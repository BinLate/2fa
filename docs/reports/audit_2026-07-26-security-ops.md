# Security Ops Checklist Mapping — 2026-07-26

Maps `docs/SECURITY_CHECKLIST.md` items to **code** vs **VPS-only** ownership after audit track `005-full-code-audit`.

| Checklist item | Owner | Notes |
|----------------|-------|-------|
| `ENV=production` in `.env` | VPS | Operator must set |
| `SESSION_SECRET` strong 32+ chars | VPS + code | `validate_config()` fail-closed in production |
| `ADMIN_DEV_LOGIN=false` | VPS + code | Fail-closed if true in production |
| `ADMIN_PUBLIC_URL` HTTPS | VPS | |
| BotFather `/setdomain` | VPS / Telegram | |
| Nginx TLS + HSTS | VPS | |
| Admin bind `127.0.0.1` | Code + VPS | `ADMIN_BIND_HOST` default `127.0.0.1` in `admin/main.py` `__main__`; refuse `0.0.0.0` in production validate |
| CSRF on POSTs | Code (already) | |
| RBAC server-side | Code (already) | |
| Stock content masked | Code (already) | |
| Backup not web-accessible | Code + VPS | |
| Restore OWNER-only | Code (already) | |
| `.env` not in git | Repo `.gitignore` | |
| Nginx `client_max_body_size` | VPS | |
| Firewall 443 only | VPS | |

Do **not** mark VPS rows fixed in code PRs — verify on host before go-live.
