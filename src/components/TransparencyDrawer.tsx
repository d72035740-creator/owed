import type { ConsumerRefundState } from "@/services/consumer-refund";

export function TransparencyDrawer({ state }: { state: ConsumerRefundState }) {
  const technical = state.technical;
  return (
    <details className="technical-drawer">
      <summary>View what OWED did</summary>
      <dl>
        <div>
          <dt>Government obligation</dt>
          <dd>OWED → {technical.obligationStatus}</dd>
        </div>
        <div>
          <dt>Previous delivery</dt>
          <dd>{technical.previousDeliveryStatus} / {technical.previousFailureReason}</dd>
        </div>
        <div>
          <dt>HDFC destination</dt>
          <dd>{technical.destinationValidationStatus} + {technical.destinationAuthorized ? "AUTHORIZED" : "NOT AUTHORIZED"}</dd>
        </div>
        <div>
          <dt>Retry lifecycle</dt>
          <dd>{technical.retryLifecycle.length > 0 ? technical.retryLifecycle.join(" → ") : "NOT SCHEDULED"}</dd>
        </div>
        <div>
          <dt>Idempotency protection</dt>
          <dd>{technical.idempotencyProtectionActive ? "ACTIVE" : "INACTIVE"}</dd>
        </div>
        <div>
          <dt>Duplicate retry</dt>
          <dd>{technical.duplicateRetryPrevented ? "PREVENTED" : "GUARDED"}</dd>
        </div>
      </dl>
    </details>
  );
}
