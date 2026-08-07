# Auditoría de Matriz-PCI (solo lectura)

Auditoría del repositorio histórico `sebastiangiampani-create/Matriz-PCI`
(commit `9e9b98d`), realizada según lo pedido en `docs/04-roadmap.md`
(Fase 1) y `AGENTS.md`. No se modificó nada del repositorio histórico.

## Arquitectura encontrada

`Matriz-PCI` es una aplicación **100% del lado del cliente**: un conjunto de
archivos HTML/JS sueltos (`launcher.html`, `app.html`, `escuela4.html`,
`plataforma.html`, etc.) sin backend ni base de datos real. El estado de
cada escuela se guarda en `localStorage` del navegador bajo la clave
`pciAppV2`. Esto confirma por qué el trabajo no persiste entre
dispositivos ni se puede compartir entre usuarios — es exactamente el
problema que `docs/00-vision.md` pide resolver.

La bolsa de contenidos está comprimida: 9 archivos de texto
(`data/db1.txt`…`data/db4.txt`, `data/rest1.txt`…`data/rest5.txt`) que la
app concatena en un único string, decodifica de base64 y descomprime con
`DecompressionStream('gzip')` en el navegador, obteniendo un array JSON de
tuplas `[id, area, subject, axis, text]`.

## Configuración real de agrupamientos obligatorios (`CFG`)

Encontrada literal en `app.html`. Confirma los números del PRD — no están
inventados, son los que usa el sistema en producción:

```js
const CFG = {
  "Lengua y Literatura":  { n: 5,  l: "Nivel",       p: "Niveles" },
  "Matemática":           { n: 5,  l: "Nivel",       p: "Niveles" },
  "Lenguas Adicionales":  { n: 5,  l: "Nivel",       p: "Niveles" },
  "Ciencias Sociales":    { n: 9,  l: "Laboratorio", p: "Laboratorios", c: 1, t: 1, q: 1, e: 1 },
  "Ciencias Naturales":   { n: 9,  l: "Laboratorio", p: "Laboratorios", c: 1, t: 1, q: 1, e: 1 },
  "Artes":                { n: 6,  l: "Taller",      p: "Talleres", e: 1 },
  "Tecnologías":          { n: 6,  l: "Taller",      p: "Talleres", e: 1 },
  "Educación Física":     { n: 10, l: "Taller",      p: "Talleres", e: 1 },
};
```

Los campos `c`, `t`, `q` en Ciencias Sociales/Naturales no se investigaron
en profundidad (no se encontró su uso más allá de la definición); `e`
parece marcar que el área admite grupos electivos adicionales
(`addElective()` en el código).

## Cómo se reparten los grupos en el tiempo (resuelve una duda abierta)

**El sistema no reparte automáticamente los N grupos entre los 10
cuatrimestres.** `init(area)` crea `CFG[area].n` grupos vacíos (p. ej. 9
"Laboratorio 1"…"Laboratorio 9") con `term: ''` (sin asignar). La
asignación de cuatrimestre es una **decisión manual de la escuela** vía un
`<select>` en la interfaz — coherente con el principio del PRD de que "el
asesor puede sugerir, pero nunca decidir por la escuela".

Esto explica por qué números como 9 (laboratorios) o 6 (talleres) no
necesitan dividir parejo entre 5 niveles o 10 cuatrimestres: no hay una
regla de reparto automático, cada escuela decide dónde va cada uno.

## Ejemplo real: Escuela 4 (`data/school4-seed.json`)

Se encontraron 18 laboratorios ya cargados y con cuatrimestre asignado —
9 de Ciencias Naturales y 9 de Ciencias Sociales, **uno por cuatrimestre
de C1 a C9** (ninguno en C10), alternando tipo Obligatorio/Electivo
(4 obligatorios + 5 electivos por área). Cada laboratorio tiene nombre,
tipo, cuatrimestre, contexto problematizador y los bloques de contenido
que articula. Guardado íntegro en
[`reference-data/matriz-pci-escuela4-labs-ejemplo.json`](reference-data/matriz-pci-escuela4-labs-ejemplo.json)
como ejemplo real de cómo una escuela resolvió el reparto — **no es una
regla del sistema, es un ejemplo de uso.**

## Bolsa de contenidos real (Formación General)

Decodificados **1155 contenidos reales**, ya en producción, con la
estructura `[id, área, materia, eje, texto]` — coincide con el modelo
`curricular_contents` de `packages/domain`:

| Área | Contenidos |
| --- | ---: |
| Educación Física | 275 |
| Ciencias Naturales | 244 |
| Artes | 187 |
| Ciencias Sociales | 177 |
| Lenguas Adicionales | 88 |
| Lengua y Literatura | 70 |
| Matemática | 60 |
| Tecnologías | 54 |
| **Total** | **1155** |

Guardado íntegro en
[`reference-data/matriz-pci-formacion-general-contenidos.json`](reference-data/matriz-pci-formacion-general-contenidos.json).
Todo pertenece a Formación General — no se encontró contenido de
Formación Orientada en los datos auditados.

## Pendiente

- No se auditó todavía la lógica de **cálculo/validación de horas**
  cuatrimestre por cuatrimestre en detalle (el reparto de grupos en el
  tiempo sí, la carga horaria numérica en sí, no) — queda para cuando se
  implemente el motor de validación real.
- No se encontraron datos de **Formación Orientada** en este repositorio;
  sigue pendiente conseguirlos (ver `docs/08-plan-de-estudios-formacion-general.md`,
  "Pendiente").
- Los campos `c`, `t`, `q` del `CFG` de Ciencias Sociales/Naturales no se
  investigaron a fondo — revisar si son relevantes al implementar esas
  áreas.
- Este documento cubre `app.html`; no se auditaron en profundidad
  `plan-editor.html`, `planes-arbol.html`, `evaluacion.html`,
  `constructor-plan.html` ni el resto de las pantallas del launcher.
