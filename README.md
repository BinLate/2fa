# 2FA / TOTP generator

Fast, compact TOTP (2FA) utility. Codes are generated **in your browser** with HMAC-SHA1. There is no app backend.

## Demo

https://2fa.muabanquyen.com/

Source: https://github.com/BinLate/2fa

## Features

- Generate TOTP (HMAC-SHA1, 6 digits, 30-second period)
- Current OTP + **Next OTP** (click either to copy)
- Countdown + thin progress bar
- Click-to-copy with overlay toast (no layout jump)
- Smart paste: secret only, or `email|password|secret` (tab/comma too)
- Saved accounts in this browser (search, delete, row OTP)
- Dark / light mode
- Vietnamese / English
- Local `localStorage` vault
- Responsive (including ~1366×768 and mobile)
- Copy Link (`https://2fa.muabanquyen.com/{SECRET}`)
- Help dialog

## Privacy / Security

- Saved accounts live in **this browser** (`localStorage` key `twofa.savedSecrets.v1`).
- OTP is generated locally. This site does **not** upload your 2FA secrets or account names to our server.
- Clearing site data / cache or reinstalling the browser can **delete** the saved list.

## Installation / Development

This is a **static** site. There is no `package.json` and no build step.

```bash
git clone https://github.com/BinLate/2fa.git
cd 2fa
```

Preview options:

- Open `index.html` in a browser (most flows work; Apache rewrite is not used).
- Or serve the folder with any static server, for example:

```bash
npx --yes serve .
```

TOTP unit check (Node, no npm install):

```bash
node tests/totp.test.js
```

## Deploy

Copy these files to an Apache `DocumentRoot` (HTTPS recommended):

- `index.html`
- `.htaccess` (rewrites legacy `/{secret}` paths to `index.html`)
- `favicon.png`

Optional: `LICENSE`, `README.md`.

## Open source

You can read `index.html` to see how TOTP secrets are parsed, stored locally, and never posted by app code to our server.

## License

[MIT](./LICENSE)
