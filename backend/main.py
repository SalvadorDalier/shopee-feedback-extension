from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from analyze_review import analyze_reviews as run_absa   # <-- THÊM DÒNG NÀY
# 1. Khởi tạo ứng dụng FastAPI
app = FastAPI(title="Shopee Review API")

# 2. Cấu hình CORS để Chrome Extension có thể gọi được API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Cho phép tất cả các nguồn (kể cả chrome-extension://)
    allow_credentials=True,
    allow_methods=["*"],       # Cho phép các phương thức (GET, POST, ...)
    allow_headers=["*"],       # Cho phép các header
)

# 3. Định nghĩa cấu trúc dữ liệu mà Extension gửi lên
class AnalyzeRequest(BaseModel):
    product_url: str = ""
    reviews: List[str] = []

# 4. Trang chủ đơn giản để bạn mở trên trình duyệt kiểm tra xem server đã chạy chưa
@app.get("/")
def home():
    return {
        "status": "online",
        "message": "Server FastAPI đang chạy thành công! Sẵn sàng nhận request từ Extension."
    }

# 5. API chính nhận đánh giá từ Extension và trả về Top 3 Ưu/Nhược điểm
@app.post("/api/analyze")
def analyze_reviews(data: AnalyzeRequest):
    total = len(data.reviews)
    print(f">> [FastAPI] Đã nhận {total} review từ sản phẩm: {data.product_url}")
    if total == 0:
        return {"total_reviews": 0, "top_positive": [], "top_negative": []}

    result = run_absa(data.reviews)
    return {"total_reviews": total, **result}
    
# 6. Cho phép chạy file trực tiếp bằng lệnh: python main.py
if __name__ == "__main__":
    import uvicorn
    print(">> Đang khởi động server tại http://127.0.0.1:8000 ...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

