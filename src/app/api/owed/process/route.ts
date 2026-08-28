import { processConsumerPayment } from "@/services/demo-owed";
import { owedResponse } from "../response";

export function POST() {
  return owedResponse(processConsumerPayment);
}
