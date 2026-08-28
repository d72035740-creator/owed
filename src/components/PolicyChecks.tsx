import { motion } from "framer-motion";

import type { RefundPolicyCheck } from "@/domain/refund-policy";

export function PolicyChecks({ checks, amount }: { checks: readonly RefundPolicyCheck[]; amount: string }) {
  if (checks.length === 0) return null;
  return (
    <motion.section
      className="policy-section"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="policy-heading"
    >
      <p className="section-number">Safety checks · backend result</p>
      <h2 id="policy-heading" className="policy-heading font-editorial">
        We still owe you <span className="currency">{amount}</span>.
      </h2>
      <ul className="checks-list">
        {checks.map((check, index) => (
          <motion.li
            key={check.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.05, duration: 0.2 }}
          >
            <span className={check.passed ? "check-mark passed" : "check-mark failed"} aria-hidden="true">
              {check.passed ? "✓" : "×"}
            </span>
            <span className="check-label">{check.label}</span>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
