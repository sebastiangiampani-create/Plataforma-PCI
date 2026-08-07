import type { SchoolSummary } from '@pci/domain';
import { CurricularContentsPage } from './CurricularContentsPage';
import { CurricularImportsPage } from './CurricularImportsPage';
import { PciProjectPage } from './PciProjectPage';

export function ShellPage({ token, activeSchool }: { token: string; activeSchool: SchoolSummary }) {
  return (
    <div className="pci-shell-content">
      <div className="pci-card pci-card--wide">
        <h2>{activeSchool.name}</h2>
        <p>
          Escuela activa: <strong>{activeSchool.code}</strong> · Rol: {activeSchool.roleCode}
        </p>
        <div className="pci-placeholder">
          El mapa curricular y la trazabilidad se incorporarán en próximos hitos.
        </div>
      </div>
      <PciProjectPage token={token} />
      <CurricularContentsPage token={token} />
      <CurricularImportsPage token={token} />
    </div>
  );
}
