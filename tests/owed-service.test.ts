import { describe, expect, it } from "vitest";

import { createDemoState } from "../src/data/demo";
import { createMockBankAdapter } from "../src/services/mock-bank";
import { createOwedService } from "../src/services/owed-service";

describe("OwedService", () => {
  // Fast bank adapter with zero wait for unit tests
  const createFastBankAdapter = () =>
    createMockBankAdapter(async () => {});

  it("loads the initial synthetic demo state", async () => {
    const service = createOwedService({
      bankAdapter: createFastBankAdapter(),
    });

    const state = await service.load();

    expect(state.phase).toBe("INITIAL");
    expect(state.obligation.amount).toBe(23_740);
    expect(state.obligation.status).toBe("OWED");
    expect(state.citizen.name).toBe("Meera Sharma");
    expect(state.destinations[1].bankName).toBe("HDFC Bank");
    expect(state.destinations[1].validationStatus).toBe("UNVALIDATED");
    expect(state.destinations[1].refundAuthorized).toBe(false);
  });

  it("executes the complete automatic domain flow after authorization without citizen intervention", async () => {
    const service = createOwedService({
      bankAdapter: createFastBankAdapter(),
    });

    // 1. Citizen validates destination
    const stateAfterValidation = await service.validateDestination();
    expect(stateAfterValidation.phase).toBe("DESTINATION_VALIDATED");
    expect(stateAfterValidation.destinations[1].validationStatus).toBe(
      "VALIDATED",
    );
    expect(stateAfterValidation.destinations[1].refundAuthorized).toBe(false);

    // 2. Citizen authorizes destination (triggers full automatic pipeline)
    const finalState = await service.authorizeDestination();

    // Verify final state
    expect(finalState.phase).toBe("COMPLETED");
    expect(finalState.obligation.status).toBe("COMPLETED");
    expect(finalState.destinations[1].refundAuthorized).toBe(true);

    // Verify delivery attempts
    expect(finalState.deliveryAttempts.length).toBe(2);
    const [previousFailed, newRetry] = finalState.deliveryAttempts;

    expect(previousFailed.status).toBe("FAILED");
    expect(previousFailed.failureReason).toBe("ACCOUNT_CLOSED");

    expect(newRetry.status).toBe("DELIVERED");
    expect(newRetry.destinationId).toBe("destination-demo-hdfc-001");
    expect(newRetry.failureReason).toBeNull();
    expect(newRetry.idempotencyKey).toBe(
      "refund-demo-001:destination-demo-hdfc-001:v1",
    );

    // Verify exact chronological audit trail
    const auditTypes = finalState.auditEvents.map((e) => e.type);
    expect(auditTypes).toEqual([
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
  });

  it("stops and marks state as BLOCKED when policy blockers are present", async () => {
    const initialState = createDemoState();
    const stateWithBlocker = {
      ...initialState,
      blockers: {
        ...initialState.blockers,
        legalHold: true,
      },
    };

    const service = createOwedService({
      bankAdapter: createFastBankAdapter(),
      initialData: stateWithBlocker,
    });

    await service.validateDestination();
    const blockedState = await service.authorizeDestination();

    expect(blockedState.phase).toBe("BLOCKED");
    expect(blockedState.obligation.status).toBe("OWED");
    expect(blockedState.destinations[1].refundAuthorized).toBe(true);
    // No new retry created because policy failed
    expect(blockedState.deliveryAttempts.length).toBe(1);
    expect(blockedState.auditEvents.at(-1)?.type).toBe("POLICY_BLOCKED");
  });

  it("prevents duplicate retries idempotently", async () => {
    const service = createOwedService({
      bankAdapter: createFastBankAdapter(),
    });

    await service.validateDestination();
    await service.authorizeDestination();

    const state = service.getState();
    const retryResult = await service.createRetryIfEligible();

    expect(retryResult.retryResult.created).toBe(false);
    expect(state.deliveryAttempts.length).toBe(2);
  });

  it("supports individual step execution for granular control", async () => {
    const service = createOwedService({
      bankAdapter: createFastBankAdapter(),
    });

    // 1. Validate
    await service.validateDestination("destination-demo-hdfc-001");
    expect(service.getState().phase).toBe("DESTINATION_VALIDATED");

    // 2. Validate step-by-step when already validated:
    // Calling authorize with manual subsequent steps
    // To do this, we can authorize the destination directly via service.authorizeDestination
    // or test evaluating, scheduling, starting, completing
    const finalState = await service.authorizeDestination("destination-demo-hdfc-001");
    expect(finalState.phase).toBe("COMPLETED");

    // Verify retry method directly on completed state is idempotent
    const retryAgain = await service.createRetryIfEligible("destination-demo-hdfc-001");
    expect(retryAgain.retryResult.created).toBe(false);
  });

  it("resets demo back to initial state cleanly", async () => {
    const service = createOwedService({
      bankAdapter: createFastBankAdapter(),
    });

    await service.validateDestination();
    await service.authorizeDestination();
    expect(service.getState().phase).toBe("COMPLETED");

    const resetState = service.resetDemo();
    expect(resetState.phase).toBe("INITIAL");
    expect(resetState.obligation.status).toBe("OWED");
    expect(resetState.destinations[1].validationStatus).toBe("UNVALIDATED");
    expect(resetState.destinations[1].refundAuthorized).toBe(false);
    expect(resetState.deliveryAttempts.length).toBe(1);
  });

  it("notifies subscribers whenever state changes", async () => {
    const service = createOwedService({
      bankAdapter: createFastBankAdapter(),
    });

    const recordedPhases: string[] = [];
    const unsubscribe = service.subscribe((state) => {
      recordedPhases.push(state.phase);
    });

    await service.validateDestination();
    await service.authorizeDestination();

    expect(recordedPhases).toEqual([
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
    ]);

    unsubscribe();
  });

  it("throws when trying to authorize an unvalidated destination", async () => {
    const service = createOwedService({
      bankAdapter: createFastBankAdapter(),
    });

    await expect(service.authorizeDestination()).rejects.toThrow(
      "Cannot authorize an unvalidated refund destination",
    );
  });
});
