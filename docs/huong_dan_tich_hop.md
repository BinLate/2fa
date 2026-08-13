# HƯỚNG DẪN QUẢN TRỊ VÀ VẬN HÀNH SẢN PHẨM GOOGLE ONE (CDK GEMINI PRO)
*(Liên kết tự động sinh CDK key giữa Bot Telegram cổng 8000 và Gemini MBQ cổng 8001)*

Tài liệu này hướng dẫn chi tiết cách bạn quản lý, cấu hình và chủ động tắt/bật bán (đưa tồn kho về 0) sản phẩm **ID = 41** trực tiếp trên trang quản trị Admin Panel của bạn mà không cần đụng vào code.

---

## 1. Cơ chế hoạt động của sản phẩm tự động bán CDK
Sản phẩm này hoạt động theo cơ chế **Just-In-Time (Mua đến đâu sinh key đến đó)**:
- Bạn **không cần nạp sẵn key** vào kho.
- Khi khách hàng mua và thanh toán thành công trên Bot $\rightarrow$ Bot tự gọi API nội bộ sang cổng `8001` $\rightarrow$ Hệ thống tự sinh 1 mã CDK ngẫu nhiên mới $\rightarrow$ Giao trực tiếp mã này cho khách hàng kèm hướng dẫn kích hoạt.

---

## 2. Giải thích các thông số cấu hình tại trang sửa sản phẩm 41 (`/bot/products/41/edit`)

Nhìn vào giao diện sửa sản phẩm của bạn, đây là ý nghĩa và cách thiết lập các thông số:

### ⚙️ Phần "Nguồn hàng" & "Ưu tiên giao hàng"
* **Nguồn hàng**: Chọn `Kho nội bộ + API` hoặc `Chỉ API`.
  - Khuyên dùng: `Kho nội bộ + API`.
* **Ưu tiên giao hàng**: Chọn `Ưu tiên kho nội bộ trước`. Nếu kho nội bộ của bạn rỗng (không nạp key), hệ thống sẽ tự động gọi sang API `Gemini MBQ` để lấy key.

### ⚙️ Bảng "Cấu hình nguồn API"
Bảng này quyết định cách Bot kết nối với API sinh key của bạn:
* **Nhà cung cấp**: Chọn **`Gemini MBQ`** (đã được liên kết).
* **PLAN ID**: Điền **`cdk_key`** (mã nhận diện gói hàng, không được sửa đổi).
* **Nút BẬT** (Trạng thái hoạt động của nguồn API):
  - **`Bật`**: Cho phép Bot kết nối và lấy key từ API.
  - **`Tắt`**: Tắt kết nối API.
* **Nút AUTO** (Tự động mua khi có đơn hàng):
  - **`Bật`**: Hệ thống tự động sinh key và giao ngay cho khách sau khi họ thanh toán.
  - **`Tắt`**: Khi khách thanh toán, hệ thống sẽ không tự động giao key mà tạo đơn hàng ở trạng thái **Chờ duyệt** để Admin tự kiểm tra và duyệt thủ công.
* **Nút KHO** (Đồng bộ tồn kho):
  - **`Bật`**: Bot sẽ hiển thị tồn kho theo số lượng trả về từ Adapter (đang đặt mặc định là `9999` để luôn báo còn hàng).
  - **`Tắt`**: Hệ thống bỏ qua việc đồng bộ từ API và gán cứng tồn kho hiển thị là **`999`** chiếc.
* **Nút GIÁ VỐN API** (Đồng bộ giá vốn):
  - Nên để **`Tắt`** vì đây là hệ thống tự sinh key nội bộ, không có giá vốn từ nhà cung cấp bên thứ ba.

---

## 3. Cách ĐƯA TỒN KHO VỀ 0 (Tắt bán) khi hệ thống gặp lỗi hoặc bảo trì

Khi hệ thống gặp lỗi hoặc bạn muốn tạm dừng bán sản phẩm này ngay lập tức để khách hàng không thể mua được nữa, bạn có **2 cách cực kỳ nhanh chóng** sau:

### 🔴 Cách 1: TẮT cấu hình nguồn API (Khuyên dùng)
1. Tại bảng **Cấu hình nguồn API**, chuyển cột **BẬT** từ **`Bật`** sang **`Tắt`**.
2. Nhấn nút **Lưu** ở góc dưới.
   - *Kết quả*: Tồn kho sản phẩm 41 trên Bot Telegram sẽ lập tức chuyển về **`0`** (Hết hàng) và nút Mua hàng sẽ bị vô hiệu hóa. Khách hàng không thể đặt đơn mới.

### 🔴 Cách 2: Chuyển nguồn hàng về Kho nội bộ rỗng
1. Tại ô chọn **Nguồn hàng**, chuyển từ `Kho nội bộ + API` thành **`Chỉ kho nội bộ`**.
2. Nhấn nút **Lưu**.
   - *Kết quả*: Vì kho nội bộ của sản phẩm 41 này không được bạn nạp sẵn key nào, Bot sẽ báo **Hết hàng** ngay lập tức.

---

## 4. Tùy chỉnh tin nhắn giao hàng cho khách hàng

Bạn có thể chỉnh sửa nội dung tin nhắn mà khách hàng nhận được khi mua key thành công bằng cách:
1. Nhấn vào nút **"Tùy chỉnh tin giao hàng cho nguồn này"** ngay dưới dòng cấu hình API.
2. Nhập nội dung hướng dẫn của bạn.
   - *Lưu ý*: Sử dụng biến **`{{key}}`** tại nơi bạn muốn hiển thị mã CDK.
   - *Mẫu tin nhắn đề xuất*:
     ```text
     🔑 Mã kích hoạt của bạn:
     {{key}}

     📋 Hướng dẫn sử dụng:
     1️⃣ Truy cập: https://vnaz.net
     2️⃣ Nhập mã CDK vào ô kích hoạt
     3️⃣ Điền thông tin Gmail cần nâng cấp
     4️⃣ Hệ thống sẽ tự động xử lý cho bạn

     ⏰ Mã CDK chỉ sử dụng được 1 lần.
     💬 Nếu cần hỗ trợ, liên hệ admin.
     ```
3. Nhấn **Lưu** để áp dụng.
