import { describe, expect, it } from "vitest";

import { createDemoState } from "../src/data/demo";
import { createMockIncomeTaxAdapter } from "../src/services/mock-income-tax";

describe("mock Income Tax adapter", () => {
  it("returns the government data from the synthetic demo", async () => {
    const adapter = createMockIncomeTaxAdapter();
    const [obligation, previousDelivery, blockers] = await Promise.all([
      adapter.getObligation(),
      adapter.getPreviousDelivery(),
      adapter.getBlockers(),
    ]);

    expect(obligation).toEqual(createDemoState().obligation);
    expect(previousDelivery).toEqual(createDemoState().deliveryAttempts[0]);
    expect(blockers).toEqual(createDemoState().blockers);
  });

  it("returns fresh values rather than mutable fixture references", async () => {
    const adapter = createMockIncomeTaxAdapter();
    const firstObligation = await adapter.getObligation();
    const secondObligation = await adapter.getObligation();
    const firstBlockers = await adapter.getBlockers();
    const secondBlockers = await adapter.getBlockers();

    expect(firstObligation).not.toBe(secondObligation);
    expect(firstBlockers).not.toBe(secondBlockers);
  });
});
