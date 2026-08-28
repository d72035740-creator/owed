import type {
  DeliveryAttempt,
  DemoBlockers,
  GovernmentObligation,
  RefundDestination,
} from "./types";

export interface RefundPolicyInput {
  readonly obligation: GovernmentObligation;
  readonly previousDelivery: DeliveryAttempt;
  readonly destination: RefundDestination;
  readonly blockers: DemoBlockers;
  readonly deliveryAttempts: readonly DeliveryAttempt[];
}

export interface RefundPolicyCheck {
  readonly id: string;
  readonly label: string;
  readonly passed: boolean;
}

export interface RefundPolicyDecision {
  readonly eligible: boolean;
  readonly checks: readonly RefundPolicyCheck[];
}

function hasActiveRetry(input: RefundPolicyInput): boolean {
  return input.deliveryAttempts.some(
    (attempt) =>
      attempt.obligationId === input.obligation.id &&
      (attempt.status === "SCHEDULED" || attempt.status === "PROCESSING"),
  );
}

export function evaluateRefundPolicy(
  input: RefundPolicyInput,
): RefundPolicyDecision {
  const checks: readonly RefundPolicyCheck[] = [
    {
      id: "refund-remains-unpaid",
      label: "Refund remains unpaid",
      passed: input.obligation.status === "OWED",
    },
    {
      id: "previous-delivery-failed",
      label: "Previous delivery failed",
      passed:
        input.previousDelivery.obligationId === input.obligation.id &&
        input.previousDelivery.status === "FAILED",
    },
    {
      id: "destination-related-failure",
      label: "Failure was destination-related",
      passed:
        input.previousDelivery.failureReason === "ACCOUNT_CLOSED" ||
        input.previousDelivery.failureReason === "INVALID_ACCOUNT",
    },
    {
      id: "destination-validated",
      label: "New destination validated",
      passed: input.destination.validationStatus === "VALIDATED",
    },
    {
      id: "destination-authorized",
      label: "Refund destination authorized",
      passed: input.destination.refundAuthorized,
    },
    {
      id: "no-payment-blocker",
      label: "No payment blocker",
      passed:
        !input.blockers.legalHold &&
        !input.blockers.adjustmentPending &&
        !input.blockers.identityConflict &&
        !hasActiveRetry(input),
    },
  ];

  return {
    eligible: checks.every((check) => check.passed),
    checks,
  };
}

export type RefundPolicy = typeof evaluateRefundPolicy;
