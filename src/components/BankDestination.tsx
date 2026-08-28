import { motion } from "framer-motion";

import type { ConsumerRefundState } from "@/services/consumer-refund";

export function BankDestination({
  destination,
  validationActive = false,
}: {
  destination: ConsumerRefundState["destination"];
  validationActive?: boolean;
}) {
  const validated = destination.validationStatus === "VALIDATED";
  const validating =
    destination.validationStatus === "VALIDATING" || validationActive;
  return (
    <motion.div
      className="bank-destination"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="bank-monogram" aria-hidden="true">H</div>
      <div className="bank-copy">
        <p className="bank-name">{destination.bankName}</p>
        <p className="masked-account currency">{destination.maskedAccount}</p>
        <p className="account-holder">{destination.accountHolder}</p>
      </div>
      <div className="bank-status-col">
        <p className={validated ? "status-pill verified" : "status-pill"}>
          <span aria-hidden="true">{validated ? "✓" : validating ? "↻" : "○"}</span>{" "}
          {validated ? "Validated" : validating ? "Validating" : "Needs validation"}
        </p>
        <p className="bank-sim-note">Simulated bank</p>
      </div>
    </motion.div>
  );
}
