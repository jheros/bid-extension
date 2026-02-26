# Extension source structure

## Layout

- **`config.js`** – Supabase URL and anon key (edit for your project).

- **`lib/`** – Shared utilities (no Chrome APIs).
  - `constants.js` – Message types, notification defaults, error codes.
  - `datetime.js` – Bangkok time helpers: `getBangkokDateTime`, `parseBangkokDateTimeToUtcMs`, `getBangkokDateTimeLocal`, `formatDateTime`, `toAppliedAtUtcIso`.
  - `platform.js` – `detectPlatformFromUrl(url)` for job board detection.

- **`services/`** – Background-only business logic.
  - `notifications.js` – `showNotification(options)`.
  - `auth.js` – Facade: `signIn(email, password)`, `signOut()` (dispatches to Supabase or backend).
  - `applications.js` – Facade: `saveApplication(data)` (dispatches to Supabase or backend).
  - `supabase/` – `client.js`, `auth.js`, `applications.js`.
  - `backend/` – `auth.js`, `applications.js`.
  - `ai/openrouter.js` – `extractJobInfoWithAI(data)`.

- **`background/index.js`** – Message router: handles `MESSAGE_TYPES` and delegates to services.

- **`content/`** – Content script entry and styles.

- **`components/`** – React UI (App, TabBtn).

- **`utils/`** – Content-side helpers (e.g. `jobExtractor.js` for DOM extraction).

## Usage

- **Adding a message type:** extend `lib/constants.js` and add a case in `background/index.js`.
- **Changing Supabase/backend behavior:** edit the corresponding file under `services/supabase/` or `services/backend/`.
- **Reusing datetime/platform:** import from `lib/datetime.js` or `lib/platform.js`.
