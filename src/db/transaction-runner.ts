import type { AuditRepository } from "./repositories/audit-repository";
import { createPostgresAuditRepository } from "./repositories/audit-repository";
import type { DeliveryRepository } from "./repositories/delivery-repository";
import { createPostgresDeliveryRepository } from "./repositories/delivery-repository";
import type { DestinationRepository } from "./repositories/destination-repository";
import { createPostgresDestinationRepository } from "./repositories/destination-repository";
import type { ObligationRepository } from "./repositories/obligation-repository";
import { createPostgresObligationRepository } from "./repositories/obligation-repository";
import { db, type OwedDatabase } from "./index";

export interface OwedRepositories {
  readonly obligationRepository: ObligationRepository;
  readonly destinationRepository: DestinationRepository;
  readonly deliveryRepository: DeliveryRepository;
  readonly auditRepository: AuditRepository;
}

export interface OwedTransactionRunner {
  run<T>(work: (repositories: OwedRepositories) => Promise<T>): Promise<T>;
}

export function createPostgresOwedTransactionRunner(
  database: OwedDatabase = db,
): OwedTransactionRunner {
  return {
    run(work) {
      return database.transaction(async (transaction) =>
        work({
          obligationRepository:
            createPostgresObligationRepository(transaction),
          destinationRepository:
            createPostgresDestinationRepository(transaction),
          deliveryRepository: createPostgresDeliveryRepository(transaction),
          auditRepository: createPostgresAuditRepository(transaction),
        }),
      );
    },
  };
}
