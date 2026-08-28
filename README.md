# OWED

OWED is a working civic-tech prototype built around one invariant: a failed delivery attempt does not erase an established government obligation.

The synthetic demo follows Meera Sharma's ₹23,740 income-tax refund from a failed SBI delivery, through HDFC destination repair and deterministic eligibility checks, to one idempotent simulated payment retry. PostgreSQL is the durable source of truth; browser storage is not used.

## Run locally

Requirements: Node.js 20+, npm, and a PostgreSQL/Neon connection string.

1. Copy `.env.example` to `.env.local` and provide `DATABASE_URL`.
2. Run `npm install`.
3. Run `npm run db:migrate`.
4. Run `npm run db:seed`.
5. Run `npm run db:check`.
6. Run `npm run dev` and open `http://localhost:3000`.

`npm run db:seed` is repeatable and restores only the fixed synthetic Meera records. The in-product **Restart Demo** control performs the same scenario reset through the server and database.

## Verification

- `npm test` — Vitest unit and PostgreSQL integration tests
- `npm run test:e2e` — Playwright happy-path browser journey
- `npx tsc --noEmit` — TypeScript
- `npm run lint` — ESLint
- `npm run build` — production build

Database integration tests require `DATABASE_URL`. All values are synthetic; never use real identity, tax, bank-account, payment, or government credentials.

See [WHAT_IS_REAL.md](WHAT_IS_REAL.md) for prototype boundaries and production limitations, and [BUILD_WITH_CODEX.md](BUILD_WITH_CODEX.md) for the documented Codex contribution.
