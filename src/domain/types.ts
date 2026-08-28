export type GovernmentObligationStatus = "OWED" | "BLOCKED" | "COMPLETED";

export interface GovernmentObligation {
  readonly id: string;
  readonly type: string;
  readonly amount: number;
  readonly assessmentYear: string;
  readonly status: GovernmentObligationStatus;
}

export type DeliveryAttemptStatus =
  | "SCHEDULED"
  | "PROCESSING"
  | "FAILED"
  | "DELIVERED";

export type DeliveryFailureReason =
  | "ACCOUNT_CLOSED"
  | "INVALID_ACCOUNT"
  | "BANK_REJECTED"
  | "IDENTITY_MISMATCH"
  | "OTHER";

export interface DeliveryAttempt {
  readonly id: string;
  readonly obligationId: GovernmentObligation["id"];
  readonly destinationId: RefundDestination["id"];
  readonly status: DeliveryAttemptStatus;
  readonly failureReason: DeliveryFailureReason | null;
  readonly idempotencyKey: string;
}

export type DestinationValidationStatus =
  | "UNVALIDATED"
  | "VALIDATING"
  | "VALIDATED"
  | "FAILED";

export interface RefundDestination {
  readonly id: string;
  readonly bankName: string;
  readonly maskedAccount: string;
  readonly accountHolder: string;
  readonly validationStatus: DestinationValidationStatus;
  readonly refundAuthorized: boolean;
  readonly version: number;
}

export type AuditEventType =
  | "OBLIGATION_CREATED"
  | "DELIVERY_FAILED"
  | "DESTINATION_VALIDATION_STARTED"
  | "DESTINATION_VALIDATED"
  | "DESTINATION_AUTHORIZED"
  | "POLICY_EVALUATION_STARTED"
  | "POLICY_PASSED"
  | "POLICY_BLOCKED"
  | "RETRY_SCHEDULED"
  | "RETRY_PROCESSING"
  | "PAYMENT_DELIVERED"
  | "OBLIGATION_COMPLETED";

export interface AuditEvent {
  readonly id: string;
  readonly type: AuditEventType;
  readonly timestamp: string;
  readonly message: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface DemoBlockers {
  readonly legalHold: boolean;
  readonly adjustmentPending: boolean;
  readonly identityConflict: boolean;
}
