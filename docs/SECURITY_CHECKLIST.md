# Security Checklist (Pre-Production)

- [ ] `ENV=production` in `.env`
- [ ] `SESSION_SECRET` set to random 64+ byte string
- [ ] `ADMIN_DEV_LOGIN=false` in production
- [ ] `ADMIN_PUBLIC_URL` matches HTTPS domain
- [ ] Telegram domain set via @BotFather `/setdomain`
- [ ] Nginx TLS 1.2+ with HSTS
- [ ] Admin binds to `127.0.0.1` only (behind reverse proxy)
- [ ] CSRF enabled on all POST forms
- [ ] RBAC enforced server-side on every mutating route
- [ ] Stock content masked in list views
- [ ] Backup files not web-accessible without auth
- [ ] Restore requires OWNER role
- [ ] `.env` not committed to git
- [ ] File upload size limited in Nginx (`client_max_body_size`)
- [ ] Firewall: expose 443 only
