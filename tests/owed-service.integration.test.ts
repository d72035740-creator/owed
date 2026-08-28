import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "../src/db/index";
import { createPostgresAuditRepository } from "../src/db/repositories/audit-repository";
import { createPostgresDeliveryRepository } from "../src/db/repositories/delivery-repository";
import { createPostgresDestinationRepository } from "../src/db/repositories/destination-repository";
import { createPostgresObligationRepository } from "../src/db/repositories/obligation-repository";
import {
  createPostgresOwedTransactionRunner,
  type OwedTransactionRunner,
} from "../src/db/transaction-runner";
import {
  auditEvents,
  deliveryAttempts,
  governmentObligations,
  refundDestinations,
  users,
} from "../src/db/schema";
import { createRetryIdempotencyKey } from "../src/domain/idempotency";
import { evaluateRefundPolicy } from "../src/domain/refund-policy";
import {
  createMockBankAdapter,
  type MockBankAdapter,
} from "../src/services/mock-bank";
import {
  createOwedService,
  type OwedService,
} from "../src/services/owed-service";

const obligationRepository = createPostgresObligationRepository();
const destinationRepository = createPostgresDestinationRepository();
const deliveryRepository = createPostgresDeliveryRepository();
const auditRepository = createPostgresAuditRepository();

const testIds = {
  userId: randomUUID(),
  obligationId: randomUUID(),
  sbiDestinationId: randomUUID(),
  hdfcDestinationId: randomUUID(),
  failedAttemptId: randomUUID(),
  auditEventIds: [randomUUID(), randomUUID()] as const,
};

let service: OwedService;
const transactionRunner = createPostgresOwedTransactionRunner();

function buildService(
  overrides: {
    readonly bankAdapter?: MockBankAdapter;
    readonly transactionRunner?: OwedTransactionRunner;
  } = {},
): OwedService {
  return createOwedService({
    obligationId: testIds.obligationId,
    replacementDestinationId: testIds.hdfcDestinationId,
    originalAttemptId: testIds.failedAttemptId,
    initialAuditEventIds: testIds.auditEventIds,
    obligationRepository,
    destinationRepository,
    deliveryRepository,
    auditRepository,
    bankAdapter:
      overrides.bankAdapter ?? createMockBankAdapter(async () => {}),
    refundPolicy: evaluateRefundPolicy,
    transactionRunner: overrides.transactionRunner ?? transactionRunner,
  });
}

function failAuditAppend(
  eventType: string,
  message = `Injected failure while appending ${eventType}`,
): OwedTransactionRunner {
  return {
    run(work) {
      return transactionRunner.run((repositories) =>
        work({
          ...repositories,
          auditRepository: {
            ...repositories.auditRepository,
            async append(event) {
              if (event.eventType === eventType) throw new Error(message);
              return repositories.auditRepository.append(event);
            },
          },
        }),
      );
    },
  };
}

const retryIdempotencyKey = createRetryIdempotencyKey(
  testIds.obligationId,
  testIds.hdfcDestinationId,
  1,
);

async function makeObligationEligible(): Promise<void> {
  await service.validateDestination();
  const authorized = await destinationRepository.authorize(
    testIds.hdfcDestinationId,
  );
  expect(authorized?.refundAuthorized).toBe(true);
}

async function expectOnePersistedRetryAndAudit(): Promise<void> {
  const [attempts, events] = await Promise.all([
    deliveryRepository.listForObligation(testIds.obligationId),
    auditRepository.listForObligation(testIds.obligationId),
  ]);

  expect(
    attempts.filter(
      (attempt) => attempt.idempotencyKey === retryIdempotencyKey,
    ),
  ).toHaveLength(1);
  expect(
    events.filter((event) => event.eventType === "RETRY_SCHEDULED"),
  ).toHaveLength(1);
}

async function scheduleRetry(): Promise<string> {
  await service.validateDestination();
  const state = await service.authorizeDestination();
  const retry = state.deliveryAttempts.find(
    (attempt) => attempt.idempotencyKey === retryIdempotencyKey,
  );
  if (!retry) throw new Error("Expected the integration retry to be scheduled");
  return retry.id;
}

async function countAuditEvents(eventType: string): Promise<number> {
  const events = await auditRepository.listForObligation(testIds.obligationId);
  return events.filter((event) => event.eventType === eventType).length;
}

describe.sequential("repository-backed OwedService", () => {
  beforeAll(async () => {
    await db.transaction(async (transaction) => {
      await transaction.insert(users).values({
        id: testIds.userId,
        displayName: "Synthetic Integration Citizen",
      });
      await transaction.insert(governmentObligations).values({
        id: testIds.obligationId,
        userId: testIds.userId,
        type: "INCOME_TAX_REFUND",
        amountPaise: 2_374_000,
        assessmentYear: "2026-27",
        status: "OWED",
      });
      await transaction.insert(refundDestinations).values([
        {
          id: testIds.sbiDestinationId,
          userId: testIds.userId,
          bankName: "SBI",
          maskedAccount: "••••1028",
          accountHolder: "Synthetic Integration Citizen",
          validationStatus: "VALIDATED",
          refundAuthorized: true,
          version: 1,
        },
        {
          id: testIds.hdfcDestinationId,
          userId: testIds.userId,
          bankName: "HDFC Bank",
          maskedAccount: "••••4821",
          accountHolder: "Synthetic Integration Citizen",
          validationStatus: "UNVALIDATED",
          refundAuthorized: false,
          version: 1,
        },
      ]);
      await transaction.insert(deliveryAttempts).values({
        id: testIds.failedAttemptId,
        obligationId: testIds.obligationId,
        destinationId: testIds.sbiDestinationId,
        status: "FAILED",
        failureReason: "ACCOUNT_CLOSED",
        idempotencyKey: `${testIds.obligationId}:${testIds.sbiDestinationId}:v1`,
      });
      await transaction.insert(auditEvents).values([
        {
          id: testIds.auditEventIds[0],
          obligationId: testIds.obligationId,
          eventType: "OBLIGATION_CREATED",
          message: "Refund obligation recorded",
          metadata: { synthetic: true },
        },
        {
          id: testIds.auditEventIds[1],
          obligationId: testIds.obligationId,
          eventType: "DELIVERY_FAILED",
          message: "Payment delivery failed",
          metadata: { synthetic: true },
        },
      ]);
    });

    service = buildService();
  }, 120_000);

  beforeEach(async () => {
    await service.resetDemo();
  }, 120_000);

  afterAll(async () => {
    await db
      .delete(auditEvents)
      .where(eq(auditEvents.obligationId, testIds.obligationId));
    await db
      .delete(deliveryAttempts)
      .where(eq(deliveryAttempts.obligationId, testIds.obligationId));
    await db
      .delete(refundDestinations)
      .where(eq(refundDestinations.userId, testIds.userId));
    await db
      .delete(governmentObligations)
      .where(eq(governmentObligations.id, testIds.obligationId));
    await db.delete(users).where(eq(users.id, testIds.userId));
    await db.$client.end();
  }, 120_000);

  it(
    "Test A — persists the initial owed state and failed delivery",
    async () => {
      const [obligation, originalDelivery, replacementDestination] =
        await Promise.all([
          obligationRepository.getById(testIds.obligationId),
          deliveryRepository.getById(testIds.failedAttemptId),
          destinationRepository.getById(testIds.hdfcDestinationId),
        ]);

      expect(obligation?.status).toBe("OWED");
      expect(originalDelivery).toMatchObject({
        status: "FAILED",
        failureReason: "ACCOUNT_CLOSED",
      });
      expect(replacementDestination).toMatchObject({
        bankName: "HDFC Bank",
        validationStatus: "UNVALIDATED",
        refundAuthorized: false,
      });
    },
    120_000,
  );

  it("Test B — persists destination validation and its audit events", async () => {
    await service.validateDestination();

    const [replacementDestination, auditHistory] = await Promise.all([
      destinationRepository.getById(testIds.hdfcDestinationId),
      auditRepository.listForObligation(testIds.obligationId),
    ]);
    const eventTypes = auditHistory.map((event) => event.eventType);

    expect(replacementDestination?.validationStatus).toBe("VALIDATED");
    expect(replacementDestination?.validatedAt).toBeInstanceOf(Date);
    expect(eventTypes).toContain("DESTINATION_VALIDATION_STARTED");
    expect(eventTypes).toContain("DESTINATION_VALIDATED");
  }, 120_000);

  it("Test C — persists authorization, policy pass, and one scheduled retry", async () => {
    await service.validateDestination();
    await service.authorizeDestination();

    const [replacementDestination, attempts, auditHistory] = await Promise.all([
      destinationRepository.getById(testIds.hdfcDestinationId),
      deliveryRepository.listForObligation(testIds.obligationId),
      auditRepository.listForObligation(testIds.obligationId),
    ]);
    const newAttempts = attempts.filter(
      (attempt) => attempt.id !== testIds.failedAttemptId,
    );
    const eventTypes = auditHistory.map((event) => event.eventType);

    expect(replacementDestination?.refundAuthorized).toBe(true);
    expect(eventTypes).toContain("DESTINATION_AUTHORIZED");
    expect(eventTypes).toContain("POLICY_PASSED");
    expect(eventTypes).toContain("RETRY_SCHEDULED");
    expect(newAttempts).toHaveLength(1);
    expect(newAttempts[0]?.status).toBe("SCHEDULED");
  }, 120_000);

  it("persists the complete flow without completing during authorization", async () => {
    const validated = await service.validateDestination();
    expect(validated.phase).toBe("DESTINATION_VALIDATED");

    const authorized = await service.authorizeDestination();
    expect(authorized.phase).toBe("RETRY_SCHEDULED");
    expect(authorized.obligation.status).toBe("OWED");
    expect(authorized.deliveryAttempts).toHaveLength(2);

    const retry = authorized.deliveryAttempts.find(
      (attempt) => attempt.status === "SCHEDULED",
    );
    expect(retry).toBeDefined();

    const duplicate = await service.createRetryIfEligible();
    expect(duplicate.retryResult.created).toBe(false);
    expect(duplicate.state.deliveryAttempts).toHaveLength(2);

    const completed = await service.processScheduledRetry(retry?.id ?? "");
    expect(completed.phase).toBe("COMPLETED");
    expect(completed.obligation.status).toBe("COMPLETED");
    expect(completed.deliveryAttempts[0]).toMatchObject({
      status: "FAILED",
      failureReason: "ACCOUNT_CLOSED",
    });
    expect(completed.deliveryAttempts[1]?.status).toBe("DELIVERED");
    expect(completed.auditEvents.map((event) => event.type)).toEqual([
      "OBLIGATION_CREATED",
      "DELIVERY_FAILED",
      "DESTINATION_VALIDATION_STARTED",
      "DESTINATION_VALIDATED",
      "DESTINATION_AUTHORIZED",
      "POLICY_EVALUATION_STARTED",
      "POLICY_PASSED",
      "RETRY_SCHEDULED",
      "POLICY_EVALUATION_STARTED",
      "POLICY_BLOCKED",
      "RETRY_PROCESSING",
      "PAYMENT_DELIVERED",
      "OBLIGATION_COMPLETED",
    ]);
  }, 120_000);

  it("rejects authorization until persisted validation succeeds", async () => {
    await expect(service.authorizeDestination()).rejects.toThrow(
      "Cannot authorize an unvalidated refund destination",
    );
  }, 120_000);

  it("persists one retry and one schedule event across repeated creation", async () => {
    await makeObligationEligible();

    await service.createRetryIfEligible();
    await service.createRetryIfEligible();

    await expectOnePersistedRetryAndAudit();
  }, 120_000);

  it("persists one retry and one schedule event under concurrent creation", async () => {
    await makeObligationEligible();

    await Promise.all([
      service.createRetryIfEligible(),
      service.createRetryIfEligible(),
    ]);

    await expectOnePersistedRetryAndAudit();
  }, 120_000);

  it("rolls back authorization when DESTINATION_AUTHORIZED audit persistence fails", async () => {
    await service.validateDestination();
    const failingService = buildService({
      transactionRunner: failAuditAppend("DESTINATION_AUTHORIZED"),
    });

    await expect(failingService.authorizeDestination()).rejects.toThrow(
      "Injected failure while appending DESTINATION_AUTHORIZED",
    );

    const [destination, attempts] = await Promise.all([
      destinationRepository.getById(testIds.hdfcDestinationId),
      deliveryRepository.listForObligation(testIds.obligationId),
    ]);
    expect(destination?.refundAuthorized).toBe(false);
    expect(
      attempts.filter((attempt) => attempt.idempotencyKey === retryIdempotencyKey),
    ).toHaveLength(0);
    expect(await countAuditEvents("DESTINATION_AUTHORIZED")).toBe(0);
  }, 120_000);

  it("rolls back authorization, policy, and retry after retry insertion fails to commit", async () => {
    await service.validateDestination();
    const failingService = buildService({
      transactionRunner: failAuditAppend("RETRY_SCHEDULED"),
    });

    await expect(failingService.authorizeDestination()).rejects.toThrow(
      "Injected failure while appending RETRY_SCHEDULED",
    );

    const [destination, attempts, events] = await Promise.all([
      destinationRepository.getById(testIds.hdfcDestinationId),
      deliveryRepository.listForObligation(testIds.obligationId),
      auditRepository.listForObligation(testIds.obligationId),
    ]);
    expect(destination?.refundAuthorized).toBe(false);
    expect(
      attempts.filter((attempt) => attempt.idempotencyKey === retryIdempotencyKey),
    ).toHaveLength(0);
    expect(
      events.some((event) =>
        [
          "DESTINATION_AUTHORIZED",
          "POLICY_EVALUATION_STARTED",
          "POLICY_PASSED",
          "RETRY_SCHEDULED",
        ].includes(event.eventType),
      ),
    ).toBe(false);
  }, 120_000);

  it("rolls back the entire completion transaction when its final audit append fails", async () => {
    const retryId = await scheduleRetry();
    const failingService = buildService({
      transactionRunner: failAuditAppend("OBLIGATION_COMPLETED"),
    });

    await expect(failingService.processScheduledRetry(retryId)).rejects.toThrow(
      "Injected failure while appending OBLIGATION_COMPLETED",
    );

    const [attempt, obligation, events] = await Promise.all([
      deliveryRepository.getById(retryId),
      obligationRepository.getById(testIds.obligationId),
      auditRepository.listForObligation(testIds.obligationId),
    ]);
    expect(attempt?.status).toBe("PROCESSING");
    expect(obligation?.status).toBe("OWED");
    expect(events.some((event) => event.eventType === "PAYMENT_DELIVERED")).toBe(
      false,
    );
    expect(
      events.some((event) => event.eventType === "OBLIGATION_COMPLETED"),
    ).toBe(false);
  }, 120_000);

  it("commits PROCESSING before invoking the simulated bank", async () => {
    const retryId = await scheduleRetry();
    let bankCalls = 0;
    const checkingBank = createMockBankAdapter(async (milliseconds) => {
      if (milliseconds !== 1_500) return;
      bankCalls += 1;
      const persisted = await deliveryRepository.getById(retryId);
      expect(persisted?.status).toBe("PROCESSING");
    });

    await buildService({ bankAdapter: checkingBank }).processScheduledRetry(
      retryId,
    );

    expect(bankCalls).toBe(1);
  }, 120_000);

  it("serializes concurrent authorization into one retry and one logical audit", async () => {
    await service.validateDestination();

    await Promise.all([
      service.authorizeDestination(),
      service.authorizeDestination(),
    ]);

    await expectOnePersistedRetryAndAudit();
    expect(await countAuditEvents("DESTINATION_AUTHORIZED")).toBe(1);
  }, 120_000);

  it("does not invoke the bank for an already PROCESSING retry", async () => {
    const retryId = await scheduleRetry();
    await service.startRetry(retryId);
    let bankCalls = 0;
    const countingBank = createMockBankAdapter(async (milliseconds) => {
      if (milliseconds === 1_500) bankCalls += 1;
    });

    const state = await buildService({
      bankAdapter: countingBank,
    }).processScheduledRetry(retryId);

    expect(bankCalls).toBe(0);
    expect(
      state.deliveryAttempts.find((attempt) => attempt.id === retryId)?.status,
    ).toBe("PROCESSING");
  }, 120_000);

  it("does not invoke the bank again for a DELIVERED retry", async () => {
    const retryId = await scheduleRetry();
    await service.processScheduledRetry(retryId);
    let bankCalls = 0;
    const countingBank = createMockBankAdapter(async (milliseconds) => {
      if (milliseconds === 1_500) bankCalls += 1;
    });

    const state = await buildService({
      bankAdapter: countingBank,
    }).processScheduledRetry(retryId);

    expect(bankCalls).toBe(0);
    expect(state.obligation.status).toBe("COMPLETED");
  }, 120_000);

  it("does not invoke the bank when the obligation is already COMPLETED", async () => {
    const retryId = await scheduleRetry();
    await obligationRepository.markCompleted(testIds.obligationId);
    let bankCalls = 0;
    const countingBank = createMockBankAdapter(async (milliseconds) => {
      if (milliseconds === 1_500) bankCalls += 1;
    });

    const state = await buildService({
      bankAdapter: countingBank,
    }).processScheduledRetry(retryId);

    expect(bankCalls).toBe(0);
    expect(state.obligation.status).toBe("COMPLETED");
    expect(
      state.deliveryAttempts.find((attempt) => attempt.id === retryId)?.status,
    ).toBe("SCHEDULED");
  }, 120_000);
});
