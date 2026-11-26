# [011] La bandeja parte vacía y se carga la exportación de Telesalud

**Estado**: done
**Fecha creación**: 2026-11-26
**Rama asociada**: `feat/011-cargar-exportacion` (sale de la rama de la 010, que sale de la 006: ninguna de las dos estaba unida a `main`)

## Objetivo

Que la demo calce con la arquitectura elegida (opción A: Pulso es una capa sobre la exportación de Telesalud). La bandeja parte vacía y se llena cuando el triajista "carga" la exportación. En la demo, esa exportación es siempre el archivo de demostración: nunca se sube un archivo del computador (regla R1).

## Preguntas y respuestas

Candela pidió el cambio con todo el detalle el 2026-11-26, así que no hubo preguntas. Su pedido cuenta como la aprobación (regla hasta la tarea 009: lo técnico y lo visual lo decido yo y lo anoto).

Lo que pidió:
1. La página parte con la bandeja vacía, inspirada en `docs/diseno/bandeja-vacia.png`: "No hay solicitudes. Carga la exportación de Telesalud para empezar."
2. El botón principal pasa a ser "Cargar exportación de Telesalud". Abre una ventana con el archivo de demostración ya elegido (59 solicitudes), la nota "En el piloto: archivo exportado desde Telesalud" y un botón "Cargar". Al cargar aparece la pantalla de carga de tres pasos y luego la bandeja.
3. Después, el botón cambia a "Cargar nueva exportación": carga la exportación siguiente, que trae SINT-0009, con el mismo resaltado de antes.
4. Por la regla R1, la ventana no permite subir archivos del computador. No se procesa ningún archivo que venga de afuera.
5. "Reiniciar demo" vuelve a la bandeja vacía.
6. Ajustar el guion de la demo (tarea 009) a este flujo.

## Decisiones que tomé

**Nombres de las exportaciones:** "Exportación de demostración 1 · 59 solicitudes" y "Exportación de demostración 2 · 1 solicitud nueva". No les puse un nombre de archivo (como `.csv`), porque no existen como archivos aparte: son las mismas 60 solicitudes sintéticas separadas en dos entregas. Un nombre inventado haría parecer real algo que no lo es.

**La ventana:**
- Muestra el archivo ya elegido, con un ícono de documento, la nota "En el piloto: archivo exportado desde Telesalud" y, en letra chica, "En esta demostración solo se puede usar este archivo: no se suben archivos del computador."
- Botones "Cancelar" y "Cargar". Cerrar con Esc o con "Cancelar" no carga nada.
- No tiene ningún campo para elegir archivos.

**Regla R1 también en el programa:** la dirección que carga (`POST /api/bandeja/cargar-exportacion`) no acepta nada. Si alguien le manda datos o un archivo, responde 400 con "Solo se puede cargar la exportación de demostración: Pulso no recibe archivos (regla R1)" y no carga nada. Hay pruebas que lo revisan con un JSON, un archivo y texto.

**Bandeja vacía:** se ve solo la tarjeta del centro, con su botón. Se esconden las tarjetas de resumen, los filtros y los botones de arriba, como en la imagen de Figma.

**Pantalla de carga:** ahora aparece **solo al cargar una exportación**:
- en la primera, el paso 1 dice "(59 solicitudes)";
- en la segunda, "(1 solicitud nueva)".

Ya no aparece al abrir la página ni con "Reiniciar demo", porque la bandeja parte vacía y no hay nada que cargar.

**Segunda exportación:** SINT-0009 entra al final del grupo de urgencia, con el resaltado de 2,5 s, y la página baja hasta ella. Lo que el triajista ya confirmó o corrigió se mantiene.

Después de la segunda, el botón queda desactivado con la nota "No hay más exportaciones de demostración. Usa "Reiniciar demo"."

**Se quitó** el botón "Simular ingreso de nueva solicitud" y su dirección (`/api/bandeja/simular-ingreso`). También se quitó la fila "Aplicando la sugerencia guardada…".

**La copia para diseño** (tarea 010) se generó de nuevo y tiene el mismo flujo.

## Para el guion de la demo (tarea 009)

**El guion todavía no existe:** es parte de la tarea 009 ("Diagrama de arquitectura y guion de la demo"), que aún no se crea. Dejo aquí el recorrido de la pantalla con el flujo nuevo, para usarlo cuando se haga:

1. Se abre Pulso: la bandeja está vacía ("No hay solicitudes. Carga la exportación de Telesalud para empezar.").
2. "Cargar exportación de Telesalud" → se ve la ventana con la "Exportación de demostración 1 · 59 solicitudes" y la nota "En el piloto: archivo exportado desde Telesalud" → "Cargar".
3. Pantalla de carga (unos 3 segundos): "Cargando la exportación de Telesalud… (59 solicitudes)", "Aplicando las sugerencias de MiniMax…" y "Ordenando la bandeja…".
4. Aparece la bandeja ordenada: arriba, las que tienen alerta crítica. Se puede hacer clic en la tarjeta "Con alerta crítica".
5. Se abre una solicitud y se confirma la sugerencia (tecla C).
6. Se corrige otra (por ejemplo, se quita "Urgencia") y se ve cómo cambia de lugar.
7. "Cargar nueva exportación" → "Exportación de demostración 2 · 1 solicitud nueva" → "Cargar". SINT-0009 entra al grupo de urgencia, resaltada.
8. Para repetir la toma: "Reiniciar demo" vuelve a la bandeja vacía.

Qué decir siempre (decisión 007): los resultados de MiniMax son reales pero **reproducidos desde archivo**, no en vivo, y la IA sugiere pero decide el equipo clínico.

## Criterios de aceptación

- [x] La página parte con la bandeja vacía y el mensaje pedido.
- [x] La ventana muestra el archivo de demostración ya elegido, la nota del piloto y "Cargar", sin forma de subir archivos.
- [x] Al cargar, aparece la pantalla de carga de tres pasos y luego la bandeja de 59.
- [x] "Cargar nueva exportación" trae SINT-0009 resaltada; después el botón queda desactivado.
- [x] El programa rechaza cualquier dato o archivo que se le mande al cargar (regla R1).
- [x] "Reiniciar demo" vuelve a la bandeja vacía.
- [x] `npm test` (405 pruebas) y `npm run lint` pasan. Probado en el navegador.
- [x] `TASKS.md` actualizado. La rama se une a `main` con el Pull Request de esta tarea.

## Archivos modificados/creados

- `src/services/demo-bandeja.service.js`: la bandeja parte vacía; `cargarExportacion()` reemplaza a `simularIngreso()`.
- `src/controllers/bandeja.controller.js` y `src/routes/bandeja.routes.js`: la dirección `POST /api/bandeja/cargar-exportacion`, que no acepta datos.
- `public/index.html`, `public/app.js` y `public/estilos.css`: la bandeja vacía, la ventana y los botones nuevos.
- `scripts/diseno/api-en-navegador.js`: la copia para diseño responde igual.
- Pruebas: `tests/services/demo-bandeja.service.test.js`, `tests/api/bandeja.api.test.js` y `tests/scripts/diseno/api-en-navegador.test.js`.
- `docs/decisiones/010-bandeja-parte-vacia-con-exportaciones.md` (nueva) y `docs/decisiones/008-pantalla-html-con-express.md`.
- `docs/diseno/bandeja-vacia.png`: la referencia de Figma de Candela.

## Cómo probarlo

1. En la terminal de VS Code: `Ctrl + C` para apagar Pulso si estaba encendido, y después `npm.cmd run iniciar`.
2. Abrir http://localhost:3000 y recargar con `Ctrl + F5`.
3. Seguir los pasos de "Para el guion de la demo", de arriba.

## Notas de cierre

**Cerrada el 2026-11-26.**

**Qué quedó hecho:** la bandeja parte vacía y se llena con las dos exportaciones de demostración, sin recibir nunca un archivo de afuera.

**Pendiente:** el guion completo es parte de la tarea 009. Aquí quedó el recorrido de la pantalla.

**Uso de IA en esta tarea:** se usó Claude Code (asistente de programación con IA) para escribir el código, las pruebas y esta documentación, y para probar la pantalla en un navegador. Candela definió el flujo nuevo y la regla de no subir archivos. Solo se usaron datos sintéticos (inventados).
