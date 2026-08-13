# Kế hoạch phát triển — MBQ Telegram Shop

> Ghi chú cho các hướng làm tiếp. Cập nhật: 2026-06-13.

## Đã xong gần đây

- [x] Khuyến mãi per-product (scope, override giá/bonus, label VI/EN)
- [x] Migration Alembic `f6a7b8c9d0e1` → `h8i9j0k1l2m3`
- [x] Topbar admin: profile dropdown, mobile search rộng hơn
- [x] Deploy: `1. Push-Git.bat`, `2. Deploy-VPS.bat`, SSH key (`0. Setup-SSH-VPS.bat`)
- [x] `.gitignore` bổ sung deploy / DB / secrets

---

## Ưu tiên đề xuất (mai có thể chọn 1–2 mục)

> **Plan chi tiết — dịch vụ Family (Office 365, Google Drive, YouTube, Gemini Pro/Ultra):**  
> [`PLAN-SUBSCRIPTION-FULFILLMENT.md`](PLAN-SUBSCRIPTION-FULFILLMENT.md)  
> **Plan chi tiết — WordPress / WooCommerce + chung kho bot:**  
> [`PLAN-WOOCOMMERCE-INTEGRATION.md`](PLAN-WOOCOMMERCE-INTEGRATION.md)

### P1 — Vận hành (nên làm trước)

| # | Ý tưởng | Mô tả ngắn | File / vùng code liên quan |
|---|---------|------------|----------------------------|
| 1 | **Watcher health dashboard** | Admin: lần poll IMAP cuối, UID kẹt, email lỗi parse | `watcher.py`, `watcher_state.json`, admin router mới |
| 2 | **Cảnh báo Telegram cho admin** | Kho thấp, watcher lỗi auth, đơn pending quá lâu | `core/services/stock_alerts.py`, `ADMIN_TELEGRAM_IDS` |
| 3 | **GitHub Actions auto-deploy** | Push `master` → SSH VPS + alembic + restart | `.github/workflows/deploy.yml` |

### P2 — Doanh thu / giữ khách

| # | Ý tưởng | Mô tả ngắn | Ghi chú |
|---|---------|------------|---------|
| **4b** | **Giao hàng subscription (Family)** | Office 365, Google/YouTube Family, Gemini | Xem [`PLAN-SUBSCRIPTION-FULFILLMENT.md`](PLAN-SUBSCRIPTION-FULFILLMENT.md) |
| 4 | **Mã giới thiệu (referral)** | Link invite → khách mới mua → cộng ví người giới thiệu | DB mới + hook `fulfill_order` |
| 5 | **Nhắc hàng về** | Hết kho → đăng ký nhắc → import kho → bot gửi tin | Bảng waitlist + notify khi stock AVAILABLE |
| 6 | **Mua lại nhanh** | Từ lịch sử đơn, 1 nút mua lại cùng SP/số lượng | `handlers/buy.py`, `handlers/orders.py` |
| 7 | **Flash sale / countdown** | Deal có start/end → badge + đếm ngược trên catalog | `quantity_deal_service`, bot UI |
| **8b** | **WordPress / WooCommerce storefront** | Web Flatsome + API bot, chung kho | Xem [`PLAN-WOOCOMMERCE-INTEGRATION.md`](PLAN-WOOCOMMERCE-INTEGRATION.md) |

### P3 — Trải nghiệm bot

| # | Ý tưởng | Mô tả ngắn |
|---|---------|------------|
| 8 | **Deep link sản phẩm** | `t.me/bot?start=product_123` mở thẳng SP |
| 9 | **FAQ / hỗ trợ** | Menu hướng dẫn CK, hoàn tiền — dùng `message_templates` |
| 10 | **Telegram Mini App** | Catalog web trong Telegram (dài hạn) |

### P4 — Khi shop lớn hơn

| # | Ý tưởng | Mô tả ngắn |
|---|---------|------------|
| 11 | **PostgreSQL** | Đổi `DATABASE_URL`, `alembic upgrade head` |
| 12 | **Báo cáo kinh doanh** | Dashboard: doanh thu/SP, tỉ lệ hủy, CK muộn, top khách — `analytics_service` |

---

## Gợi ý chọn buổi mai

**Nếu 2–3 giờ:** làm **#1 Watcher health** hoặc **#2 Cảnh báo admin** — giảm rủi ro production.

**Nếu muốn tăng sales:** **#5 Nhắc hàng về** hoặc **#6 Mua lại nhanh** — tái dùng code đơn/ví sẵn có.

**Nếu muốn viral nhẹ:** **#4 Referral** — cần thiết kế DB + rule rõ (chỉ đơn đầu? % hoàn?).

---

## Checklist trước khi code tính năng mới

1. `git pull` / dev local đồng bộ với VPS
2. Có migration? → `alembic revision` + test local
3. Đụng email/CK? → đọc rule `mbq-payment-matching`, `mbq-watcher-imap`
4. Deploy: `1. Push-Git.bat` → `2. Deploy-VPS.bat`
5. Restart **watcher** sau deploy (bắt buộc)

---

## Ghi chú deploy (nhắc nhanh)

```text
Máy dev:  1. Push-Git.bat
          2. Deploy-VPS.bat   (SSH key đã setup — không cần mật khẩu)

VPS tay:  cd /opt/bot-telegram && git pull && source venv/bin/activate
          && alembic upgrade head
          && sudo systemctl restart bot-watcher bot-telegram bot-expire bot-admin
```

Chi tiết: [`DEPLOY_VPS.md`](DEPLOY_VPS.md), [`SSH-DEPLOY-SETUP.md`](SSH-DEPLOY-SETUP.md).

---

## Ý tưởng tự thêm (để trống)

- 
- 
- 
