# Rule Engine curricular

## Objetivo

Centralizar reglas curriculares versionadas, trazables y testeables. Ninguna regla crítica debe quedar escondida en componentes de interfaz.

## Formato de una regla

Cada regla debe registrar:

- `code`
- `name`
- `description`
- `severity`
- `rule_version`
- `scope`
- `configuration_json`
- `active`

## Severidades

- `ERROR`: impide validar o publicar.
- `WARNING`: permite continuar, pero exige revisión.
- `RECOMMENDATION`: orienta sin bloquear decisiones institucionales.

## Reglas iniciales

### PCI-STR-001
Cada Nivel ocupa exactamente dos cuatrimestres consecutivos.

### PCI-STR-002
Nivel 1 ocupa C1-C2; Nivel 2 C3-C4; Nivel 3 C5-C6; Nivel 4 C7-C8; Nivel 5 C9-C10.

### PCI-HRS-001
La carga horaria se valida de forma independiente por cuatrimestre.

### PCI-HRS-002
No se permiten compensaciones entre cuatrimestres.

### PCI-HRS-003
La suma de aportes por área debe coincidir con la carga horaria total del espacio en cada cuatrimestre.

### PCI-HRS-004
Una hora articulada no puede contabilizarse nuevamente como hora adicional.

### PCI-COV-001
Cada contenido debe poder localizarse en al menos un espacio para considerarse cubierto.

### PCI-COV-002
La repetición de contenidos debe distinguir cobertura válida de sobrerrepresentación.

### PCI-GEN-001
Los agrupamientos obligatorios tienen prioridad sobre formatos complementarios.

### PCI-ORI-001
Cada orientación debe contener exactamente tres talleres y tres laboratorios.

### PCI-ORI-002
El Proyecto de Vinculación con el Futuro es obligatorio, anual, exclusivo de Nivel 5 y ocupa C9-C10.

### PCI-ORI-003
El Proyecto de Vinculación con el Futuro no genera horas nuevas.

### PCI-VER-001
Una versión publicada es inmutable.

### PCI-VER-002
Toda modificación posterior a una publicación crea una nueva versión.

### PCI-IMP-001
Archivar contenidos no elimina asignaciones históricas.

### PCI-MOD-001
Los modelos cerrados son inmutables y de solo lectura.

## Resultado esperado

Cada ejecución debe devolver:

- código de regla;
- severidad;
- entidad afectada;
- causa;
- impacto;
- posible solución;
- datos usados para evaluar la regla.
