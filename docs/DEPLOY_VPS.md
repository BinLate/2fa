# Deploy VPS — MBQ Telegram Shop Bot

Hướng dẫn triển khai bot bán hàng Telegram lên VPS Ubuntu chạy 24/7.

**4 process dùng chung một database** (`bot.db` / `DATABASE_URL`):

| Process | File | Vai trò |
|---------|------|---------|
| Bot | `bot.py` | Telegram handlers + vòng lặp hết hạn đơn |
| Watcher | `watcher.py` | IMAP Gmail → xử lý chuyển khoản Timo/BVBank |
| Expire | `expire_orders.py` | Hết hạn đơn + dọn giao dịch bank theo retention |
| Admin | `admin/main.py` | Web panel FastAPI tại `/bot/*` |

> **Cảnh báo:** Bot và Watcher **phải** trỏ cùng `DATABASE_URL`. Watcher không chạy = có tiền nhưng không giao hàng.

---

## 1. Chọn VPS

Hai gói cùng giá ~**200.000đ/tháng**:

| | Plan4A (4C-4G-50G) | Plan5 (3C-6G-60G) |
|---|---|---|
| CPU | **4 vCPU** | 3 vCPU |
| RAM | 4 GB | **6 GB** |
| SSD | 50 GB | **60 GB** |
| Băng thông | Không giới hạn | Không giới hạn |

### Khuyến nghị: **Plan5 — 3 vCPU / 6 GB RAM / 60 GB SSD**

Lý do:

- Stack này chạy **4 process Python** + SQLite + nginx — tải chủ yếu là **RAM và I/O**, không phải CPU nặng.
- **6 GB RAM** thoải mái hơn khi bot + watcher + admin + broadcast đồng thời; SQLite cũng hưởng lợi từ cache hệ thống.
- **3 vCPU** đủ cho shop vừa và vừa lớn (watcher poll IMAP, bot xử lý callback).
- **60 GB** tiện lưu backup `backups/` và log.

Chỉ chọn Plan4A (4 CPU / 4 GB) nếu traffic rất thấp và bạn ưu tiên dư CPU; với bot 24/7, **6 GB RAM an toàn hơn**.

**OS:** Ubuntu **22.04** hoặc **24.04** LTS  
**Vị trí:** Singapore hoặc Việt Nam (latency Telegram + Gmail ổn)

---

## 2. Chuẩn bị trước khi lên VPS

- [ ] Domain cho admin (vd: `admin.shopcuaban.com`) — A record trỏ IP VPS
- [ ] Bot token từ [@BotFather](https://t.me/BotFather)
- [ ] Telegram ID admin từ [@userinfobot](https://t.me/userinfobot)
- [ ] Gmail **App Password** (bật 2FA → Tạo mật khẩu ứng dụng)
- [ ] Số tài khoản ngân hàng nhận tiền (VietQR)
- [ ] Chuỗi `SESSION_SECRET` ngẫu nhiên dài (64+ ký tự)

---

## 3. Upload mã nguồn và dữ liệu

```bash
sudo mkdir -p /opt/bot-telegram
sudo chown $USER:$USER /opt/bot-telegram
```

Upload toàn bộ project lên `/opt/bot-telegram` bằng WinSCP, FileZilla hoặc `scp`.

| File / thư mục | Upload? | Ghi chú |
|----------------|---------|---------|
| Toàn bộ code | Có | Trừ `venv/`, `__pycache__/` |
| `.env` | **Có** (rồi sửa trên VPS) | Upload từ máy dev được — **nhớ sửa production** (mục 4) |
| `bot.db` | Có nếu đã có shop | Giữ sản phẩm/đơn/khách hiện tại |
| `bot_test.db` | Không | Chỉ dùng khi chạy test trên máy dev |
| `venv/` | Không | Tạo lại trên VPS bằng `python3 -m venv venv` |

### Database — có cần cấu hình không?

**Không cần cài PostgreSQL/MySQL.** Mặc định dùng SQLite file `bot.db`.

Dòng `# DATABASE_URL=sqlite:///./bot.db` trong `.env.example` **bị comment** — không cần bỏ comment. Nếu không set `DATABASE_URL`, code tự dùng `/opt/bot-telegram/bot.db`.

- **Đã có `bot.db`:** upload lên, **không** chạy `init_db` (tránh ghi đè). Chỉ `alembic upgrade head` nếu code mới hơn DB.
- **Chưa có `bot.db`:** chạy khởi tạo ở mục 4.

### 3.1. Cập nhật code bằng `git pull` (khuyến nghị)

An toàn hơn WinSCP sync vì `.env`, `bot.db`, `venv` **không nằm trong git** (`.gitignore`) — `git pull` **không ghi đè** chúng.

#### Trên máy dev (mỗi lần sửa code xong)

```bash
cd bot-telegram
git add .
git commit -m "Mô tả thay đổi"
git push origin master
```

> Nhánh có thể là `main` thay vì `master` — dùng đúng tên nhánh trên remote.

#### Lần đầu trên VPS — `git clone`

```bash
sudo apt install -y git
sudo mkdir -p /opt/bot-telegram
sudo chown $USER:$USER /opt/bot-telegram

git clone https://github.com/TEN-BAN/bot-telegram.git /opt/bot-telegram
cd /opt/bot-telegram
```

Repo **private** — dùng SSH:

```bash
git clone git@github.com:TEN-BAN/bot-telegram.git /opt/bot-telegram
```

(Cần thêm SSH key VPS vào GitHub: Settings → SSH keys.)

Sau clone, làm tiếp mục **4** (venv, `.env`, `bot.db`, systemd…). **`.env` và `bot.db` tạo/upload thủ công** — không có trong repo.

#### Mỗi lần cập nhật trên VPS — `git pull`

```bash
cd /opt/bot-telegram

# (khuyến nghị) backup DB trước khi pull
cp bot.db bot.db.bak.$(date +%Y%m%d%H%M)

git pull origin master

source venv/bin/activate
pip install -r requirements.txt          # nếu requirements.txt đổi
alembic upgrade head                     # nếu có migration mới

sudo systemctl restart bot-watcher bot-telegram bot-expire bot-admin
```

| Bước | Bắt buộc? |
|------|-----------|
| `git pull` | Có |
| `pip install -r requirements.txt` | Khi `requirements.txt` đổi |
| `alembic upgrade head` | Khi có migration Alembic mới |
| Restart 4 service | **Có** — watcher bắt buộc sau đổi code |

Kiểm tra nhanh:

```bash
git log -1 --oneline
sudo systemctl status bot-telegram bot-watcher bot-expire bot-admin --no-pager
```

#### `git pull` báo conflict

```bash
git status
# Nếu chỉ conflict file tracked — xem diff, sửa tay hoặc:
git stash
git pull origin master
git stash pop
```

**Không** `git reset --hard` trên VPS nếu có file local quan trọng chưa backup.

---

### 3.2. File / thư mục loại trừ (không đưa lên VPS / không ghi đè)

#### Tự động loại trừ khi dùng `git pull`

Các mục trong `.gitignore` — git **không** track, VPS giữ nguyên sau pull:

| Loại trừ | Lý do |
|----------|--------|
| `.env` | Secret production — chỉ trên VPS |
| `bot.db`, `bot.db-*` | Dữ liệu shop thật |
| `bot_test.db`, `test_bot.db` | DB test |
| `venv/` | Tạo trên VPS (Linux), không copy từ Windows |
| `__pycache__/`, `.pytest_cache/` | Cache Python |
| `watcher_state.json` | Runtime watcher |
| `backups/` | Backup server |
| `*.log` | Log |

#### WinSCP sync — exclude thủ công (nếu không dùng git)

Trong WinSCP → Sync → **Exclude mask**, thêm:

```
.env; bot.db; bot.db-*; bot_test.db; test_bot.db*; venv/; __pycache__/; .pytest_cache/; watcher_state.json; backups/; *.log; .git/
```

Chỉ sync **một chiều** Local → Remote. **Không** mirror hai chiều.

#### Có trong git nhưng **không cần trên VPS production** (có thể xóa sau clone)

```bash
cd /opt/bot-telegram
sudo rm -rf tests/ .cursor/ .pytest_cache/
sudo rm -f run_tests.py Start.bat RestartAdmin.bat
```

| Xóa được | Giữ lại |
|----------|---------|
| `tests/`, `run_tests.py` | `bot.py`, `watcher.py`, `admin/`, `core/`… |
| `.cursor/` | `alembic/`, `scripts/` |
| `Start.bat`, `RestartAdmin.bat` | `.env`, `bot.db`, `venv/` |
| `bot_test.db` (nếu lỡ có) | `watcher_state.json`, `backups/`, `uploads/` |

`README.md`, `docs/` — tùy chọn, giữ cũng được (nhẹ).

#### Không bao giờ xóa trên VPS

- `.env`
- `bot.db` (+ `-wal`, `-shm`)
- `venv/` (trừ khi tạo lại từ đầu)
- `watcher_state.json` (trừ khi cố ý reset watcher — xem `scripts/reprocess_email.py`)

---

### 3.3. So sánh WinSCP vs git pull

| | WinSCP sync | `git pull` |
|--|-------------|------------|
| Ghi đè nhầm `.env` / `bot.db` | Dễ nếu quên exclude | **Không** — không trong git |
| Cần commit trước | Không | Có (`git push`) |
| Phù hợp | Sửa gấp, chưa push | Vận hành lâu dài, có lịch sử |

Có thể dùng cả hai: **git pull** là đường chính; WinSCP chỉ khi cần đẩy gấp (vẫn exclude như mục 3.2).

---

## 4. Cài môi trường

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv sqlite3 nginx certbot python3-certbot-nginx git ufw

cd /opt/bot-telegram
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # bỏ qua nếu đã upload .env từ máy dev
nano /opt/bot-telegram/.env
```

### `.env` production — **bắt buộc sửa sau khi upload**

Dù upload `.env` từ máy dev hay tạo mới, trên VPS phải có ít nhất:

```env
ENV=production
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=TenBot_khong_co_@
ADMIN_TELEGRAM_IDS=123456789

ADMIN_PUBLIC_URL=https://boy.muabanquyen.com
SESSION_SECRET=<chuoi-ngau-nhien-64-ky-tu-tro-len>
ADMIN_DEV_LOGIN=false

IMAP_HOST=imap.gmail.com
IMAP_PORT=993
EMAIL_ADDRESS=your_email@gmail.com
APP_PASSWORD=your_google_app_password
IMAP_FOLDER=INBOX

BANK_ACCOUNT_NO=...
BANK_ACCOUNT_NAME=...
BANK_NAME=TIMO

ORDER_RESERVATION_MINUTES=5
ORDER_EXPIRE_POLL_SECONDS=5
WALLET_PAYMENT_ENABLED=true
QR_PAYMENT_ENABLED=true
```

**Lưu ý quan trọng:**

| Biến | Ghi chú |
|------|---------|
| `ENV=production` | Systemd cũng ép `ENV=production` — Dev Login **luôn tắt** trên VPS |
| `ADMIN_PUBLIC_URL` | Phải khớp domain HTTPS thật (vd `https://boy.muabanquyen.com`) |
| `ADMIN_DEV_LOGIN=false` | Production **không** dùng user/pass `admin/admin` |
| `TELEGRAM_BOT_USERNAME` | Không có ký tự `@` |
| `IMAP_FOLDER` | Viết `INBOX` — **không** bọc dấu ngoặc kép |
| `DATABASE_URL` | Không cần set — mặc định `bot.db` |

**Đăng nhập admin production:** nút **Log in with Telegram** (không phải username/password). Telegram ID phải có trong `ADMIN_TELEGRAM_IDS` và bảng `admin_users` (`python scripts/bootstrap_admin.py`).

### Khởi tạo database (cài mới)

```bash
source venv/bin/activate
python -c "from core.database import init_db; init_db()"
alembic upgrade head
python scripts/bootstrap_admin.py
```

> **Không chạy test trên VPS production.** Test chỉ dùng `python run_tests.py` trên máy dev (dùng `bot_test.db` riêng).

---

## 5. Systemd — 4 dịch vụ 24/7

File mẫu trong `scripts/systemd_*.service` đã cấu hình `/opt/bot-telegram`, `venv/bin/python`, user `www-data`. Mỗi service có `Environment=ENV=production` — **ghi đè** `ENV=development` trong `.env` (Dev Login luôn tắt trên VPS).

### `bot-telegram.service`

```ini
[Unit]
Description=Telegram Shop Bot Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/bot-telegram
Environment=ENV=production
EnvironmentFile=/opt/bot-telegram/.env
ExecStart=/opt/bot-telegram/venv/bin/python bot.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### `bot-watcher.service`

```ini
[Unit]
Description=Gmail Timo Watcher Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/bot-telegram
Environment=ENV=production
EnvironmentFile=/opt/bot-telegram/.env
ExecStart=/opt/bot-telegram/venv/bin/python watcher.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### `bot-expire.service`

```ini
[Unit]
Description=Order Expiration Scheduler Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/bot-telegram
Environment=ENV=production
EnvironmentFile=/opt/bot-telegram/.env
ExecStart=/opt/bot-telegram/venv/bin/python expire_orders.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### `bot-admin.service`

```ini
[Unit]
Description=MBQ Telegram Shop Admin Panel
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/bot-telegram
Environment=ENV=production
EnvironmentFile=/opt/bot-telegram/.env
ExecStart=/opt/bot-telegram/venv/bin/uvicorn admin.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Cài và kích hoạt service

```bash
sudo cp scripts/systemd_bot.service /etc/systemd/system/bot-telegram.service
sudo cp scripts/systemd_watcher.service /etc/systemd/system/bot-watcher.service
sudo cp scripts/systemd_expire.service /etc/systemd/system/bot-expire.service
sudo cp scripts/systemd_admin.service /etc/systemd/system/bot-admin.service

sudo systemctl daemon-reload
sudo systemctl enable bot-telegram bot-watcher bot-expire bot-admin
sudo systemctl start bot-telegram bot-watcher bot-expire bot-admin
sudo systemctl status bot-telegram bot-watcher bot-expire bot-admin
```

### Khởi động lại 4 service (sau sửa code / `.env`)

```bash
sudo systemctl restart bot-watcher bot-telegram bot-expire bot-admin
```

Hoặc trên web admin: **Quản trị → Dịch vụ** (`/bot/services`) — tick service → **Restart đã chọn** (cần sudoers mục 6.1).

Hoặc từng service (SSH):

```bash
sudo systemctl restart bot-telegram   # bot Telegram
sudo systemctl restart bot-watcher    # bắt buộc sau mỗi lần deploy code
sudo systemctl restart bot-expire     # hết hạn đơn + retention
sudo systemctl restart bot-admin      # web admin (sau sửa .env)
```

Kiểm tra nhanh:

```bash
sudo systemctl status bot-telegram bot-watcher bot-expire bot-admin --no-pager
```

> Watcher **bắt buộc** restart sau deploy. Bot và admin nên restart cùng lúc.

---

## 6. Phân quyền file (chmod) — bảo mật + code chạy được

4 service chạy user **`www-data`**. Chạy sau khi upload code + `bot.db` + `.env`:

```bash
cd /opt/bot-telegram

# Thư mục runtime
sudo mkdir -p backups uploads/products
sudo touch watcher_state.json

# Code: root sở hữu, group www-data đọc được
sudo chown -R root:www-data /opt/bot-telegram
sudo find /opt/bot-telegram -type d -exec chmod 750 {} \;
sudo find /opt/bot-telegram -type f -exec chmod 640 {} \;

# .env — chỉ www-data đọc
sudo chown www-data:www-data .env
sudo chmod 600 .env

# SQLite — www-data phải ghi được
sudo chown www-data:www-data bot.db bot.db-wal bot.db-shm watcher_state.json 2>/dev/null || true
sudo chmod 660 bot.db bot.db-wal bot.db-shm watcher_state.json 2>/dev/null || true

# Backup, upload ảnh sản phẩm
sudo chown -R www-data:www-data backups uploads
sudo chmod 770 backups uploads

# venv — www-data cần execute python/uvicorn
sudo chown -R root:www-data venv
sudo find venv -type d -exec chmod 755 {} \;
sudo find venv -type f -exec chmod 644 {} \;
sudo chmod 755 venv/bin/*

# Script backup + restart (admin panel)
sudo chmod 750 scripts/backup_cron.sh
sudo chmod 750 scripts/restart_services.sh
```

### 6.1. Restart service từ Admin (`/bot/services`)

Web admin (OWNER + ADMIN) có trang **Dịch vụ** — tick checkbox → **Restart đã chọn**.

`www-data` cần quyền `sudo` **chỉ** cho script whitelist:

```bash
sudo tee /etc/sudoers.d/bot-telegram-restart <<'EOF'
www-data ALL=(root) NOPASSWD: /opt/bot-telegram/scripts/restart_services.sh
EOF
sudo chmod 440 /etc/sudoers.d/bot-telegram-restart
sudo visudo -c
```

Kiểm tra:

```bash
sudo -u www-data sudo /opt/bot-telegram/scripts/restart_services.sh bot-watcher
sudo systemctl is-active bot-watcher
```

Sau `git pull`, có thể restart từ **`https://boy.muabanquyen.com/bot/services`** thay vì SSH.

Kiểm tra chmod:

```bash
ls -la /opt/bot-telegram/.env          # -rw------- www-data www-data
sudo -u www-data test -w /opt/bot-telegram/bot.db && echo "DB writable OK"
```

| Đường dẫn | Owner | chmod | Lý do |
|-----------|--------|-------|--------|
| Code `.py`, templates | `root:www-data` | dir `750`, file `640` | Chạy được, không lộ cho user khác |
| `.env` | `www-data:www-data` | `600` | Token, password Gmail |
| `bot.db` (+ wal/shm) | `www-data:www-data` | `660` | 4 process ghi DB |
| `backups/`, `uploads/` | `www-data:www-data` | `770` | Backup + upload admin |
| `venv/bin/*` | `root:www-data` | `755` | Service chạy python |

**Không** dùng `chmod 777`. Sau mỗi lần upload code bằng user khác, chạy lại block lệnh trên.

---

## 7. Nginx + HTTPS + Cloudflare

Luồng: `Trình duyệt → Cloudflare → VPS (nginx :443) → uvicorn :8000 → /bot/login`

### 7.1. Cấu hình Nginx

Tạo `/etc/nginx/sites-available/bot-admin`:

```nginx
server {
    listen 80;
    server_name boy.muabanquyen.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 10M;
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/bot-admin /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 7.2. Cloudflare — trước khi chạy certbot

Nếu domain dùng **Cloudflare** (icon mây cam):

1. Vào **DNS** → record `boy` (hoặc subdomain admin) → chuyển sang **DNS only** (mây xám) tạm thời
2. Đợi 1–2 phút để DNS trỏ thẳng IP VPS
3. Chạy SSL trên VPS:

```bash
sudo certbot --nginx -d boy.muabanquyen.com
```

4. Sau khi certbot thành công, bật lại **Proxied** (mây cam) trên Cloudflare
5. Cloudflare **SSL/TLS** → chọn **Full (strict)** (vì VPS đã có Let's Encrypt)

> Nếu không tắt proxy, certbot có thể fail hoặc cấp cert sai. Lỗi **HTTP 521** thường do nginx chưa chạy, firewall chặn 80/443, hoặc DNS trỏ sai IP.

### 7.3. Sửa `.env` và restart sau SSL

```bash
sudo nano /opt/bot-telegram/.env
```

Đảm bảo:

```env
ENV=production
ADMIN_PUBLIC_URL=https://boy.muabanquyen.com
ADMIN_DEV_LOGIN=false
```

```bash
sudo systemctl restart bot-admin
sudo systemctl reload nginx
```

### 7.4. Telegram Login — `/setdomain` (bắt buộc)

Vào [@BotFather](https://t.me/BotFather):

1. `/setdomain`
2. Chọn bot (vd `MuaBanQuyen_bot`)
3. Nhập: `boy.muabanquyen.com` — **không** có `https://`, **không** có `/bot`

Lỗi **"Bot domain invalid"** trên trang login = chưa `/setdomain` hoặc domain sai.

```bash
cd /opt/bot-telegram && source venv/bin/activate
python scripts/bootstrap_admin.py
```

### 7.5. Test sau cấu hình

```bash
# Backend admin (trên VPS)
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/bot/login

# Qua nginx + HTTPS (từ VPS hoặc máy ngoài)
curl -L https://boy.muabanquyen.com/bot/login | head

# 4 service
sudo systemctl status nginx bot-admin --no-pager
```

Trình duyệt: **`https://boy.muabanquyen.com/bot/login`** (luôn có tiền tố `/bot/`).

---

## 8. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Chỉ mở **22, 80, 443**. Admin bind `127.0.0.1:8000` — **không** expose port 8000 ra internet.

---

## 9. Backup tự động

```bash
chmod +x scripts/backup_cron.sh
crontab -e
```

Thêm dòng (chạy 2h sáng mỗi ngày):

```cron
0 2 * * * /opt/bot-telegram/scripts/backup_cron.sh >> /var/log/bot-backup.log 2>&1
```

Backup lưu tại `backups/`, quản lý qua `/bot/backups` trên admin panel (tải xuống, khôi phục, chọn nhiều file để xóa).

**Retention:** bản sao lưu cũ hơn **10 ngày** tự động bị xóa (khi tạo backup mới, khi mở trang `/bot/backups`, hoặc qua cron). Đổi số ngày trong `.env`:

```env
BACKUP_RETENTION_DAYS=10
```

**Trước mỗi lần nâng cấp:**

```bash
cp /opt/bot-telegram/bot.db /opt/bot-telegram/bot.db.bak.$(date +%Y%m%d%H%M)
```

---

## 10. Smoke test sau deploy

- [ ] Bot: `/start` → xem catalog, tạo đơn thử
- [ ] Watcher: `sudo journalctl -u bot-watcher -f` — thấy poll IMAP, không lỗi auth
- [ ] Chuyển khoản thử (số tiền nhỏ) → đơn chuyển `DELIVERED`
- [ ] Admin: `https://boy.muabanquyen.com/bot/login` — đăng nhập Telegram OK
- [ ] Nhập 1 dòng kho → thấy trong inventory
- [ ] Hủy đơn chờ thanh toán → kho trả về `AVAILABLE`

---

## 11. Xem log

```bash
sudo journalctl -u bot-telegram -f
sudo journalctl -u bot-watcher -f
sudo journalctl -u bot-expire -f
sudo journalctl -u bot-admin -f
```

Log watcher quan trọng khi debug thanh toán bank. Nếu email lỗi parse, có thể chặn queue UID — xem `docs/` và rule watcher trong `.cursor/rules/`.

---

## 12. Nâng cấp code / migration

### Cách A — `git pull` (khuyến nghị)

Xem mục **3.1**. Tóm tắt:

```bash
cd /opt/bot-telegram
cp bot.db bot.db.bak.$(date +%Y%m%d%H%M)
git pull origin master
source venv/bin/activate && pip install -r requirements.txt && alembic upgrade head
sudo systemctl restart bot-watcher bot-telegram bot-expire bot-admin
```

### Cách B — WinSCP / upload thủ công

1. Backup `bot.db`
2. Upload code (exclude `.env`, `bot.db`, `venv` — mục **3.2**)
3. `pip install` + `alembic upgrade head` nếu cần
4. Restart 4 service

### Dừng service trước migration lớn (tùy chọn)

Nếu `alembic upgrade` báo database locked:

```bash
sudo systemctl stop bot-telegram bot-watcher bot-expire bot-admin
cp bot.db bot.db.bak.$(date +%Y%m%d%H%M)
source venv/bin/activate && alembic upgrade head
sudo systemctl start bot-telegram bot-watcher bot-expire bot-admin
```

### DB đã chạy legacy scripts (nâng cấp từ bản cũ)

Nếu DB đã có cột multilang nhưng chưa từng chạy Alembic:

```bash
alembic stamp f53c3725c6f2
alembic upgrade head
alembic current   # xác nhận revision mới nhất
```

Chi tiết thêm: mục **Migration & Nâng cấp** trong `README.md`.

---

## 13. Checklist bảo mật

Xem đầy đủ: [`docs/SECURITY_CHECKLIST.md`](SECURITY_CHECKLIST.md)

- [ ] `ENV=production`
- [ ] `SESSION_SECRET` mạnh (64+ byte)
- [ ] `ADMIN_DEV_LOGIN=false`
- [ ] `ADMIN_PUBLIC_URL` khớp domain HTTPS
- [ ] @BotFather `/setdomain` đã cấu hình
- [ ] Admin chỉ bind `127.0.0.1` (behind nginx)
- [ ] `.env` không commit git (`chmod 600` trên VPS)
- [ ] Firewall chỉ mở 22, 80, 443

---

## 14. Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân có thể | Cách xử lý |
|-------------|-------------------|------------|
| **HTTP ERROR 521** (Cloudflare) | Nginx chưa chạy / firewall chặn 80–443 / DNS sai IP | `systemctl status nginx`, `ufw status`, tắt proxy CF khi chạy certbot |
| **Bot domain invalid** | Chưa `/setdomain` trên BotFather | BotFather → `/setdomain` → `boy.muabanquyen.com` |
| Không thấy form Dev Login | `ENV=production` (đúng) — Dev Login tắt cố ý | Dùng nút Telegram; không bật dev login trên VPS |
| **Not authorized** sau Telegram login | Telegram ID chưa trong DB | `ADMIN_TELEGRAM_IDS` + `python scripts/bootstrap_admin.py` |
| Có tiền CK nhưng không giao hàng | Watcher không chạy / sai IMAP | `systemctl status bot-watcher`, kiểm tra `APP_PASSWORD`, `IMAP_FOLDER=INBOX` |
| Admin 502 Bad Gateway | `bot-admin` crash | `journalctl -u bot-admin -n 50` |
| Đơn không hết hạn | Expire service dừng | `systemctl status bot-expire` |
| Bot không phản hồi | Token sai / process crash | `journalctl -u bot-telegram -n 50` |
| `database is locked` | SQLite concurrent cao | Restart services; cân nhắc PostgreSQL sau |
| Email parse lỗi, watcher đứng | UID queue kẹt | `scripts/debug_email.py`, `scripts/reprocess_email.py` |

### Lệnh chẩn đoán nhanh

```bash
sudo systemctl status nginx bot-telegram bot-watcher bot-expire bot-admin --no-pager
sudo ss -tlnp | grep -E ':80|:443|:8000'
curl -I http://127.0.0.1:8000/bot/login
grep -E '^(ENV|ADMIN_PUBLIC_URL|ADMIN_DEV_LOGIN|TELEGRAM_BOT_USERNAME)=' /opt/bot-telegram/.env
grep server_name /etc/nginx/sites-enabled/*
```

---

## Tài liệu liên quan

- [`README.md`](../README.md) — tổng quan dự án
- [`docs/SECURITY_CHECKLIST.md`](SECURITY_CHECKLIST.md) — bảo mật production
- `.cursor/rules/mbq-system-brain.mdc` — kiến trúc 4 process
