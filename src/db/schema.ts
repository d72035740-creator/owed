import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const obligationStatus = pgEnum("obligation_status", [
  "OWED",
  "BLOCKED",
  "COMPLETED",
]);

export const destinationValidationStatus = pgEnum(
  "destination_validation_status",
  ["UNVALIDATED", "VALIDATING", "VALIDATED", "FAILED"],
);

export const deliveryAttemptStatus = pgEnum("delivery_attempt_status", [
  "SCHEDULED",
  "PROCESSING",
  "FAILED",
  "DELIVERED",
]);

export const deliveryFailureReason = pgEnum("delivery_failure_reason", [
  "ACCOUNT_CLOSED",
  "INVALID_ACCOUNT",
  "BANK_REJECTED",
  "IDENTITY_MISMATCH",
  "OTHER",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const governmentObligations = pgTable(
  "government_obligations",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: text("type").notNull(),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    assessmentYear: text("assessment_year").notNull(),
    status: obligationStatus("status").notNull(),
    legalHold: boolean("legal_hold").default(false).notNull(),
    adjustmentPending: boolean("adjustment_pending").default(false).notNull(),
    identityConflict: boolean("identity_conflict").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("government_obligations_user_id_idx").on(table.userId),
    index("government_obligations_user_status_idx").on(
      table.userId,
      table.status,
    ),
  ],
);

export const refundDestinations = pgTable(
  "refund_destinations",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    bankName: text("bank_name").notNull(),
    maskedAccount: text("masked_account").notNull(),
    accountHolder: text("account_holder").notNull(),
    validationStatus: destinationValidationStatus("validation_status").notNull(),
    refundAuthorized: boolean("refund_authorized").default(false).notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("refund_destinations_user_id_idx").on(table.userId)],
);

export const deliveryAttempts = pgTable(
  "delivery_attempts",
  {
    id: uuid("id").primaryKey(),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => governmentObligations.id, { onDelete: "restrict" }),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => refundDestinations.id, { onDelete: "restrict" }),
    status: deliveryAttemptStatus("status").notNull(),
    failureReason: deliveryFailureReason("failure_reason"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("delivery_attempts_idempotency_key_unique").on(
      table.idempotencyKey,
    ),
    index("delivery_attempts_obligation_id_idx").on(table.obligationId),
    index("delivery_attempts_obligation_status_idx").on(
      table.obligationId,
      table.status,
    ),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey(),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => governmentObligations.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    message: text("message"),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_events_obligation_created_at_idx").on(
      table.obligationId,
      table.createdAt,
    ),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type GovernmentObligationRow = typeof governmentObligations.$inferSelect;
export type RefundDestinationRow = typeof refundDestinations.$inferSelect;
export type DeliveryAttemptRow = typeof deliveryAttempts.$inferSelect;
export type AuditEventRow = typeof auditEvents.$inferSelect;
