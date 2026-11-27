# [016] Diagrama de arquitectura tecnológica con Archify

**Estado**: done
**Fecha creación**: 2026-11-26
**Rama asociada**: `feat/016-diagrama-arquitectura` (parte de `feat/015-caso-rosa`)

## Objetivo

Hacer un diagrama de la arquitectura tecnológica de Pulso (las piezas del programa y cómo se conectan), basado en el código real, para el video y para la UAI. Se entrega como una página HTML y como una imagen PNG en alta resolución.

## Preguntas y respuestas

- **¿Con qué herramienta?** Con la skill Archify (licencia Apache-2.0), instalada según su documentación oficial y con el aviso de actualizaciones apagado (`ARCHIFY_UPDATE_CHECK_DISABLED=1`).
- **¿Dónde se instala?** Candela eligió instalarla de forma **global**, en su carpeta de usuario de Claude. Así no queda dentro del repositorio y no se sube a GitHub.
- **Contenido** (lo pidió Candela): pantalla, servidor y API, servicios (lector de la exportación, seudonimización, clasificación, orden de la bandeja y evaluación), validación con Zod, conexión con la IA, proveedor de IA fuera del centro, datos, calidad, la frontera de privacidad y una zona aparte con la "Propuesta para el piloto (por definir con la UAI)".
- **Colores**: los de Pulso (azul petróleo #1F6F78, lavanda #5B5B9A para la IA y fondo claro), en tema claro. Textos en español. No inventar piezas.

Decisiones que tomé yo:

- **La IA no se llama en vivo en la demo**, y el diagrama lo muestra así: la "Clasificación" se corre antes, con `npm run clasificar:sinteticos`, y guarda corridas en JSON; la bandeja las lee desde ahí.
- Separé los datos en dos cajas, "Exportación de demostración" (CSV) y "Archivos JSON" (solicitudes, corridas y referencia), para que se entienda qué lee cada pieza y no se crucen las líneas.
- **Frontera de privacidad**: un marco "Centro de salud · aquí se quedan los datos personales y la tabla de códigos" y otro "Proveedor de IA · FUERA del centro". La flecha que cruza dice qué viaja: profesional, motivo, texto tapado, edad y código. Una nota debajo lo repite.
- **La propuesta** va con un marco punteado y cada caja dice "por definir · no construido". No tiene flechas hacia lo construido.
- **Colores**:
  - azul petróleo: pantalla, servidor y servicios;
  - lavanda: conexión con la IA (y la flecha punteada de la clave);
  - verde: datos;
  - ámbar: privacidad y validación;
  - gris: lo de fuera del centro y la propuesta.
  - No usé rojo.
- **El número de pruebas** del diagrama es el real al cerrar la tarea: 523.

## Criterios de aceptación

- [x] Archify instalado según su documentación y su revisión (`doctor`) pasó; nada de la instalación está en el repositorio.
- [x] El diagrama pasó las cuatro revisiones automáticas de Archify (formato, entrega, procedencia y prueba en el navegador) y no tiene cruces de líneas.
- [x] Cada pieza construida apunta a su código; la propuesta dice "no construido".
- [x] Abre en tema claro con los colores de Pulso.
- [x] HTML en `docs/arquitectura/arquitectura-pulso.html` y PNG de 5310 × 3156 en `docs/arquitectura/arquitectura-pulso.png`.
- [x] No contiene la clave ni el `.env`, y respeta la regla de no decir que los criterios están aprobados clínicamente (una prueba lo revisa).

## Archivos modificados/creados

- `docs/arquitectura/arquitectura-pulso.html` (nuevo): el diagrama interactivo.
- `docs/arquitectura/arquitectura-pulso.png` (nuevo): la imagen para el video y la UAI.
- `docs/arquitectura/arquitectura-pulso.archify.json` (nuevo): la descripción del diagrama, para regenerarlo.
- `scripts/colores-arquitectura.js` (nuevo): aplica los colores de Pulso y el tema claro.
- `tests/scripts/colores-arquitectura.test.js` (nuevo, 5 pruebas).
- `.gitignore`: ignora `.archify/` (carpeta de trabajo de Archify).
- `docs/decisiones/014-diagrama-con-archify.md` (nuevo), `docs/arquitectura.md`, `README.md`, `TASKS.md`.

## Cómo probarlo

1. Abre `docs/arquitectura/arquitectura-pulso.html` con doble clic: se abre en el navegador, en tema claro. Al pasar el mouse por una caja se ve su detalle; el botón "Exportar" guarda imágenes.
2. Abre `docs/arquitectura/arquitectura-pulso.png` con el visor de imágenes.
3. Pruebas automáticas: `npm.cmd test` (523 pruebas).

Para regenerarlo (necesita Archify instalado):

1. `node ~/.claude/skills/archify/bin/archify.mjs finalize architecture docs/arquitectura/arquitectura-pulso.archify.json <salida.html> --repo-root . --quality showcase`.
2. `node scripts/colores-arquitectura.js <salida.html> docs/arquitectura/arquitectura-pulso.html`.

## Notas de cierre

Diagrama terminado y revisado a ojo en tema claro. El interruptor del diagrama permite pasar al tema oscuro, pero en ese tema quedan los colores originales de Archify. El video y la UAI usan el tema claro.
