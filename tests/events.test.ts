import { describe, expect, it } from "vitest";

import { createDemoState } from "../src/data/demo";
import { createAuditEvent } from "../src/domain/events";
import {
  transitionRefundState,
  type RefundEvent,
} from "../src/domain/state-machine";

describe("audit events", () => {
  it("uses a real runtime timestamp and a canonical message", () => {
    const before = Date.now();
    const event = createAuditEvent({
      id: "refund-demo-001:audit:test",
      type: "POLICY_PASSED",
      metadata: { obligationId: "refund-demo-001" },
    });
    const after = Date.now();

    expect(Date.parse(event.timestamp)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(event.timestamp)).toBeLessThanOrEqual(after);
    expect(event.message).toBe("Automatic payment checks passed");
  });

  it("records the important transitions in the successful journey", () => {
    const events: readonly RefundEvent[] = [
      "BEGIN_DESTINATION_REPAIR",
      "BEGIN_DESTINATION_VALIDATION",
      "DESTINATION_VALIDATION_SUCCEEDED",
      "AUTHORIZE_DESTINATION",
      "BEGIN_POLICY_EVALUATION",
      "POLICY_ELIGIBLE",
      "SCHEDULE_RETRY",
      "PROCESS_RETRY",
      "DELIVERY_SUCCEEDED",
      "COMPLETE_OBLIGATION",
    ];
    const finalState = events.reduce(transitionRefundState, createDemoState());

    expect(finalState.auditEvents.map((event) => event.type)).toEqual([
      "OBLIGATION_CREATED",
      "DELIVERY_FAILED",
      "DESTINATION_VALIDATION_STARTED",
      "DESTINATION_VALIDATED",
      "DESTINATION_AUTHORIZED",
      "POLICY_EVALUATION_STARTED",
      "POLICY_PASSED",
      "RETRY_SCHEDULED",
      "RETRY_PROCESSING",
      "PAYMENT_DELIVERED",
      "OBLIGATION_COMPLETED",
    ]);
    expect(finalState.auditEvents.every((event) => event.message.length > 0)).toBe(
      true,
    );
  });

  it("records blocked policy and failed delivery outcomes", () => {
    const toPolicy: readonly RefundEvent[] = [
      "BEGIN_DESTINATION_REPAIR",
      "BEGIN_DESTINATION_VALIDATION",
      "DESTINATION_VALIDATION_SUCCEEDED",
      "AUTHORIZE_DESTINATION",
      "BEGIN_POLICY_EVALUATION",
    ];
    const policyState = toPolicy.reduce(
      transitionRefundState,
      createDemoState(),
    );
    const blocked = transitionRefundState(policyState, "POLICY_BLOCKED");
    const eligible = transitionRefundState(policyState, "POLICY_ELIGIBLE");
    const processing = (["SCHEDULE_RETRY", "PROCESS_RETRY"] as const).reduce(
      transitionRefundState,
      eligible,
    );
    const failed = transitionRefundState(processing, "DELIVERY_FAILED");

    expect(blocked.auditEvents.at(-1)?.type).toBe("POLICY_BLOCKED");
    expect(failed.auditEvents.at(-1)?.type).toBe("DELIVERY_FAILED");
    expect(failed.obligation.status).toBe("OWED");
  });
});
