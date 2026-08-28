import { loadConsumerRefund } from "@/services/demo-owed";
import { owedResponse } from "./response";

export const dynamic = "force-dynamic";

export function GET() {
  return owedResponse(loadConsumerRefund);
}
