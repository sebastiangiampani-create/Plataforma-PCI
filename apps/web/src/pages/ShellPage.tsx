import type { SchoolSummary } from '@pci/domain';
import { CurricularImportsPage } from './CurricularImportsPage';

export function ShellPage({ token, activeSchool }: { token: string; activeSchool: SchoolSummary }) {
  return (
    <div className="pci-shell-content">
      <div className="pci-card pci-card--wide">
        <h2>{activeSchool.name}</h2>
        <p>
          Escuela activa: <strong>{activeSchool.code}</strong> · Rol: {activeSchool.roleCode}
        </p>
        <div className="pci-placeholder">
          El resto de los módulos curriculares (bolsa de contenidos, mapa curricular, trazabilidad)
          se incorporarán en próximos hitos.
        </div>
      </div>
      <CurricularImportsPage token={token} />
    </div>
  );
}
