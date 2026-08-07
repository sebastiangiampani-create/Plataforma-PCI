# Arquitectura inicial

## Enfoque

Plataforma PCI se construirá como una única aplicación modular con una sola fuente de verdad. Las vistas de matriz, mapa, trazabilidad, informes y administración operarán sobre el mismo estado versionado.

## Capas

1. **Interfaz web responsive**
   - Constructor curricular.
   - Bolsa de contenidos.
   - Mapa curricular.
   - Administración e informes.

2. **API de aplicación**
   - Autenticación y permisos.
   - Casos de uso.
   - Simulación y publicación.

3. **Núcleo de dominio PCI**
   - Motor de cobertura.
   - Motor de carga horaria.
   - Motor de validación.
   - Motor de trazabilidad.
   - Motor de versionado y bitácora.

4. **Persistencia**
   - Base de datos relacional.
   - Migraciones de esquema.
   - Importaciones reversibles.
   - Respaldo y auditoría.

## Decisiones obligatorias

- Sin iframes.
- Sin aplicaciones paralelas.
- Sin reglas curriculares incrustadas en componentes visuales.
- Los cálculos deben ser determinísticos y probables mediante pruebas.
- Los nombres visibles no funcionarán como identificadores.
- Cada entidad central tendrá un identificador único estable.

## Flujo de simulación

1. Copiar temporalmente el estado vigente.
2. Aplicar el movimiento propuesto.
3. Recalcular cobertura, horas y reglas.
4. Mostrar diferencias e impactos.
5. Confirmar o cancelar.
6. Persistir solamente tras la confirmación.

## Estrategia de implementación

La tecnología definitiva se validará después de la auditoría del sistema estable. La arquitectura de dominio debe permanecer independiente del framework elegido.
