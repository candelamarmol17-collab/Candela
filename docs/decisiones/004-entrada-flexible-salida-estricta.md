# 004 · Entrada flexible, salida estricta

**Fecha**: 2026-11-19 · **Tarea**: 002

## Qué se decidió

- **Entrada (la solicitud de Telesalud)**: el molde es flexible.
  - `tipo_profesional` y `motivo` aceptan cualquier texto no vacío. No se comparan con las listas de `catalogos.js`.
  - Los campos de más se descartan sin error.
  - Los campos opcionales que vienen vacíos (`null`) se tratan como si no vinieran.
- **Salida (la respuesta de la IA)**: el molde es estricto.
  - `profesional_sugerido`, `prioridad_sugerida`, `confianza` y cada alerta tienen que estar en su lista permitida.
  - Un campo de más rechaza la respuesta.
  - La única excepción: las alertas repetidas se eliminan sin rechazar la respuesta.

## Por qué

- **La entrada viene de un sistema que no controlamos.** Todavía no conocemos el formato real de la exportación de Telesalud. Las listas que tenemos son las del formulario, y los datos del centro mencionan una categoría "Otros" que no aparece en ellas. Si fuéramos estrictos, rechazaríamos solicitudes reales por una etiqueta distinta, y una urgencia podría quedar fuera de la bandeja.
- **La salida viene de la IA, y no puede inventar nada.** Si la respuesta no calza exactamente con lo que pedimos, no se usa: queda como "no clasificada" (tarea 5) y la revisa una persona. Así se cumplen las reglas R2 y R3 de los requerimientos.
- **Quitar una alerta repetida no inventa información.** Rechazar toda la clasificación por eso sería desproporcionado.

## Alternativas descartadas

- **Entrada estricta (validar contra las listas del formulario)**: rechazaría solicitudes válidas mientras no se conozca la exportación real.
- **Salida flexible (ignorar campos de más o corregir valores parecidos, como "medicina" por "Medicina")**: sería adivinar lo que quiso decir la IA, y eso va contra la regla de no inventar.

## Cuándo revisar esta decisión

Cuando la gestora de Telesalud del CESFAM Boris Soler confirme los campos reales de la exportación y sus valores.
