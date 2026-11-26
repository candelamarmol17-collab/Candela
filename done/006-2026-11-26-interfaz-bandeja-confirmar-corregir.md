# [006] Interfaz de bandeja con confirmar o corregir

**Estado**: done
**Fecha creación**: 2026-11-26
**Rama asociada**: `feat/006-interfaz-bandeja`

## Objetivo

Una pantalla web simple para el video: muestra la bandeja ordenada de la tarea 005 y deja que el triajista **confirme o corrija** cada sugerencia. Siempre queda claro que la IA solo sugiere y que decide una persona (regla R2), y que los resultados son reales pero **reproducidos desde un archivo**, no generados en vivo (decisión 007).

## Diseño de referencia (definido por Candela, 2026-11-26)

- **Base:** las pantallas de Figma en `docs/diseno/` (bandeja, detalle, corregir, bandeja-corregida, solicitud-entrando, no-clasificada). Se copia **solo el estilo**: los datos de las imágenes son de ejemplo. Siempre se usan los datos y las etiquetas reales del MVP: SINT-xxxx, la etiqueta de la corrida de MiniMax, el modelo y la versión real del prompt.
- **Paleta:**

  | Uso | Texto | Fondo |
  |---|---|---|
  | Fondo de la página | | `#F6F7F5` |
  | Tarjetas y paneles | | `#FFFFFF` |
  | Texto general | `#23303A` | |
  | Color principal | `#1F6F78` | |
  | IA (lavanda) | `#5B5B9A` | `#EEEEF8` |
  | Prioridad alta | `#9F2D2D` | `#FBEAEA` |
  | Prioridad media | `#8A5A0B` | `#FCF1DC` |
  | Prioridad baja | `#2F6B4F` | `#E7F3EC` |

  El rojo se usa **solo** para alertas críticas. Tipografía Inter de 16 px.
- **Elementos que se agregan de la versión en Bolt:**
  1. Logo `docs/diseno/logo-pulso.svg` a la izquierda de "Pulso", y también como ícono de la pestaña del navegador (favicon).
  2. Tarjetas de resumen con ícono en un cuadradito redondeado de color suave: bandeja (Total), triángulo coral (Con alerta crítica), flecha diagonal ámbar (Prioridad alta), pulso (Pendientes) y documento con advertencia en gris azulado (No clasificadas).
  3. Íconos en los botones: "+" en "Simular ingreso de nueva solicitud" y flecha circular en "Reiniciar demo".
  4. "Triajista de demostración" como etiqueta con borde y fondo suave.
  5. Animaciones:
     - una solicitud nueva o recién corregida aparece con un fondo azul petróleo muy suave que se desvanece a blanco en 2,5 s;
     - el panel de detalle entra deslizándose desde la derecha en 0,35 s.
  6. Esquinas de 12 px en tarjetas y paneles.
- **Íconos:** SVG livianos copiados de Lucide (licencia abierta ISC), sin instalar una librería.
- Los números de `evaluacion.png` son inventados y **nunca** se copian. La evaluación es de la tarea 008.

## Preguntas y respuestas

**Propuestas del 2026-11-26. Candela aprobó las 19 el mismo día**, incluida la descarga de la fuente Inter. También confirmó:
- `BANDEJA_ARCHIVO_CORRIDA`, con la corrida de MiniMax por defecto;
- un resaltado breve cuando una solicitud cambia de lugar;
- las dependencias `express` y `supertest`.

| # | Pregunta | Propuesta | Respuesta de Candela |
|---|---|---|---|
| 1 | ¿Con qué se hace la pantalla? | HTML y JavaScript simple, sin framework, servidos por el mismo programa Node con **Express**. Dependencias nuevas: `express` y, solo para pruebas, `supertest`. | **Aprobada.** |
| 2 | ¿Qué corrida muestra? | Variable nueva `BANDEJA_ARCHIVO_CORRIDA` en el `.env`; por defecto, la corrida de MiniMax. | **Aprobada.** |
| 3 | ¿Qué puede corregir el triajista? | Prioridad, profesional y alertas, más un motivo opcional de hasta 300 caracteres con aviso de no escribir datos personales. "Persona mayor (60+)" no se puede cambiar, porque sale de la edad. | **Aprobada.** |
| 4 | ¿Dónde se guardan las confirmaciones y correcciones? | Solo en memoria. Se pierden al reiniciar el programa, y "Reiniciar demo" vuelve al inicio. El registro permanente es la tarea 007. | **Aprobada.** |
| 5 | ¿Qué pasa al corregir o confirmar? | Al corregir, la solicitud cambia de lugar de inmediato con la marca "Corregida por triajista". Al confirmar, queda en su lugar con la marca "Confirmada". | **Aprobada.** |
| 6 | ¿Qué muestra cada solicitud? | Del vecino: número, fecha, profesional pedido, motivo y texto completo. De la sugerencia: prioridad, profesional, alertas, justificación y confianza. | **Aprobada.** |
| 7 | Texto del aviso de la regla R2 | El de Figma: "Es una sugerencia. La decisión es del triajista. La IA no entrega indicaciones clínicas." | **Aprobada.** |
| 8 | Usuario ficticio | "Triajista de demostración", sin inicio de sesión. | **Aprobada.** |
| 9 | Puerto | `PUERTO=3000` (ya está en `.env.example`). | **Aprobada.** |

**Preguntas que salen de las imágenes de Figma:**

| # | Pregunta | Propuesta | Respuesta de Candela |
|---|---|---|---|
| 10 | "Simular ingreso de nueva solicitud": ¿qué solicitud entra? | La bandeja empieza con 59 solicitudes. El botón hace entrar la que falta (por ejemplo SINT-0060) con la clasificación **guardada** de MiniMax. | **Aprobada.** |
| 11 | Mientras entra, Figma dice "Analizando con IA…". ¿Se mantiene? | Cambiarlo por "Aplicando la sugerencia guardada de MiniMax…": "Analizando con IA" haría creer que responde en vivo (decisión 007). | **Aprobada.** |
| 12 | Frases resaltadas en el texto del vecino (Figma resalta "renovar" e "insulina") | **Se simplifica: sin resaltado.** El modelo no dice qué frases usó, y agregarlo cambiaría el prompt, que está congelado. Adivinarlas con el código podría resaltar algo que no fue lo importante. | **Aprobada.** |
| 13 | Antigüedad: Figma dice "hace 3 días" | Mostrar la fecha y hora de ingreso (por ejemplo "17-11 12:15"). "Hace X días" cambiaría según el día en que se grabe el video. | **Aprobada.** |
| 14 | Pestañas Registro, Evaluación y Cómo funciona | Mostrarlas, pero desactivadas, con el texto "Próximamente" hasta las tareas 007, 008 y 009. | **Aprobada.** |
| 15 | Filtros (prioridad, alerta, estado), búsqueda por número, atajos de teclado (C, E, ↑ ↓) y botón "Deshacer" | Se incluyen todos: son rápidos de hacer. "Deshacer" anula la última confirmación o corrección. | **Aprobada.** |
| 16 | Tipografía Inter | Descargar el archivo de la fuente Inter (licencia abierta OFL, unos 300 KB) al repositorio, para que la demo funcione sin internet. Si no, se usa la fuente del sistema. | **Aprobada.** |
| 17 | Textos del encabezado de Figma | Se mantienen: "Prototipo de demostración · Datos 100% ficticios · La IA sugiere, el equipo clínico decide", "Pulso", "IA que encuentra lo urgente escondido, para que la atención llegue a tiempo" y "CESFAM piloto · Bandeja de Telesalud". | **Aprobada.** |
| 18 | Nombres de las alertas en pantalla | Los de Figma: Urgencia, Violencia, Riesgo suicida (es `ideacion_suicida`), Descompensación, Persona mayor (60+) y GES. | **Aprobada.** |
| 19 | Solicitudes no clasificadas | Van en la caja punteada "Requiere revisión manual", arriba de todo, y el triajista las clasifica con el mismo formulario de corrección. La corrida de MiniMax no tiene ninguna, así que en el video esa caja no aparece. | **Aprobada.** |

## Decisiones que tomé durante la implementación

Candela pidió que, hasta la tarea 009, tome yo las decisiones técnicas y visuales y las anote aquí. Solo se le pregunta lo que afecte las bases, los criterios clínicos, los datos personales o lo que pueda hacer parecer real algo que no lo es.

**La solicitud del "ingreso simulado" es SINT-0009.**
- Es casi la más nueva (22-11, 11:57).
- MiniMax le sugirió urgencia, así que en el video muestra cómo algo urgente aparece arriba.
- Por la regla de antigüedad, entra al final del grupo de urgencia, porque es la más nueva.
- Antes de entrar se muestra 1,2 segundos el aviso "Aplicando la sugerencia guardada de MiniMax M3.1 Flash…", con la nota "resultado reproducido desde archivo".

**Grupos en pantalla.** Figma tiene un solo grupo "Con alerta crítica". La bandeja de la 005 tiene dos, así que se muestran como:
- "Con alerta crítica · Urgencia";
- "Con alerta crítica · Violencia, riesgo suicida o descompensación";
- "Sin alerta crítica".

Cada uno lleva su cantidad.

**De dónde vienen los datos, siempre visible** en la franja gris de arriba (ver los ajustes más abajo). El modelo y la versión del prompt van en el pie de la caja "Sugerencia IA" de cada solicitud: "Modelo: minimaxai/minimax-m3.1-flash · Prompt v1 · Reproducido desde archivo".

**En cada fila:**
- "Pidió X → Y": el profesional que pidió el vecino y el sugerido;
- la fecha "17-11 12:15";
- "Confianza" solo cuando la clasificación es de la IA.

**Estados:**
- "Pendiente" (reloj);
- "Confirmada" (check verde);
- "Corregida por triajista" (etiqueta azul petróleo con lápiz).

**Panel de detalle:**
- Muestra la sugerencia de la IA **y**, si hubo corrección, una caja aparte "Decisión del triajista" con el motivo. Así se ven las dos.
- Las solicitudes no clasificadas muestran "Clasificar manualmente" en vez de "Confirmar".

**Formulario de corrección:**
- Parte con los valores vigentes.
- "Persona mayor (60+)" aparece bloqueada, con la nota de que sale de la edad.
- El motivo tiene un tope de 300 caracteres y el aviso "No escribas datos personales".

**Avisos flotantes:** "Clasificación confirmada" y "Corrección guardada" duran 8 segundos y traen el botón "Deshacer".

**Las acciones viven en el programa encendido:** recargar la página no las borra; "Reiniciar demo" o apagar el programa, sí.

**Accesibilidad básica:**
- se puede usar con teclado (Enter abre, Esc cierra);
- el foco se ve;
- si la persona pidió menos movimiento en su computador, se desactivan las animaciones.

**La fuente Inter** se copió del paquete `@fontsource-variable/inter` (solo la parte latina, 48 KB), con su licencia. Después se desinstaló el paquete.

**Toda la API está en `/api/bandeja`** (ver la decisión 008).

## Ajustes pedidos por Candela después de revisar la pantalla (2026-11-26)

Candela probó la pantalla y pidió cuatro cambios. Así quedaron:

**1. Las tarjetas de resumen filtran la lista.**
- "Total en bandeja" quita todos los filtros.
- "Con alerta crítica", "Prioridad alta" y "Pendientes de revisión" muestran solo esas solicitudes. Al hacer clic se quitan los demás filtros (también la búsqueda), para que se vea exactamente lo que dice la tarjeta.
- Un segundo clic en la tarjeta activa quita su filtro.
- "No clasificadas" lleva a la sección "Requiere revisión manual". Si no hay ninguna (como en la corrida de MiniMax), muestra el aviso "No hay solicitudes sin clasificar".
- La tarjeta activa tiene borde azul petróleo, y las listas desplegables de filtros cambian para coincidir. También al revés: si se elige un filtro en la lista desplegable que coincide con una tarjeta, esa tarjeta se marca.
- La página baja suavemente hasta los filtros, para que se vea qué quedó elegido.
- Los números de las tarjetas siempre muestran el total de la bandeja, no lo filtrado.
- Mi decisión: "Total" aparece marcado cuando no hay ningún filtro.
- Las tarjetas son botones: se pueden usar con el teclado (Tab y Enter).
- Arreglo de paso: con el filtro "Con alerta crítica", las no clasificadas ya no aparecen (no tienen alerta porque la IA no respondió).

**2. Se quitó la franja lavanda.** La franja gris de arriba ahora dice: "Prototipo de demostración · Datos 100% ficticios · Resultados de MiniMax reproducidos desde archivo · La IA sugiere, el equipo clínico decide".
- Mi decisión: la parte "Resultados de MiniMax reproducidos desde archivo" la arma el programa con la corrida que esté cargada. Si alguien carga la corrida simulada, dice "Resultados SIMULADOS por reglas fijas (no son IA), reproducidos desde archivo". Así nunca dice "MiniMax" si los datos no son de MiniMax.
- Para eso, la descripción de los datos trae dos campos nuevos: `nombre_corto` ("MiniMax") y `texto_franja`.

**3. "Datos ficticios" aparece una sola vez**, en la franja gris. Revisé la pantalla completa: no aparece en ningún otro lugar.

**4. Pantalla de carga** al abrir la página y al presionar "Reiniciar demo".
- Al centro, en una tarjeta blanca: el logo de Pulso, un título que cambia por pasos, una barra de avance y, fijo abajo, "La IA sugiere, el equipo clínico decide."
- Pasos (0,8 segundos cada uno, unos 2,7 segundos en total con la salida):
  1. "Cargando la exportación de Telesalud… (59 solicitudes)";
  2. "Aplicando las sugerencias de MiniMax…";
  3. "Ordenando la bandeja…".
- El número de solicitudes y el nombre del modelo salen de los datos cargados, no están escritos a mano.
- No dice "Clasificando" ni nada que haga creer que la IA responde en vivo.
- Mis decisiones:
  - la barra es azul petróleo y no lavanda como en Figma, porque el lavanda en esta pantalla significa "lo dijo la IA", y cargar un archivo no es la IA;
  - "Reiniciar demo" también deja los filtros en blanco;
  - mientras se ve la pantalla de carga, los atajos de teclado no hacen nada;
  - si la persona pidió menos movimiento en su computador, la barra y la salida no se animan.
- Referencia: `docs/diseno/cargando.png` (Figma), con el logo arriba como en la versión de Bolt.

## Plan técnico

- **Capas:**
  - ruta (dirección web): `GET /api/bandeja`, `POST /api/bandeja/:id/confirmar`, `POST /api/bandeja/:id/corregir`, `POST /api/bandeja/deshacer`, `POST /api/bandeja/simular-ingreso` y `POST /api/bandeja/reiniciar`;
  - controlador, que valida con Zod lo que llega;
  - servicio, que usa `armarBandejaDesdeCorrida` de la tarea 005;
  - repositorio, que lee la corrida con `leerDatosBandeja`.
- Errores en un middleware global (una función que atrapa todos los errores en un solo lugar). Las respuestas son JSON con los códigos 200, 400, 404 y 500.
- La pantalla vive en `public/` (HTML, CSS y JavaScript), con el logo y los íconos SVG.
- Pruebas con Jest y Supertest de cada dirección web, incluidos los casos borde: número que no existe, corrección inválida y cuerpo vacío.

## Criterios de aceptación

- [x] La pantalla muestra la bandeja ordenada de la tarea 005, por grupos, con la etiqueta de los datos siempre visible.
- [x] El triajista puede confirmar, corregir (prioridad, profesional, alertas y motivo opcional), deshacer y clasificar a mano una no clasificada.
- [x] Al corregir, la solicitud cambia de lugar de inmediato y se resalta.
- [x] "Simular ingreso" y "Reiniciar demo" funcionan.
- [x] Filtros, búsqueda por número y atajos de teclado.
- [x] Aviso de la regla R2 en el panel. Nada dice "Analizando con IA".
- [x] Diseño de Figma con los elementos de Bolt: logo, favicon, tarjetas con íconos, animaciones y esquinas de 12 px.
- [x] La API valida con Zod lo que llega, responde JSON con 200, 201, 400, 404 y 500, y maneja los errores en un solo middleware.
- [x] `npm test` y `npm run lint` pasan. Sin `console.log`.
- [x] Candela revisó la pantalla en su navegador y pidió 4 ajustes, que ya están hechos y probados en el navegador.
- [x] Tarjetas que filtran, franja gris con el origen de los datos, "Datos ficticios" una sola vez y pantalla de carga.
- [x] `TASKS.md` actualizado. La rama se une a `main` con el Pull Request de esta tarea.

## Archivos modificados/creados

- **Programa (capas):**
  - `src/server.js`: enciende la aplicación;
  - `src/app.js`;
  - `src/config/app.js`: `PUERTO` y `BANDEJA_ARCHIVO_CORRIDA`;
  - `src/routes/bandeja.routes.js`;
  - `src/controllers/bandeja.controller.js`;
  - `src/schemas/correccion.schema.js`: la validación con Zod;
  - `src/services/demo-bandeja.service.js`: el estado de la demo;
  - `src/middlewares/errores.js`.
- `src/services/bandeja.service.js`: la etiqueta ahora trae también el nombre del modelo para mostrar, su nombre corto y el texto de la franja.
- **Pantalla:** `public/index.html`, `public/estilos.css`, `public/app.js`, `public/iconos.js`, `public/logo-pulso.svg`, `public/fuentes/` (Inter y su licencia) y `public/LICENCIA-Lucide.txt`.
- **Pruebas:**
  - `tests/services/demo-bandeja.service.test.js`;
  - `tests/api/bandeja.api.test.js` (Supertest);
  - `tests/config/app.test.js`.
- `package.json` (comando `iniciar`, `express` y `supertest`), `.env.example` (`BANDEJA_ARCHIVO_CORRIDA`), `eslint.config.js` (reglas para el código del navegador) y `README.md`.
- `docs/decisiones/008-pantalla-html-con-express.md`.
- `docs/diseno/`: las referencias de Figma (incluida `cargando.png`) y el logo de Candela.
- `tests/services/bandeja.service.test.js`: pruebas del nombre corto y del texto de la franja.

## Cómo probarlo

1. `npm.cmd test` y `npm.cmd run lint`: todo debe pasar.
2. En la terminal de VS Code: `npm.cmd run iniciar`. Abrir http://localhost:3000.
3. Recorrido sugerido:
   - abrir una solicitud;
   - confirmarla con la tecla C;
   - presionar "Deshacer";
   - corregir otra (por ejemplo, quitar "Urgencia") y ver cómo cambia de lugar;
   - presionar "Simular ingreso de nueva solicitud": entra SINT-0009;
   - hacer clic en las tarjetas de resumen: cada una filtra, y un segundo clic quita el filtro;
   - presionar "Reiniciar demo": aparece la pantalla de carga y la bandeja vuelve al inicio.
4. Para apagar: Ctrl + C en la terminal.

## Notas de cierre

**Cerrada el 2026-11-26.**

**Qué quedó hecho:** la pantalla de la bandeja para el video. Muestra las 59 solicitudes ordenadas por grupos con las sugerencias guardadas de MiniMax, deja confirmar, corregir, deshacer y clasificar a mano, simula el ingreso de SINT-0009, y tiene filtros, búsqueda, atajos de teclado, tarjetas que filtran y pantalla de carga. Siempre dice que los resultados se reproducen desde archivo y que decide una persona.

**Pruebas:** 365 pruebas automáticas pasan y `npm run lint` no muestra errores. Todo el recorrido se probó en el navegador sin errores.

**Pendiente para otras tareas:**
- el registro permanente de confirmaciones y correcciones (tarea 007): hoy se guardan solo mientras el programa está encendido;
- la pestaña "Evaluación" (tarea 008) y "Cómo funciona" (tarea 009).

**Uso de IA en esta tarea:** se usó Claude Code (asistente de programación con IA) para:
- proponer el plan y las decisiones visuales;
- escribir el código, las pruebas y esta documentación;
- probar la pantalla en un navegador.

Candela entregó el diseño de Figma y Bolt, aprobó el plan, revisó la pantalla y pidió los ajustes. Solo se usaron datos sintéticos (inventados).
