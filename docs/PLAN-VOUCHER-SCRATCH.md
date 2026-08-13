# Cào thẻ voucher — Phase 1 + Phase 2

## Luồng Phase 1

1. Admin tạo **Chương trình cào thẻ** tại `/bot/scratch-cards`
2. Cấu hình phạm vi SP, giải thưởng + trọng số, bật chương trình
3. Khách **thanh toán OK** → bot gửi tin thành công + **tin thẻ cào** (nút「Cào thẻ ngay」)
4. Khách bấm cào → animation → lộ voucher + mã `VC…`
5. Voucher lưu DB (`user_vouchers`), hết hạn theo cấu hình

## Phase 2 (đã triển khai)

- **Auto best voucher** khi tạo đơn (sau chiết khấu hội viên / KM số lượng)
- Nút **「Chọn voucher」** trên màn xác nhận đơn → đổi mã / bỏ voucher
- **Tài khoản → Voucher của tôi** — danh sách mã còn hiệu lực
- Voucher **giữ chỗ** (`reserved_order_id`) trong lúc `PENDING_PAYMENT`; trả khi hủy/hết hạn; đánh dấu `used_at` khi giao hàng

## Code chính

| Thành phần | File |
|------------|------|
| Models | `core/models/scratch_cards.py`, `core/models/orders.py` |
| Cào thẻ | `core/services/scratch_card_service.py` |
| Checkout voucher | `core/services/voucher_service.py`, `core/services/order_review_service.py` |
| Hook sau giao hàng | `core/services/order_delivery_hooks.py` |
| Bot callback cào | `handlers/scratch_card.py` |
| Bot callback voucher | `handlers/voucher.py` |
| Tài khoản voucher | `handlers/account.py` |
| Admin | `admin/routers/scratch_cards.py` |

## Giải mẫu (seed khi tạo)

| Giải | Trọng số | ~Tỉ lệ |
|------|----------|--------|
| Chúc bạn may mắn lần sau (không voucher) | 50 | 50% |
| 10% max 20k | 20 | 20% |
| Giảm 5k | 13 | 13% |
| Giảm 10k | 10 | 10% |
| Giảm 20k | 4 | 4% |
| 20% max 50k | 3 | 3% |

Restart **bot** + **admin** sau deploy.
