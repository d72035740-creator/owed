import { describe, expect, it } from "vitest";

import { createDemoState } from "../src/data/demo";
import {
  evaluateRefundPolicy,
  type RefundPolicyInput,
} from "../src/domain/refund-policy";

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

describe("refund policy", () => {
  it.each(["ACCOUNT_CLOSED", "INVALID_ACCOUNT"] as const)(
    "allows automatic resume for the destination failure %s",
    (failureReason) => {
      const input = createEligibleInput();
      const result = evaluateRefundPolicy({
        ...input,
        previousDelivery: { ...input.previousDelivery, failureReason },
      });

      expect(result).toEqual({
        eligible: true,
        checks: [
          {
            id: "refund-remains-unpaid",
            label: "Refund remains unpaid",
            passed: true,
          },
          {
            id: "previous-delivery-failed",
            label: "Previous delivery failed",
            passed: true,
          },
          {
            id: "destination-related-failure",
            label: "Failure was destination-related",
            passed: true,
          },
          {
            id: "destination-validated",
            label: "New destination validated",
            passed: true,
          },
          {
            id: "destination-authorized",
            label: "Refund destination authorized",
            passed: true,
          },
          {
            id: "no-payment-blocker",
            label: "No payment blocker",
            passed: true,
          },
        ],
      });
    },
  );

  it.each(["BLOCKED", "COMPLETED"] as const)(
    "rejects an obligation with status %s",
    (status) => {
      const input = createEligibleInput();
      const result = evaluateRefundPolicy({
        ...input,
        obligation: { ...input.obligation, status },
      });

      expect(result.eligible).toBe(false);
      expect(result.checks[0]).toMatchObject({ passed: false });
    },
  );

  it("rejects a previous delivery that did not fail", () => {
    const input = createEligibleInput();
    const result = evaluateRefundPolicy({
      ...input,
      previousDelivery: {
        ...input.previousDelivery,
        status: "DELIVERED",
        failureReason: null,
      },
    });

    expect(result.eligible).toBe(false);
    expect(result.checks[1]).toMatchObject({ passed: false });
  });

  it("rejects a failure unrelated to the destination", () => {
    const input = createEligibleInput();
    const result = evaluateRefundPolicy({
      ...input,
      previousDelivery: {
        ...input.previousDelivery,
        failureReason: "BANK_REJECTED",
      },
    });

    expect(result.eligible).toBe(false);
    expect(result.checks[2]).toMatchObject({ passed: false });
  });

  it("requires a validated and authorized destination", () => {
    const input = createEligibleInput();
    const result = evaluateRefundPolicy({
      ...input,
      destination: {
        ...input.destination,
        validationStatus: "UNVALIDATED",
        refundAuthorized: false,
      },
    });

    expect(result.eligible).toBe(false);
    expect(result.checks[3]).toMatchObject({ passed: false });
    expect(result.checks[4]).toMatchObject({ passed: false });
  });

  it.each(
    ["legalHold", "adjustmentPending", "identityConflict"] as const,
  )("rejects the blocker %s", (blocker) => {
    const input = createEligibleInput();
    const result = evaluateRefundPolicy({
      ...input,
      blockers: { ...input.blockers, [blocker]: true },
    });

    expect(result.eligible).toBe(false);
    expect(result.checks[5]).toMatchObject({ passed: false });
  });

  it.each(["SCHEDULED", "PROCESSING"] as const)(
    "rejects an active retry with status %s",
    (status) => {
      const input = createEligibleInput();
      const result = evaluateRefundPolicy({
        ...input,
        deliveryAttempts: [
          ...input.deliveryAttempts,
          {
            id: "delivery-demo-retry-001",
            obligationId: input.obligation.id,
            destinationId: input.destination.id,
            status,
            failureReason: null,
            idempotencyKey: "refund-demo-001:destination-demo-hdfc-001:retry-1",
          },
        ],
      });

      expect(result.eligible).toBe(false);
      expect(result.checks[5]).toMatchObject({ passed: false });
    },
  );

  it("is deterministic and does not mutate its input", () => {
    const input = createEligibleInput();
    const before = JSON.stringify(input);

    expect(evaluateRefundPolicy(input)).toEqual(evaluateRefundPolicy(input));
    expect(JSON.stringify(input)).toBe(before);
  });
});
