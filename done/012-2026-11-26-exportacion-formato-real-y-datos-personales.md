# [012] Exportación con el formato real de Telesalud y separación de datos personales

**Estado**: done
**Fecha creación**: 2026-11-26
**Rama asociada**: `feat/012-exportacion-formato-real` (sale de la 011)

## Objetivo

Que Pulso lea la exportación de Telesalud con su **formato real** (48 columnas) y que, **antes de la IA**, separe los datos personales del vecino. Los datos personales se quedan en el centro de salud y la IA recibe solo lo necesario para sugerir.

Lo único real es el encabezado (`docs/formato-exportacion-telesalud.csv` y `.xlsx`, sin datos). Todos los datos siguen siendo sintéticos (regla R1).

## Preguntas y respuestas

Candela pidió el cambio con todo el detalle el 2026-11-26. Hice dos preguntas porque tocaban datos personales y lo que el video muestra:

| # | Pregunta | Respuesta de Candela |
|---|---|---|
| 1 | La columna A ("ID") no estaba en ninguna lista. ¿Qué se hace con ella? | **Se separa** como dato identificatorio: nunca llega a la IA y es la llave de la tabla de códigos que se queda en el centro de salud. |
| 2 | El prompt v1 (congelado) no envía "Especificidad" y las corridas guardadas no la recibieron. ¿Qué dice el panel? | **Decir lo que pasó:** Especificidad queda en el mapeo como "para la IA desde un prompt v2 [PENDIENTE]", va vacía en la exportación de demostración, y el panel dice "La IA recibió: profesional pedido, motivo, texto y edad. No recibió: nombre, RUT, contacto ni dirección." |

Pedido completo de Candela:
1. Mapeo de columnas en un solo lugar, por posición (las columnas E y AV se llaman igual: "Información adicional").
2. Separación de datos personales (seudonimización: se cambian los datos que identifican por un código), hecha con código y sin IA: quitar las columnas identificatorias, asignar un código interno y tapar en el texto libre los RUT, teléfonos y correos. Con pruebas.
3. Exportación de demostración con las 48 columnas e identificadores claramente inventados. La carga de la demo usa este archivo.
4. Pantalla de carga con un anillo de progreso y cuatro pasos.
5. Una línea en el panel de detalle sobre qué recibió la IA.
6. Anotar el flujo para el diagrama de la 009.

## Mapeo de columnas (definido por Candela)

| Uso | Columnas |
|---|---|
| **Lo que recibe la IA** | Tipo prestador (R), Motivo consulta (S), Información adicional (la primera, E) y Edad (N). Especificidad (T): **[PENDIENTE]** hasta un prompt v2. |
| **Datos personales del vecino** (nunca llegan a la IA) | ID (A), Código seguimiento (D), Género (G), Nombre (H), Apellido paterno (I), Apellido materno (J), Nombre social (K), Tipo identificador (L), Nº identificador (M), Email (O), Telefono (P) y Dirección (Q). |
| **Funcionarios y notas** (no llegan a la IA) | Cerrado por, Cargo, Profesión, Fecha agenda, Nota cierre (X a AB) y las 18 columnas de derivación (AC a AT). |
| **Evaluación del piloto** (no llegan a la IA) | Cesfam (B), Prioridad (C), Fecha solicitud (F), Estado (U), Fecha cierre (V), Tipo cierre (W) y Contactado (AU). |
| **[PENDIENTE]** | La segunda "Información adicional" (AV): no se usa hasta confirmar qué contiene. |

"Fecha solicitud" no llega a la IA, pero la bandeja la usa para ordenar por antigüedad.

## Decisiones que tomé

Candela me pidió decidir lo técnico y lo visual y anotarlo. Lo grande quedó en la decisión 011 (`docs/decisiones/011-formato-real-y-separacion-de-datos-personales.md`). Además:

- **Especificidad no pasa a la IA todavía.** El prompt v1 la enviaría si viniera con datos, así que la separación de datos personales no la deja pasar. Así la línea del panel dice exactamente lo que pasa. Cuando exista un prompt v2 se decide si se agrega.
- **La tabla de códigos de la demo viene armada** (DEMO-ID-0001 → SINT-0001) para que calce con la corrida de MiniMax guardada. En el piloto los códigos serían nuevos (PUL-0001…).
- **Teléfonos que se tapan**: celulares (9 XXXX XXXX) y fijos de Santiago (2 XXXX XXXX o 22 XXX XXXX), con o sin +56. Probé que no se tapen temperaturas, presiones, glicemias ni semanas de embarazo, y que ninguno de los 60 textos sintéticos cambie.
- **Si la exportación no tiene el formato de Telesalud**, no se carga nada y el mensaje lo dice sin repetir datos personales.
- **Anillo de carga**: dura 3 segundos y sube suave (más lento al principio y al final). Cada paso aparece en un cuarto del anillo: 0 %, 25 %, 50 % y 75 %. El primero dice cuántas solicitudes trae y el segundo cuántas columnas se separaron (12). Los lectores de pantalla leen el texto del paso, no cada número del porcentaje.
- **La línea "La IA recibió…"** va justo debajo de la caja de la sugerencia, en letra chica y gris, en todas las solicitudes (también en las que la IA no respondió, porque igual se le enviaron esos datos).
- La copia de diseño (`pulso-diseno.html`) ahora lleva dentro las dos exportaciones de demostración. Los únicos datos "personales" que trae son los inventados ("Vecina Demo 01"…).

## Para el diagrama de la tarea 009

- La **separación de datos personales es un paso propio**, entre "Exportación de Telesalud" y "IA". Se hace con código, sin IA.
- Los datos personales y la tabla de códigos **se quedan en el centro de salud**. A la IA solo llegan: profesional pedido, motivo, texto (con RUT, teléfonos y correos tapados) y edad, con un código en vez del ID.
- El recorrido del guion cambia en un punto: al cargar, la pantalla muestra "Separando los datos personales… (12 columnas)" antes de "Aplicando las sugerencias de MiniMax…". El panel de detalle tiene la línea "La IA recibió… No recibió…".

## Criterios de aceptación

- [x] El mapeo de las 48 columnas está en un solo archivo y una prueba lo compara con el encabezado real.
- [x] La separación quita las columnas identificatorias, asigna un código interno y tapa RUT, teléfonos y correos en el texto. Con pruebas.
- [x] La exportación de demostración tiene las 48 columnas e identificadores claramente inventados, y la demo la usa.
- [x] Ningún dato personal sale del programa hacia la pantalla ni hacia la IA (con pruebas).
- [x] Pantalla de carga con anillo y cuatro pasos, de unos 3 segundos.
- [x] Línea del panel de detalle sobre qué recibió la IA.
- [x] Notas para el diagrama de la 009.
- [x] `npm test` y `npm run lint` pasan. Probado en el navegador.

## Archivos modificados/creados

- Nuevos: `src/schemas/exportacion-telesalud.js` (mapeo), `src/utilidades/csv.js` (leer y escribir CSV), `src/services/seudonimizacion.service.js` (separación de datos personales), `src/services/exportacion-demo.service.js` (arma la exportación de demostración), `scripts/generar-exportacion-demo.js`, `data/sinteticos/exportacion-demo-1.csv` y `-2.csv`, `docs/formato-exportacion-telesalud.csv` y `.xlsx` (solo el encabezado), `docs/decisiones/011-formato-real-y-separacion-de-datos-personales.md`.
- Cambiados: `src/services/demo-bandeja.service.js` (carga desde la exportación y separa los datos), `src/repositories/bandeja.repository.js` (lee las exportaciones), `src/server.js`, `src/prompts/clasificacion.js` (solo exporta la lista de campos para probarla), `public/index.html`, `public/app.js` y `public/estilos.css` (anillo de carga y línea del panel), `scripts/exportar-diseno.js` y `scripts/diseno/instalar-api.js` (copia de diseño), `package.json`, `.gitignore`, `README.md`, `TASKS.md`, decisión 010.
- Pruebas: nuevas para el mapeo, el CSV y la separación; actualizadas las de la demo, la dirección de la bandeja, el repositorio, la copia de diseño y su API en el navegador.

## Cómo probarlo

1. Apaga el programa si está encendido (Ctrl + C) y vuelve a encenderlo: `npm.cmd run iniciar`.
2. Abre http://localhost:3000 y recarga con Ctrl + F5.
3. Presiona "Cargar exportación de Telesalud" y luego "Cargar": el anillo sube de 0 a 100 % en unos 3 segundos y pasa por los cuatro pasos, incluido "Separando los datos personales… (12 columnas)".
4. Abre cualquier solicitud: bajo la sugerencia aparece "La IA recibió: profesional pedido, motivo, texto y edad. No recibió: nombre, RUT, contacto ni dirección." En ninguna parte de la pantalla aparece "Vecina Demo" ni un correo.
5. Pruebas automáticas: `npm.cmd test` y `npm.cmd run lint`.

## Notas de cierre

Pulso ya lee la exportación con el formato real de Telesalud (48 columnas) y, antes de la IA, separa los datos personales con código. La demo carga dos archivos de demostración con identificadores claramente inventados. La pantalla de carga ahora es un anillo con cuatro pasos y el panel dice qué recibió la IA. Pruebas: 464 pasando. Probado en el navegador (puerto 3001). Copia de diseño regenerada.

Quedan [PENDIENTE]: qué contiene la segunda "Información adicional" (AV), si Especificidad entra en un prompt v2 y el formato exacto de las fechas de la exportación real.
