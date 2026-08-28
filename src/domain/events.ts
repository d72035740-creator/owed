import type { AuditEvent, AuditEventType } from "./types";

const eventMessages: Readonly<Record<AuditEventType, string>> = {
  OBLIGATION_CREATED: "Refund obligation recorded",
  DELIVERY_FAILED: "Payment delivery failed",
  DESTINATION_VALIDATION_STARTED: "Destination validation started",
  DESTINATION_VALIDATED: "New refund destination validated",
  DESTINATION_AUTHORIZED: "New destination authorized for refunds",
  POLICY_EVALUATION_STARTED: "Automatic payment checks started",
  POLICY_PASSED: "Automatic payment checks passed",
  POLICY_BLOCKED: "Automatic payment is currently blocked",
  RETRY_SCHEDULED: "Payment retry scheduled",
  RETRY_PROCESSING: "Payment retry processing",
  PAYMENT_DELIVERED: "Payment delivered",
  OBLIGATION_COMPLETED: "Refund obligation completed",
};

export interface CreateAuditEventInput {
  readonly id: string;
  readonly type: AuditEventType;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export function createAuditEvent(input: CreateAuditEventInput): AuditEvent {
  return {
    id: input.id,
    type: input.type,
    timestamp: new Date().toISOString(),
    message: eventMessages[input.type],
    metadata: input.metadata ?? {},
  };
}

export type { AuditEvent, AuditEventType } from "./types";
