export default function AdminLoading() {
  return (
    <div className="admin-loading" role="status" aria-live="polite">
      <span className="admin-spinner" aria-hidden="true" />
      <p>Loading newsroom…</p>
    </div>
  );
}
