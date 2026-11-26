# [006] Interfaz de bandeja con confirmar o corregir

**Estado**: backlog
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

**Propuestas del 2026-11-26, pendientes de respuesta:**

| # | Pregunta | Propuesta | Respuesta de Candela |
|---|---|---|---|
| 1 | ¿Con qué se hace la pantalla? | HTML y JavaScript simple, sin framework, servidos por el mismo programa Node con **Express**. Dependencias nuevas: `express` y, solo para pruebas, `supertest`. | (pendiente) |
| 2 | ¿Qué corrida muestra? | Variable nueva `BANDEJA_ARCHIVO_CORRIDA` en el `.env`; por defecto, la corrida de MiniMax. | (pendiente) |
| 3 | ¿Qué puede corregir el triajista? | Prioridad, profesional y alertas, más un motivo opcional de hasta 300 caracteres con aviso de no escribir datos personales. "Persona mayor (60+)" no se puede cambiar, porque sale de la edad. | (pendiente) |
| 4 | ¿Dónde se guardan las confirmaciones y correcciones? | Solo en memoria. Se pierden al reiniciar el programa, y "Reiniciar demo" vuelve al inicio. El registro permanente es la tarea 007. | (pendiente) |
| 5 | ¿Qué pasa al corregir o confirmar? | Al corregir, la solicitud cambia de lugar de inmediato con la marca "Corregida por triajista". Al confirmar, queda en su lugar con la marca "Confirmada". | (pendiente) |
| 6 | ¿Qué muestra cada solicitud? | Del vecino: número, fecha, profesional pedido, motivo y texto completo. De la sugerencia: prioridad, profesional, alertas, justificación y confianza. | (pendiente) |
| 7 | Texto del aviso de la regla R2 | El de Figma: "Es una sugerencia. La decisión es del triajista. La IA no entrega indicaciones clínicas." | (pendiente) |
| 8 | Usuario ficticio | "Triajista de demostración", sin inicio de sesión. | (pendiente) |
| 9 | Puerto | `PUERTO=3000` (ya está en `.env.example`). | (pendiente) |

**Preguntas que salen de las imágenes de Figma:**

| # | Pregunta | Propuesta | Respuesta de Candela |
|---|---|---|---|
| 10 | "Simular ingreso de nueva solicitud": ¿qué solicitud entra? | La bandeja empieza con 59 solicitudes. El botón hace entrar la que falta (por ejemplo SINT-0060) con la clasificación **guardada** de MiniMax. | (pendiente) |
| 11 | Mientras entra, Figma dice "Analizando con IA…". ¿Se mantiene? | Cambiarlo por "Aplicando la sugerencia guardada de MiniMax…": "Analizando con IA" haría creer que responde en vivo (decisión 007). | (pendiente) |
| 12 | Frases resaltadas en el texto del vecino (Figma resalta "renovar" e "insulina") | **Se simplifica: sin resaltado.** El modelo no dice qué frases usó, y agregarlo cambiaría el prompt, que está congelado. Adivinarlas con el código podría resaltar algo que no fue lo importante. | (pendiente) |
| 13 | Antigüedad: Figma dice "hace 3 días" | Mostrar la fecha y hora de ingreso (por ejemplo "17-11 12:15"). "Hace X días" cambiaría según el día en que se grabe el video. | (pendiente) |
| 14 | Pestañas Registro, Evaluación y Cómo funciona | Mostrarlas, pero desactivadas, con el texto "Próximamente" hasta las tareas 007, 008 y 009. | (pendiente) |
| 15 | Filtros (prioridad, alerta, estado), búsqueda por número, atajos de teclado (C, E, ↑ ↓) y botón "Deshacer" | Se incluyen todos: son rápidos de hacer. "Deshacer" anula la última confirmación o corrección. | (pendiente) |
| 16 | Tipografía Inter | Descargar el archivo de la fuente Inter (licencia abierta OFL, unos 300 KB) al repositorio, para que la demo funcione sin internet. Si no, se usa la fuente del sistema. | (pendiente) |
| 17 | Textos del encabezado de Figma | Se mantienen: "Prototipo de demostración · Datos 100% ficticios · La IA sugiere, el equipo clínico decide", "Pulso", "IA que encuentra lo urgente escondido, para que la atención llegue a tiempo" y "CESFAM piloto · Bandeja de Telesalud". | (pendiente) |
| 18 | Nombres de las alertas en pantalla | Los de Figma: Urgencia, Violencia, Riesgo suicida (es `ideacion_suicida`), Descompensación, Persona mayor (60+) y GES. | (pendiente) |
| 19 | Solicitudes no clasificadas | Van en la caja punteada "Requiere revisión manual", arriba de todo, y el triajista las clasifica con el mismo formulario de corrección. La corrida de MiniMax no tiene ninguna, así que en el video esa caja no aparece. | (pendiente) |

## Plan técnico (se completa con las respuestas)

- **Capas:**
  - ruta (dirección web): `GET /api/bandeja`, `POST /api/bandeja/:id/confirmar`, `POST /api/bandeja/:id/corregir`, `POST /api/bandeja/deshacer`, `POST /api/bandeja/simular-ingreso` y `POST /api/bandeja/reiniciar`;
  - controlador, que valida con Zod lo que llega;
  - servicio, que usa `armarBandejaDesdeCorrida` de la tarea 005;
  - repositorio, que lee la corrida con `leerDatosBandeja`.
- Errores en un middleware global (una función que atrapa todos los errores en un solo lugar). Las respuestas son JSON con los códigos 200, 400, 404 y 500.
- La pantalla vive en `public/` (HTML, CSS y JavaScript), con el logo y los íconos SVG.
- Pruebas con Jest y Supertest de cada dirección web, incluidos los casos borde: número que no existe, corrección inválida y cuerpo vacío.

## Criterios de aceptación

(se completan con las respuestas)

## Archivos modificados/creados

(se completa al implementar)

## Cómo probarlo

(se completa al implementar)

## Notas de cierre

(se completa al mover a /done; incluir si se usó Claude Code y para qué)
