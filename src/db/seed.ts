import { db } from "./index";
import { and, eq, ne } from "drizzle-orm";
import {
  DEMO_OBLIGATION_ID,
  DEMO_USER_ID,
  FAILED_ATTEMPT_ID,
  HDFC_DESTINATION_ID,
  INITIAL_AUDIT_EVENT_IDS,
  SBI_DESTINATION_ID,
} from "./demo-constants";
import {
  auditEvents,
  deliveryAttempts,
  governmentObligations,
  refundDestinations,
  users,
} from "./schema";

async function seed(): Promise<void> {
  await db.transaction(async (transaction) => {
    await transaction
      .delete(auditEvents)
      .where(eq(auditEvents.obligationId, DEMO_OBLIGATION_ID));
    await transaction
      .delete(deliveryAttempts)
      .where(
        and(
          eq(deliveryAttempts.obligationId, DEMO_OBLIGATION_ID),
          ne(deliveryAttempts.id, FAILED_ATTEMPT_ID),
        ),
      );
    await transaction
      .insert(users)
      .values({ id: DEMO_USER_ID, displayName: "Meera Sharma" })
      .onConflictDoUpdate({
        target: users.id,
        set: { displayName: "Meera Sharma" },
      });

    await transaction
      .insert(governmentObligations)
      .values({
        id: DEMO_OBLIGATION_ID,
        userId: DEMO_USER_ID,
        type: "INCOME_TAX_REFUND",
        amountPaise: 2_374_000,
        assessmentYear: "2026-27",
        status: "OWED",
        legalHold: false,
        adjustmentPending: false,
        identityConflict: false,
      })
      .onConflictDoUpdate({
        target: governmentObligations.id,
        set: {
          status: "OWED",
          legalHold: false,
          adjustmentPending: false,
          identityConflict: false,
          completedAt: null,
          updatedAt: new Date(),
        },
      });

    await transaction
      .insert(refundDestinations)
      .values([
        {
          id: SBI_DESTINATION_ID,
          userId: DEMO_USER_ID,
          bankName: "SBI",
          maskedAccount: "••••1028",
          accountHolder: "Meera Sharma",
          validationStatus: "VALIDATED",
          refundAuthorized: true,
          version: 1,
          validatedAt: new Date(),
        },
        {
          id: HDFC_DESTINATION_ID,
          userId: DEMO_USER_ID,
          bankName: "HDFC Bank",
          maskedAccount: "••••4821",
          accountHolder: "Meera Sharma",
          validationStatus: "UNVALIDATED",
          refundAuthorized: false,
          version: 1,
        },
      ])
      .onConflictDoUpdate({
        target: refundDestinations.id,
        set: {
          userId: DEMO_USER_ID,
          accountHolder: "Meera Sharma",
          version: 1,
          updatedAt: new Date(),
        },
      });

    await transaction
      .update(refundDestinations)
      .set({
        bankName: "SBI",
        maskedAccount: "••••1028",
        validationStatus: "VALIDATED",
        refundAuthorized: true,
        validatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refundDestinations.id, SBI_DESTINATION_ID));
    await transaction
      .update(refundDestinations)
      .set({
        bankName: "HDFC Bank",
        maskedAccount: "••••4821",
        validationStatus: "UNVALIDATED",
        refundAuthorized: false,
        validatedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(refundDestinations.id, HDFC_DESTINATION_ID));

    await transaction
      .insert(deliveryAttempts)
      .values({
        id: FAILED_ATTEMPT_ID,
        obligationId: DEMO_OBLIGATION_ID,
        destinationId: SBI_DESTINATION_ID,
        status: "FAILED",
        failureReason: "ACCOUNT_CLOSED",
        idempotencyKey: `${DEMO_OBLIGATION_ID}:${SBI_DESTINATION_ID}:v1`,
        completedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: deliveryAttempts.id,
        set: {
          status: "FAILED",
          failureReason: "ACCOUNT_CLOSED",
        },
      });

    await transaction
      .insert(auditEvents)
      .values([
        {
          id: INITIAL_AUDIT_EVENT_IDS[0],
          obligationId: DEMO_OBLIGATION_ID,
          eventType: "OBLIGATION_CREATED",
          message: "Refund obligation recorded",
          metadata: { synthetic: true },
        },
        {
          id: INITIAL_AUDIT_EVENT_IDS[1],
          obligationId: DEMO_OBLIGATION_ID,
          eventType: "DELIVERY_FAILED",
          message: "Payment delivery failed",
          metadata: {
            synthetic: true,
            failureReason: "ACCOUNT_CLOSED",
          },
        },
      ])
      .onConflictDoNothing({ target: auditEvents.id });
  });
}

seed()
  .then(() => {
    console.info("Synthetic OWED demo seeded");
  })
  .catch((error: unknown) => {
    console.error("Failed to seed synthetic OWED demo", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$client.end();
  });
