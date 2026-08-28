import { createDemoState, type DemoState } from "../data/demo";
import type {
  DeliveryAttempt,
  DemoBlockers,
  GovernmentObligation,
} from "../domain/types";

export interface MockIncomeTaxAdapter {
  getObligation(): Promise<GovernmentObligation>;
  getPreviousDelivery(): Promise<DeliveryAttempt>;
  getBlockers(): Promise<DemoBlockers>;
}

export function createMockIncomeTaxAdapter(
  getDemoState: () => DemoState = createDemoState,
): MockIncomeTaxAdapter {
  return {
    async getObligation() {
      return { ...getDemoState().obligation };
    },

    async getPreviousDelivery() {
      const previousDelivery = getDemoState().deliveryAttempts[0];

      if (!previousDelivery) {
        throw new Error("Synthetic demo state has no previous delivery");
      }

      return { ...previousDelivery };
    },

    async getBlockers() {
      return { ...getDemoState().blockers };
    },
  };
}
