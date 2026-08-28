import {
  evaluateRefundPolicy,
  type RefundPolicyDecision,
  type RefundPolicyInput,
} from "./refund-policy";
import type {
  DeliveryAttempt,
  GovernmentObligation,
  RefundDestination,
} from "./types";

export type IdempotencyKey = string;

export interface RetryCreationInput {
  readonly obligation: GovernmentObligation;
  readonly destination: RefundDestination;
  readonly deliveryAttempts: readonly DeliveryAttempt[];
}

export interface RetryCreationResult {
  readonly idempotencyKey: IdempotencyKey;
  readonly retry: DeliveryAttempt | null;
  readonly deliveryAttempts: readonly DeliveryAttempt[];
  readonly created: boolean;
}

export interface RetryEvaluationResult extends RetryCreationResult {
  readonly decision: RefundPolicyDecision;
}

export function createRetryIdempotencyKey(
  obligationId: GovernmentObligation["id"],
  destinationId: RefundDestination["id"],
  destinationVersion: RefundDestination["version"],
): IdempotencyKey {
  return `${obligationId}:${destinationId}:v${destinationVersion}`;
}

export function createRetry(input: RetryCreationInput): RetryCreationResult {
  const idempotencyKey = createRetryIdempotencyKey(
    input.obligation.id,
    input.destination.id,
    input.destination.version,
  );
  const existingRetry = input.deliveryAttempts.find(
    (attempt) => attempt.idempotencyKey === idempotencyKey,
  );

  if (existingRetry) {
    return {
      idempotencyKey,
      retry: existingRetry,
      deliveryAttempts: input.deliveryAttempts,
      created: false,
    };
  }

  if (input.obligation.status !== "OWED") {
    return {
      idempotencyKey,
      retry: null,
      deliveryAttempts: input.deliveryAttempts,
      created: false,
    };
  }

  const retry: DeliveryAttempt = {
    id: `retry:${idempotencyKey}`,
    obligationId: input.obligation.id,
    destinationId: input.destination.id,
    status: "SCHEDULED",
    failureReason: null,
    idempotencyKey,
  };

  return {
    idempotencyKey,
    retry,
    deliveryAttempts: [...input.deliveryAttempts, retry],
    created: true,
  };
}

export function evaluateAndCreateRetry(
  input: RefundPolicyInput,
): RetryEvaluationResult {
  const decision = evaluateRefundPolicy(input);

  if (!decision.eligible) {
    return {
      decision,
      idempotencyKey: createRetryIdempotencyKey(
        input.obligation.id,
        input.destination.id,
        input.destination.version,
      ),
      retry: null,
      deliveryAttempts: input.deliveryAttempts,
      created: false,
    };
  }

  return {
    decision,
    ...createRetry(input),
  };
}
