# Arunalu Loan Manager

Modern loan and collections management portal for Arunalu Investments. The app centralises administrator access, customer onboarding, loan lifecycle tracking, payment reconciliation, arrears monitoring, and Bluetooth receipt printing in an immersive Next.js experience tuned for daily field use.

## Key Capabilities

- **Role-gated access** for super admins and admins with JWT session cookies.
- **Customer registry** with sequential IDs and granular locality metadata.
- **Loan orchestration** supporting automated schedules, interest computation, and status auditing.
- **Payment operations** with validation, arrears roll-ups, and optional receipt email/SMS dispatch.
- **Dashboard insights** summarising capital, profit, user/loan states, and arrears at a glance.
- **Email OTP security** enforced during administrator login and password recovery flows.
- **Bluetooth device pairing** via the Web Bluetooth API for portable receipt printers.

## Tech Stack

- [Next.js 14 (App Router)](https://nextjs.org/)
- [React 18](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [MongoDB + Mongoose](https://mongoosejs.com/)
- [Zod](https://zod.dev/) schema validation
- [TanStack Query](https://tanstack.com/query/latest) + [Zustand](https://zustand-demo.pmnd.rs/) state
- [Tailwind CSS](https://tailwindcss.com/)
- [Nodemailer](https://nodemailer.com/) for transactional email
- [Web Bluetooth API](https://developer.mozilla.org/docs/Web/API/Web_Bluetooth_API)

## Getting Started

```bash
npm install
npm run dev
```

The UI will be served on `http://localhost:3000`.

### Production Build

```bash
npm run build
npm run start
```

### Code Quality

```bash
npm run lint
```

## Required Environment Variables

Create or update `.env.local` with the following keys.

```dotenv
# Database
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>/<db>?retryWrites=true&w=majority"

# Authentication
JWT_SECRET="replace-with-long-random-string"
JWT_EXPIRES_IN="7d" # accepts values understood by jsonwebtoken (e.g. 1d, 12h, 604800)

# App URLs (used in emails)
APP_URL="https://arunalu.example.com" # change to your deployed origin

# Email / OTP delivery (SMTP or provider API)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="no-reply@arunalu.lk"
SMTP_PASSWORD="app-password" # use an app password for Gmail
MAIL_FROM_ADDRESS="no-reply@arunalu.lk"
MAIL_FROM_NAME="Arunalu Investments"

# Optional: API key for third-party email provider (if you swap SMTP out)
MAIL_PROVIDER_API_KEY="replace-with-provider-api-key"

# Notify.lk SMS (optional but required for SMS alerts)
NOTIFYLK_USER_ID=""
NOTIFYLK_API_KEY=""
NOTIFYLK_SENDER_ID=""
```

> **Note:** The `.env.local` file is git-ignored. Do not commit secrets. Use an app password if you rely on Gmail SMTP.

## Project Structure

```text
loan-manager/
├── public/                 # Static assets
├── src/
│   ├── app/                # Next.js app router pages & layouts
│   │   ├── (auth)/         # Authentication flows (login, reset, etc.)
│   │   ├── (dashboard)/    # Authenticated dashboard surface
│   │   ├── api/            # Route handlers (REST endpoints)
│   │   ├── globals.css     # Tailwind base & custom theming
│   │   └── layout.tsx      # Root app layout
│   ├── components/
│   │   ├── layout/         # Sidebar/topbar wrappers
│   │   ├── loans/          # Loan detail client components
│   │   ├── dashboard/      # KPI/stat cards
│   │   └── ui/             # Reusable styled primitives (button, input…)
│   ├── lib/                # Shared utilities (auth, db, calculations, mailer)
│   ├── models/             # Mongoose schemas
│   └── store/              # Client-side Zustand stores
├── tailwind.config.ts      # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # Project documentation
```

### Directory Deep Dive

| Path | Description |
| --- | --- |
| `src/app/(auth)` | Client-rendered authentication experiences with glassmorphism styling, Suspense-wrapped routing helpers, and shared layout. |
| `src/app/(dashboard)` | Protected dashboard shell integrating sidebar, topbar, and feature pages (customers, loans, payments, settings). |
| `src/app/api` | Fully typed Next.js route handlers enforcing auth, validation, and business rules for CRUD operations. |
| `src/components` | Design system primitives and feature-focused components (confirm dialogs, stat cards, loan history). |
| `src/lib` | Cross-cutting concerns — database connector, JWT helpers, mailing, dashboard aggregation, loan/payment math. |
| `src/models` | Mongoose schemas for `User`, `Customer`, `Loan`, and `Payment`. |
| `src/store` | Zustand store for auth session snapshotting across client routes. |

## Administrator Bootstrapping

When the database is empty, the first registered account automatically becomes a `superadmin`. Subsequent registrations default to `admin`. To seed additional administrators without hitting the public registration endpoint:

1. Add a JSON payload to `.env.local`:

   ```dotenv
   SEED_ADMINS='[{"name":"Portal Owner","email":"owner@example.com","password":"ChangeMe123!","role":"superadmin"}]'
   ```

2. Execute the script:

   ```bash
   npx ts-node --project tsconfig.json scripts/seed-admins.ts
   ```

Entries with existing emails are skipped safely. Remove the `SEED_ADMINS` variable afterwards to avoid accidental reseeding.

## SMS Notifications (Notify.lk)

To enable SMS receipts:

1. Create an account at [notify.lk](https://notify.lk/) and activate your sender ID.
2. Generate an API key and note your `user_id`, `api_key`, and approved `sender_id`.
3. Add the values to `.env.local` (`NOTIFYLK_USER_ID`, `NOTIFYLK_API_KEY`, `NOTIFYLK_SENDER_ID`).
4. Restart the dev server or redeploy so the environment variables are loaded.

When a payment is recorded you can trigger SMS receipts from the Payments screen.

## Operational Notes

- **JWT Cookies:** `AUTH_COOKIE` is httpOnly and same-site `lax`; update `JWT_SECRET` in production and rotate regularly.
- **Receipts:** Email and SMS notices are triggered manually from the Payments screen. If SMTP is not configured, emails fall back to logging the payload — useful during development.
- **Bluetooth Pairing:** Browsers require secure contexts (HTTPS) and user gesture to initiate device discovery.
- **MongoDB Connections:** The connection helper caches the Mongoose instance to avoid handler cold-start churn.

## Troubleshooting

- Run `npm run build` to surface type/lint issues outside of the dev server.
- Verify `.env.local` line endings if you copy/paste multi-line URIs (single line only).
- Mongo connection errors often stem from IP whitelist or DNS SRV records — test your URI with the Mongo shell.

---

For enhancements or questions, document findings in issues before altering production-critical flows (auth, payments, loan schedule maths).


