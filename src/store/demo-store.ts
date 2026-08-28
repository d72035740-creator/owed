import type { RefundState } from "@/domain/state-machine";

export interface DemoStore {
  get(): RefundState;
  set(state: RefundState): void;
}
