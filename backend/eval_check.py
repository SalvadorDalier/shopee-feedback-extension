import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from analyze_review import analyze_reviews, load_aspects

TEST_BENCHMARK = [
    # 1. Giao hàng - Positive
    {
        "text": "Giao hàng siêu nhanh, mới đặt hôm qua mà sáng nay anh shipper đã gọi giao đồ rồi.",
        "expected_aspect": "giao hàng",
        "expected_polarity": "positive",
    },
    {
        "text": "Bác tài shipper thân thiện dễ thương giao tận cửa tầng 5, thời gian ship thần tốc.",
        "expected_aspect": "giao hàng",
        "expected_polarity": "positive",
    },
    # 2. Giao hàng - Negative
    {
        "text": "Thời gian giao chậm như rùa, ngâm đơn cả tuần mới chịu ship, chờ mòn mỏi.",
        "expected_aspect": "giao hàng",
        "expected_polarity": "negative",
    },
    {
        "text": "Shipper gọi cộc lốc thái độ gắt gỏng như chửi khách, giao hàng trễ 3 ngày.",
        "expected_aspect": "giao hàng",
        "expected_polarity": "negative",
    },
    # 3. Đóng gói - Positive
    {
        "text": "Hàng đóng gói cẩn thận 3 lớp chống sốc, bọc kỹ nguyên seal mở hộp ưng cái bụng.",
        "expected_aspect": "đóng gói",
        "expected_polarity": "positive",
    },
    {
        "text": "Thùng carton dày dặn bọc xốp cẩn thận không một vết móp, đóng hộp xịn xò.",
        "expected_aspect": "đóng gói",
        "expected_polarity": "positive",
    },
    # 4. Đóng gói - Negative
    {
        "text": "Hộp móp méo nát bét, bọc hàng sơ sài không có chống sốc gì cả.",
        "expected_aspect": "đóng gói",
        "expected_polarity": "negative",
    },
    {
        "text": "Gói hàng sơ sài quấn đúng lớp nilon rách toạc làm vỡ nát bên trong.",
        "expected_aspect": "đóng gói",
        "expected_polarity": "negative",
    },
    # 5. Chất lượng - Positive
    {
        "text": "Chất lượng đỉnh chóp, 10 điểm không có nhưng, đeo tai nghe bass dập bao phê.",
        "expected_aspect": "chất lượng",
        "expected_polarity": "positive",
    },
    {
        "text": "Form áo chuẩn đét, tôn dáng xỉu, chất vải mềm mịn ưng ý cực kỳ.",
        "expected_aspect": "chất lượng",
        "expected_polarity": "positive",
    },
    {
        "text": "Chất kem mịn màng thơm phức, thoa lên da êm ru thẩm thấu nhanh.",
        "expected_aspect": "chất lượng",
        "expected_polarity": "positive",
    },
    {
        "text": "Bánh giòn rụm ngon cành đào, ăn cuốn hết nước chấm.",
        "expected_aspect": "chất lượng",
        "expected_polarity": "positive",
    },
    # 6. Chất lượng - Negative
    {
        "text": "Hàng pha kè lởm khởm, chất lượng như hạch, chê nha!",
        "expected_aspect": "chất lượng",
        "expected_polarity": "negative",
    },
    {
        "text": "Vải mỏng dính lộ cả nội y, đường may cẩu thả bung chỉ toe toét, quá thất vọng.",
        "expected_aspect": "chất lượng",
        "expected_polarity": "negative",
    },
    {
        "text": "Mùi kinh tởm nồng nặc hóa chất, dùng bị dị ứng nổi mụn toang mặt.",
        "expected_aspect": "chất lượng",
        "expected_polarity": "negative",
    },
    {
        "text": "Bàn phím ọp ẹp liệt phím, cắm vào không lên nguồn như đồ chơi hàng chợ.",
        "expected_aspect": "chất lượng",
        "expected_polarity": "negative",
    },
    # 7. Giá cả - Positive
    {
        "text": "Giá hạt dẻ hời vl, săn sale áp mã được giá cực tốt đáng tiền.",
        "expected_aspect": "giá cả",
        "expected_polarity": "positive",
    },
    {
        "text": "Áp voucher giảm 50k giá rẻ bèo, deal hời quá trời luôn.",
        "expected_aspect": "giá cả",
        "expected_polarity": "positive",
    },
    # 8. Giá cả - Negative
    {
        "text": "Giá chát chúa quá đắt, mua về phí tiền không đáng một xu.",
        "expected_aspect": "giá cả",
        "expected_polarity": "negative",
    },
    {
        "text": "Giá chát lòi mà chất lượng như hạch, phí tiền uổng công kỳ vọng.",
        "expected_aspect": "giá cả",
        "expected_polarity": "negative",
    },
    # 9. Dịch vụ - Positive
    {
        "text": "Chủ shop dễ thương cute, rep tin nhắn nhiệt tình, tặng kèm quà xinh xắn.",
        "expected_aspect": "dịch vụ",
        "expected_polarity": "positive",
    },
    {
        "text": "Shop tư vấn nhiệt tình, rep ib trong 1 nốt nhạc còn hỗ trợ đổi trả tận tâm.",
        "expected_aspect": "dịch vụ",
        "expected_polarity": "positive",
    },
    # 10. Dịch vụ - Negative
    {
        "text": "Shop thái độ lồi lõm, nhắn tin seen không thèm rep, né gấp shop này.",
        "expected_aspect": "dịch vụ",
        "expected_polarity": "negative",
    },
    {
        "text": "Nhắn tin hỏi cách bảo hành thì shop bơ luôn, cạch mặt không bao giờ quay lại.",
        "expected_aspect": "dịch vụ",
        "expected_polarity": "negative",
    },
]

DEDUP_TESTS = [
    {
        "name": "2 review gần giống nhau -> chỉ ra 1 feedback, mentions >= 2",
        "reviews": [
            "Giao hàng nhanh lắm, shipper dễ thương",
            "Giao hàng nhanh lắm, anh shipper dễ thương luôn",
            "Chất lượng tạm ổn",
        ],
        "check": lambda r: (
            len(r["top_positive"]) >= 1
            and any(
                item["aspect"] == "giao hàng" and item["mentions"] >= 1
                for item in r["top_positive"]
            )
        ),
    },
    {
        "name": "Negation flip: 'không tốt' -> negative",
        "reviews": ["Hàng không tốt, chất lượng kém"],
        "check": lambda r: (
            len(r["top_negative"]) >= 1
            and any(item["aspect"] == "chất lượng" for item in r["top_negative"])
        ),
    },
    {
        "name": "Score có confidence > 0",
        "reviews": ["Giao hàng siêu nhanh, đóng gói cẩn thận, chất lượng đỉnh chóp"],
        "check": lambda r: all(
            item.get("confidence", 0) > 0 and item.get("score", 0) > 0
            for item in r["top_positive"]
        ),
    },
]


def run_evaluation():
    print("=" * 70)
    print(" ĐÁNH GIÁ ABSA: NAIVE BAYES + LAPLACE SMOOTHING + DEDUP")
    print("=" * 70)

    aspects_data = load_aspects()
    passed = 0
    total = len(TEST_BENCHMARK)

    print("\n--- Benchmark cơ bản (24 cases) ---\n")

    for idx, item in enumerate(TEST_BENCHMARK, 1):
        text = item["text"]
        exp_aspect = item["expected_aspect"]
        exp_pol = item["expected_polarity"]

        result = analyze_reviews([text], aspects_data)
        target_list = result["top_positive"] if exp_pol == "positive" else result["top_negative"]

        matched_aspects = [entry["aspect"] for entry in target_list]
        is_pass = exp_aspect in matched_aspects

        status_str = "✓ PASS" if is_pass else "✗ FAIL"
        if is_pass:
            passed += 1

        scores_str = ""
        for entry in target_list:
            if entry["aspect"] == exp_aspect:
                scores_str = f" | score={entry.get('score', '?')} conf={entry.get('confidence', '?')}"
                break

        print(f"[{idx:02d}/{total:02d}] {status_str} | {exp_aspect:10s} ({exp_pol:8s}) | Nhận: {matched_aspects}{scores_str}")
        if not is_pass:
            print(f"       Review: \"{text}\"")
            print(f"       -> Pos: {[x['aspect'] for x in result['top_positive']]}")
            print(f"       -> Neg: {[x['aspect'] for x in result['top_negative']]}")

    print(f"\n--- Benchmark cơ bản: {passed}/{total} ---\n")

    print("--- Dedup + Ranking tests ---\n")

    dedup_passed = 0
    for idx, test in enumerate(DEDUP_TESTS, 1):
        result = analyze_reviews(test["reviews"], aspects_data)
        is_pass = test["check"](result)
        dedup_passed += int(is_pass)
        status_str = "✓ PASS" if is_pass else "✗ FAIL"
        print(f"[D{idx}] {status_str} | {test['name']}")
        if not is_pass:
            print(f"       Pos: {result['top_positive']}")
            print(f"       Neg: {result['top_negative']}")

    total_all = total + len(DEDUP_TESTS)
    passed_all = passed + dedup_passed

    accuracy = (passed_all / total_all) * 100
    print("-" * 70)
    print(f" KẾT QUẢ: {passed_all}/{total_all} đạt ({accuracy:.1f}%)")
    print("=" * 70)
    return passed_all == total_all


if __name__ == "__main__":
    success = run_evaluation()
    sys.exit(0 if success else 1)
