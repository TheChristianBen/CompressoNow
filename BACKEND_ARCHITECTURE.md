# Backend and security architecture

## Current architecture

This project is a client-side React + TypeScript application. Its persistence layer uses IndexedDB in the user's browser (`catchup-db`); there is currently no server API, hosted database, or server-side authentication in this repository. Imported conversations and derived items are therefore stored locally in that browser profile, not synchronized between devices.

## Improvements in this revision

- Reuses an IndexedDB connection instead of opening and closing one for every operation.
- Uses the configured database name and schema version consistently.
- Handles unavailable IndexedDB, open failures, blocked upgrades, transaction errors/aborts, and database version changes.
- Keeps multi-record replacement and delete operations within transactions so the changes commit or abort together.
- Reduces repeated token lookups in chat search and deduplicates query tokens before scoring.

## Security and privacy notes

- Treat imported chat exports as sensitive. Anyone with access to the same browser profile may be able to access local app data.
- The current local-first app has no account system or server authorization to secure. Do not describe it as multi-user or cloud-synced.
- Never put service-role keys, private API keys, or other server secrets in `VITE_*` variables or frontend source; Vite exposes those values to the browser.
- If adding a hosted backend, use a server-side API for privileged operations, validate all inputs on the server, and enable row-level security / least-privilege policies in the database. Test policies with unauthenticated and cross-user requests.
- Before deploying, configure the hosting provider to send suitable HTTPS and security headers (at minimum `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a carefully tested Content Security Policy). Header support depends on the hosting platform.
- Establish an export/backup flow before introducing migrations or any operation that could overwrite user data.

## Recommended next architecture step

Keep IndexedDB as the private local cache. If cross-device sync is a real requirement, introduce a hosted backend deliberately (for example, Supabase) with authentication, per-user data ownership, strict row-level security, schema migrations, and server-side validation. Do not add a remote database just to improve a score; it changes the privacy model and requires security configuration.

## Verification checklist

- Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.
- Test first launch, save/load, deleting all data, browser reload, two tabs open during an upgrade, and unavailable/blocked storage.
- Test large chat imports and verify that the UI remains responsive.
- Review browser storage and network requests to ensure chat content is not sent to an external service unexpectedly.
