# SSH deploy không mật khẩu (một lần)

## Bạn cần sửa ở đâu?

| File | Sửa gì |
|------|--------|
| `2. Deploy-VPS.bat` | `VPS_HOST`, `VPS_USER` (nếu đổi IP/user) |
| `0. Setup-SSH-VPS.bat` | Cùng `VPS_HOST`, `VPS_USER` với Deploy |
| `scripts/ssh-mbq-vps.config.example` | `HostName`, `User` nếu đổi VPS |
| `%USERPROFILE%\.ssh\config` | Tự tạo bởi Setup — hoặc sửa tay `HostName` / `User` |

**Quan trọng:** IP/user trong 3 chỗ trên phải **giống nhau**.

## Làm một lần

1. Double-click **`0. Setup-SSH-VPS.bat`**
2. Nhập **mật khẩu root VPS lần cuối** khi được hỏi
3. Thấy `SSH OK - khong can mat khau` → xong

## Deploy hàng ngày

1. `1. Push-Git.bat`
2. `2. Deploy-VPS.bat` — không hỏi `yes`, không hỏi mật khẩu

## Đổi IP VPS sau này

Sửa `HostName` trong `%USERPROFILE%\.ssh\config` (block `Host mbq-vps`) và `VPS_HOST` trong các file `.bat`.

## Bảo mật

- Key **không passphrase** = ai dùng được máy Windows có thể SSH VPS.
- Không commit `.ssh/` — nằm ngoài project.
- File `*.bat` local không lên git (`.gitignore`).
