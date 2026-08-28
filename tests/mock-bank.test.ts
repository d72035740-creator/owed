import { describe, expect, it } from "vitest";

import { createDemoState } from "../src/data/demo";
import {
  createMockBankAdapter,
  SIMULATED_DELIVERY_DELAY_MS,
  SIMULATED_VALIDATION_DELAY_MS,
} from "../src/services/mock-bank";

describe("mock bank adapter", () => {
  it("simulates deterministic destination validation after 650ms", async () => {
    const waits: number[] = [];
    const adapter = createMockBankAdapter(async (milliseconds) => {
      waits.push(milliseconds);
    });
    const destination = createDemoState().destinations[1];

    const result = await adapter.validateDestination(destination);

    expect(waits).toEqual([SIMULATED_VALIDATION_DELAY_MS]);
    expect(SIMULATED_VALIDATION_DELAY_MS).toBe(650);
    expect(result.integration).toBe("SIMULATED_BANK");
    expect(result.destination).toEqual({
      ...destination,
      validationStatus: "VALIDATED",
    });
    expect(result.destination).not.toBe(destination);
  });

  it("simulates deterministic delivery after 1500ms", async () => {
    const waits: number[] = [];
    const adapter = createMockBankAdapter(async (milliseconds) => {
      waits.push(milliseconds);
    });
    const previousAttempt = createDemoState().deliveryAttempts[0];
    const processingAttempt = {
      ...previousAttempt,
      id: "retry:refund-demo-001:destination-demo-hdfc-001:v1",
      destinationId: "destination-demo-hdfc-001",
      status: "PROCESSING" as const,
      failureReason: null,
      idempotencyKey: "refund-demo-001:destination-demo-hdfc-001:v1",
    };

    const result = await adapter.deliverPayment(processingAttempt);

    expect(waits).toEqual([SIMULATED_DELIVERY_DELAY_MS]);
    expect(SIMULATED_DELIVERY_DELAY_MS).toBe(1_500);
    expect(result.integration).toBe("SIMULATED_BANK");
    expect(result.attempt).toEqual({
      ...processingAttempt,
      status: "DELIVERED",
      failureReason: null,
    });
    expect(result.attempt).not.toBe(processingAttempt);
  });

  it("guards invalid simulated integration inputs", async () => {
    const adapter = createMockBankAdapter(async () => {});
    const demo = createDemoState();

    await expect(
      adapter.validateDestination(demo.destinations[0]),
    ).rejects.toThrow("requires an unvalidated destination");
    await expect(
      adapter.deliverPayment(demo.deliveryAttempts[0]),
    ).rejects.toThrow("requires a processing attempt");
  });
});
