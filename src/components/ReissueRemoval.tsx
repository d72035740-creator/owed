import { motion } from "framer-motion";

export function ReissueRemoval() {
  return (
    <motion.section
      className="reissue-removal"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Payment resumed without another application"
    >
      <motion.div
        className="removed-request-box"
        initial={{ opacity: 1, maxHeight: 180 }}
        animate={{
          opacity: [1, 1, 0.45, 0],
          maxHeight: [180, 180, 180, 0],
          marginBottom: [24, 24, 12, 0],
        }}
        style={{ overflow: "hidden" }}
        transition={{ delay: 0.35, duration: 1.05, times: [0, 0.35, 0.72, 1] }}
      >
          <p className="small-label">Unnecessary procedure</p>
        <div className="struck-copy">
          <span className="reissue-name">Refund Reissue Request</span>
          <motion.span
            className="strike-line"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.15, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </motion.div>

      <motion.div
        className="resume-arrow"
        aria-hidden="true"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.2 }}
      >
        ↓
      </motion.div>

      <motion.div
        className="resumed-box"
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.52, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="resume-signal-badge" aria-hidden="true">✓</div>
        <div className="resumed-text-group">
          <p className="small-label verified-label">No second application</p>
          <h3 className="resumed-title font-editorial">Payment resumed automatically</h3>
        </div>
      </motion.div>
    </motion.section>
  );
}
