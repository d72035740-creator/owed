import { describe, expect, it } from "vitest";

import { createDemoState } from "../src/data/demo";
import {
  InvalidStateTransitionError,
  transitionRefundState,
  type RefundEvent,
  type RefundPhase,
  type RefundState,
} from "../src/domain/state-machine";

function applyEvents(
  initialState: RefundState,
  events: readonly RefundEvent[],
): RefundState {
  return events.reduce(transitionRefundState, initialState);
}

describe("refund state machine", () => {
  it("supports the complete successful lifecycle", () => {
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
    const expectedPhases: readonly RefundPhase[] = [
      "DESTINATION_REPAIR",
      "VALIDATING_DESTINATION",
      "DESTINATION_VALIDATED",
      "DESTINATION_AUTHORIZED",
      "POLICY_EVALUATING",
      "ELIGIBLE",
      "RETRY_SCHEDULED",
      "RETRY_PROCESSING",
      "DELIVERED",
      "COMPLETED",
    ];
    let state: RefundState = createDemoState();

    events.forEach((event, index) => {
      state = transitionRefundState(state, event);
      expect(state.phase).toBe(expectedPhases[index]);
    });

    expect(state.obligation.status).toBe("COMPLETED");
  });

  it("keeps policy blocking separate from the obligation status", () => {
    const state = applyEvents(createDemoState(), [
      "BEGIN_DESTINATION_REPAIR",
      "BEGIN_DESTINATION_VALIDATION",
      "DESTINATION_VALIDATION_SUCCEEDED",
      "AUTHORIZE_DESTINATION",
      "BEGIN_POLICY_EVALUATION",
      "POLICY_BLOCKED",
    ]);

    expect(state.phase).toBe("BLOCKED");
    expect(state.obligation.status).toBe("OWED");
    expect(transitionRefundState(state, "REEVALUATE_POLICY").phase).toBe(
      "POLICY_EVALUATING",
    );
  });

  it("keeps the obligation owed when delivery fails", () => {
    const state = applyEvents(createDemoState(), [
      "BEGIN_DESTINATION_REPAIR",
      "BEGIN_DESTINATION_VALIDATION",
      "DESTINATION_VALIDATION_SUCCEEDED",
      "AUTHORIZE_DESTINATION",
      "BEGIN_POLICY_EVALUATION",
      "POLICY_ELIGIBLE",
      "SCHEDULE_RETRY",
      "PROCESS_RETRY",
      "DELIVERY_FAILED",
    ]);

    expect(state.phase).toBe("DELIVERY_FAILED");
    expect(state.obligation.status).toBe("OWED");
    expect(transitionRefundState(state, "BEGIN_DESTINATION_REPAIR").phase).toBe(
      "DESTINATION_REPAIR",
    );
  });

  it("does not complete the obligation before the completed phase", () => {
    const delivered = applyEvents(createDemoState(), [
      "BEGIN_DESTINATION_REPAIR",
      "BEGIN_DESTINATION_VALIDATION",
      "DESTINATION_VALIDATION_SUCCEEDED",
      "AUTHORIZE_DESTINATION",
      "BEGIN_POLICY_EVALUATION",
      "POLICY_ELIGIBLE",
      "SCHEDULE_RETRY",
      "PROCESS_RETRY",
      "DELIVERY_SUCCEEDED",
    ]);

    expect(delivered.phase).toBe("DELIVERED");
    expect(delivered.obligation.status).toBe("OWED");

    const completed = transitionRefundState(
      delivered,
      "COMPLETE_OBLIGATION",
    );
    expect(completed.phase).toBe("COMPLETED");
    expect(completed.obligation.status).toBe("COMPLETED");
  });

  it("guards invalid transitions without changing the state", () => {
    const initial = createDemoState();

    expect(() => transitionRefundState(initial, "PROCESS_RETRY")).toThrow(
      InvalidStateTransitionError,
    );
    expect(initial.phase).toBe("INITIAL");
    expect(initial.obligation.status).toBe("OWED");
  });

  it("does not permit transitions after completion", () => {
    const completed = applyEvents(createDemoState(), [
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
    ]);

    expect(() =>
      transitionRefundState(completed, "BEGIN_DESTINATION_REPAIR"),
    ).toThrow(InvalidStateTransitionError);
  });
});
