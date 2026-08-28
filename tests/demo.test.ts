import { describe, expect, it } from "vitest";

import { createDemoState } from "../src/data/demo";

describe("synthetic demo state", () => {
  it("creates a fresh copy of the entire state", () => {
    const first = createDemoState();
    const second = createDemoState();

    expect({
      ...first,
      auditEvents: first.auditEvents.map((event) => ({
        ...event,
        timestamp: "runtime timestamp",
      })),
    }).toEqual({
      ...second,
      auditEvents: second.auditEvents.map((event) => ({
        ...event,
        timestamp: "runtime timestamp",
      })),
    });
    expect(first).not.toBe(second);
    expect(first.citizen).not.toBe(second.citizen);
    expect(first.obligation).not.toBe(second.obligation);
    expect(first.destinations).not.toBe(second.destinations);
    expect(first.destinations[0]).not.toBe(second.destinations[0]);
    expect(first.deliveryAttempts).not.toBe(second.deliveryAttempts);
    expect(first.deliveryAttempts[0]).not.toBe(second.deliveryAttempts[0]);
    expect(first.auditEvents).not.toBe(second.auditEvents);
    expect(first.auditEvents[0]).not.toBe(second.auditEvents[0]);
    expect(first.blockers).not.toBe(second.blockers);
  });
});
