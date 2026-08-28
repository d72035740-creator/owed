import { describe, expect, it } from "vitest";

import { createDemoState } from "../src/data/demo";
import { createAuditEvent } from "../src/domain/events";
import type { RefundPolicyCheck } from "../src/domain/refund-policy";
import { toConsumerRefundState } from "../src/services/consumer-refund";

const checks: readonly RefundPolicyCheck[] = [
  { id: "refund-remains-unpaid", label: "Refund remains unpaid", passed: true },
  { id: "no-payment-blocker", label: "No payment blocker", passed: true },
];

describe("consumer refund mapper", () => {
  it("maps persisted policy checks and strips internal state", () => {
    const state = createDemoState();
    const consumer = toConsumerRefundState({
      ...state,
      phase: "RETRY_SCHEDULED",
      auditEvents: [
        ...state.auditEvents,
        createAuditEvent({
          id: "policy-passed",
          type: "POLICY_PASSED",
          metadata: { checks },
        }),
      ],
    });

    expect(consumer.refund.displayAmount).toBe("₹23,740");
    expect(consumer.checks).toEqual(checks);
    expect(consumer.previousPayment).toMatchObject({
      bankName: "SBI",
      maskedAccount: "••••1028",
      reason: "Account closed",
    });
    expect(JSON.stringify(consumer)).not.toContain("idempotencyKey");
    expect(JSON.stringify(consumer)).not.toContain("legalHold");
  });

  it("derives the required completed outcome metrics from persisted events", () => {
    const state = createDemoState();
    const consumer = toConsumerRefundState({
      ...state,
      phase: "COMPLETED",
      obligation: { ...state.obligation, status: "COMPLETED" },
      auditEvents: [
        ...state.auditEvents,
        createAuditEvent({
          id: "destination-validated",
          type: "DESTINATION_VALIDATED",
        }),
      ],
    });

    expect(consumer.metrics).toEqual({
      failedDeliveries: 1,
      destinationRepairs: 1,
      reapplications: 0,
    });
  });
});
