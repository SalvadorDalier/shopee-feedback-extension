// ============================================================
// POPUP CONTROLLER – ĐIỀU PHỐI GIAO DIỆN & DỮ LIỆU
// ============================================================

/** Truy vấn DOM element theo selector, báo lỗi nếu không tìm thấy */
function $(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Không tìm thấy phần tử: ${selector}`);
  return el;
}

/** Cập nhật thông báo trạng thái lên giao diện */
function showStatus(el, text, isError = false) {
  el.classList.remove(CONFIG.css.hidden, CONFIG.css.error);
  if (isError) el.classList.add(CONFIG.css.error);
  el.innerText = text;
}

/** Render danh sách <li> vào <ul> an toàn */
function renderList(ulElement, items, textKey) {
  ulElement.innerHTML = "";
  (items || []).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = typeof item === "string" ? item : (item?.[textKey] ?? "");
    ulElement.appendChild(li);
  });
}

/** Lấy thông tin tab đang hoạt động */
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tab;
}

/** Tải dữ liệu review mẫu từ tệp json dự phòng (không hardcode trong code) */
async function loadMockReviews() {
  try {
    const fileUrl = chrome.runtime.getURL(CONFIG.mockDataPath);
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Không thể tải file mock reviews:", err);
    return [];
  }
}

/** Gửi message yêu cầu content script cào review */
async function fetchReviewsFromContentScript(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: CONFIG.actions.extractReviews,
    });
    if (response?.success && Array.isArray(response.reviews) && response.reviews.length > 0) {
      return response.reviews;
    }
  } catch (e) {
    console.warn(CONFIG.messages.domWarning, e);
  }
  return [];
}

/** Lấy URL API backend (ưu tiên lấy từ chrome.storage nếu người dùng cấu hình tùy chỉnh) */
async function getBackendAnalyzeUrl() {
  if (chrome.storage?.sync) {
    try {
      const data = await chrome.storage.sync.get("customBackendUrl");
      if (data?.customBackendUrl) return data.customBackendUrl;
    } catch (_) {}
  }
  return CONFIG.backend.analyzeUrl;
}

/** Gửi danh sách review sang Backend FastAPI để phân tích ABSA */
async function analyzeReviews(productUrl, reviews) {
  const endpoint = await getBackendAnalyzeUrl();
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_url: productUrl,
        reviews,
      }),
    });
    if (!res.ok) throw new Error(CONFIG.messages.backendError(res.status));
    return await res.json();
  } catch (err) {
    if (err.message.includes("Failed to fetch") || err.name === "TypeError") {
      throw new Error(CONFIG.messages.serverOffline(endpoint));
    }
    throw err;
  }
}

// ============================================================
// XỬ LÝ SỰ KIỆN NÚT PHÂN TÍCH
// ============================================================

$(CONFIG.selectors.btnExtract).addEventListener("click", async () => {
  const statusMsg = $(CONFIG.selectors.statusMsg);
  const resultBox = $(CONFIG.selectors.resultBox);
  const posList = $(CONFIG.selectors.posList);
  const negList = $(CONFIG.selectors.negList);

  showStatus(statusMsg, CONFIG.messages.extracting);

  try {
    const tab = await getActiveTab();
    if (!tab?.id) {
      throw new Error(CONFIG.messages.invalidTab);
    }

    // 1. Cào review trực tiếp từ trang Shopee hiện tại
    let reviews = await fetchReviewsFromContentScript(tab.id);

    // 2. Nếu Shopee chặn hoặc chưa tải được review, nạp dữ liệu lưu sẵn từ file JSON
    if (reviews.length === 0) {
      showStatus(statusMsg, CONFIG.messages.fallback);
      reviews = await loadMockReviews();
      if (reviews.length === 0) {
        throw new Error(CONFIG.messages.emptyData);
      }
    } else {
      showStatus(statusMsg, CONFIG.messages.collected(reviews.length));
    }

    // 3. Gửi sang backend phân tích
    const productUrl = tab.url || "";
    const data = await analyzeReviews(productUrl, reviews);

    // 4. Render kết quả lên giao diện Popup
    const { responseKeys } = CONFIG;
    renderList(posList, data[responseKeys.positive], responseKeys.itemText);
    renderList(negList, data[responseKeys.negative], responseKeys.itemText);

    resultBox.classList.remove(CONFIG.css.hidden);
    showStatus(statusMsg, CONFIG.messages.done(data[responseKeys.total] ?? reviews.length));
  } catch (err) {
    showStatus(statusMsg, CONFIG.messages.errorPrefix + err.message, true);
  }
});
