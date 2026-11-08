# extension-TMG — Shopee Review Summarizer

Tiện ích mở rộng trình duyệt (Chrome Extension - Manifest V3) kết hợp Backend giúp **tóm tắt Top 3 Ưu điểm và Nhược điểm** từ bình luận sản phẩm trên Shopee bằng phương pháp phân tích cảm xúc theo khía cạnh (ABSA - Aspect-Based Sentiment Analysis).

---

## Cấu trúc thư mục

```text
extension-TMG/
├── assest/
│   ├── input.css                                 # Đầu vào cấu hình Tailwind CSS (@import "tailwindcss")
│   └── output.css                                # File CSS đã biên dịch (Tailwind CSS v4.3.3)
├── doc/
│   └── EDA.docx                                  # Tài liệu khảo sát cấu trúc DOM các khối bình luận Shopee
├── extensions/
│   ├── manifest.json                             # Cấu hình Chrome Extension (Manifest V3)
│   ├── popup.html                                # Giao diện popup
│   ├── config.js                                 # Cấu hình trung tâm (endpoints, selectors, messages)
│   ├── popup.js                                  # Controller điều phối popup
│   ├── mock_reviews.json                         # Dữ liệu review mẫu dự phòng (tách biệt khỏi mã nguồn JS)
│   ├── content.js                                # Content script trích xuất review từ DOM
│   ├── selector.js                               # Bộ chọn DOM Shopee (SEL, PATTERNS, checkLayout)
│   └── output.css                                # File CSS đã biên dịch Tailwind CSS cho extension
├── .venv/                                        # Môi trường ảo Python 3.13
├── main.py                                       # Backend FastAPI giả lập (Bước 2: Mock API)
├── review_summarizer_imple'mentation_flow.png    # Sơ đồ lộ trình triển khai dự án
└── README.md                                     # Tài liệu mô tả dự án
```

---

## Chi tiết các thành phần

### 1. Tiện ích mở rộng (`extensions/`)

- **`manifest.json`**:
  - **Manifest Version**: `3` (`Shopee Review Summarizer v1.0`)
  - **Permissions**: `activeTab`, `scripting`
  - **Host Permissions**: `https://shopee.vn/*`, `http://127.0.0.1:8000/*`
  - **Content Scripts**: Tự động nạp `content.js` trên `https://shopee.vn/*`
  - **Action Popup**: `popup.html`

- **`content.js`** *(Đã triển khai)*:
  - `extractReviewsFromDOM()`: Quét các phần tử bình luận (`div.shopee-product-comment-list > div, div.product-ratings__list div.q2b7Oq`), lấy nội dung chữ từ `div.YNedDV` hoặc `.shopee-product-rating__content`, lọc bỏ bình luận quá ngắn (`<= 5` ký tự).
  - `collectReviews(maxCount = 20)`: Tự động cuộn mượt (`scrollIntoView`) tới vùng đánh giá, thu thập review ở trang hiện tại; nếu chưa đủ số lượng sẽ tự động bấm nút sang trang (`button.shopee-icon-button--right`), khử trùng lặp bằng `Set` và cắt theo `maxCount`.
  - `chrome.runtime.onMessage`: Lắng nghe message `EXTRACT_SHOPEE_REVIEWS` từ popup và trả về tối đa `30` review.

- **`popup.html`** *(Đã triển khai)*:
  - Giao diện sử dụng Tailwind CSS gồm tiêu đề, nút kích hoạt **Phân Tích** (`#btn-extract`), dòng trạng thái (`#status-msg`) và khung kết quả (`#result-box`) chia làm 2 thẻ:
    - **Top 3 Ưu Điểm** (`#pos-list`)
    - **Top 3 Nhược Điểm** (`#neg-list`)

- **`popup.js`** *(Đã triển khai)*:
  - Khi nhấn `#btn-extract`, gửi message `{ action: "EXTRACT_SHOPEE_REVIEWS" }` tới tab Shopee đang mở.
  - **Cơ chế Fallback**: Nếu không lấy được review từ DOM (bị chặn hoặc chưa tải xong), tự động chuyển sang mảng dữ liệu dự phòng `MOCK_REVIEWS`.
  - Gửi request `POST` tới `http://127.0.0.1:8000/api/analyze` kèm payload `{ product_url, reviews }`.
  - Hiển thị danh sách `top_positive`, `top_negative` và tổng số review (`total_reviews`) lên giao diện popup.

- **`selector.js`**:
  - Tập trung bộ chọn DOM của Shopee vào đối tượng bất biến `SEL` (phân loại `[ỔN ĐỊNH]`, `[DỄ GÃY]`, và các vùng thông tin cá nhân `KHÔNG ĐỌC` như `avatar`, `author`).
  - Định nghĩa `PATTERNS` (regex tách ngày, phân loại hàng, nhãn) và hàm `checkLayout(root)` để kiểm tra tính toàn vẹn của giao diện Shopee.

---

### 2. Giao diện & Tài nguyên (`assest/`)
- **`input.css`**: Tệp nguồn khai báo `@import "tailwindcss";`.
- **`output.css`**: Tệp CSS đã biên dịch bằng **Tailwind CSS v4.3.3** phục vụ định dạng cho `popup.html`.
  > **Lưu ý kỹ thuật**: Trong `popup.html` đang có thẻ `<link rel="stylesheet" href="../assest/main.css" />` (tệp cũ trước khi đổi tên sang `input.css`) và đường dẫn tương đối `../assest/output.css` nằm ngoài thư mục `extensions/`. Khi nạp Unpacked Extension từ thư mục `extensions/`, trình duyệt chỉ truy cập được các tệp nằm bên trong `extensions/`.

---

### 3. Tài liệu & Lộ trình triển khai (`doc/` & Sơ đồ luồng)
- **`doc/EDA.docx`**: Tài liệu khảo sát tên class và cấu trúc cây DOM của khối bình luận người dùng trong `.shopee-product-comment-list`.
- **`review_summarizer_imple'mentation_flow.png`**: Lộ trình triển khai 6 giai đoạn:

| Bước | Hạng mục | Nội dung chính | Trạng thái |
| :--- | :--- | :--- | :--- |
| **0** | **Kiểm tra khả thi** | Khảo sát cấu trúc DOM, phân trang (`EDA.docx`, `selector.js`) | Đã xong |
| **1** | **Đọc review từ Shopee** | `extractReviewsFromDOM`, `collectReviews`, phân trang & `MOCK_REVIEWS` fallback (`content.js`, `popup.js`) | Đã xong |
| **2** | **Nối extension với backend** | Giao tiếp `POST /api/analyze` từ `popup.js` sang FastAPI (`127.0.0.1:8000`) | Đang làm (đã có phía Extension) |
| **3** | **ABSA và chọn 3 ưu, 3 nhược** | Thiết kế prompt trả JSON, kiểm tra schema phía Backend | Chưa làm |
| **4** | **Popup và lưu PostgreSQL** | Đã có UI tải/lỗi trên Popup; chờ tích hợp lưu kết quả vào PostgreSQL | Đang làm |
| **5** | **Đánh giá kiểu RBL** | Tập test, so sánh prompt *(Nếu chưa đạt F1 70% thì quay lại bước 3 chỉnh prompt)* | Chưa làm |