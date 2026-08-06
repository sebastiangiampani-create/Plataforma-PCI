export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="pci-state" role="status">
      {label}
    </div>
  );
}
