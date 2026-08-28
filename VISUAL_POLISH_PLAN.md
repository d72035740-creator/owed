# OWED — Visual Polish & Frontend Execution Blueprint

> **Status:** Approved Execution Blueprint (Aligned with Editorial Civic-Tech Rules)  
> **Core Axiom:** *Government obligation != delivery attempt.* Failure breaks the delivery attempt; it does not erase the citizen's established right.  
> **Design Tone:** Premium editorial civic-tech · Serious public financial infrastructure · Honest synthetic prototype (No fake statutory claims, No fake NPCI claims).

---

## The Approved 5 Implementation Priorities

```
+=======================================================================================+
| PRIORITY STACK (EXECUTE UPON BACKEND INTEGRATION HANDOFF)                             |
+---+-----------------------------------+-----------------------------------------------+
| 1 | Opening Hero (Dual-State Invariant)| ₹23,740 + "Government obligation: Still active"|
|   |                                   | vs "Previous delivery: Failed" above the fold |
| 2 | Signature 1.5s Elimination Sequence| Authorize → Checks → ~~Reissue~~ → Resume     |
| 3 | "0 Reapplications" Dominant Metric | 80-96px hero "0" + eliminate reissue friction  |
| 4 | Typography, Materiality & CTA     | Instrument Serif, Inter, #F4F0E8, 6px CTA     |
| 5 | Simple Continuous Route Metaphor  | Vertical unbroken obligation rail + branches  |
+---+-----------------------------------+-----------------------------------------------+
```

---

## 1. Opening Hero (P0 — Immediate Visual Invariant)

### Layout & Copy Lockup
Make the first viewport instantly communicate the core principle without requiring the judge to read a dense table:

```text
UNFINISHED GOVERNMENT PAYMENT

We still owe you

₹23,740

─────────────────────────────────────────────────────────────────────────────
Government obligation        STILL ACTIVE
Previous delivery            FAILED · SBI ••••1028 (Account closed)
─────────────────────────────────────────────────────────────────────────────

"The payment failed. What government owed you didn't."

[ Fix where my refund goes                                                 → ]
```

### Exact Specifications
- **Eyebrow:** `UNFINISHED GOVERNMENT PAYMENT` — Inter 11px / weight 650 / tracking `+0.12em` uppercase / `#706B61`.
- **Pre-heading:** `We still owe you` — Instrument Serif 24px / `#181713`.
- **Protagonist Amount:** `₹23,740` — Instrument Serif 108px (desktop) / 64px (mobile) / `tabular-nums` / line-height `0.82`.
- **Status Contrast Strip:**
  - 1px hairline border top and bottom (`#D8D0C3`).
  - Left label: `Government obligation` → Right value: `STILL ACTIVE` (Muted green `#2E6552` or solid Charcoal `#181713`, weight 700).
  - Left label: `Previous delivery` → Right value: `FAILED` (Brick red `#A33B32`, weight 700) `· SBI ••••1028 (Account closed)`.
- **Editorial Central Thesis:**  
  *"The payment failed. What government owed you didn't."* — Instrument Serif 28px desktop / 20px mobile / italic or regular display / `#181713`.
- **Primary CTA:**
  - `[ Fix where my refund goes → ]`
  - Height `48px`, padding `0 24px`, border-radius `6px` (sharp/architectural, not pill), bg `#181713`, text `#F4F0E8`.
  - Arrow micro-interaction: `transform: translateX(3px)` on hover.
  - Optional subtext: `Choose a valid refund destination`.

---

## 2. Signature Reissue Elimination Sequence (P0 — 1.5s Fast & Deliberate)

### Choreography Timeline (1.4s – 1.7s Total)
Fast, intentional, and crisp for live demos and video recordings without lagging:

```text
  0ms     Citizen clicks "Authorize HDFC for refunds"
          └─ Button reflects active state: "Checking unfinished payments…"

200ms     Inline status appears: "Checking unfinished payments…"
          └─ Subtle hairline pulse

400ms     Header reveals: "We still owe you ₹23,740"

500ms     Check 1: Refund remains unpaid                 ✓ [SATISFIED]
600ms     Check 2: Previous delivery failed              ✓ [SATISFIED]
700ms     Check 3: Failure was destination-related       ✓ [SATISFIED]
800ms     Check 4: New destination validated             ✓ [SATISFIED]
900ms     Check 5: Refund destination authorized         ✓ [SATISFIED]
1000ms    Check 6: No payment blocker                    ✓ [SATISFIED]

1100ms    Legacy requirement card renders:
          ┌────────────────────────────────────────────────────────┐
          │  Citizen action removed:                               │
          │  Refund Reissue Request                                │
          └────────────────────────────────────────────────────────┘

1200ms    Brick-red rule (1.5px, #A33B32) strikes across "Refund Reissue Request" (200ms duration)

1400ms    Card dims (opacity: 0.25) and collapses (height -> 0, margin -> 0, overflow: hidden)

1550ms    Resolution Box Springs Into Position:
          ┌────────────────────────────────────────────────────────┐
          │  ✓ PAYMENT RESUMED AUTOMATICALLY                       │
          │  You fixed the destination. You don't need to request  │
          │  the same refund again.                                │
          └────────────────────────────────────────────────────────┘
```

### Approved Language Rules
- **No** fake form numbers (e.g. ❌ `Form 31-A`).
- **No** hackathon badges (e.g. ❌ `BYPASSED BY OWED` or ❌ `Deterministic Policy Passed`).
- **Keep clean & human:**  
  `~~Refund Reissue Request~~`  
  → **Payment resumed automatically**  
  *You fixed the destination. You don't need to request the same refund again.*

---

## 3. "0 Reapplications" Ending Dominance (P0 — Hero Metric)

### Resolution View Composition
Avoid 3 equal boxes. Position `0` as the undeniable victory metric:

```text
                                  ₹23,740
                                 DELIVERED
                            To HDFC Bank ••••4821


                                     0
                              REAPPLICATIONS

                    You repaired one thing: where the refund
                    should go. You never requested the refund again.


                    The delivery failed.
                    What government owed you didn't.
```

### Exact Specifications
- **Delivered Amount:** `₹23,740` in muted deep green `#2E6552` (Instrument Serif 64px).
- **Hero Zero Metric:**
  - Digit `0` rendered in Instrument Serif at **88px** desktop / **56px** mobile (`tabular-nums`).
  - Label below: `REAPPLICATIONS` (Inter 12px bold, letter-spacing `0.1em`, uppercase).
- **Supporting Editorial Copy:**  
  *"You repaired one thing: where the refund should go. You never requested the refund again."*
- **Audit Context:**
  - Small secondary chips: `1 failed delivery (SBI)` · `1 destination repair (HDFC)`.
- **Explicit Exclusions:**
  - ❌ **Do NOT include** `"Total citizen time saved: 14–21 business days"`.

---

## 4. Typography, Materiality & CTA (P1 — Visual Craft)

### Design Tokens
- **Background Canvas:** Warm paper `#F4F0E8`.
- **Primary Ink:** Deep charcoal `#181713`.
- **Muted Text:** Neutral stone `#706B61`.
- **Hairline Rules:** 1px solid `#D8D0C3`.
- **Failure Accent:** Restrained brick red `#A33B32`.
- **Success Accent:** Muted deep forest green `#2E6552`.
- **Subtle Surface Noise:** SVG fractal noise at `0.022` opacity with `pointer-events: none`.

### Typography Rules
- **Display & Statements:** `Instrument Serif` (Hero amounts, section headings, thesis statements).
- **Interface & Data:** `Inter` / `Source Sans 3` (Labels, buttons, audit messages, status pills).
- **Numerals:** Strictly `font-variant-numeric: tabular-nums lining-nums;` across all figures, account digits, years, timestamps.

### CTA Architecture
- Sharp `6px` radius (`--radius-sm: 6px`).
- Deep charcoal fill `#181713` with off-white text `#F4F0E8`.
- Subtle tactile hover lift (`translateY(-1px)`) and arrow glide (`translateX(3px)`).

---

## 5. Simple Continuous Route Metaphor (P1 — `ObligationRoute.tsx`)

### Visual Circuit Concept
A clean, vertical timeline showing that the **sovereign obligation line never breaks**, while the failed SBI delivery branch terminates and HDFC repairs it:

```text
    REFUND APPROVED
          │
          ● ₹23,740 STILL OWED  (Continuous vertical line)
          │
          ├─── SBI ••••1028
          │         × Delivery failed (Account closed)
          │
          └─── HDFC ••••4821
                    ✓ Destination repaired
                    │
                    ✓ Safety checks passed
                    │
                    ● Payment resumed automatically
                    │
                    ✓ Delivered
```

### Styling
- Continuous solid vertical rule (1.5px `#181713`).
- Broken branch: Muted red marker `×` with `#A33B32`.
- Repaired branch: Muted green marker `✓` with `#2E6552`.
- Zero complex transit / subway UI slop — just pure, elegant typographic routing.

---

## Prohibited Elements (Do Not Implement)

| Prohibited Item | Why Excluded |
| :--- | :--- |
| ❌ **Fake Statute Inspector** (`IT Act Sec 244A`) | We must not invent statutory names or claims. |
| ❌ **NPCI / Penny Drop Claims** | Backend is a mock bank adapter; say *"Checking account…"*, *"Validated"*, *"Simulated bank validation"*. |
| ❌ **`[NPCI GATEWAY]` Actor Tags** | Use only authentic actors: `CITIZEN`, `OWED`, `SIMULATED BANK`. |
| ❌ **"14–21 Days Saved" Metric** | Unsubstantiated claim that invites judge scrutiny. |
| ❌ **Audio Haptics / Sound Effects** | Distracting and unnecessary for civic infrastructure. |
| ❌ **Export PDF Button** | Feature creep outside core demo loop. |
| ❌ **Amount Count-Up Animation** | ₹23,740 is an existing obligation, not accumulating points. |
| ❌ **Raw Technical Code IDs in Hero UI** | Main flow uses human checks; keep raw IDs out of the primary narrative. |

---

## Final QA Checklist

- [ ] Hero dual-state (Obligation Active vs Delivery Failed) visible without scrolling.
- [ ] Signature animation executes within ~1.5 seconds.
- [ ] "Refund Reissue Request" is visibly struck through and collapses.
- [ ] Resolution screen prominently displays the large `0 REAPPLICATIONS` metric.
- [ ] All financial numerals are strictly tabular.
- [ ] No fake statutes, no fake NPCI / penny-drop claims.
- [ ] Background is warm `#F4F0E8` with 1px `#D8D0C3` rules and sharp 6px buttons.
