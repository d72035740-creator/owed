import { eq, sql } from "drizzle-orm";

import { db, type DatabaseExecutor } from "../index";
import {
  refundDestinations,
  type RefundDestinationRow,
} from "../schema";

export interface DestinationRepository {
  getById(id: string): Promise<RefundDestinationRow | null>;
  getByIdForUpdate(id: string): Promise<RefundDestinationRow | null>;
  getForUser(userId: string): Promise<readonly RefundDestinationRow[]>;
  updateValidationStatus(
    id: string,
    status: RefundDestinationRow["validationStatus"],
  ): Promise<RefundDestinationRow | null>;
  authorize(id: string): Promise<RefundDestinationRow | null>;
  incrementVersion(id: string): Promise<RefundDestinationRow | null>;
  resetDemo(id: string): Promise<RefundDestinationRow | null>;
}

export function createPostgresDestinationRepository(
  database: DatabaseExecutor = db,
): DestinationRepository {
  return {
    async getById(id) {
      const [row] = await database
        .select()
        .from(refundDestinations)
        .where(eq(refundDestinations.id, id))
        .limit(1);
      return row ?? null;
    },

    async getByIdForUpdate(id) {
      const [row] = await database
        .select()
        .from(refundDestinations)
        .where(eq(refundDestinations.id, id))
        .limit(1)
        .for("update");
      return row ?? null;
    },

    async getForUser(userId) {
      return database
        .select()
        .from(refundDestinations)
        .where(eq(refundDestinations.userId, userId));
    },

    async updateValidationStatus(id, status) {
      const now = new Date();
      const [row] = await database
        .update(refundDestinations)
        .set({
          validationStatus: status,
          validatedAt: status === "VALIDATED" ? now : null,
          updatedAt: now,
        })
        .where(eq(refundDestinations.id, id))
        .returning();
      return row ?? null;
    },

    async authorize(id) {
      const [row] = await database
        .update(refundDestinations)
        .set({ refundAuthorized: true, updatedAt: new Date() })
        .where(eq(refundDestinations.id, id))
        .returning();
      return row ?? null;
    },

    async incrementVersion(id) {
      const [row] = await database
        .update(refundDestinations)
        .set({
          version: sql`${refundDestinations.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(refundDestinations.id, id))
        .returning();
      return row ?? null;
    },

    async resetDemo(id) {
      const [row] = await database
        .update(refundDestinations)
        .set({
          validationStatus: "UNVALIDATED",
          refundAuthorized: false,
          version: 1,
          validatedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(refundDestinations.id, id))
        .returning();
      return row ?? null;
    },
  };
}
