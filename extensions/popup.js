// popup.js
// gọi content script lấy review -> merge text -> gửi backend -> hiển thị kết quả

const analyzeBtn = document.getElementById("analyzeBtn");
const statusText = document.getElementById("statusText");
const positiveList = document.getElementById("positiveList");
const negativeList = document.getElementById("negativeList");

function setStatus(message) {
  if (statusText) statusText.textContent = message;
}

function clearResults() {
  positiveList.innerHTML = "";
  negativeList.innerHTML = "";
}

function renderResults(result) {
  clearResults();

  (result.top_positive || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.aspect}: "${item.example}"`;
    positiveList.appendChild(li);
  });

  (result.top_negative || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.aspect}: "${item.example}"`;
    negativeList.appendChild(li);
  });

  if (!result.top_positive?.length && !result.top_negative?.length) {
    setStatus("Không đủ dữ liệu để phân tích ưu/nhược điểm.");
  } else {
    setStatus("Hoàn tất.");
  }
}

// Gộp review (structured + freeText) từ content.js thành 1 chuỗi text duy nhất
// vì backend chỉ cần list[str] để phân tích, không cần giữ cấu trúc
function mergeReviewToText(review) {
  const structuredText = Object.entries(review.structured || {})
    .map(([label, value]) => `${label}: ${value}`)
    .join(". ");
  const parts = [structuredText, review.freeText].filter((s) => s && s.trim());
  return parts.join(". ").trim();
}

async function getActiveShopeeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes("shopee.vn")) {
    return null;
  }
  return tab;
}

async function extractReviewsFromContentScript(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: "EXTRACT_SHOPEE_REVIEWS" },
      (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, reason: "NO_CONTENT_SCRIPT", reviews: [] });
          return;
        }
        resolve(
          response || { ok: false, reason: "EMPTY_RESPONSE", reviews: [] },
        );
      },
    );
  });
}

// Dự phòng: dùng mock_reviews.json nếu cào thật thất bại (đúng như README mô tả)
async function loadMockReviews() {
  const url = chrome.runtime.getURL("mock_reviews.json");
  const res = await fetch(url);
  const data = await res.json();
  // Giả định mock_reviews.json có cùng shape { reviews: [...] } hoặc là mảng trực tiếp
  return Array.isArray(data) ? data : data.reviews || [];
}

async function callBackendAnalyze(texts) {
  const baseUrl =
    (typeof CONFIG !== "undefined" && CONFIG.API_BASE_URL) ||
    "http://127.0.0.1:8000";
  const res = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviews: texts }),
  });

  if (!res.ok) {
    throw new Error(`Backend trả lỗi: ${res.status}`);
  }
  return res.json();
}

async function handleAnalyzeClick() {
  analyzeBtn.disabled = true;
  clearResults();
  setStatus("Đang lấy đánh giá...");

  try {
    const tab = await getActiveShopeeTab();
    let reviews = [];

    if (tab) {
      const extraction = await extractReviewsFromContentScript(tab.id);
      if (extraction.ok && extraction.reviews?.length > 0) {
        reviews = extraction.reviews;
      }
    }

    if (reviews.length === 0) {
      setStatus("Không lấy được review thật, dùng dữ liệu mẫu...");
      reviews = await loadMockReviews();
    }

    const texts = reviews.map(mergeReviewToText).filter((t) => t.length > 0);

    if (texts.length === 0) {
      setStatus("Không có nội dung review để phân tích.");
      return;
    }

    setStatus(`Đang phân tích ${texts.length} đánh giá...`);
    const result = await callBackendAnalyze(texts);
    renderResults(result);
  } catch (err) {
    setStatus("Lỗi: không kết nối được backend. Kiểm tra server đã chạy chưa.");
    console.error(err);
  } finally {
    analyzeBtn.disabled = false;
  }
}

analyzeBtn.addEventListener("click", handleAnalyzeClick);
