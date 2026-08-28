import { motion } from "framer-motion";

import type { RefundPolicyCheck } from "@/domain/refund-policy";

export function PolicyChecks({ checks, amount }: { checks: readonly RefundPolicyCheck[]; amount: string }) {
  if (checks.length === 0) return null;
  return (
    <motion.section className="policy-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} aria-labelledby="policy-heading">
      <p className="section-number">03 / Automatic checks</p>
      <h2 id="policy-heading" className="policy-heading font-editorial">We still owe you <span className="currency">{amount}</span>.</h2>
      <p className="policy-intro">Before resuming payment, OWED checked the unfinished obligation against the current government record.</p>
      <ul className="checks-list">
        {checks.map((check, index) => (
          <motion.li key={check.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}>
            <span className={check.passed ? "check-mark passed" : "check-mark failed"} aria-hidden="true">{check.passed ? "✓" : "×"}</span>
            <span>{check.label}</span>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
