import { eq } from "drizzle-orm";

import { db, type DatabaseExecutor } from "../index";
import {
  governmentObligations,
  type GovernmentObligationRow,
} from "../schema";

export interface ObligationRepository {
  getById(id: string): Promise<GovernmentObligationRow | null>;
  getByIdForUpdate(id: string): Promise<GovernmentObligationRow | null>;
  getForUser(userId: string): Promise<readonly GovernmentObligationRow[]>;
  updateStatus(
    id: string,
    status: GovernmentObligationRow["status"],
  ): Promise<GovernmentObligationRow | null>;
  markCompleted(id: string): Promise<GovernmentObligationRow | null>;
  resetDemo(id: string): Promise<GovernmentObligationRow | null>;
}

export function createPostgresObligationRepository(
  database: DatabaseExecutor = db,
): ObligationRepository {
  return {
    async getById(id) {
      const [row] = await database
        .select()
        .from(governmentObligations)
        .where(eq(governmentObligations.id, id))
        .limit(1);
      return row ?? null;
    },

    async getByIdForUpdate(id) {
      const [row] = await database
        .select()
        .from(governmentObligations)
        .where(eq(governmentObligations.id, id))
        .limit(1)
        .for("update");
      return row ?? null;
    },

    async getForUser(userId) {
      return database
        .select()
        .from(governmentObligations)
        .where(eq(governmentObligations.userId, userId));
    },

    async updateStatus(id, status) {
      const [row] = await database
        .update(governmentObligations)
        .set({ status, updatedAt: new Date() })
        .where(eq(governmentObligations.id, id))
        .returning();
      return row ?? null;
    },

    async markCompleted(id) {
      const completedAt = new Date();
      const [row] = await database
        .update(governmentObligations)
        .set({
          status: "COMPLETED",
          completedAt,
          updatedAt: completedAt,
        })
        .where(eq(governmentObligations.id, id))
        .returning();
      return row ?? null;
    },

    async resetDemo(id) {
      const [row] = await database
        .update(governmentObligations)
        .set({
          status: "OWED",
          legalHold: false,
          adjustmentPending: false,
          identityConflict: false,
          completedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(governmentObligations.id, id))
        .returning();
      return row ?? null;
    },
  };
}
