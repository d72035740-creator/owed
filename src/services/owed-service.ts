import { createDemoState, type DemoState } from "../data/demo";
import { createRetry, type RetryCreationResult } from "../domain/idempotency";
import {
  evaluateRefundPolicy,
  type RefundPolicyDecision,
} from "../domain/refund-policy";
import {
  transitionRefundState,
  type RefundEvent,
} from "../domain/state-machine";
import type { DeliveryAttempt, RefundDestination } from "../domain/types";
import { createMockBankAdapter, type MockBankAdapter } from "./mock-bank";
import {
  createMockIncomeTaxAdapter,
  type MockIncomeTaxAdapter,
} from "./mock-income-tax";

export interface OwedServiceOptions {
  readonly bankAdapter?: MockBankAdapter;
  readonly incomeTaxAdapter?: MockIncomeTaxAdapter;
  readonly initialData?: DemoState;
}

export interface EvaluateObligationResult {
  readonly state: DemoState;
  readonly decision: RefundPolicyDecision;
}

export interface RetryResult {
  readonly state: DemoState;
  readonly retryResult: RetryCreationResult;
}

export interface OwedService {
  getState(): DemoState;
  load(): Promise<DemoState>;
  resetDemo(): DemoState;
  validateDestination(destinationId?: string): Promise<DemoState>;
  authorizeDestination(destinationId?: string): Promise<DemoState>;
  evaluateOutstandingObligation(
    destinationId?: string,
  ): Promise<EvaluateObligationResult>;
  createRetryIfEligible(destinationId?: string): Promise<RetryResult>;
  startRetry(attemptId?: string): Promise<DemoState>;
  completePayment(attemptId?: string): Promise<DemoState>;
  subscribe(listener: (state: DemoState) => void): () => void;
}

export function createOwedService(
  options: OwedServiceOptions = {},
): OwedService {
  const bankAdapter = options.bankAdapter ?? createMockBankAdapter();
  const incomeTaxAdapter =
    options.incomeTaxAdapter ?? createMockIncomeTaxAdapter();

  let state: DemoState = options.initialData
    ? { ...options.initialData }
    : createDemoState();

  const listeners = new Set<(state: DemoState) => void>();

  function notify(): void {
    for (const listener of listeners) {
      listener(state);
    }
  }

  function applyTransition(event: RefundEvent): void {
    const nextRefundState = transitionRefundState(state, event);
    state = {
      ...state,
      ...nextRefundState,
    };
    notify();
  }

  function findDestination(
    destinationId?: string,
  ): RefundDestination | undefined {
    if (destinationId) {
      return state.destinations.find((dest) => dest.id === destinationId);
    }
    // Default to the first unvalidated/repaired destination, or last destination
    return (
      state.destinations.find(
        (dest) => dest.validationStatus === "UNVALIDATED",
      ) ?? state.destinations.at(-1)
    );
  }

  return {
    getState(): DemoState {
      return state;
    },

    async load(): Promise<DemoState> {
      return state;
    },

    resetDemo(): DemoState {
      state = options.initialData
        ? { ...options.initialData }
        : createDemoState();
      notify();
      return state;
    },

    subscribe(listener: (state: DemoState) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async validateDestination(destinationId?: string): Promise<DemoState> {
      const destination = findDestination(destinationId);
      if (!destination) {
        throw new Error(
          `Refund destination not found: ${destinationId ?? "default"}`,
        );
      }

      if (state.phase === "INITIAL") {
        applyTransition("BEGIN_DESTINATION_REPAIR");
      }

      if (state.phase === "DESTINATION_REPAIR") {
        applyTransition("BEGIN_DESTINATION_VALIDATION");
      }

      const validationResult =
        await bankAdapter.validateDestination(destination);

      state = {
        ...state,
        destinations: state.destinations.map((dest) =>
          dest.id === validationResult.destination.id
            ? validationResult.destination
            : dest,
        ),
      };
      applyTransition("DESTINATION_VALIDATION_SUCCEEDED");

      return state;
    },

    async evaluateOutstandingObligation(
      destinationId?: string,
    ): Promise<EvaluateObligationResult> {
      const destination = findDestination(destinationId);
      if (!destination) {
        throw new Error(
          `Refund destination not found: ${destinationId ?? "default"}`,
        );
      }

      const previousDelivery =
        state.deliveryAttempts.find((attempt) => attempt.status === "FAILED") ??
        (await incomeTaxAdapter.getPreviousDelivery());

      if (state.phase === "BLOCKED") {
        applyTransition("REEVALUATE_POLICY");
      } else if (state.phase === "DESTINATION_AUTHORIZED") {
        applyTransition("BEGIN_POLICY_EVALUATION");
      }

      const decision = evaluateRefundPolicy({
        obligation: state.obligation,
        previousDelivery,
        destination,
        blockers: state.blockers,
        deliveryAttempts: state.deliveryAttempts,
      });

      if (decision.eligible) {
        applyTransition("POLICY_ELIGIBLE");
      } else {
        applyTransition("POLICY_BLOCKED");
      }

      return {
        state,
        decision,
      };
    },

    async createRetryIfEligible(
      destinationId?: string,
    ): Promise<RetryResult> {
      const destination = findDestination(destinationId);
      if (!destination) {
        throw new Error(
          `Refund destination not found: ${destinationId ?? "default"}`,
        );
      }

      const retryResult = createRetry({
        obligation: state.obligation,
        destination,
        deliveryAttempts: state.deliveryAttempts,
      });

      if (retryResult.retry && state.phase === "ELIGIBLE") {
        state = {
          ...state,
          deliveryAttempts: retryResult.deliveryAttempts,
        };
        applyTransition("SCHEDULE_RETRY");
      }

      return {
        state,
        retryResult,
      };
    },

    async startRetry(attemptId?: string): Promise<DemoState> {
      const attempt = attemptId
        ? state.deliveryAttempts.find((a) => a.id === attemptId)
        : state.deliveryAttempts.find((a) => a.status === "SCHEDULED");

      if (!attempt) {
        throw new Error(
          `No scheduled delivery attempt found to start: ${attemptId ?? "default"}`,
        );
      }

      const processingAttempt: DeliveryAttempt = {
        ...attempt,
        status: "PROCESSING",
      };

      state = {
        ...state,
        deliveryAttempts: state.deliveryAttempts.map((a) =>
          a.id === processingAttempt.id ? processingAttempt : a,
        ),
      };

      if (state.phase === "RETRY_SCHEDULED") {
        applyTransition("PROCESS_RETRY");
      } else {
        notify();
      }

      return state;
    },

    async completePayment(attemptId?: string): Promise<DemoState> {
      const attempt = attemptId
        ? state.deliveryAttempts.find((a) => a.id === attemptId)
        : state.deliveryAttempts.find((a) => a.status === "PROCESSING");

      if (!attempt) {
        throw new Error(
          `No processing delivery attempt found to complete: ${attemptId ?? "default"}`,
        );
      }

      const deliveryResult = await bankAdapter.deliverPayment(attempt);

      state = {
        ...state,
        deliveryAttempts: state.deliveryAttempts.map((a) =>
          a.id === deliveryResult.attempt.id ? deliveryResult.attempt : a,
        ),
      };

      if (state.phase === "RETRY_PROCESSING") {
        applyTransition("DELIVERY_SUCCEEDED");
      }

      if (state.phase === "DELIVERED") {
        applyTransition("COMPLETE_OBLIGATION");
      }

      return state;
    },

    async authorizeDestination(destinationId?: string): Promise<DemoState> {
      const destination = findDestination(destinationId);
      if (!destination) {
        throw new Error(
          `Refund destination not found: ${destinationId ?? "default"}`,
        );
      }

      if (destination.validationStatus !== "VALIDATED") {
        throw new Error(
          "Cannot authorize an unvalidated refund destination",
        );
      }

      // 1. Authorize destination
      const authorizedDestination: RefundDestination = {
        ...destination,
        refundAuthorized: true,
      };
      state = {
        ...state,
        destinations: state.destinations.map((dest) =>
          dest.id === authorizedDestination.id ? authorizedDestination : dest,
        ),
      };
      applyTransition("AUTHORIZE_DESTINATION");

      // 2. Automatically evaluate obligation
      const evalResult =
        await this.evaluateOutstandingObligation(authorizedDestination.id);

      if (!evalResult.decision.eligible) {
        return state;
      }

      // 3. If eligible, create retry idempotently and schedule
      const retryResult =
        await this.createRetryIfEligible(authorizedDestination.id);

      if (!retryResult.retryResult.retry) {
        return state;
      }

      // 4. Start retry processing
      await this.startRetry(retryResult.retryResult.retry.id);

      // 5. Complete payment via mock bank delivery
      await this.completePayment(retryResult.retryResult.retry.id);

      return state;
    },
  };
}
