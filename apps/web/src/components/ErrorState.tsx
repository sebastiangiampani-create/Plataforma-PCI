export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="pci-state pci-state--error" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="pci-button pci-button--secondary" onClick={onRetry}>
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
