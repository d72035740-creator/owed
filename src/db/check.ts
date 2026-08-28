import { eq } from "drizzle-orm";

import { createRetryIdempotencyKey } from "../domain/idempotency";
import { db } from "./index";
import { createPostgresAuditRepository } from "./repositories/audit-repository";
import { createPostgresDeliveryRepository } from "./repositories/delivery-repository";
import { createPostgresDestinationRepository } from "./repositories/destination-repository";
import { createPostgresObligationRepository } from "./repositories/obligation-repository";
import { users } from "./schema";

class SmokeCheckError extends Error {}

function requireExpected(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new SmokeCheckError(message);
  }
}

function formatRupees(amountPaise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountPaise / 100);
}

async function checkSeededDemo(): Promise<void> {
  const obligationRepository = createPostgresObligationRepository();
  const destinationRepository = createPostgresDestinationRepository();
  const deliveryRepository = createPostgresDeliveryRepository();
  const auditRepository = createPostgresAuditRepository();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.displayName, "Meera Sharma"))
    .limit(1);
  requireExpected(user, "Synthetic user Meera Sharma is missing");

  const obligations = await obligationRepository.getForUser(user.id);
  const obligation = obligations.find(
    (record) => record.type === "INCOME_TAX_REFUND",
  );
  requireExpected(obligation, "Synthetic refund obligation is missing");
  requireExpected(
    obligation.amountPaise === 2_374_000,
    "Synthetic refund amount is incorrect",
  );
  const displayAmount = formatRupees(obligation.amountPaise);
  requireExpected(displayAmount === "₹23,740", "Formatted refund amount is incorrect");
  requireExpected(obligation.status === "OWED", "Refund must remain OWED");
  requireExpected(
    obligation.assessmentYear === "2026-27",
    "Assessment year is incorrect",
  );

  const destinations = await destinationRepository.getForUser(user.id);
  const previousDestination = destinations.find(
    (record) =>
      record.bankName === "SBI" && record.maskedAccount === "••••1028",
  );
  requireExpected(previousDestination, "Synthetic SBI destination is missing");

  const originalDelivery = await deliveryRepository.getByIdempotencyKey(
    createRetryIdempotencyKey(
      obligation.id,
      previousDestination.id,
      previousDestination.version,
    ),
  );
  requireExpected(originalDelivery, "Original delivery attempt is missing");
  requireExpected(
    originalDelivery.status === "FAILED",
    "Original delivery must be FAILED",
  );
  requireExpected(
    originalDelivery.failureReason === "ACCOUNT_CLOSED",
    "Original delivery failure reason must be ACCOUNT_CLOSED",
  );

  const replacementDestination = destinations.find(
    (record) =>
      record.bankName === "HDFC Bank" && record.maskedAccount === "••••4821",
  );
  requireExpected(
    replacementDestination,
    "Synthetic HDFC destination is missing",
  );
  requireExpected(
    replacementDestination.validationStatus === "UNVALIDATED",
    "Replacement destination must be UNVALIDATED",
  );
  requireExpected(
    replacementDestination.refundAuthorized === false,
    "Replacement destination must not be authorized",
  );

  const auditHistory = await auditRepository.listForObligation(obligation.id);
  const eventTypes = new Set(auditHistory.map((event) => event.eventType));
  requireExpected(
    eventTypes.has("OBLIGATION_CREATED"),
    "OBLIGATION_CREATED audit event is missing",
  );
  requireExpected(
    eventTypes.has("DELIVERY_FAILED"),
    "DELIVERY_FAILED audit event is missing",
  );

  console.info("Synthetic OWED database check passed");
  console.info(`User: ${user.displayName}`);
  console.info(
    `Obligation: ${displayAmount}, ${obligation.status}, AY ${obligation.assessmentYear}`,
  );
  console.info(
    `Original delivery: ${originalDelivery.status}, ${originalDelivery.failureReason}`,
  );
  console.info(
    `Replacement: ${replacementDestination.bankName} ${replacementDestination.maskedAccount}, ${replacementDestination.validationStatus}, authorized=${replacementDestination.refundAuthorized}`,
  );
  console.info(`Initial audit events: ${auditHistory.length}`);
}

checkSeededDemo()
  .catch((error: unknown) => {
    if (error instanceof SmokeCheckError) {
      console.error(`Synthetic OWED database check failed: ${error.message}`);
    } else {
      console.error("Synthetic OWED database check failed unexpectedly");
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$client.end();
  });
