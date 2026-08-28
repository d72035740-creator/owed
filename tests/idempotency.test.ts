import { describe, expect, it } from "vitest";

import { createDemoState } from "../src/data/demo";
import {
  createRetry,
  createRetryIdempotencyKey,
  evaluateAndCreateRetry,
} from "../src/domain/idempotency";
import type { RefundPolicyInput } from "../src/domain/refund-policy";

function createEligibleInput(): RefundPolicyInput {
  const demo = createDemoState();

  return {
    obligation: demo.obligation,
    previousDelivery: demo.deliveryAttempts[0],
    destination: {
      ...demo.destinations[1],
      validationStatus: "VALIDATED",
      refundAuthorized: true,
    },
    blockers: demo.blockers,
    deliveryAttempts: demo.deliveryAttempts,
  };
}

describe("delivery retry idempotency", () => {
  it("returns the required deterministic key", () => {
    expect(
      createRetryIdempotencyKey(
        "refund-demo-001",
        "destination-demo-hdfc-001",
        1,
      ),
    ).toBe("refund-demo-001:destination-demo-hdfc-001:v1");
  });

  it("creates only one attempt when retry creation is called twice", () => {
    const input = createEligibleInput();
    const first = createRetry(input);
    const second = createRetry({
      ...input,
      deliveryAttempts: first.deliveryAttempts,
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.retry).toBe(first.retry);
    expect(
      second.deliveryAttempts.filter(
        (attempt) => attempt.idempotencyKey === first.idempotencyKey,
      ),
    ).toHaveLength(1);
  });

  it("creates one retry when eligibility evaluation runs twice", () => {
    const input = createEligibleInput();
    const first = evaluateAndCreateRetry(input);
    const second = evaluateAndCreateRetry({
      ...input,
      deliveryAttempts: first.deliveryAttempts,
    });

    expect(first.decision.eligible).toBe(true);
    expect(first.created).toBe(true);
    expect(second.decision.eligible).toBe(false);
    expect(second.created).toBe(false);
    expect(
      second.deliveryAttempts.filter(
        (attempt) => attempt.idempotencyKey === first.idempotencyKey,
      ),
    ).toHaveLength(1);
  });

  it("never creates another retry for a completed obligation", () => {
    const input = createEligibleInput();
    const result = createRetry({
      ...input,
      obligation: { ...input.obligation, status: "COMPLETED" },
    });

    expect(result.created).toBe(false);
    expect(result.retry).toBeNull();
    expect(result.deliveryAttempts).toBe(input.deliveryAttempts);
  });
});
