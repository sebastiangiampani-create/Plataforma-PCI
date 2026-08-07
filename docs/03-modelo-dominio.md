# Modelo de dominio inicial

## Agregados principales

### Escuela
Representa una institución activa que construye y publica sus propias versiones del PCI.

### PCI
Raíz funcional del proyecto curricular de una escuela. Contiene estado, componentes, espacios, reglas aplicadas y versiones.

### Versión PCI
Instantánea inmutable cuando se publica. Conserva responsables, fecha, fundamento pedagógico, cambios e impacto.

### Componente curricular
Distingue Formación General y Formación Orientada.

### Orientación
Define contenidos, espacios, reglas y cargas específicas de una orientación.

### Área, Materia y Eje
Estructuran la base curricular y permiten agrupar, filtrar y reportar contenidos.

### Contenido curricular
Unidad trazable con identificador estable, estado activo o archivado y pertenencia a componente, orientación, área, materia y eje.

### Espacio curricular
Unidad configurable del mapa institucional. Registra tipo, carácter, nivel, cuatrimestres, horas, objetivos, contexto, contenidos y observaciones.

### Tipo de espacio
- Autónomo.
- Integrado.
- Articulador.

### Formato curricular
- Nivel.
- Laboratorio.
- Taller.
- Seminario.
- Proyecto.
- Proyecto Sociocomunitario Solidario.
- Orientación.
- Proyecto de Vinculación con el Futuro.

### Asignación de contenido
Relación trazable entre un contenido y uno o más espacios curriculares.

### Carga horaria
Registra horas semanales por espacio, cuatrimestre y área aportante.

### Articulación
Relaciona espacios de origen con espacios articuladores sin generar doble conteo de horas.

### Regla curricular
Definición versionada y administrable que produce resultados de validación.

### Resultado de validación
Hallazgo clasificado como error, advertencia o recomendación, con causa, impacto y posible solución.

### Simulación
Copia temporal del estado sobre la que se evalúa un cambio antes de confirmarlo.

### Bitácora
Registro de decisiones, cambios, responsables, fundamentos e impactos.

### Usuario y rol
Controlan permisos para administrar, construir, consultar o supervisar.

## Relaciones clave

- Una Escuela posee uno o más PCI y múltiples versiones.
- Un PCI contiene componentes curriculares y espacios.
- Un espacio ocupa uno o dos cuatrimestres según su formato.
- Un contenido puede asignarse a varios espacios, pero la cobertura debe detectar repetición y sobrerrepresentación.
- Una carga horaria pertenece a un espacio, cuatrimestre y área aportante.
- Una versión publicada referencia todos los identificadores y configuraciones vigentes al momento de su publicación.

## Invariantes

- Los identificadores no dependen del nombre visible.
- Una versión publicada no se modifica.
- Las horas se validan por cuatrimestre.
- El Proyecto de Vinculación no crea horas nuevas.
- Los contenidos archivados conservan su historia.
- Los modelos cerrados son inmutables y de solo lectura.
