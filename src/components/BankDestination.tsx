import { motion } from "framer-motion";

import type { ConsumerRefundState } from "@/services/consumer-refund";

export function BankDestination({ destination }: { destination: ConsumerRefundState["destination"] }) {
  const validated = destination.validationStatus === "VALIDATED";
  return (
    <motion.div className="bank-destination" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="bank-monogram" aria-hidden="true">H</div>
      <div className="bank-copy">
        <p className="bank-name">{destination.bankName}</p>
        <p className="masked-account currency">{destination.maskedAccount}</p>
        <p className="account-holder">Held by {destination.accountHolder}</p>
      </div>
      <p className={validated ? "status-pill verified" : "status-pill"}>
        <span aria-hidden="true">{validated ? "✓" : "○"}</span>{" "}
        {validated ? "Validated" : "Needs validation"}
      </p>
    </motion.div>
  );
}
