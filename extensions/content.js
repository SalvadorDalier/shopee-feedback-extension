// ============================================================
// CẤU HÌNH – content script dùng SEL & PATTERNS từ selector.js
// ============================================================
const CONTENT_CONFIG = Object.freeze({
  // Số review tối đa mỗi lần thu thập
  maxReviews: 30,

  // Độ dài tối thiểu của văn bản review để không bị lọc
  minTextLength: 5,

  // Thời gian chờ (ms)
  delays: {
    scrollWait: 1200, // chờ sau khi cuộn tới vùng đánh giá
    pageWait: 2000, // chờ sau khi lật trang
  },

  // Số trang tối đa sẽ lật tự động
  maxPages: 5,

  // Action name phải khớp với popup.js CONFIG.actions.extractReviews
  action: "EXTRACT_SHOPEE_REVIEWS",
});

// ============================================================
// HELPERS
// ============================================================

/** Tạm dừng n ms */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Đếm số sao của 1 review item.
 * Đếm số thẻ svg.icon-rating-solid bên trong div.rGdC5O (vùng sao riêng của item,
 * không lẫn với sao tổng quan ở đầu trang).
 */
function countStars(itemNode) {
  const starContainer = itemNode.querySelector(".rGdC5O");
  if (!starContainer) return 0;
  return starContainer.querySelectorAll(SEL.star).length;
}

/**
 * Phân tích chuỗi dateLine: "2026-09-13 23:15 | Variation: GK Kuten Jack 3.5,Không Mic"
 * Trả về { date, variation }
 */
function parseDateLine(itemNode) {
  const el = itemNode.querySelector(SEL.dateLine);
  if (!el) return { date: "", variation: "" };

  const raw = el.innerText.trim();
  const parts = raw.split(PATTERNS.dateLineSeparator);

  const datePart = (parts[0] || "").trim();
  const dateMatch = datePart.match(PATTERNS.date);
  const date = dateMatch ? dateMatch[0] : datePart;

  let variation = "";
  if (parts.length > 1) {
    variation = parts
      .slice(1)
      .join(PATTERNS.dateLineSeparator)
      .trim()
      .replace(PATTERNS.variationPrefix, "");
  }

  return { date, variation };
}

/**
 * Trích xuất các nhãn đánh giá có cấu trúc (VD: "Âm thanh: hợp gu", "Thiết kế: đeo êm").
 * Mỗi span.K5v3lN chứa nhãn, giá trị nằm ở nextElementSibling.
 */
function extractStructuredLabels(itemNode) {
  const block = itemNode.querySelector(SEL.structured);
  if (!block) return [];

  const labels = block.querySelectorAll(SEL.label);
  const result = [];

  labels.forEach((labelEl) => {
    const labelText = labelEl.innerText.trim().replace(PATTERNS.labelTail, "");
    const valueEl = labelEl.nextElementSibling;
    const valueText = valueEl ? valueEl.innerText.trim() : "";
    if (labelText && valueText) {
      result.push({ label: labelText, value: valueText });
    }
  });

  return result;
}

/**
 * Trích xuất văn bản tự do (bình luận chính của người dùng).
 */
function extractFreeText(itemNode) {
  const el = itemNode.querySelector(SEL.freeText);
  return el ? el.innerText.trim() : "";
}

// ============================================================
// TRÍCH XUẤT CHÍNH
// ============================================================

/**
 * Trích xuất tất cả review từ trang hiện tại.
 * Trả về mảng các đối tượng có cấu trúc:
 * {
 *   cmtid:      string,   – ID bình luận từ data-cmtid
 *   stars:      number,   – Số sao (1–5)
 *   date:       string,   – Ngày đánh giá (YYYY-MM-DD)
 *   variation:  string,   – Phân loại hàng đã mua
 *   structured: [{label, value}],  – Đánh giá có nhãn
 *   freeText:   string,   – Bình luận tự do
 *   fullText:   string,   – Gộp structured + freeText làm 1 chuỗi (để gửi backend)
 * }
 */
function extractReviewsFromDOM() {
  const items = document.querySelectorAll(SEL.item);
  const results = [];

  items.forEach((node) => {
    const cmtid = node.dataset.cmtid || "";
    const stars = countStars(node);
    const { date, variation } = parseDateLine(node);
    const structured = extractStructuredLabels(node);
    const freeText = extractFreeText(node);

    // Gộp structured labels + freeText thành 1 chuỗi hoàn chỉnh
    const structuredText = structured
      .map((s) => `${s.label}: ${s.value}`)
      .join(". ");
    const fullText = [structuredText, freeText].filter(Boolean).join(". ");

    // Lọc bỏ review không có nội dung có ý nghĩa
    if (fullText.length <= CONTENT_CONFIG.minTextLength) return;

    results.push({
      cmtid,
      stars,
      date,
      variation,
      structured,
      freeText,
      fullText,
    });
  });

  return results;
}

/**
 * Kiểm tra xem nút "Next" có thể bấm được không.
 */
function canGoNext() {
  const btn = document.querySelector(`button${SEL.pageNext}`);
  return btn && !btn.disabled;
}

/**
 * Bấm nút "Next" và chờ trang mới tải xong.
 */
async function goNextPage() {
  const btn = document.querySelector(`button${SEL.pageNext}`);
  if (!btn || btn.disabled) return false;
  btn.click();
  await sleep(CONTENT_CONFIG.delays.pageWait);
  return true;
}

/**
 * Lấy trang đang active (số).
 */
function getCurrentPage() {
  const active = document.querySelector(SEL.pageActive);
  return active ? parseInt(active.innerText, 10) || 1 : 1;
}

// ============================================================
// THU THẬP ĐA TRANG
// ============================================================

/**
 * Tự động gom review từ nhiều trang cho đến khi đủ maxCount hoặc hết trang.
 * Sử dụng cmtid để khử trùng lặp giữa các trang.
 */
async function collectReviews(maxCount = CONTENT_CONFIG.maxReviews) {
  // Kiểm tra bố cục Shopee có đúng cấu trúc đã khảo sát không
  const layout = checkLayout();
  if (!layout.ok) {
    console.warn(
      "[Shopee Summarizer] Layout check failed (E02):",
      layout,
      "— thử thu thập dù sao",
    );
  }

  // Cuộn nhẹ tới vùng đánh giá để kích hoạt render
  const ratingSection =
    document.querySelector(SEL.listWrap) || document.querySelector(SEL.list);
  if (ratingSection) {
    ratingSection.scrollIntoView({ behavior: "smooth", block: "center" });
    await sleep(CONTENT_CONFIG.delays.scrollWait);
  }

  const seenIds = new Set();
  const collected = [];
  let pagesVisited = 0;

  while (
    collected.length < maxCount &&
    pagesVisited < CONTENT_CONFIG.maxPages
  ) {
    const pageReviews = extractReviewsFromDOM();

    for (const review of pageReviews) {
      if (seenIds.has(review.cmtid)) continue;
      seenIds.add(review.cmtid);
      collected.push(review);
      if (collected.length >= maxCount) break;
    }

    pagesVisited++;

    // Dừng nếu đã đủ hoặc không thể lật trang tiếp
    if (collected.length >= maxCount || !canGoNext()) break;

    const prevPage = getCurrentPage();
    const navigated = await goNextPage();
    if (!navigated || getCurrentPage() === prevPage) break;
  }

  return collected;
}

// ============================================================
// LẮNG NGHE MESSAGE TỪ popup.js
// ============================================================

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action !== CONTENT_CONFIG.action) return false;

  collectReviews()
    .then((reviews) => {
      // Gửi cả dữ liệu có cấu trúc và mảng text thuần cho backend
      sendResponse({
        success: true,
        reviews: reviews.map((r) => r.fullText), // text[] cho backward compat
        structured: reviews, // dữ liệu đầy đủ
        page: getCurrentPage(),
        total: reviews.length,
      });
    })
    .catch((err) => {
      sendResponse({
        success: false,
        error: err.message,
        reviews: [],
      });
    });

  return true; // Giữ kênh kết nối async
});
