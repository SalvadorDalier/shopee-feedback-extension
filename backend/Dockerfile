# Base image Python 3.11 slim tương thích tốt với PyTorch và NLP libraries
FROM python:3.11-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Thiết lập biến môi trường Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Cài đặt các gói hệ thống cần thiết
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy file requirements trước để tận dụng Docker layer cache
COPY requirements.txt .

# Cài đặt các thư viện Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn backend vào container (/app)
COPY . .

# Mở cổng 8000
EXPOSE 8000

# Lệnh khởi chạy server FastAPI với Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
