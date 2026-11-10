import json
import re
import math
from pathlib import Path
from collections import defaultdict

ASPECTS_PATH = Path(__file__).parent / "aspects.json"
NEGATION_WORDS = ["không", "chẳng", "chả", "chưa", "đừng", "k", "ko", "khong"]

JACCARD_THRESHOLD = 0.6
NEUTRAL_BAND = 0.1


def load_aspects(path: Path = ASPECTS_PATH) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def split_snippets(text: str) -> list[str]:
    raw_parts = re.split(r"[.!?\n,;]+|\bnhưng\b|\btuy nhiên\b", text, flags=re.IGNORECASE)
    return [p.strip() for p in raw_parts if p.strip()]


def count_keyword_hits(snippet_lower: str, keywords: list[str]) -> int:
    return sum(1 for kw in keywords if kw in snippet_lower)


def count_sentiment_with_negation(snippet_lower: str, keywords: list[str]) -> tuple[int, int]:
    hits = 0
    flipped = 0
    for kw in keywords:
        start_search = 0
        while True:
            idx = snippet_lower.find(kw, start_search)
            if idx == -1:
                break
            window_start = max(0, idx - 15)
            preceding_text = snippet_lower[window_start:idx]
            has_negation = any(
                re.search(rf"\b{neg}\b", preceding_text) for neg in NEGATION_WORDS
            )
            if has_negation:
                flipped += 1
            else:
                hits += 1
            start_search = idx + len(kw)
    return hits, flipped


# ────────── Dedup: Jaccard trigram ──────────

def char_trigrams(text: str) -> set[str]:
    t = text.lower().strip()
    if len(t) < 3:
        return {t}
    return {t[i:i+3] for i in range(len(t) - 2)}


def jaccard_sim(a: set, b: set) -> float:
    if not a and not b:
        return 1.0
    intersection = len(a & b)
    union = len(a | b)
    return intersection / union if union else 0.0


def dedup_snippets(items: list[tuple]) -> list[tuple]:
    """
    items: list of (review_idx, snippet, pos_count, neg_count)
    return: list of (representative_snippet, cluster_size, avg_pos, avg_neg, distinct_reviews)
    """
    if not items:
        return []

    trigram_cache = []
    for item in items:
        trigram_cache.append(char_trigrams(item[1]))

    clusters = []
    assigned = [False] * len(items)

    for i in range(len(items)):
        if assigned[i]:
            continue
        cluster = [i]
        assigned[i] = True
        for j in range(i + 1, len(items)):
            if assigned[j]:
                continue
            if jaccard_sim(trigram_cache[i], trigram_cache[j]) > JACCARD_THRESHOLD:
                cluster.append(j)
                assigned[j] = True

        cluster_items = [items[k] for k in cluster]
        representative = max(cluster_items, key=lambda x: len(x[1]))[1]
        cluster_size = len(cluster)
        avg_pos = sum(it[2] for it in cluster_items) / cluster_size
        avg_neg = sum(it[3] for it in cluster_items) / cluster_size
        distinct_reviews = len(set(it[0] for it in cluster_items))

        clusters.append((representative, cluster_size, avg_pos, avg_neg, distinct_reviews))

    return clusters


# ────────── Naive Bayes + Laplace Smoothing ──────────

def laplace_confidence(pos_count: float, neg_count: float) -> tuple[float, str]:
    """
    Laplace +1 smoothing:
      pos_smooth = (pos + 1) / (pos + neg + 2)
      neg_smooth = (neg + 1) / (pos + neg + 2)
    return: (confidence, polarity)
      confidence ∈ (0, 1), polarity = "positive" | "negative" | "neutral"
    """
    pos_smooth = (pos_count + 1) / (pos_count + neg_count + 2)
    neg_smooth = (neg_count + 1) / (pos_count + neg_count + 2)

    if abs(pos_smooth - 0.5) < NEUTRAL_BAND:
        return 0.5, "neutral"

    if pos_smooth > neg_smooth:
        return pos_smooth, "positive"
    else:
        return neg_smooth, "negative"


# ────────── Main: analyze_reviews ──────────

def analyze_reviews(reviews: list[str], aspects_data: dict | None = None) -> dict:
    if aspects_data is None:
        aspects_data = load_aspects()

    aspects = aspects_data["aspects"]
    positive_words = aspects_data["positive_words"]
    negative_words = aspects_data["negative_words"]

    # Phase 1: Extract (aspect, snippet, sentiment counts)
    # candidates[(aspect, polarity)] = list of (review_idx, snippet, pos_count, neg_count)
    raw_candidates = defaultdict(list)

    for review_idx, review_text in enumerate(reviews):
        for snippet in split_snippets(review_text):
            snippet_lower = snippet.lower()

            pos_hits, pos_flipped = count_sentiment_with_negation(snippet_lower, positive_words)
            neg_hits, neg_flipped = count_sentiment_with_negation(snippet_lower, negative_words)

            total_pos = pos_hits + neg_flipped
            total_neg = neg_hits + pos_flipped

            if total_pos == 0 and total_neg == 0:
                continue

            confidence, polarity = laplace_confidence(total_pos, total_neg)

            if polarity == "neutral":
                continue

            for aspect_name, keywords in aspects.items():
                if count_keyword_hits(snippet_lower, keywords) > 0:
                    raw_candidates[(aspect_name, polarity)].append(
                        (review_idx, snippet, total_pos, total_neg)
                    )

    # Phase 2: Dedup per (aspect, polarity)
    # Phase 3: Naive Bayes + Laplace → confidence per cluster
    # Phase 4: Index → final_score = coverage × avg_confidence
    scored = []
    for (aspect_name, polarity), items in raw_candidates.items():
        clusters = dedup_snippets(items)

        coverage = 0
        confidence_sum = 0.0
        best_snippet = ""
        best_confidence = 0.0

        for representative, cluster_size, avg_pos, avg_neg, distinct_reviews in clusters:
            coverage += distinct_reviews
            conf, _ = laplace_confidence(avg_pos, avg_neg)
            confidence_sum += conf

            if conf > best_confidence:
                best_confidence = conf
                best_snippet = representative

        num_clusters = len(clusters)
        avg_confidence = confidence_sum / num_clusters if num_clusters else 0.0
        final_score = round(coverage * avg_confidence, 2)

        scored.append({
            "aspect": aspect_name,
            "polarity": polarity,
            "example": best_snippet,
            "mentions": coverage,
            "score": final_score,
            "confidence": round(avg_confidence, 2),
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

    strip_polarity = lambda item: {
        "aspect": item["aspect"],
        "example": item["example"],
        "mentions": item["mentions"],
        "score": item["score"],
        "confidence": item["confidence"],
    }

    return {
        "top_positive": [strip_polarity(i) for i in positives],
        "top_negative": [strip_polarity(i) for i in negatives],
    }
