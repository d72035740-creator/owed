# What is real

## Implemented in the prototype

- PostgreSQL/Neon persistence for users, obligations, destinations, delivery attempts, and audit events
- Drizzle schema, migration, seed, repositories, and short transaction boundaries
- deterministic refund-resumption policy and explicit lifecycle guards
- database-unique idempotency protection for retry creation, including concurrent calls
- atomic destination authorization/retry scheduling and payment completion
- database-derived API responses, policy checks, timeline, and completion state
- a complete Next.js/React browser journey and Playwright coverage

## Simulated

- the citizen and all financial records are synthetic
- the Income Tax source adapter is a replaceable in-process mock
- HDFC destination validation waits deterministically and returns success; no bank account is contacted
- payment delivery waits deterministically and returns success; no payment rail or real money movement exists

The interface labels the record and bank activity as synthetic/simulated. OWED is not connected to the Income Tax Department, HDFC, SBI, NPCI, RBI, or any government identity provider.

## Required for production

A production service would require authenticated citizen identity and access control; an authoritative refund-obligation integration; approved bank validation and payment providers; provider-side idempotency and external payment references; a durable asynchronous worker; status lookup and reconciliation; retry and operational exception handling; monitoring, metrics, alerts, security and secrets management; compliance controls; and disaster recovery.

There is a known crash window after an external provider reports success but before the local completion transaction commits. The prototype passes the stable retry idempotency key to the adapter, but it does not claim full reconciliation. Production must store the provider reference, look up provider status by that stable key, and reconcile local state before attempting payment again.
