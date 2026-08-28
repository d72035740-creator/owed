import type { RefundState } from "@/domain/state-machine";

export interface Persistence {
  read(): Promise<RefundState | null>;
  write(state: RefundState): Promise<void>;
}
