export function RefundAuthorization({ onAuthorize, pending }: { onAuthorize(): void; pending: boolean }) {
  return (
    <div className="authorization-block">
      <div>
        <p className="authorization-title">Use this account for my refunds</p>
        <p className="authorization-detail">This confirms HDFC Bank as the destination for this and future Income Tax refunds.</p>
      </div>
      <button className="primary-action" type="button" onClick={onAuthorize} disabled={pending}>
        {pending ? "Checking unfinished payments…" : "Authorize HDFC"}
      </button>
    </div>
  );
}
