// selector.js
// Tập trung toàn bộ CSS selector của khu vực đánh giá Shopee.
// Ghi chú độ ổn định dựa trên khảo sát DOM thực tế (Bước 0 - EDA).
// Khi Shopee đổi giao diện, chỉ cần sửa file này, không đụng vào content.js.

const SELECTORS = Object.freeze({
  // ---------- Danh sách và phân trang ----------
  listWrap: ".product-ratings__list", //
  list: ".shopee-product-comment-list", //
  item: "[data-cmtid]", // một review, id nằm ở item.dataset.cmtid
  pager: "nav.shopee-page-controller", //
  pageNext: ".shopee-icon-button--right", // sang trang sau
  pagePrev: ".shopee-icon-button--left", //
  pageActive: ".shopee-button-solid--primary", // nút của trang đang chọn
  pageNumber: ".shopee-button-no-outline", // các nút số trang còn lại

  // ---------- ĐỌC (tìm bên trong một item) ----------
  star: "svg.icon-rating-solid", // đếm số thẻ này = số sao
  dateLine: ".XYk98l", // (dễ bị thay đổi) "2026-09-07 10:39 | Variation: Trắng"
  structured: ".meQyXP", // (dễ bị thay đổi) khối bình luận, KHÔNG phải review nào cũng có
  label: ".K5v3lN", // (dễ bị thay đổi) nhãn "Chất lượng sản phẩm"..., giá trị là nextElementSibling
  freeText: ".YNedDV", // (dễ bị thay đổi) chữ tự do, có thể rỗng

  // ---------- KHÔNG ĐỌC (ghi ra để không AI đọc nhầm) ----------
  avatar: ".kRbrbH", // thông tin cá nhân
  author: ".InK5kS", // thông tin cá nhân
  media: ".ZBCPg1", // ảnh và video, bản này chưa phân tích
  actionsBar: ".shopee-product-rating__actions", // helpful, Report Abuse; dùng để tự kiểm tra

  // ---------- CHƯA BIẾT ----------
  shopReply: null, // chờ mẫu HTML của review có phản hồi từ shop
});
