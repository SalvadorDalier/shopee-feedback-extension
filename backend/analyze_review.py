# Phân tích danh sách review (list[str]) -> Top 3 ưu điểm, Top 3 nhược điểm.
# Cách làm: với mỗi review, tách thành các câu nhỏ (snippet), tìm câu nào nhắc
# tới khía cạnh nào (vd "giao hàng"), rồi chấm điểm câu đó là tích cực/tiêu cực
# dựa trên từ điển cảm xúc. Sau đó gom nhóm theo khía cạnh, xếp hạng theo:
#   - số review KHÁC NHAU nhắc tới khía cạnh đó (coverage, giống document
#     frequency trong TF-IDF - Ch7.1 Vector Space Model)
#   - mức độ rõ ràng của cảm xúc (độ lệch positive/negative)
# Đây là bản xấp xỉ đơn giản của Naive Bayes sentiment classifier (Ch10.1),
# dùng lexicon thay vì model đã train. Hàm analyze_reviews() là entry point
# duy nhất, sau này có thể thay nội bộ bằng model thật (teammate train) mà
# không cần sửa main.py.

import json
import re
from pathlib import Path
from collections import defaultdict

ASPECTS_PATH = Path(__file__).parent / "aspects.json"


def load_aspects(path: Path = ASPECTS_PATH) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def split_snippets(text: str) -> list[str]:
    # Tách review thành câu/cụm nhỏ theo dấu câu phổ biến
    raw_parts = re.split(r"[.!?\n]+", text)
    return [p.strip() for p in raw_parts if p.strip()]


def count_keyword_hits(snippet_lower: str, keywords: list[str]) -> int:
    return sum(1 for kw in keywords if kw in snippet_lower)


def analyze_reviews(reviews: list[str], aspects_data: dict | None = None) -> dict:
    """
    reviews: danh sách text review đã gộp sẵn (từ popup.js mergeReviewToText)
    return: {
        "top_positive": [{"aspect": str, "example": str, "mentions": int}, ...],
        "top_negative": [{"aspect": str, "example": str, "mentions": int}, ...]
    }
    """
    if aspects_data is None:
        aspects_data = load_aspects()

    aspects = aspects_data["aspects"]
    positive_words = aspects_data["positive_words"]
    negative_words = aspects_data["negative_words"]

    # candidates[(aspect, polarity)] = list of (review_index, snippet, strength)
    candidates = defaultdict(list)

    for review_idx, review_text in enumerate(reviews):
        for snippet in split_snippets(review_text):
            snippet_lower = snippet.lower()

            pos_hits = count_keyword_hits(snippet_lower, positive_words)
            neg_hits = count_keyword_hits(snippet_lower, negative_words)

            if pos_hits == 0 and neg_hits == 0:
                continue  # câu này không mang tín hiệu cảm xúc rõ ràng, bỏ qua

            net = pos_hits - neg_hits
            if net == 0:
                continue  # trung hòa, không xếp vào tích cực hay tiêu cực

            polarity = "positive" if net > 0 else "negative"

            for aspect_name, keywords in aspects.items():
                if count_keyword_hits(snippet_lower, keywords) > 0:
                    candidates[(aspect_name, polarity)].append(
                        (review_idx, snippet, abs(net))
                    )

    # Chấm điểm từng (aspect, polarity): coverage (số review khác nhau) +
    # strength (tổng độ mạnh cảm xúc), giống công thức ranking tuyến tính Ch5.1 / Ch12.1
    scored = []
    for (aspect_name, polarity), items in candidates.items():
        distinct_reviews = len(set(idx for idx, _, _ in items))
        total_strength = sum(strength for _, _, strength in items)
        score = distinct_reviews * 2 + total_strength  # trọng số có thể tinh chỉnh sau

        # câu đại diện: câu có strength cao nhất (rõ cảm xúc nhất)
        best_snippet = max(items, key=lambda x: x[2])[1]

        scored.append({
            "aspect": aspect_name,
            "polarity": polarity,
            "example": best_snippet,
            "mentions": distinct_reviews,
            "score": score,
        })

    positives = sorted(
        [s for s in scored if s["polarity"] == "positive"],
        key=lambda x: x["score"],
        reverse=True,
    )[:3]

    negatives = sorted(
        [s for s in scored if s["polarity"] == "negative"],
        key=lambda x: x["score"],
        reverse=True,
    )[:3]

    strip_internal = lambda item: {
        "aspect": item["aspect"],
        "example": item["example"],
        "mentions": item["mentions"],
    }

    return {
        "top_positive": [strip_internal(i) for i in positives],
        "top_negative": [strip_internal(i) for i in negatives],
    }