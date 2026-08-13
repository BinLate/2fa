# Audit remediation summary — 2026-07-26 (P0→P2)

Feature: `specs/005-full-code-audit`

## Closed / mitigated in code

| ID | Change |
|----|--------|
| C2 | `delivery_token` only when status called with matching `email` |
| H1 | Rate limits + max 3 emails on customer/orders & delivery-secure |
| H2 | Cancel requires matching email (400/403) |
| H4 | Stronger `validate_config` (32-char secret, bind host) |
| H5 | Ops mapping doc + default bind 127.0.0.1 |
| H3 | Accept body HMAC-SHA256 **or** legacy static header |
| M8 | `hmac.compare_digest` / WP `hash_equals` |
| M11 | Webhook `60/minute` rate limit |
| M4 | Order IDs `token_hex(8)` + parser 8/16 hex |
| PERF-01/02/03 | Batch stock counts, SQL aggregates, indexes migration |
| PERF-05 | WP poll backoff |
| PERF-04 | `asyncio.to_thread` for wallet fulfill |
| PERF-06 | Watcher UID quarantine after 3 failures |
| PERF-08/09 | Expire poll default 20s; batch locale session |

## Deferred

| ID | Note |
|----|------|
| C1 | Supplier secrets encrypt-at-rest — design deferred (owner approval) |
| PERF-12 | WP API short TTL cache — skipped (stock accuracy SLA) |
| Product US3 | Explicitly out of scope this track |

## Deploy

Restart: **watcher**, bot, admin, expire. Run `alembic upgrade head`. Deploy updated WP plugin JS/PHP.
