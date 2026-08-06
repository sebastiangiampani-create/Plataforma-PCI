import type { SchoolSummary } from '@pci/domain';

export function ShellPage({ activeSchool }: { activeSchool: SchoolSummary }) {
  return (
    <div className="pci-card pci-card--wide">
      <h2>{activeSchool.name}</h2>
      <p>
        Escuela activa: <strong>{activeSchool.code}</strong> · Rol: {activeSchool.roleCode}
      </p>
      <div className="pci-placeholder">
        Los módulos curriculares (bolsa de contenidos, mapa curricular, trazabilidad) se
        incorporarán en el próximo hito. Esta base solo confirma que la sesión de desarrollo y la
        selección de escuela persisten correctamente.
      </div>
    </div>
  );
}
