import type { DeliveryAttempt, RefundDestination } from "../domain/types";

export const SIMULATED_VALIDATION_DELAY_MS = 650;
export const SIMULATED_DELIVERY_DELAY_MS = 1_500;

export interface DestinationValidationResult {
  readonly integration: "SIMULATED_BANK";
  readonly destination: RefundDestination;
}

export interface PaymentDeliveryResult {
  readonly integration: "SIMULATED_BANK";
  readonly attempt: DeliveryAttempt;
}

export interface MockBankAdapter {
  validateDestination(
    destination: RefundDestination,
  ): Promise<DestinationValidationResult>;
  deliverPayment(attempt: DeliveryAttempt): Promise<PaymentDeliveryResult>;
}

// TODO(real payment rail): use DeliveryAttempt.idempotencyKey as the external
// payment reference and add status lookup/reconciliation. That is required to
// recover if payment succeeds externally before the local completion
// transaction commits.

type Wait = (milliseconds: number) => Promise<void>;

function simulatedWait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createMockBankAdapter(
  wait: Wait = simulatedWait,
): MockBankAdapter {
  return {
    async validateDestination(destination) {
      if (destination.validationStatus !== "UNVALIDATED") {
        throw new Error(
          "Simulated bank validation requires an unvalidated destination",
        );
      }

      await wait(SIMULATED_VALIDATION_DELAY_MS);

      return {
        integration: "SIMULATED_BANK",
        destination: {
          ...destination,
          validationStatus: "VALIDATED",
        },
      };
    },

    async deliverPayment(attempt) {
      if (attempt.status !== "PROCESSING") {
        throw new Error(
          "Simulated bank delivery requires a processing attempt",
        );
      }

      await wait(SIMULATED_DELIVERY_DELAY_MS);

      return {
        integration: "SIMULATED_BANK",
        attempt: {
          ...attempt,
          status: "DELIVERED",
          failureReason: null,
        },
      };
    },
  };
}
