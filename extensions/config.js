// ============================================================
// CẤU HÌNH TRUNG TÂM (EXTENSION CONFIGURATION)
// ============================================================
const CONFIG = Object.freeze({
  // Cấu hình Backend
  backend: {
    baseUrl: "http://127.0.0.1:8000",
    analyzeEndpoint: "/api/analyze",
    get analyzeUrl() {
      return `${this.baseUrl}${this.analyzeEndpoint}`;
    },
  },

  // Đường dẫn tệp dữ liệu mock dự phòng
  mockDataPath: "mock_reviews.json",

  // Hành động giao tiếp giữa Popup và Content Script
  actions: {
    extractReviews: "EXTRACT_SHOPEE_REVIEWS",
  },

  // Danh sách DOM selectors của giao diện popup
  selectors: {
    btnExtract: "#btn-extract",
    statusMsg: "#status-msg",
    resultBox: "#result-box",
    posList: "#pos-list",
    negList: "#neg-list",
  },

  // CSS classes điều khiển trạng thái hiển thị
  css: {
    hidden: "hidden",
    error: "text-rose-600",
  },

  // Các mẫu thông báo cho người dùng
  messages: {
    extracting: "Đang cào review từ trang Shopee...",
    fallback: "Kích hoạt dữ liệu review dự phòng (Fallback)...",
    collected: (n) => `Đã lấy được ${n} đánh giá. Đang gửi sang backend...`,
    done: (n) => `Hoàn tất phân tích (${n} review).`,
    backendError: (status) => `Backend lỗi: ${status}`,
    serverOffline: (url) => `Không kết nối được Backend (${url}). Hãy chạy lệnh "python main.py" để bật server.`,
    domWarning: "Không thể cào trực tiếp từ DOM, chuyển sang chế độ dự phòng:",
    invalidTab: "Vui lòng mở một trang sản phẩm Shopee để phân tích.",
    emptyData: "Không thể lấy review từ trang và file mock data trống.",
    errorPrefix: "Lỗi: ",
  },

  // Khóa dữ liệu trong kết quả trả về từ API backend
  responseKeys: {
    positive: "top_positive",
    negative: "top_negative",
    total: "total_reviews",
    itemText: "text",
  },
});
