# Cloudflare Device Verification

This project uses the following browser/device signals:

- Browser / user-agent
- Operating-system family via navigator.platform/user-agent
- Screen and available screen resolution
- Device pixel ratio
- Language and language list
- Timezone and timezone offset
- Touch capability / max touch points
- Browser capability flags
- WebGL support/version/vendor/renderer where exposed
- A locally generated random device identifier in localStorage
- SHA-256 fingerprint derived from the above signals

It intentionally does NOT attempt to collect IMEI, SIM data, phone serial number,
Telegram passwords, login codes, bot tokens, precise location, or hidden credentials.

## Important identity requirement

To detect "same Telegram account, different device", the Mini App needs the
Telegram WebApp user id. The page reads `Telegram.WebApp.initDataUnsafe.user.id`.

For production-grade authentication, the Telegram WebApp initData should also be
validated server-side using the bot token. This sample keeps the bot token out of
the Cloudflare Worker and therefore treats the WebApp user id as an account
identifier, not as a cryptographic authentication proof.

## Install

1. Create a D1 database:
   npx wrangler d1 create tg-device-verification

2. Put the returned database_id in wrangler.toml.

3. Apply the schema:
   npx wrangler d1 execute tg-device-verification --remote --file=./schema.sql

4. Deploy:
   npx wrangler deploy

5. Attach your Cloudflare route/custom domain:
   https://uglybhai.zya.me/

## Existing TPY registration endpoint

Use:
https://uglybhai.zya.me/api/bot_register.php

The registration request can remain:
botHash
bot
webhook_url

The bot_token parameter is not needed and is deliberately not stored.

## Result states

success:
First verification for the Telegram account/device.

info:
Same account + same known fingerprint => Already Verified.

error + code MULTI_DEVICE:
Same Telegram account but a different fingerprint/device was detected.

## UI

The UI follows the supplied reference:
Verification Organization
Device Verification
Scanning your device...
5-second progress
No VERIFY button/input
After 5 seconds the page attempts Telegram.WebApp.close().

## Limitations

Browser fingerprints are not perfect. Browser updates, privacy settings,
cleared storage, WebView changes, or spoofing can change the fingerprint.
Therefore fingerprinting should be treated as an anti-abuse signal, not proof
of a physical device identity.
