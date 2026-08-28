import { randomUUID } from "node:crypto";

import type { AuditRepository } from "../db/repositories/audit-repository";
import type { DeliveryRepository } from "../db/repositories/delivery-repository";
import type { DestinationRepository } from "../db/repositories/destination-repository";
import type { ObligationRepository } from "../db/repositories/obligation-repository";
import type {
  OwedRepositories,
  OwedTransactionRunner,
} from "../db/transaction-runner";
import type {
  AuditEventRow,
  DeliveryAttemptRow,
  GovernmentObligationRow,
  RefundDestinationRow,
} from "../db/schema";
import { createAuditEvent } from "../domain/events";
import { createRetryIdempotencyKey } from "../domain/idempotency";
import type {
  RefundPolicy,
  RefundPolicyDecision,
  RefundPolicyInput,
} from "../domain/refund-policy";
import type { RefundPhase, RefundState } from "../domain/state-machine";
import type {
  AuditEvent,
  AuditEventType,
  DeliveryAttempt,
  DemoBlockers,
  GovernmentObligation,
  RefundDestination,
} from "../domain/types";
import type { MockBankAdapter } from "./mock-bank";

export interface OwedState extends RefundState {
  readonly destinations: readonly RefundDestination[];
  readonly blockers: DemoBlockers;
}

export interface OwedServiceOptions {
  readonly obligationId: string;
  readonly replacementDestinationId: string;
  readonly originalAttemptId: string;
  readonly initialAuditEventIds: readonly string[];
  readonly obligationRepository: ObligationRepository;
  readonly destinationRepository: DestinationRepository;
  readonly deliveryRepository: DeliveryRepository;
  readonly auditRepository: AuditRepository;
  readonly bankAdapter: MockBankAdapter;
  readonly refundPolicy: RefundPolicy;
  readonly transactionRunner: OwedTransactionRunner;
}

export interface EvaluateObligationResult {
  readonly state: OwedState;
  readonly decision: RefundPolicyDecision;
}

export interface PersistedRetryResult {
  readonly retry: DeliveryAttempt | null;
  readonly created: boolean;
  readonly idempotencyKey: string;
}

export interface RetryResult {
  readonly state: OwedState;
  readonly retryResult: PersistedRetryResult;
}

export interface OwedService {
  load(): Promise<OwedState>;
  resetDemo(): Promise<OwedState>;
  validateDestination(destinationId?: string): Promise<OwedState>;
  authorizeDestination(destinationId?: string): Promise<OwedState>;
  evaluateOutstandingObligation(
    destinationId?: string,
  ): Promise<EvaluateObligationResult>;
  createRetryIfEligible(destinationId?: string): Promise<RetryResult>;
  startRetry(attemptId?: string): Promise<OwedState>;
  completePayment(attemptId?: string): Promise<OwedState>;
  processScheduledRetry(attemptId: string): Promise<OwedState>;
}

function mapObligation(row: GovernmentObligationRow): GovernmentObligation {
  return {
    id: row.id,
    type: row.type,
    amount: row.amountPaise / 100,
    assessmentYear: row.assessmentYear,
    status: row.status,
  };
}

function mapDestination(row: RefundDestinationRow): RefundDestination {
  return {
    id: row.id,
    bankName: row.bankName,
    maskedAccount: row.maskedAccount,
    accountHolder: row.accountHolder,
    validationStatus: row.validationStatus,
    refundAuthorized: row.refundAuthorized,
    version: row.version,
  };
}

function mapAttempt(row: DeliveryAttemptRow): DeliveryAttempt {
  return {
    id: row.id,
    obligationId: row.obligationId,
    destinationId: row.destinationId,
    status: row.status,
    failureReason: row.failureReason,
    idempotencyKey: row.idempotencyKey,
  };
}

function mapAuditEvent(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    type: row.eventType as AuditEventType,
    timestamp: row.createdAt.toISOString(),
    message: row.message ?? row.eventType,
    metadata:
      typeof row.metadata === "object" && row.metadata !== null
        ? (row.metadata as Readonly<Record<string, unknown>>)
        : {},
  };
}

function derivePhase(
  obligation: GovernmentObligation,
  replacement: RefundDestination,
  attempts: readonly DeliveryAttempt[],
  events: readonly AuditEvent[],
): RefundPhase {
  if (obligation.status === "COMPLETED") return "COMPLETED";
  if (attempts.some((attempt) => attempt.status === "PROCESSING")) {
    return "RETRY_PROCESSING";
  }
  if (attempts.some((attempt) => attempt.status === "SCHEDULED")) {
    return "RETRY_SCHEDULED";
  }
  const latestPolicyEvent = [...events]
    .reverse()
    .find(
      (event) =>
        event.type === "POLICY_BLOCKED" || event.type === "POLICY_PASSED",
    );
  if (latestPolicyEvent?.type === "POLICY_BLOCKED") return "BLOCKED";
  if (replacement.refundAuthorized) return "DESTINATION_AUTHORIZED";
  if (replacement.validationStatus === "VALIDATED") {
    return "DESTINATION_VALIDATED";
  }
  if (replacement.validationStatus === "VALIDATING") {
    return "VALIDATING_DESTINATION";
  }
  return "INITIAL";
}

export function createOwedService(options: OwedServiceOptions): OwedService {
  const {
    obligationRepository,
    destinationRepository,
    deliveryRepository,
    auditRepository,
    bankAdapter,
    refundPolicy,
    transactionRunner,
  } = options;

  const repositories: OwedRepositories = {
    obligationRepository,
    destinationRepository,
    deliveryRepository,
    auditRepository,
  };

  async function appendAudit(
    type: AuditEventType,
    metadata: Readonly<Record<string, unknown>> = {},
    repository: AuditRepository = auditRepository,
  ): Promise<void> {
    const event = createAuditEvent({ id: randomUUID(), type, metadata });
    await repository.append({
      id: event.id,
      obligationId: options.obligationId,
      eventType: event.type,
      message: event.message,
      metadata: event.metadata,
      createdAt: new Date(event.timestamp),
    });
  }

  async function load(): Promise<OwedState> {
    const obligationRow = await obligationRepository.getById(
      options.obligationId,
    );
    if (!obligationRow) throw new Error("Refund obligation not found");

    const [destinationRows, attemptRows, auditRows] = await Promise.all([
      destinationRepository.getForUser(obligationRow.userId),
      deliveryRepository.listForObligation(obligationRow.id),
      auditRepository.listForObligation(obligationRow.id),
    ]);
    const replacementRow = destinationRows.find(
      (row) => row.id === options.replacementDestinationId,
    );
    if (!replacementRow) throw new Error("Replacement destination not found");

    const obligation = mapObligation(obligationRow);
    const destinations = destinationRows.map(mapDestination);
    const deliveryAttempts = attemptRows.map(mapAttempt);
    const auditEvents = auditRows.map(mapAuditEvent);
    const replacement = mapDestination(replacementRow);

    return {
      phase: derivePhase(
        obligation,
        replacement,
        deliveryAttempts,
        auditEvents,
      ),
      obligation,
      destinations,
      deliveryAttempts,
      auditEvents,
      blockers: {
        legalHold: obligationRow.legalHold,
        adjustmentPending: obligationRow.adjustmentPending,
        identityConflict: obligationRow.identityConflict,
      },
    };
  }

  async function getDestination(id?: string): Promise<RefundDestination> {
    const row = await destinationRepository.getById(
      id ?? options.replacementDestinationId,
    );
    if (!row) throw new Error("Refund destination not found");
    return mapDestination(row);
  }

  async function evaluateWithRepositories(
    currentRepositories: OwedRepositories,
    destination: RefundDestination,
  ): Promise<RefundPolicyDecision> {
    await appendAudit(
      "POLICY_EVALUATION_STARTED",
      {},
      currentRepositories.auditRepository,
    );
    const obligationRow = await currentRepositories.obligationRepository.getById(
      options.obligationId,
    );
    if (!obligationRow) throw new Error("Refund obligation not found");
    const [attemptRows, previousRow] = await Promise.all([
      currentRepositories.deliveryRepository.listForObligation(
        options.obligationId,
      ),
      currentRepositories.deliveryRepository.getLatestFailedForObligation(
        options.obligationId,
      ),
    ]);
    if (!previousRow) throw new Error("Previous failed delivery not found");

    const input: RefundPolicyInput = {
      obligation: mapObligation(obligationRow),
      previousDelivery: mapAttempt(previousRow),
      destination,
      blockers: {
        legalHold: obligationRow.legalHold,
        adjustmentPending: obligationRow.adjustmentPending,
        identityConflict: obligationRow.identityConflict,
      },
      deliveryAttempts: attemptRows.map(mapAttempt),
    };
    const decision = refundPolicy(input);
    await appendAudit(
      decision.eligible ? "POLICY_PASSED" : "POLICY_BLOCKED",
      { checks: decision.checks },
      currentRepositories.auditRepository,
    );
    return decision;
  }

  function evaluate(destination: RefundDestination) {
    return evaluateWithRepositories(repositories, destination);
  }

  async function scheduleRetryWithRepositories(
    currentRepositories: OwedRepositories,
    destination: RefundDestination,
  ): Promise<PersistedRetryResult> {
    const key = createRetryIdempotencyKey(
      options.obligationId,
      destination.id,
      destination.version,
    );
    const existing =
      await currentRepositories.deliveryRepository.getByIdempotencyKey(key);
    if (existing) {
      return { retry: mapAttempt(existing), created: false, idempotencyKey: key };
    }

    const proposedId = randomUUID();
    const persisted = await currentRepositories.deliveryRepository.create({
      id: proposedId,
      obligationId: options.obligationId,
      destinationId: destination.id,
      status: "SCHEDULED",
      failureReason: null,
      idempotencyKey: key,
    });
    const created = persisted.id === proposedId;
    if (created) {
      await appendAudit(
        "RETRY_SCHEDULED",
        { attemptId: persisted.id },
        currentRepositories.auditRepository,
      );
    }
    return { retry: mapAttempt(persisted), created, idempotencyKey: key };
  }

  async function beginRetryProcessing(attemptId: string): Promise<{
    readonly shouldInvokeBank: boolean;
    readonly attempt: DeliveryAttempt;
  }> {
    return transactionRunner.run(async (transactionRepositories) => {
      const attempt =
        await transactionRepositories.deliveryRepository.getByIdForUpdate(
          attemptId,
        );
      if (!attempt) throw new Error("Scheduled retry not found");
      const obligation =
        await transactionRepositories.obligationRepository.getByIdForUpdate(
          attempt.obligationId,
        );
      if (!obligation || obligation.id !== options.obligationId) {
        throw new Error("Retry does not belong to refund obligation");
      }
      if (obligation.status === "COMPLETED" || attempt.status === "DELIVERED") {
        return { shouldInvokeBank: false, attempt: mapAttempt(attempt) };
      }
      if (attempt.status === "PROCESSING") {
        return { shouldInvokeBank: false, attempt: mapAttempt(attempt) };
      }
      if (attempt.status !== "SCHEDULED") {
        throw new Error("Retry is not scheduled for processing");
      }

      const processing =
        await transactionRepositories.deliveryRepository.markProcessing(
          attempt.id,
        );
      if (!processing) throw new Error("Retry processing transition failed");
      await appendAudit(
        "RETRY_PROCESSING",
        { attemptId: attempt.id },
        transactionRepositories.auditRepository,
      );
      return { shouldInvokeBank: true, attempt: mapAttempt(processing) };
    });
  }

  async function completeRetryTransaction(attemptId: string): Promise<void> {
    await transactionRunner.run(async (transactionRepositories) => {
      const attempt =
        await transactionRepositories.deliveryRepository.getByIdForUpdate(
          attemptId,
        );
      if (!attempt) throw new Error("Processing retry not found");
      const obligation =
        await transactionRepositories.obligationRepository.getByIdForUpdate(
          attempt.obligationId,
        );
      if (!obligation || obligation.id !== options.obligationId) {
        throw new Error("Retry does not belong to refund obligation");
      }
      if (
        attempt.status === "DELIVERED" &&
        obligation.status === "COMPLETED"
      ) {
        return;
      }
      if (attempt.status !== "PROCESSING") {
        throw new Error("Retry did not remain processing");
      }

      const delivered =
        await transactionRepositories.deliveryRepository.markDelivered(
          attempt.id,
        );
      if (!delivered) throw new Error("Retry delivery transition failed");
      await appendAudit(
        "PAYMENT_DELIVERED",
        { attemptId: attempt.id },
        transactionRepositories.auditRepository,
      );
      const completed =
        await transactionRepositories.obligationRepository.markCompleted(
          obligation.id,
        );
      if (!completed) throw new Error("Obligation completion failed");
      await appendAudit(
        "OBLIGATION_COMPLETED",
        {},
        transactionRepositories.auditRepository,
      );
    });
  }

  const service: OwedService = {
    load,

    async validateDestination(destinationId) {
      const destination = await getDestination(destinationId);
      if (destination.validationStatus !== "UNVALIDATED") {
        throw new Error("Destination is not available for validation");
      }
      await destinationRepository.updateValidationStatus(
        destination.id,
        "VALIDATING",
      );
      await appendAudit("DESTINATION_VALIDATION_STARTED", {
        destinationId: destination.id,
      });
      try {
        await bankAdapter.validateDestination(destination);
        await destinationRepository.updateValidationStatus(
          destination.id,
          "VALIDATED",
        );
        await appendAudit("DESTINATION_VALIDATED", {
          destinationId: destination.id,
        });
      } catch (error) {
        await destinationRepository.updateValidationStatus(destination.id, "FAILED");
        throw error;
      }
      return load();
    },

    async authorizeDestination(destinationId) {
      const targetId = destinationId ?? options.replacementDestinationId;
      await transactionRunner.run(async (transactionRepositories) => {
        const obligation =
          await transactionRepositories.obligationRepository.getByIdForUpdate(
            options.obligationId,
          );
        const destination =
          await transactionRepositories.destinationRepository.getByIdForUpdate(
            targetId,
          );
        if (!obligation) throw new Error("Refund obligation not found");
        if (!destination) throw new Error("Refund destination not found");
        if (destination.userId !== obligation.userId) {
          throw new Error("Refund destination does not belong to obligation user");
        }
        if (destination.validationStatus !== "VALIDATED") {
          throw new Error("Cannot authorize an unvalidated refund destination");
        }

        let authorized = destination;
        if (!destination.refundAuthorized) {
          const updated =
            await transactionRepositories.destinationRepository.authorize(
              destination.id,
            );
          if (!updated) throw new Error("Refund destination authorization failed");
          authorized = updated;
          await appendAudit(
            "DESTINATION_AUTHORIZED",
            { destinationId: destination.id },
            transactionRepositories.auditRepository,
          );
        }

        const mappedDestination = mapDestination(authorized);
        const decision = await evaluateWithRepositories(
          transactionRepositories,
          mappedDestination,
        );
        if (decision.eligible) {
          await scheduleRetryWithRepositories(
            transactionRepositories,
            mappedDestination,
          );
        }
      });
      return load();
    },

    async evaluateOutstandingObligation(destinationId) {
      const destination = await getDestination(destinationId);
      const decision = await evaluate(destination);
      return { state: await load(), decision };
    },

    async createRetryIfEligible(destinationId) {
      const targetId = destinationId ?? options.replacementDestinationId;
      let retryResult: PersistedRetryResult | undefined;
      await transactionRunner.run(async (transactionRepositories) => {
        const obligation =
          await transactionRepositories.obligationRepository.getByIdForUpdate(
            options.obligationId,
          );
        const destination =
          await transactionRepositories.destinationRepository.getByIdForUpdate(
            targetId,
          );
        if (!obligation || !destination) throw new Error("Refund state not found");
        if (destination.userId !== obligation.userId) {
          throw new Error("Refund destination does not belong to obligation user");
        }
        const mappedDestination = mapDestination(destination);
        const decision = await evaluateWithRepositories(
          transactionRepositories,
          mappedDestination,
        );
        retryResult = decision.eligible
          ? await scheduleRetryWithRepositories(
              transactionRepositories,
              mappedDestination,
            )
          : {
              retry: null,
              created: false,
              idempotencyKey: createRetryIdempotencyKey(
                options.obligationId,
                destination.id,
                destination.version,
              ),
            };
      });
      if (!retryResult) throw new Error("Retry evaluation did not complete");
      return { state: await load(), retryResult };
    },

    async startRetry(attemptId) {
      const attempt = attemptId
        ? await deliveryRepository.getById(attemptId)
        : await deliveryRepository.getActiveRetry(options.obligationId);
      if (!attempt) throw new Error("Scheduled retry not found");
      await beginRetryProcessing(attempt.id);
      return load();
    },

    async completePayment(attemptId) {
      const attempt = attemptId
        ? await deliveryRepository.getById(attemptId)
        : await deliveryRepository.getActiveRetry(options.obligationId);
      if (!attempt) throw new Error("Processing retry not found");
      if (attempt.status === "PROCESSING") {
        await bankAdapter.deliverPayment(mapAttempt(attempt));
        await completeRetryTransaction(attempt.id);
      } else if (attempt.status !== "DELIVERED") {
        throw new Error("Retry is not processing");
      }
      return load();
    },

    async processScheduledRetry(attemptId) {
      const start = await beginRetryProcessing(attemptId);
      if (!start.shouldInvokeBank) return load();

      // The adapter receives the stable retry idempotency key. A real payment
      // rail must also support status lookup/reconciliation for the crash window
      // between external success and the local completion transaction.
      await bankAdapter.deliverPayment(start.attempt);
      await completeRetryTransaction(attemptId);
      return load();
    },

    async resetDemo() {
      await transactionRunner.run(async (transactionRepositories) => {
        await transactionRepositories.deliveryRepository.resetDemo(
          options.obligationId,
          options.originalAttemptId,
        );
        await transactionRepositories.destinationRepository.resetDemo(
          options.replacementDestinationId,
        );
        await transactionRepositories.obligationRepository.resetDemo(
          options.obligationId,
        );
        await transactionRepositories.auditRepository.resetDemo(
          options.obligationId,
          options.initialAuditEventIds,
        );
      });
      return load();
    },
  };

  return service;
}
