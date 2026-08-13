# QA Checklist — Khuyến mãi (sau gộp Giảm giá)

## Admin

- [ ] `/bot/discounts` redirect → `/bot/quantity-deals`
- [ ] Tạo deal **Mua tặng thêm** (SP A) + **Giá mốc SL** (SP B) + **Giảm giá** (DM/SP) — cả 3 bật cùng lúc
- [ ] PERCENTAGE: % + trần/đơn + chi tiêu tối thiểu + multi-select DM/SP
- [ ] Cảnh báo trùng scope khi lưu deal overlap
- [ ] Toggle bật/tắt không tắt deal khác

## Bot — giá

- [ ] Mua SP A → bonus đúng
- [ ] Mua SP B → giá mốc đúng
- [ ] Mua SP trong scope PERCENTAGE → % + cap
- [ ] SP ngoài scope → không giảm
- [ ] Khách chưa đủ min_total_spent → không giảm
- [ ] Deal chưa start / đã end → không áp dụng
- [ ] Membership vs deal → khách lấy giá tốt hơn

## Thanh toán

- [ ] Ví + VietQR: amount khớp order review
- [ ] Admin tăng giá deal sau khi tạo đơn pending → thanh toán bị chặn (re-validate)

## Deploy

```bash
alembic upgrade head
python scripts/migrate_promotion_to_deals.py
# restart: bot, admin, watcher
```
