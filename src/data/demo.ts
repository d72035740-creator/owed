import type { RefundState } from "@/domain/state-machine";
import type { DemoBlockers, RefundDestination } from "@/domain/types";
import { createAuditEvent } from "../domain/events";

export interface SyntheticCitizen {
  readonly name: string;
  readonly age: number;
  readonly occupation: string;
}

export interface DemoState extends RefundState {
  readonly citizen: SyntheticCitizen;
  readonly destinations: readonly RefundDestination[];
  readonly blockers: DemoBlockers;
}

export function createDemoState(): DemoState {
  const auditEvents = [
    createAuditEvent({
      id: "refund-demo-001:audit:1",
      type: "OBLIGATION_CREATED",
      metadata: {
        obligationId: "refund-demo-001",
        assessmentYear: "2026-27",
        amount: 23_740,
      },
    }),
    createAuditEvent({
      id: "refund-demo-001:audit:2",
      type: "DELIVERY_FAILED",
      metadata: {
        obligationId: "refund-demo-001",
        deliveryAttemptId: "delivery-demo-001",
        failureReason: "ACCOUNT_CLOSED",
      },
    }),
  ];

  return {
    phase: "INITIAL",
    citizen: {
      name: "Meera Sharma",
      age: 46,
      occupation: "School teacher",
    },
    obligation: {
      id: "refund-demo-001",
      type: "INCOME_TAX_REFUND",
      amount: 23_740,
      assessmentYear: "2026-27",
      status: "OWED",
    },
    destinations: [
      {
        id: "destination-demo-sbi-001",
        bankName: "SBI",
        maskedAccount: "••••1028",
        accountHolder: "Meera Sharma",
        validationStatus: "VALIDATED",
        refundAuthorized: true,
        version: 1,
      },
      {
        id: "destination-demo-hdfc-001",
        bankName: "HDFC Bank",
        maskedAccount: "••••4821",
        accountHolder: "Meera Sharma",
        validationStatus: "UNVALIDATED",
        refundAuthorized: false,
        version: 1,
      },
    ],
    deliveryAttempts: [
      {
        id: "delivery-demo-001",
        obligationId: "refund-demo-001",
        destinationId: "destination-demo-sbi-001",
        status: "FAILED",
        failureReason: "ACCOUNT_CLOSED",
        idempotencyKey:
          "refund-demo-001:destination-demo-sbi-001:delivery-1",
      },
    ],
    auditEvents,
    blockers: {
      legalHold: false,
      adjustmentPending: false,
      identityConflict: false,
    },
  };
}
