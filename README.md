# 2FA / TOTP

Tạo mã OTP (2FA) ngay trên trình duyệt. Không backend, không npm, không bước build.

- Demo: https://2fa.muabanquyen.com/
- Mã nguồn: https://github.com/BinLate/2fa

## Tính năng

- TOTP HMAC-SHA1, 6 số, chu kỳ 30 giây
- Mã **hiện tại** và **tiếp theo** — bấm vào số để copy
- Đếm ngược + thanh thời gian
- Dán secret, hoặc cả dòng `email|password|secret` (tab / dấu phẩy cũng được). Field thừa, số đơn, URL bị bỏ qua
- Lưu danh sách tài khoản trên trình duyệt này (tìm, xóa, tạo OTP từng dòng)
- Tiếng Việt / English, dark / light
- Copy Link: `https://2fa.muabanquyen.com/{SECRET}`
- Hộp hướng dẫn nhanh

## Quyền riêng tư

Mã OTP được tạo trên máy bạn. Danh sách đã lưu nằm trong trình duyệt (`localStorage`). Website không gửi secret 2FA hay tên tài khoản lên server của chúng tôi. Xóa dữ liệu / cache hoặc cài lại trình duyệt có thể làm mất danh sách.

Mã nguồn mở — xem `index.html` để tự kiểm tra.

## Chạy local

Site tĩnh. Clone rồi mở `index.html`, hoặc serve thư mục bằng bất kỳ static server nào.

```bash
git clone https://github.com/BinLate/2fa.git
cd 2fa
```

File cần có:

- `index.html`
- `.htaccess` (Apache: rewrite `/{SECRET}` về `index.html`)
- `favicon.png`
- `LICENSE`

## Deploy

Copy các file trên lên Apache `DocumentRoot` (nên dùng HTTPS).

## License

[MIT](./LICENSE)
