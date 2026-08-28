import type { RefundPolicyCheck } from "../domain/refund-policy";
import type { RefundPhase } from "../domain/state-machine";
import type { AuditEvent, DeliveryFailureReason } from "../domain/types";
import type { OwedState } from "./owed-service";

export interface ConsumerRefundState {
  readonly citizen: {
    readonly name: string;
    readonly age: number;
    readonly occupation: string;
  };
  readonly refund: {
    readonly id: string;
    readonly displayAmount: string;
    readonly assessmentYear: string;
    readonly status: "OWED" | "BLOCKED" | "COMPLETED";
  };
  readonly previousPayment: {
    readonly status: "FAILED";
    readonly bankName: string;
    readonly maskedAccount: string;
    readonly reason: string;
  };
  readonly destination: {
    readonly bankName: string;
    readonly maskedAccount: string;
    readonly accountHolder: string;
    readonly validationStatus:
      | "UNVALIDATED"
      | "VALIDATING"
      | "VALIDATED"
      | "FAILED";
    readonly refundAuthorized: boolean;
  };
  readonly phase: RefundPhase;
  readonly checks: readonly RefundPolicyCheck[];
  readonly timeline: readonly {
    readonly id: string;
    readonly type: AuditEvent["type"];
    readonly timestamp: string;
    readonly message: string;
  }[];
  readonly metrics: {
    readonly failedDeliveries: number;
    readonly destinationRepairs: number;
    readonly reapplications: 0;
  };
}

const failureReasonLabels: Readonly<Record<DeliveryFailureReason, string>> = {
  ACCOUNT_CLOSED: "Account closed",
  INVALID_ACCOUNT: "Invalid account",
  BANK_REJECTED: "Bank rejected the payment",
  IDENTITY_MISMATCH: "Account holder did not match",
  OTHER: "Delivery could not be completed",
};

function isPolicyCheck(value: unknown): value is RefundPolicyCheck {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.passed === "boolean"
  );
}

function policyChecks(events: readonly AuditEvent[]): readonly RefundPolicyCheck[] {
  const policyEvent = [...events]
    .reverse()
    .find(
      (event) => event.type === "POLICY_PASSED" || event.type === "POLICY_BLOCKED",
    );
  const checks = policyEvent?.metadata.checks;
  return Array.isArray(checks) && checks.every(isPolicyCheck)
    ? checks.map((check) => ({
        id: check.id,
        label: check.label,
        passed: check.passed,
      }))
    : [];
}

export function toConsumerRefundState(state: OwedState): ConsumerRefundState {
  const failedAttempt = state.deliveryAttempts.find(
    (attempt) => attempt.status === "FAILED",
  );
  if (!failedAttempt || !failedAttempt.failureReason) {
    throw new Error("Previous failed payment is missing");
  }
  const previousDestination = state.destinations.find(
    (destination) => destination.id === failedAttempt.destinationId,
  );
  const replacementDestination = state.destinations.find(
    (destination) => destination.id !== failedAttempt.destinationId,
  );
  if (!previousDestination || !replacementDestination) {
    throw new Error("Synthetic refund destinations are incomplete");
  }

  return {
    citizen: {
      name: "Meera Sharma",
      age: 46,
      occupation: "School teacher",
    },
    refund: {
      id: state.obligation.id,
      displayAmount: new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(state.obligation.amount),
      assessmentYear: state.obligation.assessmentYear,
      status: state.obligation.status,
    },
    previousPayment: {
      status: "FAILED",
      bankName: previousDestination.bankName,
      maskedAccount: previousDestination.maskedAccount,
      reason: failureReasonLabels[failedAttempt.failureReason],
    },
    destination: {
      bankName: replacementDestination.bankName,
      maskedAccount: replacementDestination.maskedAccount,
      accountHolder: replacementDestination.accountHolder,
      validationStatus: replacementDestination.validationStatus,
      refundAuthorized: replacementDestination.refundAuthorized,
    },
    phase: state.phase,
    checks: policyChecks(state.auditEvents),
    timeline: state.auditEvents.map(({ id, type, timestamp, message }) => ({
      id,
      type,
      timestamp,
      message,
    })),
    metrics: {
      failedDeliveries: state.deliveryAttempts.filter(
        (attempt) => attempt.status === "FAILED",
      ).length,
      destinationRepairs: state.auditEvents.filter(
        (event) => event.type === "DESTINATION_VALIDATED",
      ).length,
      reapplications: 0,
    },
  };
}
