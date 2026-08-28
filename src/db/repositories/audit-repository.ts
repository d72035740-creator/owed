import { and, asc, eq, notInArray } from "drizzle-orm";

import { db, type DatabaseExecutor } from "../index";
import { auditEvents, type AuditEventRow } from "../schema";

export type NewAuditEvent = typeof auditEvents.$inferInsert;

export interface AuditRepository {
  append(event: NewAuditEvent): Promise<AuditEventRow>;
  listForObligation(obligationId: string): Promise<readonly AuditEventRow[]>;
  resetDemo(
    obligationId: string,
    initialEventIds: readonly string[],
  ): Promise<void>;
}

export function createPostgresAuditRepository(
  database: DatabaseExecutor = db,
): AuditRepository {
  return {
    async append(event) {
      const [created] = await database
        .insert(auditEvents)
        .values(event)
        .returning();
      if (!created) {
        throw new Error("Audit event was not persisted");
      }
      return created;
    },

    async listForObligation(obligationId) {
      return database
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.obligationId, obligationId))
        .orderBy(asc(auditEvents.createdAt));
    },

    async resetDemo(obligationId, initialEventIds) {
      await database
        .delete(auditEvents)
        .where(
          and(
            eq(auditEvents.obligationId, obligationId),
            notInArray(auditEvents.id, [...initialEventIds]),
          ),
        );
    },
  };
}
