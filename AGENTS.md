# OWED

OWED is a Build What Moves India civic-tech prototype.

## Core principle

Government obligation != delivery attempt.

A failed delivery attempt must NOT erase an already-established
government obligation.

Example:

obligation.status = OWED
deliveryAttempt.status = FAILED

## Demo scenario

Citizen:
Meera Sharma
46
School teacher

Refund:
₹23,740

Assessment Year:
2026–27

Previous destination:
SBI ••••1028

Previous delivery:
FAILED

Failure reason:
ACCOUNT_CLOSED

New destination:
HDFC Bank ••••4821

Initial:
UNVALIDATED
refundAuthorized = false

All information is synthetic.

Never introduce:
- real PAN
- Aadhaar
- real account numbers
- payment credentials
- government credentials

## Primary journey

₹23,740 still owed
→ repair destination
→ validate HDFC
→ authorize HDFC for refunds
→ automatically evaluate unfinished obligation
→ deterministic safety checks
→ remove Refund Reissue Request
→ create one retry
→ simulated bank delivery
→ obligation completed

The citizen must never click:
- Retry refund
- Refund Reissue
- Submit refund request

That citizen action disappearing is the point.

## Design

Premium editorial civic-tech.

Avoid:
- generic SaaS
- AI slop
- purple gradients
- glassmorphism
- neon
- giant cards
- excessive rounded rectangles
- crypto/fintech dashboard design
- gradient text
- confetti
- chatbot UI
- giant shadows
- meaningless icons

Use:
- warm paper background
- near-black text
- Instrument Serif for editorial statements
- Inter for interface text
- brick red only for failure
- muted green for verified/success
- thin rules
- excellent typography
- large intentional whitespace
- subtle purposeful motion

₹23,740 is the visual protagonist.

## Engineering rules

- deterministic policy logic
- no AI in payment decisions
- explicit state machine
- idempotent retry
- audit events
- mocked external systems clearly disclosed
- all demo data synthetic
- mobile-first
- accessibility
- meaningful tests
- no feature creep

## Important

Do not make large visual or architectural changes without explaining them first.
