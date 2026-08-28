import { createAuditEvent } from "./events";
import type {
  AuditEvent,
  AuditEventType,
  DeliveryAttempt,
  GovernmentObligation,
} from "./types";

export type RefundPhase =
  | "INITIAL"
  | "DESTINATION_REPAIR"
  | "VALIDATING_DESTINATION"
  | "DESTINATION_VALIDATED"
  | "DESTINATION_AUTHORIZED"
  | "POLICY_EVALUATING"
  | "BLOCKED"
  | "ELIGIBLE"
  | "RETRY_SCHEDULED"
  | "RETRY_PROCESSING"
  | "DELIVERY_FAILED"
  | "DELIVERED"
  | "COMPLETED";

export type RefundEvent =
  | "BEGIN_DESTINATION_REPAIR"
  | "BEGIN_DESTINATION_VALIDATION"
  | "DESTINATION_VALIDATION_SUCCEEDED"
  | "AUTHORIZE_DESTINATION"
  | "BEGIN_POLICY_EVALUATION"
  | "POLICY_BLOCKED"
  | "POLICY_ELIGIBLE"
  | "REEVALUATE_POLICY"
  | "SCHEDULE_RETRY"
  | "PROCESS_RETRY"
  | "DELIVERY_FAILED"
  | "DELIVERY_SUCCEEDED"
  | "COMPLETE_OBLIGATION";

export interface RefundState {
  readonly phase: RefundPhase;
  readonly obligation: GovernmentObligation;
  readonly deliveryAttempts: readonly DeliveryAttempt[];
  readonly auditEvents: readonly AuditEvent[];
}

const transitionAuditTypes: Readonly<
  Partial<Record<RefundEvent, AuditEventType>>
> = {
  BEGIN_DESTINATION_VALIDATION: "DESTINATION_VALIDATION_STARTED",
  DESTINATION_VALIDATION_SUCCEEDED: "DESTINATION_VALIDATED",
  AUTHORIZE_DESTINATION: "DESTINATION_AUTHORIZED",
  BEGIN_POLICY_EVALUATION: "POLICY_EVALUATION_STARTED",
  POLICY_BLOCKED: "POLICY_BLOCKED",
  POLICY_ELIGIBLE: "POLICY_PASSED",
  REEVALUATE_POLICY: "POLICY_EVALUATION_STARTED",
  SCHEDULE_RETRY: "RETRY_SCHEDULED",
  PROCESS_RETRY: "RETRY_PROCESSING",
  DELIVERY_FAILED: "DELIVERY_FAILED",
  DELIVERY_SUCCEEDED: "PAYMENT_DELIVERED",
  COMPLETE_OBLIGATION: "OBLIGATION_COMPLETED",
};

const transitions: Readonly<
  Record<RefundPhase, Readonly<Partial<Record<RefundEvent, RefundPhase>>>>
> = {
  INITIAL: {
    BEGIN_DESTINATION_REPAIR: "DESTINATION_REPAIR",
  },
  DESTINATION_REPAIR: {
    BEGIN_DESTINATION_VALIDATION: "VALIDATING_DESTINATION",
  },
  VALIDATING_DESTINATION: {
    DESTINATION_VALIDATION_SUCCEEDED: "DESTINATION_VALIDATED",
  },
  DESTINATION_VALIDATED: {
    AUTHORIZE_DESTINATION: "DESTINATION_AUTHORIZED",
  },
  DESTINATION_AUTHORIZED: {
    BEGIN_POLICY_EVALUATION: "POLICY_EVALUATING",
  },
  POLICY_EVALUATING: {
    POLICY_BLOCKED: "BLOCKED",
    POLICY_ELIGIBLE: "ELIGIBLE",
  },
  BLOCKED: {
    REEVALUATE_POLICY: "POLICY_EVALUATING",
  },
  ELIGIBLE: {
    SCHEDULE_RETRY: "RETRY_SCHEDULED",
  },
  RETRY_SCHEDULED: {
    PROCESS_RETRY: "RETRY_PROCESSING",
  },
  RETRY_PROCESSING: {
    DELIVERY_FAILED: "DELIVERY_FAILED",
    DELIVERY_SUCCEEDED: "DELIVERED",
  },
  DELIVERY_FAILED: {
    BEGIN_DESTINATION_REPAIR: "DESTINATION_REPAIR",
  },
  DELIVERED: {
    COMPLETE_OBLIGATION: "COMPLETED",
  },
  COMPLETED: {},
};

export class InvalidStateTransitionError extends Error {
  constructor(phase: RefundPhase, event: RefundEvent) {
    super(`Cannot apply ${event} while refund is in ${phase}`);
    this.name = "InvalidStateTransitionError";
  }
}

export function transitionRefundState(
  state: RefundState,
  event: RefundEvent,
): RefundState {
  const nextPhase = transitions[state.phase][event];

  if (!nextPhase) {
    throw new InvalidStateTransitionError(state.phase, event);
  }

  if (nextPhase === "DELIVERY_FAILED" && state.obligation.status !== "OWED") {
    throw new InvalidStateTransitionError(state.phase, event);
  }

  const auditType = transitionAuditTypes[event];
  const auditEvent = auditType
    ? createAuditEvent({
        id: `${state.obligation.id}:audit:${state.auditEvents.length + 1}`,
        type: auditType,
        metadata: {
          obligationId: state.obligation.id,
          fromPhase: state.phase,
          toPhase: nextPhase,
        },
      })
    : null;

  return {
    ...state,
    phase: nextPhase,
    obligation:
      nextPhase === "COMPLETED"
        ? { ...state.obligation, status: "COMPLETED" }
        : state.obligation,
    auditEvents: auditEvent
      ? [...state.auditEvents, auditEvent]
      : state.auditEvents,
  };
}
