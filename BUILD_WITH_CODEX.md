# Build with Codex

OpenAI Codex was used as a repository-level implementation and review collaborator for this prototype. Its work included creating and reviewing the domain model, deterministic policy and state machine, PostgreSQL repositories and transaction boundaries, idempotency/concurrency tests, mock integration adapters, frontend/backend integration, the Playwright journey, and final type/lint/build/runtime validation.

Codex did not make payment decisions at runtime. The product's eligibility decision is ordinary deterministic TypeScript, covered by tests. All external integrations and all citizen data in the demo are synthetic.

Human direction defined the central obligation-versus-delivery invariant, the Meera scenario, the product flow, the visual constraints, and the submission requirements. Repository history and the test suite are the evidence for the implementation and validation work; this document does not claim autonomous production deployment or real government/bank integration.
