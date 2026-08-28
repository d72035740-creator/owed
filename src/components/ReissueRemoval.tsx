import { motion } from "framer-motion";

export function ReissueRemoval() {
  return (
    <motion.section className="reissue-removal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} aria-label="Payment resumed without another application">
      <div className="removed-request">
        <p className="small-label">Citizen action removed</p>
        <div className="struck-copy">
          <span>Refund Reissue Request</span>
          <motion.span className="strike-line" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.25, duration: 0.65 }} />
        </div>
      </div>
      <motion.div className="resume-arrow" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}>↓</motion.div>
      <motion.div className="resumed-copy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
        <span className="resume-signal" aria-hidden="true">✓</span>
        <div><p className="small-label">OWED took responsibility</p><p className="font-editorial">Payment resumed automatically</p></div>
      </motion.div>
    </motion.section>
  );
}
