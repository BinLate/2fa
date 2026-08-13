# Plan — WordPress / WooCommerce + chung kho bot Telegram

> Website: WordPress + Flatsome + WooCommerce (`muabanquyen`)  
> Trạng thái: **chưa triển khai** — làm sau. Cập nhật: 2026-06-10.

Liên quan: [`PLAN.md`](PLAN.md) · [`PLAN-SUBSCRIPTION-FULFILLMENT.md`](PLAN-SUBSCRIPTION-FULFILLMENT.md)

---

## 1. Mục tiêu

- Thay **luồng đặt hàng / thanh toán / giao hàng** của WooCommerce bằng engine của bot MBQ.
- **Dùng chung một nguồn kho** (`stock`) và catalog (`products`, `categories`) với Telegram bot.
- WordPress chủ yếu là **storefront** (Flatsome UI); bot DB là **single source of truth**.

**Không làm:** để WooCommerce ghi trực tiếp vào `bot.db` / bảng `stock`.

---

## 2. Hiện trạng code bot (điểm cần biết trước khi code)

| Thành phần | File / bảng | Ghi chú |
|------------|-------------|---------|
| Catalog | `core/models/catalog.py` → `products`, `categories`, `packages` | Giá VND integer, đa ngôn ngữ VI/EN |
| Kho digital | `core/models/inventory.py` → `stock` | `AVAILABLE` → `RESERVED` → giao key |
| Đơn hàng | `core/models/orders.py` → `orders` | `id` = `MBQ...`, FK `user_id` → `users.telegram_id` |
| Khách | `core/models/wallet.py` → `users` | PK = `telegram_id` — **chưa có khách web** |
| Tạo đơn + giữ kho | `db_services.py` → `create_order_with_reservation()` | Reserve theo `ORDER_RESERVATION_MINUTES` |
| Thanh toán CK | `db_services.py` → `process_bank_order_payment()` + `watcher.py` | Memo VietQR = `order.id` |
| Giao hàng | `db_services.py` → `_fulfill_locked_order()` | Gửi `Stock.content` |
| Chiết khấu | `discount_service`, `quantity_deal_service`, `voucher_service` | Gắn Telegram user |
| API hiện có | `admin/routers/api.py` → `/bot/api/*` | **Chỉ admin đăng nhập** — không dùng cho WP |

---

## 3. Vì sao không “dùng chung database” kiểu WooCommerce đọc/ghi trực tiếp?

| | Bot MBQ | WooCommerce |
|---|---------|-------------|
| Engine DB | SQLite (VPS) / Postgres (kế hoạch) | MySQL/MariaDB (`wp_*`) |
| Mô hình kho | Từng key, reserve theo đơn, expire | Stock WC / plugin |
| Đơn | `orders` + audit + voucher reserve | `shop_order` |
| Thanh toán | IMAP watcher + VietQR | Payment gateway WC |

**Rủi ro nếu WP ghi thẳng `stock`:** oversell, bỏ qua reserve/expire, conflict với bot + watcher, không có voucher/deal/membership.

**Kết luận:** WP và bot **nói chuyện qua HTTPS API**; bot DB giữ quyền ghi kho và đơn.

---

## 4. Kiến trúc mục tiêu

```text
┌─────────────────────┐     HTTPS + API key      ┌──────────────────────────┐
│ WordPress/Flatsome  │ ───────────────────────► │ Store API (FastAPI mới)  │
│ (MySQL riêng)       │ ◄─────────────────────── │ /store/v1/*              │
└─────────────────────┘     catalog, order, QR     └────────────┬─────────────┘
                                                                │
                    ┌───────────────────────────────────────────┼───────────────┐
                    │                                           ▼               │
                    │  bot.db (Postgres khuyến nghị)                          │
                    │  products · stock · orders · users                        │
                    └───────────────────────────────────────────────────────────┘
                           ▲                    ▲                    ▲
                      Telegram bot         watcher.py          admin /bot
```

---

## 5. Hạ tầng (làm trước Phase 1)

| Việc | Lý do |
|------|--------|
| **Chuyển SQLite → PostgreSQL** trên VPS | Web + bot + watcher cùng ghi → SQLite dễ `database locked` |
| WordPress giữ MySQL local | Không merge 2 DB |
| HTTPS + firewall | Store API chỉ mở endpoint cần thiết |
| Secret `STORE_API_KEY` trong `.env` | WP gửi header `X-API-Key` hoặc HMAC |

---

## 6. Store API đề xuất (`/store/v1/`)

Tách hoàn toàn khỏi `/bot/api/*` (admin session). Router mới, ví dụ `store/routers/` hoặc `api/store/`.

### 6.1. Read — catalog

| Method | Path | Mô tả |
|--------|------|--------|
| `GET` | `/store/v1/catalog` | Categories + products active, giá, `stock_available` |
| `GET` | `/store/v1/products/{id}` | Chi tiết SP + mô tả VI/EN + tồn |
| `GET` | `/store/v1/products/{id}/stock` | Chỉ số lượng available (cache 5–15s được) |

Response gợi ý:

```json
{
  "id": 12,
  "name": "Netflix Premium 1 tháng",
  "name_vi": "...",
  "price": 89000,
  "stock_available": 47,
  "category_id": 3,
  "featured": true
}
```

### 6.2. Write — đơn hàng

| Method | Path | Mô tả |
|--------|------|--------|
| `POST` | `/store/v1/orders` | Tạo đơn, reserve kho, trả QR + hạn thanh toán |
| `GET` | `/store/v1/orders/{id}` | Trạng thái: `PENDING_PAYMENT` / `DELIVERED` / `EXPIRED` / `CANCELLED` |
| `POST` | `/store/v1/orders/{id}/cancel` | Hủy khi còn `PENDING_PAYMENT` |
| `GET` | `/store/v1/orders/{id}/delivery` | Lấy key sau khi paid — **token một lần** hoặc xác thực email |

Body `POST /orders` gợi ý:

```json
{
  "product_id": 12,
  "quantity": 1,
  "customer_email": "khach@example.com",
  "customer_name": "Nguyen Van A",
  "locale": "vi",
  "external_ref": "wc-12345"
}
```

Response:

```json
{
  "order_id": "MBQ46E0F041",
  "amount": 89000,
  "expires_at": "2026-06-10T12:05:00Z",
  "payment": {
    "method": "bank_transfer",
    "qr_url": "https://...",
    "memo": "MBQ46E0F041",
    "bank_name": "...",
    "account_number": "..."
  }
}
```

**Tái sử dụng code:** `create_order_with_reservation()`, `utils/qr_generator.py`, `process_bank_order_payment()` — watcher **không cần đổi** nếu memo vẫn là `order.id`.

### 6.3. Bảo mật

- API key trong header; rotate được.
- Rate limit (slowapi đã có trong admin).
- `delivery` endpoint: token ngẫu nhiên, hết hạn, chỉ sau `DELIVERED`.
- Không trả key trong webhook nếu chưa xác thực email (tùy policy).
- Log audit: IP, `external_ref`, channel `web`.

---

## 7. Mở rộng database (migration Alembic)

### 7.1. Bảng `users` / khách web

**Phương án A (đơn giản):** synthetic `telegram_id` âm cho user web (`-1`, `-2`, …) + cột `email`, `channel`.

**Phương án B (sạch hơn):** bảng `web_customers` + `orders.customer_id` nullable, `orders.channel` = `telegram` | `web`.

Cột đề xuất tối thiểu trên `orders`:

```text
channel              VARCHAR   -- 'telegram' | 'web'
customer_email       VARCHAR
customer_name        VARCHAR
external_ref         VARCHAR   -- WooCommerce order ID
delivery_token       VARCHAR   -- one-time xem key
delivery_token_expires_at  DateTime
```

### 7.2. Map sản phẩm WP ↔ bot

Trên WordPress (post meta hoặc SKU):

```text
mbq_product_id = 12
```

Master catalog: **admin bot** (`/bot/products`). WP không tự sửa giá/kho.

---

## 8. WordPress / Flatsome — hai hướng

### 8.1. Custom checkout (khuyến nghị cho MVP)

- Trang Flatsome + plugin PHP nhỏ (`mbq-store`) gọi Store API.
- Luồng: chọn SP → nhập email → `POST /orders` → hiển thị QR + countdown → poll `GET /orders/{id}` → redirect trang nhận key.
- **Tắt** checkout WC cho sản phẩm digital MBQ (hoặc dùng product type riêng).

**Ưu:** ít xung đột plugin WC, kiểm soát UX Flatsome.  
**Nhược:** không dùng cart WC đầy đủ (có thể thêm sau).

### 8.2. WooCommerce làm vỏ

- Product WC “ảo”: meta `mbq_product_id`, `_manage_stock = no`.
- Hook `woocommerce_checkout_order_processed` → gọi `POST /store/v1/orders`.
- Custom payment gateway “Chuyển khoản MBQ”: hiển thị QR từ API, poll trạng thái.
- Đơn WC chỉ là record tham chiếu; đơn thật = `orders` bot.

**Ưu:** giữ cart, coupon UI WC (nếu cần).  
**Nhược:** phức tạp, dễ conflict plugin thanh toán / stock.

---

## 9. Giao key trên web

| Cách | Ghi chú |
|------|---------|
| Trang thank-you + token | `GET /orders/{id}/delivery?token=...` sau `DELIVERED` |
| Email (wp_mail / SMTP) | Gửi link token, không gửi key plaintext trong DB WP |
| Telegram (nếu khách liên kết) | Phase sau — optional `telegram_id` link |

**Không làm:** lưu key lâu dài trong `wp_postmeta` hoặc order notes WC.

---

## 10. Tính năng bot — scope cho web (quyết định sau)

| Tính năng | MVP web | Ghi chú |
|-----------|---------|---------|
| Giá catalog | Có | Từ `products.price` |
| Quantity deals | Tùy chọn | Cần port logic `resolve_discount()` cho channel web |
| Membership tier | Tùy chọn | Cần `web_customers.total_spent` hoặc link Telegram |
| Voucher / scratch card | Phase sau | Hiện gắn `telegram_id` |
| Ví nội bộ | Phase sau | Hoặc chỉ Telegram |
| Subscription / Family | Xem [`PLAN-SUBSCRIPTION-FULFILLMENT.md`](PLAN-SUBSCRIPTION-FULFILLMENT.md) | Thu email trên web tự nhiên hơn bot |

**MVP khuyến nghị:** giá cố định + CK + giao key — không voucher/deal web ở v1.

---

## 11. Lộ trình triển khai

### Phase 0 — Hạ tầng (1–2 ngày)

- [ ] Postgres trên VPS, migrate `DATABASE_URL`
- [ ] `STORE_API_KEY` + CORS/origin cho domain WP
- [ ] Document endpoint nội bộ

### Phase 1 — Store API read-only (2–3 ngày)

- [ ] `GET /catalog`, `GET /products/{id}`
- [ ] Plugin WP: shortcode hiển thị danh sách SP từ API
- [ ] Map `mbq_product_id` trên vài SP thử

### Phase 2 — Đặt hàng + thanh toán (3–5 ngày)

- [ ] Migration `channel`, `customer_email`, `external_ref`
- [ ] `POST /orders` + user web
- [ ] Trang checkout Flatsome: QR + poll status
- [ ] Đơn web hiện trong admin `/bot/orders` (badge channel)

### Phase 3 — Giao hàng web (2–3 ngày)

- [ ] `delivery_token` + trang nhận key
- [ ] Email xác nhận (optional)
- [ ] Test E2E: web order → CK → watcher → key

### Phase 4 — Mở rộng (tùy)

- [ ] Cart nhiều SP
- [ ] Quantity deals cho web
- [ ] Liên kết tài khoản Telegram ↔ email
- [ ] WC gateway đầy đủ (nếu chọn hướng 8.2)

**Ước lượng MVP (Phase 0–3):** ~2 tuần part-time.

---

## 12. Admin & vận hành

- Catalog / import kho: vẫn **admin bot** — một nơi quản lý.
- Đơn Telegram + web: cùng bảng `orders`, lọc theo `channel`.
- Deploy: sau khi có Store API → restart `bot-admin` (và process chứa API nếu tách).
- Watcher: **bắt buộc chạy** — web CK cùng luồng memo `order.id`.

---

## 13. Việc không nên làm

- Plugin WC đọc/ghi trực tiếp bảng `stock` trong `bot.db`
- Duplicate kho trên WC rồi sync tay 2 chiều
- Expose `/bot/api/*` (admin) ra internet cho WP
- Bỏ `create_order_with_reservation()` — sẽ oversell khi web + Telegram cùng bán
- SQLite khi đã có traffic web đồng thời

---

## 14. File code dự kiến thêm/sửa (khi bắt đầu code)

| Việc | Gợi ý path |
|------|------------|
| Store router | `store/main.py` hoặc `api/store/router.py` |
| Mount vào app | `admin/main.py` hoặc app FastAPI riêng port 8001 |
| Services | `core/services/store_catalog_service.py`, `store_order_service.py` |
| Auth | `store/dependencies.py` → verify API key |
| Migration | `alembic/versions/..._order_web_channel.py` |
| WP plugin | Repo riêng hoặc `wordpress-plugin/mbq-store/` (không bắt buộc trong repo bot) |
| Test | `tests/test_store_api.py` |

---

## 15. Quyết định cần chốt trước khi code

1. **Custom checkout Flatsome** (8.1) hay **WooCommerce gateway** (8.2)?
2. **User web:** synthetic `telegram_id` âm hay bảng `web_customers`?
3. **MVP có quantity deal / voucher web không?**
4. **Domain API:** cùng subdomain `api.muabanquyen.com` hay path `/store/v1` trên admin host?
5. **Postgres:** migrate VPS trước hay song song Phase 1?

---

## 16. Tham chiếu nhanh luồng đơn bot (giữ nguyên cho web)

```text
POST /store/v1/orders
    → create_order_with_reservation()   # stock RESERVED
    → PENDING_PAYMENT + VietQR memo=order.id

Khách CK
    → watcher.py → process_bank_order_payment()
    → DELIVERED + keys

GET /store/v1/orders/{id}/delivery?token=...
    → trả Stock.content (đã sanitize)
```

Hết hạn / hủy: `expire_pending_orders()` / `cancel_order()` — web poll thấy `EXPIRED`, kho về `AVAILABLE`.
