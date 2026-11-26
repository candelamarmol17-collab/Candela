# [009] Cómo funciona, diagrama de arquitectura y guion de la demo

**Estado**: done
**Fecha creación**: 2026-11-26
**Rama asociada**: `feat/009-como-funciona` (sale de la 014)

## Objetivo

Tener el material para el video que se entrega a la UAI el viernes 27 de noviembre en la mañana: la pestaña "Cómo funciona" (arquitectura, modelos considerados e IA responsable), el diagrama de arquitectura en `/docs` y el guion de la demo, de 4:40 como máximo.

## Preguntas y respuestas

No hubo preguntas nuevas. Lo pidió Candela el 2026-11-26, en versión mínima por el cambio de plazo:

- Diagrama: exportación → separación de datos personales en el centro → IA → validación → bandeja → triajista confirma o corrige → evaluación.
- La separación de datos personales es un paso propio antes de la IA, y los datos personales se quedan en el centro (nota de la tarea 012).
- Tabla de modelos considerados, tarjetas de IA responsable y guion de la demo con la frase acordada: "Los criterios se construyeron con el equipo del centro y su validación clínica formal es parte del piloto".
- En ninguna pantalla debe decir "validado" ni "validado clínicamente".
- El Registro (tarea 007) y el menú lateral quedan para después de la entrega.

## Criterios de aceptación

- [x] La pestaña "Cómo funciona" muestra los 7 pasos, dice dónde ocurre cada uno y qué viaja a la IA.
- [x] La tabla de modelos considerados es la misma de la evaluación (sale de las corridas) y dice que ningún modelo está elegido.
- [x] Tarjetas de IA responsable: supervisión humana, sin indicaciones clínicas, privacidad, sin depender de un proveedor y evaluación transparente.
- [x] `docs/arquitectura.md` con el diagrama Mermaid y `docs/guion-demo.md` de 4:40 como máximo, con la frase acordada.
- [x] Una prueba revisa que ninguna pantalla diga "validado".
- [x] `npm test` y `npm run lint` pasan. Probado en el navegador y en la copia de diseño.

## Decisiones que tomé

- **El diagrama de la pantalla es HTML y CSS** (tarjetas con flechas), igual que en `docs/diseno/como-funciona.png`. El de `/docs` es Mermaid, como piden los requerimientos.
- Cada paso lleva una etiqueta: "Centro de salud" o "Proveedor de IA". El paso de la IA va en lavanda, el del triajista en azul petróleo y la separación de datos personales con borde punteado.
- **La frase acordada va solo en el guion**, no en la pantalla, como pidió Candela. En la pantalla, la evaluación sigue diciendo que la referencia la definió el equipo del proyecto.
- "Trazabilidad" no tiene tarjeta propia: el Registro todavía no existe y no se promete algo que la pantalla no muestra.
- La pestaña "Cómo funciona" pide la evaluación una sola vez y la comparte con la pestaña "Evaluación".
- En el guion, las cifras se leen de la pantalla y vienen de las corridas guardadas.

## Archivos modificados/creados

- Nuevos: `public/como-funciona.js`, `docs/arquitectura.md`, `docs/guion-demo.md`, `tests/pantalla/textos.test.js`.
- Cambiados: `public/index.html` (pestaña), `public/app.js` (cambio de pestañas), `public/evaluacion.js` (comparte la tabla y la evaluación), `public/estilos.css`, `tests/scripts/exportar-diseno.test.js`, `README.md`, `TASKS.md`.

## Cómo probarlo

1. Une la rama, apaga el programa (Ctrl + C) y vuelve a encenderlo: `npm.cmd run iniciar`.
2. Abre http://localhost:3000, recarga con Ctrl + F5 y presiona "Cómo funciona".
3. Sigue `docs/guion-demo.md` de principio a fin con un cronómetro.

## Notas de cierre

Material del video listo: pestaña "Cómo funciona", diagrama de arquitectura y guion de 4:40. Quedan para después de la entrega: la tarea del SOME, el Registro (007) y el menú lateral.
