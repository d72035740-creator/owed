import {
  DEMO_OBLIGATION_ID,
  FAILED_ATTEMPT_ID,
  HDFC_DESTINATION_ID,
  INITIAL_AUDIT_EVENT_IDS,
} from "../db/demo-constants";
import { createPostgresAuditRepository } from "../db/repositories/audit-repository";
import { createPostgresDeliveryRepository } from "../db/repositories/delivery-repository";
import { createPostgresDestinationRepository } from "../db/repositories/destination-repository";
import { createPostgresObligationRepository } from "../db/repositories/obligation-repository";
import { createPostgresOwedTransactionRunner } from "../db/transaction-runner";
import { evaluateRefundPolicy } from "../domain/refund-policy";
import { createMockBankAdapter } from "./mock-bank";
import { toConsumerRefundState, type ConsumerRefundState } from "./consumer-refund";
import { createOwedService, type OwedService } from "./owed-service";

export function createDemoOwedService(): OwedService {
  return createOwedService({
    obligationId: DEMO_OBLIGATION_ID,
    replacementDestinationId: HDFC_DESTINATION_ID,
    originalAttemptId: FAILED_ATTEMPT_ID,
    initialAuditEventIds: INITIAL_AUDIT_EVENT_IDS,
    obligationRepository: createPostgresObligationRepository(),
    destinationRepository: createPostgresDestinationRepository(),
    deliveryRepository: createPostgresDeliveryRepository(),
    auditRepository: createPostgresAuditRepository(),
    bankAdapter: createMockBankAdapter(),
    refundPolicy: evaluateRefundPolicy,
    transactionRunner: createPostgresOwedTransactionRunner(),
  });
}

export async function loadConsumerRefund(): Promise<ConsumerRefundState> {
  return toConsumerRefundState(await createDemoOwedService().load());
}

export async function validateConsumerDestination(): Promise<ConsumerRefundState> {
  return toConsumerRefundState(
    await createDemoOwedService().validateDestination(),
  );
}

export async function authorizeConsumerDestination(): Promise<ConsumerRefundState> {
  return toConsumerRefundState(
    await createDemoOwedService().authorizeDestination(),
  );
}

export async function processConsumerPayment(): Promise<ConsumerRefundState> {
  const service = createDemoOwedService();
  const current = await service.load();
  if (current.obligation.status === "COMPLETED") {
    return toConsumerRefundState(current);
  }
  const retry = current.deliveryAttempts.find(
    (attempt) =>
      attempt.status === "SCHEDULED" || attempt.status === "PROCESSING",
  );
  if (!retry) throw new Error("No scheduled payment is available");
  return toConsumerRefundState(await service.processScheduledRetry(retry.id));
}

export async function resetConsumerDemo(): Promise<ConsumerRefundState> {
  return toConsumerRefundState(await createDemoOwedService().resetDemo());
}
