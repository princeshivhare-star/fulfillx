export default function ErrorState({ message, onRetry }) {
  return (
    <div className="empty-card">
      <h2>Something went wrong</h2>
      <p>{message}</p>
      {onRetry && <button className="button primary" onClick={onRetry}>Retry</button>}
    </div>
  );
}
