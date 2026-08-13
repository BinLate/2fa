# Plan — Giao hàng dịch vụ Family / Subscription

> Office 365, Google Drive, YouTube Premium, Gemini Pro, Gemini Ultra  
> Trạng thái: **chưa triển khai** — làm sau. Cập nhật: 2026-06-13.

Liên quan: [`PLAN.md`](PLAN.md) · code hiện tại: `delivery_type` trên `products` (admin) nhưng **bot chưa dùng** — mọi đơn vẫn giao `Stock.content` (key) qua `db_services.fulfill_order`.

---

## 1. Bài toán

| Loại SP | Khách cung cấp | Shop làm | Bot gửi sau khi xong |
|---------|----------------|----------|----------------------|
| **Office 365** (Family/Premium) | Email **Microsoft** | Mời vào Microsoft Family / gửi link lời mời | Link + HD chấp nhận lời mời Office |
| **Google Drive** (Family) | **Gmail** | Mời vào Google Family | Template HD Google (link family + 2 lỗi thường gặp) |
| **YouTube Premium** (Family) | **Gmail** | Mời family YouTube/Google | Template tương tự Google Family (có thể dùng chung family Google) |
| **Gemini Pro** | Gmail (+ có thể cần đăng nhập) | Admin xử lý tay / kích hoạt | Xác nhận hoàn tất + HD |
| **Gemini Ultra** | Gmail (+ có thể cần đăng nhập) | Admin xử lý tay | Giống Gemini Pro, template riêng nếu cần |

**Khác key tự động:** không giao chuỗi trong kho ngay; cần **thu thông tin khách → admin mời/xử lý → bot gửi hướng dẫn**.

---

## 2. Hiện trạng code (để biết sửa đâu)

| Thành phần | File | Ghi chú |
|------------|------|---------|
| Loại bàn giao (metadata) | `core/models/catalog.py` → `Product.delivery_type` | `KEY`, `ACCOUNT`, `SUBSCRIPTION`, `SERVICE` — admin đã chọn được |
| Fulfillment tự động | `db_services.py` → `_fulfill_locked_order` | Luôn `DELIVERED` + gửi `Stock.content` |
| Tin nhắn thành công | `handlers/order_success.py` | In danh sách `<code>keys</code>` |
| Template tin nhắn | `message_templates` + `message_template_service` | Dùng cho text cố định (i18n VI/EN) |
| Đơn hàng | `core/models/orders.py` | Chưa có `customer_email`, `fulfillment_notes`, trạng thái chờ giao |

---

## 3. Mô hình nghiệp vụ đề xuất

### 3.1. Trạng thái đơn (mở rộng)

```text
PENDING_PAYMENT
    → (thanh toán OK)
PAID hoặc AWAITING_FULFILLMENT    ← SP subscription: chờ admin
    → admin "Hoàn tất giao hàng"
DELIVERED                         ← bot gửi template HD cho khách
```

Hoặc giữ `PAID` + flag `fulfillment_status = pending|done` để ít đụng enum status cũ.

### 3.2. Luồng bot (mục tiêu)

```text
Chọn SP (SUBSCRIPTION/SERVICE)
    → Bot hiển thị mô tả + yêu cầu thông tin
    → FSM: thu email (validate format)
    → (Gemini only) hướng dẫn liên hệ admin DM — xem mục 6
    → Tạo đơn + thanh toán (QR / ví)
    → Sau thanh toán: "Đã nhận đơn, admin sẽ mời trong X phút"
    → Notify admin (Telegram + panel)
    → Admin mời family / xử lý Gemini
    → Admin bấm "Giao xong" → bot gửi template theo product
```

### 3.3. Profile sản phẩm (config)

Thêm **`fulfillment_profile`** (enum hoặc bảng `product_fulfillment_configs`):

| `fulfillment_profile` | Thu thông tin | Template sau giao | Auto stock? |
|----------------------|---------------|-------------------|-------------|
| `OFFICE365_FAMILY` | `microsoft_email` | `tpl_office365_invite` | Slot ảo / không trừ key |
| `GOOGLE_FAMILY` | `gmail` | `tpl_google_family_invite` | Slot ảo |
| `YOUTUBE_FAMILY` | `gmail` | `tpl_youtube_family_invite` (hoặc dùng chung Google) | Slot ảo |
| `GEMINI_PRO` | `gmail` (+ admin DM nếu cần pass) | `tpl_gemini_pro_done` | Không kho |
| `GEMINI_ULTRA` | `gmail` (+ admin DM) | `tpl_gemini_ultra_done` | Không kho |
| `KEY` (mặc định) | — | `order_success` hiện tại | Trừ stock như cũ |

Gắn profile qua admin: dropdown trên form sản phẩm hoặc map `product_id` → profile.

---

## 4. Database (draft migration)

```text
orders:
  + customer_contact_email     VARCHAR   -- email Microsoft hoặc Gmail khách gửi
  + customer_contact_type      VARCHAR   -- MICROSOFT | GMAIL
  + fulfillment_status         VARCHAR   -- pending | processing | done | cancelled
  + fulfillment_profile        VARCHAR   -- snapshot lúc tạo đơn
  + fulfilled_by_admin_id        BIGINT    nullable
  + fulfillment_completed_at   DATETIME  nullable

product_fulfillment_configs (optional, 1-1 product):
  product_id                   FK
  profile                      VARCHAR
  intake_prompt_vi / intake_prompt_en   TEXT
  post_delivery_template_key   VARCHAR   -- key trong message_templates
  requires_admin_dm            BOOLEAN   -- Gemini
  admin_dm_hint_vi / en        TEXT

order_fulfillment_events (audit):
  order_id, admin_id, action, note, created_at
```

**Kho:** SP family có thể dùng `inventory_source = MANUAL` + 1 stock placeholder `"SERVICE_SLOT"` hoặc **bỏ reserve stock** khi `delivery_type IN (SUBSCRIPTION, SERVICE)` — tránh block đơn vì thiếu key giả.

---

## 5. Template tin nhắn (nội dung mẫu lưu sẵn)

### 5.1. Google Drive / YouTube (Family Google — dùng chung hoặc tách key)

**Sau khi admin mời xong**, bot gửi (VI):

```text
Bạn vào link này, nhấn Xem lời mời (View invitation) rồi tham gia family là xong nhé:

https://myaccount.google.com/family/details

HƯỚNG DẪN 2 LỖI THƯỜNG GẶP:

- Đang ở trong family khác: tại https://myaccount.google.com/family/details kéo xuống dưới cùng → RỜI NHÓM GIA ĐÌNH → vào lại link trên để tham gia nhóm shop.

- Sai quốc gia: vào https://payments.google.com/gp/w/home/settings → tab Settings → kéo xuống → ĐÓNG HỒ SƠ THANH TOÁN → vào lại link family ở trên.
```

Lưu vào `message_templates` key đề xuất: `fulfillment.google_family_post_invite` (+ bản EN).

### 5.2. Office 365

Key: `fulfillment.office365_post_invite` — cần viết nội dung: link Microsoft account / family, bước Accept invitation (bổ sung khi làm).

### 5.3. Gemini Pro / Ultra

**Trước thanh toán hoặc ngay sau thanh toán** (bot):

```text
Đơn {order_id} — SP cần xử lý riêng.
Vui lòng nhắn TRỰC TIẾP (DM) admin @{admin_username} kèm:
• Mã đơn: {order_id}
• Gmail đã đăng ký: {gmail}

⚠️ Không gửi mật khẩu trong group chat. Chỉ trao đổi nhạy cảm qua DM admin nếu bắt buộc.
```

Key: `fulfillment.gemini_contact_admin` · `requires_admin_dm = true`.

**Sau admin xử lý xong:** `fulfillment.gemini_pro_done` / `fulfillment.gemini_ultra_done`.

---

## 6. Bảo mật — Gemini (mật khẩu Gmail)

| Cách | Khuyến nghị |
|------|-------------|
| Khách gửi pass trong group bot | ❌ Không |
| Khách DM admin + mã đơn | ⚠️ Tạm được, ghi trong plan |
| Bot thu pass trong chat (lưu DB mã hóa) | ⚠️ Phase 2+, cần audit + xóa tin |
| Không thu pass — OAuth / khách tự bật quyền | ✅ Ưu tiên dài hạn |

**Phase 1:** chỉ thu **Gmail** qua bot; phần nhạy cảm → **DM admin** + `requires_admin_dm`.

---

## 7. Admin panel

| Màn hình | Chức năng |
|----------|-----------|
| **Đơn chờ giao** | Filter `fulfillment_status=pending`, cột email khách, SP, thời gian |
| **Chi tiết đơn** | Email Microsoft/Gmail, nút **Copy email**, **Đã mời / Giao xong**, ghi chú nội bộ |
| **Sản phẩm** | Chọn `fulfillment_profile`, preview template, bật `requires_admin_dm` |
| **Message templates** | CRUD template fulfillment (VI/EN) |

Notify admin khi có đơn mới pending: Telegram tới `ADMIN_TELEGRAM_IDS` (reuse pattern stock alert).

---

## 8. Bot — file cần sửa (khi code)

| File | Việc |
|------|------|
| `handlers/buy.py` | FSM thu email trước/sau tạo đơn theo profile |
| `handlers/payment.py` | Sau thanh toán: không gọi fulfill key nếu subscription |
| `db_services.py` | Nhánh fulfill: subscription → `AWAITING_FULFILLMENT`, không trừ stock key |
| `handlers/order_success.py` | Template khác khi không có keys |
| `handlers/fulfillment.py` (mới) | Handler admin DM / callback (optional) |
| `admin/routers/orders.py` | API/page hoàn tất giao hàng |
| `core/services/fulfillment_service.py` (mới) | Logic profile, validate email, gửi template |
| `alembic/versions/...` | Cột orders + bảng config |
| `admin/i18n.py` | Label profile, trạng thái |

---

## 9. Validate email (bot)

| Profile | Rule |
|---------|------|
| `OFFICE365_FAMILY` | Email hợp lệ; gợi ý @outlook.com, @hotmail.com, @live.com hoặc bất kỳ (Microsoft account) |
| `GOOGLE_*`, `GEMINI_*` | Gmail format; có thể cảnh báo nếu không @gmail.com |
| Chung | Trim, lowercase, regex cơ bản, từ chối URL/script |

---

## 10. Lộ trình triển khai (đề xuất)

### Phase 0 — Vận hành tay (không code, làm ngay được)

- [ ] Tạo SP admin: `delivery_type = SUBSCRIPTION` hoặc `SERVICE`
- [ ] Mô tả SP ghi rõ: gửi email gì, liên hệ admin sau thanh toán
- [ ] Kho: slot placeholder hoặc số lượng slot family thủ công
- [ ] Copy template Google (mục 5.1) gửi tay sau khi mời
- [ ] Gemini: nhắn DM admin + mã đơn

### Phase 1 — Google Family pilot (1 SP: Drive hoặc YouTube)

- [ ] Migration cột `orders.customer_contact_email`, `fulfillment_status`
- [ ] Bot FSM thu Gmail
- [ ] Sau thanh toán → pending, notify admin
- [ ] Admin nút "Giao xong" → bot gửi template Google
- [ ] Test E2E: mua → CK → admin complete → khách nhận HD

### Phase 2 — Office 365

- [ ] Profile `OFFICE365_FAMILY`, thu email Microsoft
- [ ] Template Office riêng

### Phase 3 — YouTube (nếu tách template khỏi Google Drive)

- [ ] Profile `YOUTUBE_FAMILY` hoặc dùng chung Google template

### Phase 4 — Gemini Pro & Ultra

- [ ] `requires_admin_dm`, template liên hệ admin
- [ ] Queue đơn Gemini trên admin
- [ ] (Tùy chọn) thu pass an toàn — đánh giá lại sau Phase 1–3

### Phase 5 — Polish

- [ ] SLA nhắc admin (đơn pending > 30 phút)
- [ ] Khách xem trạng thái đơn "Đang chờ mời"
- [ ] i18n EN đầy đủ

---

## 11. Test checklist (khi làm xong)

- [ ] Mua Office / Google / YT / Gemini — đúng câu hỏi thu email
- [ ] Thanh toán ví + VietQR — đơn vào pending, không giao key giả
- [ ] Admin complete → khách nhận đúng template
- [ ] Đơn hủy/hết hạn — không mất email đã thu (audit)
- [ ] Gemini — không hiện field mật khẩu trên bot (chỉ hint DM admin)
- [ ] Khách banned / đơn refund — xử lý fulfillment pending

---

## 12. Mapping sản phẩm shop (điền khi setup)

| Tên SP (shop) | `product_id` | Profile | Ghi chú |
|---------------|--------------|---------|---------|
| Office 365 … | | `OFFICE365_FAMILY` | |
| Google Drive … | | `GOOGLE_FAMILY` | |
| YouTube Premium … | | `YOUTUBE_FAMILY` hoặc `GOOGLE_FAMILY` | Cùng hệ Google Family |
| Gemini Pro | | `GEMINI_PRO` | Admin DM |
| Gemini Ultra | | `GEMINI_ULTRA` | Admin DM |

---

## 13. Ghi chú / quyết định chưa chốt

- [ ] YouTube dùng chung template Google Family hay tách riêng?
- [ ] Thu email **trước** thanh toán hay **sau** thanh toán?
- [ ] Family slot: đếm bằng stock ảo hay bảng `family_slots` riêng?
- [ ] Gemini: có thu mật khẩu trong bot Phase 4 không, hay mãi DM admin?

---

*Tài liệu này chỉ là plan — chưa có migration hay handler tương ứng trong repo.*
