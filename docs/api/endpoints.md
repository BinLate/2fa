# API Documentation

Ngày cập nhật: 2026-06-26
Base URL: `http://localhost:8000/api` (hoặc domain VPS của bạn)

---

## 🔐 Authentication

Tất cả các endpoint trong tài liệu này (ngoại trừ REST API của WordPress) đều yêu cầu Header xác thực API Key của cửa hàng:

```http
X-API-Key: <your_store_api_key>
```

Nếu thiếu hoặc sai API Key, hệ thống sẽ trả về lỗi:
- `401 Unauthorized`: API Key không hợp lệ.
- `500 Internal Server Error`: API Key chưa được cấu hình trên máy chủ.

---

## 🛍️ Catalog & Products

### GET /catalog
Lấy toàn bộ danh mục sản phẩm đang hoạt động cùng với thông tin sản phẩm và trạng thái tồn kho tương ứng.

**Request:**
- Headers: `X-API-Key: <key>`

**Response (200 OK):**
```json
{
  "categories": [
    {
      "id": 1,
      "name": "Thẻ Điện Thoại",
      "name_vi": "Thẻ Điện Thoại",
      "name_en": "Mobile Cards",
      "products": [
        {
          "id": 10,
          "name": "Thẻ Viettel 100k",
          "name_vi": "Thẻ Viettel 100k",
          "name_en": "Viettel Card 100k",
          "price": 97000,
          "stock_available": 15,
          "category_id": 1,
          "category_name": "Thẻ Điện Thoại",
          "featured": true,
          "image_url": "https://example.com/viettel-100k.png",
          "description": "Thẻ cào Viettel mệnh giá 100,000đ",
          "description_vi": "Thẻ cào Viettel mệnh giá 100,000đ",
          "description_en": "Viettel scratch card 100,000 VND"
        }
      ]
    }
  ]
}
```

---

### GET /products/{product_id}
Lấy thông tin chi tiết của một sản phẩm cụ thể bằng ID.

**Request:**
- Path Parameters:
  - `product_id` (integer, required): ID của sản phẩm.
- Headers: `X-API-Key: <key>`

**Response (200 OK):**
```json
{
  "id": 10,
  "name": "Thẻ Viettel 100k",
  "name_vi": "Thẻ Viettel 100k",
  "name_en": "Viettel Card 100k",
  "price": 97000,
  "stock_available": 15,
  "category_id": 1,
  "category_name": "Thẻ Điện Thoại",
  "featured": true,
  "image_url": "https://example.com/viettel-100k.png",
  "description": "Thẻ cào Viettel mệnh giá 100,000đ",
  "description_vi": "Thẻ cào Viettel mệnh giá 100,000đ",
  "description_en": "Viettel scratch card 100,000 VND"
}
```

**Errors:**
- `404 Not Found`: Sản phẩm không tồn tại hoặc đã bị khóa/ngừng hoạt động.

---

### GET /products/{product_id}/stock
Kiểm tra số lượng tồn kho khả dụng hiện tại của một sản phẩm.
*Lưu ý: Endpoint này trả về header `Cache-Control: public, max-age=15` để giảm tải hệ thống.*

**Request:**
- Path Parameters:
  - `product_id` (integer, required): ID của sản phẩm.
- Headers: `X-API-Key: <key>`

**Response (200 OK):**
```json
{
  "product_id": 10,
  "stock_available": 15
}
```

**Errors:**
- `404 Not Found`: Sản phẩm không tồn tại hoặc đã bị khóa/ngừng hoạt động.

---

## 🛒 Orders (Đơn hàng)

### POST /orders
Tạo một đơn hàng mới từ website WooCommerce.
*Giới hạn tần suất: Tối đa 3 requests / 1 phút mỗi khách hàng (được cấu hình qua Cloudflare Turnstile hoặc rate-limiter nội bộ).*

**Request:**
- Headers: `X-API-Key: <key>`
- Body (JSON):
```json
{
  "product_id": 10,
  "quantity": 1,
  "customer_email": "customer@example.com",
  "customer_name": "Nguyễn Văn A",
  "locale": "vi",
  "turnstile_token": "0.XT....",
  "zalo_phone": "0987654321",
  "telegram_username": "nguyenvana"
}
```
*Ghi chú:*
- `turnstile_token` (string, optional): Mã captcha Turnstile để phòng chống spam đơn hàng.
- `zalo_phone` (string, optional): Số điện thoại Zalo để liên hệ nếu đơn cần admin xử lý thủ công.
- `telegram_username` (string, optional): Username Telegram để liên hệ.

**Response (201 Created):**
```json
{
  "order_id": "ORD-20260626-XYZ123",
  "amount": 97000,
  "product_name": "Thẻ Viettel 100k",
  "quantity": 1,
  "expires_at": "2026-06-26T14:40:00Z",
  "reservation_minutes": 15,
  "payment": {
    "method": "vietqr",
    "qr_url": "https://img.vietqr.io/image/mb-123456789-compact2.jpg?amount=97000&addInfo=ORD20260626XYZ123",
    "memo": "ORD20260626XYZ123",
    "bank_name": "MBBank",
    "account_number": "123456789",
    "account_name": "CONG TY MBQ"
  },
  "auto_cancelled_order_id": null
}
```
*Ghi chú:*
- Nếu khách hàng có đơn hàng `PENDING_PAYMENT` trước đó, hệ thống sẽ tự động hủy đơn cũ và trả về mã đơn bị hủy trong `auto_cancelled_order_id`.

**Errors:**
- `400 Bad Request`:
  - Khách hàng đang trong thời gian phạt Cooldown do có quá nhiều đơn hàng hết hạn liên tiếp.
  - Hết hàng trong kho.
- `422 Unprocessable Entity`: Dữ liệu đầu vào không hợp lệ (ví dụ: email sai định dạng, số lượng < 1).

---

### GET /orders/{order_id}
Lấy thông tin và trạng thái hiện tại của đơn hàng.

**Request:**
- Path Parameters:
  - `order_id` (string, required): Mã đơn hàng cần kiểm tra.
- Headers: `X-API-Key: <key>`

**Response (200 OK):**
```json
{
  "order_id": "ORD-20260626-XYZ123",
  "status": "PENDING_PAYMENT",
  "amount": 97000,
  "product_name": "Thẻ Viettel 100k",
  "quantity": 1,
  "expires_at": "2026-06-26T14:40:00Z",
  "created_at": "2026-06-26T14:25:00Z",
  "paid_at": null,
  "delivered_at": null,
  "delivery_token": null
}
```
*Ghi chú:*
- `status` có thể mang giá trị: `PENDING_PAYMENT`, `PAID`, `DELIVERED`, `EXPIRED`, `CANCELLED`.
- Khi đơn hàng chuyển sang `DELIVERED`, `delivery_token` sẽ được cấp để truy xuất mã thẻ an toàn.

**Errors:**
- `404 Not Found`: Đơn hàng không tồn tại.

---

### POST /orders/{order_id}/cancel
Yêu cầu hủy thủ công một đơn hàng đang chờ thanh toán.
*Giới hạn tần suất: Tối đa 5 requests / 1 phút.*

**Request:**
- Path Parameters:
  - `order_id` (string, required): Mã đơn hàng cần hủy.
- Headers: `X-API-Key: <key>`
- Body (JSON, optional):
```json
{
  "email": "customer@example.com"
}
```
*Ghi chú:* Nếu cung cấp `email`, hệ thống sẽ kiểm tra xem đơn hàng có thuộc sở hữu của email này hay không trước khi hủy.

**Response (200 OK):**
```json
{
  "order_id": "ORD-20260626-XYZ123",
  "status": "CANCELLED"
}
```

**Errors:**
- `403 Forbidden`: Email cung cấp không khớp với chủ đơn hàng.
- `404 Not Found`: Đơn hàng không tồn tại hoặc trạng thái đơn hàng không cho phép hủy.

---

### GET /orders/{order_id}/delivery
Lấy trực tiếp thông tin mã thẻ/key của đơn hàng đã được giao nhận bằng mã bảo mật `delivery_token`.
*Cảnh báo: Endpoint này chỉ nên được sử dụng ở luồng chuyển hướng ngay sau khi thanh toán thành công.*

**Request:**
- Path Parameters:
  - `order_id` (string, required): Mã đơn hàng.
- Query Parameters:
  - `token` (string, required): Mã `delivery_token` được lấy từ trạng thái đơn hàng.
- Headers: `X-API-Key: <key>`

**Response (200 OK):**
```json
{
  "order_id": "ORD-20260626-XYZ123",
  "product_name": "Thẻ Viettel 100k",
  "keys": [
    "SERI: 10001234567 | PIN: 9876543210123"
  ],
  "delivered_at": "2026-06-26T14:26:00Z"
}
```

**Errors:**
- `403 Forbidden`: Token không hợp lệ, đơn hàng chưa giao, hoặc token đã hết hạn.

---

### GET /orders/{order_id}/delivery-secure
Lấy thông tin mã thẻ/key của đơn hàng theo phương pháp bảo mật (đối chiếu danh sách email đăng nhập của khách hàng).
*Khuyên dùng: Sử dụng trong giao diện "My Account" (Sản phẩm đã mua) trên WooCommerce.*

**Request:**
- Path Parameters:
  - `order_id` (string, required): Mã đơn hàng.
- Query Parameters:
  - `emails` (string, required): Danh sách email của khách hàng được phân tách bằng dấu phẩy (ví dụ: `customer@example.com,alias@example.com`).
- Headers: `X-API-Key: <key>`

**Response (200 OK):**
```json
{
  "order_id": "ORD-20260626-XYZ123",
  "product_name": "Thẻ Viettel 100k",
  "product_id": 10,
  "keys": [
    "SERI: 10001234567 | PIN: 9876543210123"
  ],
  "delivered_at": "2026-06-26T14:26:00Z",
  "amount": 97000,
  "quantity": 1
}
```

**Errors:**
- `403 Forbidden`: Đơn hàng không tồn tại, chưa hoàn thành giao hàng, hoặc email truy cập không khớp với email đặt hàng.

---

### GET /customer/orders
Lấy lịch sử tất cả các đơn hàng thuộc về danh sách email của khách hàng.

**Request:**
- Query Parameters:
  - `emails` (string, required): Danh sách email được phân tách bằng dấu phẩy (ví dụ: `customer@example.com,customer.billing@example.com`).
- Headers: `X-API-Key: <key>`

**Response (200 OK):**
```json
{
  "orders": [
    {
      "order_id": "ORD-20260626-XYZ123",
      "status": "DELIVERED",
      "amount": 97000,
      "product_name": "Thẻ Viettel 100k",
      "product_id": 10,
      "quantity": 1,
      "created_at": "2026-06-26T14:25:00Z",
      "paid_at": "2026-06-26T14:26:00Z",
      "delivered_at": "2026-06-26T14:26:00Z"
    }
  ],
  "total": 1
}
```

---

## 🌐 WordPress Integration API

### GET /wp-json/mbq/v1/nonce
Endpoint REST API trên WordPress dùng để lấy chuỗi nonce động mới nhất phục vụ cho các form giao dịch nhạy cảm ở phía Client-side (nhằm tránh cache trang của các plugin WP Rocket, LiteSpeed Cache).
*Lưu ý: Endpoint này không yêu cầu header X-API-Key.*

**Request:**
- Endpoint: `https://your-woocommerce.com/wp-json/mbq/v1/nonce`
- Method: `GET`

**Response (200 OK):**
```json
{
  "nonce": "ab345cd123"
}
```
