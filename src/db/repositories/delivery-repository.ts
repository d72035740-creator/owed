import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";

import { db, type DatabaseExecutor } from "../index";
import { deliveryAttempts, type DeliveryAttemptRow } from "../schema";

export type NewDeliveryAttempt = typeof deliveryAttempts.$inferInsert;

export interface DeliveryRepository {
  getLatestForObligation(
    obligationId: string,
  ): Promise<DeliveryAttemptRow | null>;
  getByIdempotencyKey(key: string): Promise<DeliveryAttemptRow | null>;
  getById(id: string): Promise<DeliveryAttemptRow | null>;
  getByIdForUpdate(id: string): Promise<DeliveryAttemptRow | null>;
  listForObligation(obligationId: string): Promise<readonly DeliveryAttemptRow[]>;
  getLatestFailedForObligation(
    obligationId: string,
  ): Promise<DeliveryAttemptRow | null>;
  create(attempt: NewDeliveryAttempt): Promise<DeliveryAttemptRow>;
  markProcessing(id: string): Promise<DeliveryAttemptRow | null>;
  markDelivered(id: string): Promise<DeliveryAttemptRow | null>;
  getActiveRetry(obligationId: string): Promise<DeliveryAttemptRow | null>;
  resetDemo(
    obligationId: string,
    originalAttemptId: string,
  ): Promise<void>;
}

export function createPostgresDeliveryRepository(
  database: DatabaseExecutor = db,
): DeliveryRepository {
  async function getByIdempotencyKey(
    key: string,
  ): Promise<DeliveryAttemptRow | null> {
    const [row] = await database
      .select()
      .from(deliveryAttempts)
      .where(eq(deliveryAttempts.idempotencyKey, key))
      .limit(1);
    return row ?? null;
  }

  return {
    async getLatestForObligation(obligationId) {
      const [row] = await database
        .select()
        .from(deliveryAttempts)
        .where(eq(deliveryAttempts.obligationId, obligationId))
        .orderBy(desc(deliveryAttempts.createdAt))
        .limit(1);
      return row ?? null;
    },

    getByIdempotencyKey,

    async getById(id) {
      const [row] = await database
        .select()
        .from(deliveryAttempts)
        .where(eq(deliveryAttempts.id, id))
        .limit(1);
      return row ?? null;
    },

    async getByIdForUpdate(id) {
      const [row] = await database
        .select()
        .from(deliveryAttempts)
        .where(eq(deliveryAttempts.id, id))
        .limit(1)
        .for("update");
      return row ?? null;
    },

    async listForObligation(obligationId) {
      return database
        .select()
        .from(deliveryAttempts)
        .where(eq(deliveryAttempts.obligationId, obligationId))
        .orderBy(asc(deliveryAttempts.createdAt));
    },

    async getLatestFailedForObligation(obligationId) {
      const [row] = await database
        .select()
        .from(deliveryAttempts)
        .where(
          and(
            eq(deliveryAttempts.obligationId, obligationId),
            eq(deliveryAttempts.status, "FAILED"),
          ),
        )
        .orderBy(desc(deliveryAttempts.createdAt))
        .limit(1);
      return row ?? null;
    },

    async create(attempt) {
      const [created] = await database
        .insert(deliveryAttempts)
        .values(attempt)
        .onConflictDoNothing({ target: deliveryAttempts.idempotencyKey })
        .returning();

      if (created) {
        return created;
      }

      const existing = await getByIdempotencyKey(attempt.idempotencyKey);
      if (!existing) {
        throw new Error("Retry conflict occurred without an existing attempt");
      }
      return existing;
    },

    async markProcessing(id) {
      const [row] = await database
        .update(deliveryAttempts)
        .set({ status: "PROCESSING", startedAt: new Date() })
        .where(
          and(
            eq(deliveryAttempts.id, id),
            eq(deliveryAttempts.status, "SCHEDULED"),
          ),
        )
        .returning();
      return row ?? null;
    },

    async markDelivered(id) {
      const [row] = await database
        .update(deliveryAttempts)
        .set({
          status: "DELIVERED",
          failureReason: null,
          completedAt: new Date(),
        })
        .where(
          and(
            eq(deliveryAttempts.id, id),
            eq(deliveryAttempts.status, "PROCESSING"),
          ),
        )
        .returning();
      return row ?? null;
    },

    async getActiveRetry(obligationId) {
      const [row] = await database
        .select()
        .from(deliveryAttempts)
        .where(
          and(
            eq(deliveryAttempts.obligationId, obligationId),
            inArray(deliveryAttempts.status, ["SCHEDULED", "PROCESSING"]),
          ),
        )
        .orderBy(desc(deliveryAttempts.createdAt))
        .limit(1);
      return row ?? null;
    },

    async resetDemo(obligationId, originalAttemptId) {
      await database
        .delete(deliveryAttempts)
        .where(
          and(
            eq(deliveryAttempts.obligationId, obligationId),
            ne(deliveryAttempts.id, originalAttemptId),
          ),
        );
      await database
        .update(deliveryAttempts)
        .set({
          status: "FAILED",
          failureReason: "ACCOUNT_CLOSED",
          startedAt: null,
          completedAt: new Date(),
        })
        .where(eq(deliveryAttempts.id, originalAttemptId));
    },
  };
}
