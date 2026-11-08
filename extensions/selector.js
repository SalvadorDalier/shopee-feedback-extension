// selectors.js
// Mọi bộ chọn DOM của Shopee nằm ở file này (NFR-08).
// Khi Shopee đổi giao diện, chỉ cần sửa ở đây.
//
// Nạp TRƯỚC content.js trong manifest.json:
//   "content_scripts": [{ "matches": [...], "js": ["selectors.js", "content.js"] }]
//
// Quy ước:
//   [ỔN ĐỊNH]  tên class đọc được hoặc thuộc tính data-*, ít khi đổi
//   [DỄ GÃY]   tên class bị băm (ví dụ A7MThp), có thể đổi khi Shopee phát hành bản mới

const SEL = Object.freeze({
  // ---------- Danh sách và phân trang ----------
  listWrap: ".product-ratings__list", // [ỔN ĐỊNH]
  list: ".shopee-product-comment-list", // [ỔN ĐỊNH]
  item: "[data-cmtid]", // [ỔN ĐỊNH] một review, id nằm ở item.dataset.cmtid
  pager: "nav.shopee-page-controller", // [ỔN ĐỊNH]
  pageNext: ".shopee-icon-button--right", // [ỔN ĐỊNH] sang trang sau
  pagePrev: ".shopee-icon-button--left", // [ỔN ĐỊNH]
  pageActive: ".shopee-button-solid--primary", // [ỔN ĐỊNH] nút của trang đang chọn
  pageNumber: ".shopee-button-no-outline", // [ỔN ĐỊNH] các nút số trang còn lại

  // ---------- ĐỌC (tìm bên trong một item) ----------
  star: "svg.icon-rating-solid", // [ỔN ĐỊNH] đếm số thẻ này = số sao
  dateLine: ".XYk98l", // [DỄ GÃY] "2026-09-07 10:39 | Variation: Trắng"
  structured: ".meQyXP", // [DỄ GÃY] khối bình luận, KHÔNG phải review nào cũng có
  label: ".K5v3lN", // [DỄ GÃY] nhãn "Chất lượng sản phẩm"..., giá trị là nextElementSibling
  freeText: ".YNedDV", // [DỄ GÃY] chữ tự do, có thể rỗng

  // ---------- KHÔNG ĐỌC (ghi ra để không ai đọc nhầm) ----------
  avatar: ".kRbrbH", // thông tin cá nhân (FR-05)
  author: ".InK5kS", // thông tin cá nhân (FR-05)
  media: ".ZBCPg1", // ảnh và video, bản này chưa phân tích
  actionsBar: ".shopee-product-rating__actions", // [ỔN ĐỊNH] helpful, Report Abuse; dùng để tự kiểm tra

  // ---------- CHƯA BIẾT ----------
  shopReply: null, // chờ mẫu HTML của review có phản hồi từ shop
});

// Các mẫu chữ (regex) gắn với cách Shopee hiển thị.
const PATTERNS = Object.freeze({
  date: /^\d{4}-\d{2}-\d{2}/, // lấy ngày từ đầu chuỗi dateLine
  dateLineSeparator: "|", // tách ngày và phân loại
  // Giao diện tiếng Anh ghi "Variation:". Giao diện tiếng Việt có thể là "Phân loại hàng:" (chưa kiểm chứng).
  variationPrefix: /^\s*(Variation|Phân loại hàng)\s*:\s*/i,
  labelTail: /\s*:\s*$/, // bỏ dấu ":" thừa ở cuối nhãn
});

// Tự kiểm tra giao diện còn đúng như đã khảo sát không.
// Mỗi review có đúng một thanh "helpful / Report", nên hai số này phải bằng nhau.
// Nếu ok = false thì báo lỗi E02 (không đọc được review).
function checkLayout(root = document) {
  const items = root.querySelectorAll(SEL.item).length;
  const bars = root.querySelectorAll(SEL.actionsBar).length;
  return { items, bars, ok: items > 0 && items === bars };
}
