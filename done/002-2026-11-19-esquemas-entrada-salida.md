# [002] Esquemas de entrada y salida

**Estado**: done
**Fecha creación**: 2026-11-19
**Rama asociada**: `feat/002-esquemas`

## Objetivo

Definir los "moldes" (esquemas) que dicen qué datos son válidos en el MVP:

- **Entrada**: cómo tiene que venir una solicitud de Telesalud.
- **Salida**: cómo tiene que venir la respuesta de la IA.

Además, se guardan en un solo archivo las listas de valores permitidos (tipos de prestador, motivos, prioridades y alertas), para poder cambiarlas en un solo lugar cuando se conozca el formato real de la exportación.

Esta tarea no lee archivos, no llama a la IA y no ordena la bandeja. Solo define los moldes y unas funciones que dicen si un dato cumple o no.

## Preguntas y respuestas

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Nombre de la rama? | `feat/002-esquemas`. |
| 2 | ¿Campos de la solicitud? | 7 campos: `id_solicitud`, `fecha_ingreso`, `tipo_profesional`, `motivo`, `texto_libre`, `edad` y `especificidad_consulta`. |
| 3 | ¿Lista de tipos de profesional? | Lista real tomada del formulario de Telesalud (19-11-2026), donde el campo se llama "Tipo Prestador": Asistente Social, Dental, Enfermería, Kinesiología, Matrona, Medicina, Nutrición, Psicología, Terapia Ocupacional, Técnico en enfermería. Son también los valores permitidos de `profesional_sugerido`. |
| 4 | ¿Lista de motivos? | Lista real del formulario ("Motivo Consulta"), guardada en `catalogos.js` agrupada por tipo de prestador. **El esquema de entrada NO valida el motivo contra esta lista**: acepta cualquier texto no vacío. Son las etiquetas del formulario, no necesariamente las de la exportación, y los datos del centro hablan de una categoría "Otros" que no aparece en ninguna lista. La lista se usa para los datos sintéticos (tarea 3) y como referencia. |
| 5 | ¿Edad? | Opcional. Si viene, número entero entre 0 y 120. |
| 6 | ¿Texto libre vacío o solo con espacios? | Se rechaza. Máximo 300 caracteres. |
| 7 | ¿Identificador y fecha? | `id_solicitud`: cualquier texto no vacío. `fecha_ingreso`: fecha y hora en formato estándar, por ejemplo `2026-11-19T10:30:00`. |
| 8 | ¿Campos de más en la solicitud? | Se ignoran (se descartan sin error). |
| 9 | ¿Formato de salida de la IA? | Se aprueba el de la sección 5.2: `id_solicitud`, `prioridad_sugerida`, `profesional_sugerido`, `alertas`, `justificacion`, `confianza`. |
| 10 | ¿Niveles de prioridad? | Tres: alta, media y baja. |
| 11 | ¿Largo de la justificación? | No vacía, máximo 300 caracteres. |
| 12 | ¿Alertas repetidas? | No se rechaza la respuesta: se eliminan los duplicados y se continúa. Quitar un duplicado no inventa información. **Sí se rechaza** una alerta que no esté en la lista permitida. |
| 13 | ¿Quién marca la alerta de 60 años o más? | En esta tarea solo es un valor permitido. Ver "Notas para tareas futuras". |
| 14 | ¿Campos de más en la respuesta de la IA? | Se rechaza la respuesta. |
| 15 | ¿Estado "no clasificada"? | En esta tarea solo hay una función que dice si la respuesta sirve o no. El estado "no clasificada" se maneja en la tarea 5. |
| 16 | ¿Dónde van los esquemas? | En `src/schemas/`. Las listas de valores permitidos van en `src/schemas/catalogos.js`. |
| 17 | ¿Idioma de los mensajes de error? | Español. |
| 18 | ¿Qué cubren las pruebas? | Casos válidos y casos borde: campos vacíos, tipos incorrectos, textos de más de 300 caracteres, nulos y valores fuera de la lista. |
| 19 | ¿Se valida el tipo de profesional? | **En la entrada no**: se acepta cualquier texto no vacío, igual que el motivo, para no rechazar una solicitud real por una etiqueta distinta. **En la salida sí**: `profesional_sugerido` tiene que ser uno de los 10 tipos de la lista. |
| 20 | ¿Reglas de `especificidad_consulta`? | Opcional. Si viene, texto no vacío con un máximo de 300 caracteres. **[PROVISIONAL]**: el máximo se revisa cuando se conozcan los valores reales. |

**Equivalencia con el formulario de Telesalud** (queda también como comentario en el código):

- `tipo_profesional` = "Tipo Prestador"
- `motivo` = "Motivo Consulta"

**Textos de las listas**: se copiaron tal cual del formulario, incluidas las mayúsculas y minúsculas inconsistentes y las abreviaturas (por ejemplo "etc"). No se corrigen.

**[PENDIENTE] Por validar con la gestora de Telesalud del CESFAM Boris Soler**:

- Cuáles son los campos reales de la exportación.
- La categoría "Otros", que no aparece en el formulario.
- Los valores de `especificidad_consulta` (en el formulario es obligatorio, pero no sabemos qué valores tiene ni si viene en la exportación).
- Qué significan las prioridades "1 a 4".

## Notas para tareas futuras

- **Tareas 4 y 5**: si la solicitud trae la edad, la alerta de 60 años o más la calcula el código y no la IA, porque es una regla fija.
- **Nombre de la alerta de 60 años o más**: puede cambiar. Falta confirmar si la Ley 21.168 también cubre a personas con discapacidad y a cuidadores. Por eso el nombre queda en `catalogos.js`, para poder cambiarlo en un solo lugar.

## Plan técnico

**Dependencia nueva**: `zod` versión 4 (librería que revisa los datos contra un esquema). Es la que eligió la decisión técnica 001.

**Archivos que se crean**:

1. `src/schemas/catalogos.js`: listas de valores permitidos, sin lógica:
   - `TIPOS_PRESTADOR`: los 10 tipos.
   - `MOTIVOS_POR_PRESTADOR`: los motivos agrupados por tipo de prestador.
   - `PRIORIDADES`: alta, media, baja.
   - `NIVELES_CONFIANZA`: alta, media, baja.
   - `ALERTA_PERSONA_MAYOR`: el nombre de la alerta de 60 años o más (`persona_mayor_60`), separado para poder renombrarlo.
   - `ALERTAS`: urgencia, violencia, ideacion_suicida, descompensacion, la alerta de persona mayor y ges.
   - `LARGOS_MAXIMOS`: texto libre 300, justificación 300 y especificidad 300 (provisional).
2. `src/schemas/solicitud.schema.js`: esquema de entrada y función `validarSolicitud(datos)`.
3. `src/schemas/clasificacion.schema.js`: esquema de salida de la IA y función `validarClasificacion(datos)`.
4. `tests/schemas/catalogos.test.js`, `tests/schemas/solicitud.schema.test.js` y `tests/schemas/clasificacion.schema.test.js`.
5. `docs/decisiones/004-entrada-flexible-salida-estricta.md`: explica por qué la entrada es flexible (acepta etiquetas desconocidas e ignora campos de más) y la salida de la IA es estricta.

**Qué devuelven las funciones `validarSolicitud` y `validarClasificacion`**:

- Si el dato cumple: `{ exito: true, datos }`. En `datos` va la versión limpia: sin campos de más en la entrada y sin alertas repetidas en la salida.
- Si no cumple: `{ exito: false, errores }`. En `errores` va una lista con el campo y el mensaje en español, por ejemplo `{ campo: 'texto_libre', mensaje: 'El texto libre no puede superar los 300 caracteres.' }`.
- Nunca lanzan un error (no "se caen"): siempre responden con uno de esos dos formatos.

**Reglas de la entrada (solicitud)**:

| Campo | Regla |
|---|---|
| `id_solicitud` | Obligatorio. Texto no vacío. |
| `fecha_ingreso` | Obligatorio. Fecha y hora en formato estándar sin zona horaria, como `2026-11-19T10:30:00`. |
| `tipo_profesional` | Obligatorio. Texto no vacío (no se compara con la lista). |
| `motivo` | Obligatorio. Texto no vacío (no se compara con la lista). |
| `texto_libre` | Obligatorio. No vacío ni solo espacios. Máximo 300 caracteres. |
| `edad` | Opcional. Número entero entre 0 y 120. |
| `especificidad_consulta` | Opcional. Texto no vacío, máximo 300 caracteres [PROVISIONAL]. |
| Campos de más | Se descartan sin error. |

**Reglas de la salida (respuesta de la IA)**:

| Campo | Regla |
|---|---|
| `id_solicitud` | Obligatorio. Texto no vacío. |
| `prioridad_sugerida` | Obligatorio. alta, media o baja. |
| `profesional_sugerido` | Obligatorio. Uno de los 10 tipos de prestador, escrito exactamente igual. |
| `alertas` | Obligatorio. Lista (puede venir vacía). Cada alerta tiene que estar en la lista permitida. Las repetidas se eliminan. |
| `justificacion` | Obligatorio. No vacía ni solo espacios. Máximo 300 caracteres. |
| `confianza` | Obligatorio. alta, media o baja. |
| Campos de más | La respuesta se rechaza. |

Los textos no se modifican: no se quitan espacios ni se cambian mayúsculas. Solo se revisan.

### Dos detalles que necesito que apruebes

Estos puntos no salieron de las preguntas, así que los dejo explícitos para que los apruebes o los cambies:

- **A. Campos opcionales que vienen como `null` (vacíos)**: una exportación puede traer la columna `edad` o `especificidad_consulta` vacía. Propongo tratar `null` igual que si el campo no viniera, en vez de rechazar la solicitud.
- **B. Fecha con zona horaria**: propongo aceptar solo el formato del ejemplo, sin zona horaria (`2026-11-19T10:30:00`), con o sin segundos. Una fecha con zona horaria (`...Z` o `...-03:00`) se rechazaría. Se ajusta cuando se conozca la exportación real.

## Criterios de aceptación

- [x] `catalogos.js` tiene las listas copiadas tal cual del formulario.
- [x] Una solicitud válida pasa, y los campos de más se descartan.
- [x] Una solicitud con un motivo o tipo de profesional que no está en la lista pasa igual.
- [x] Se rechazan: campos obligatorios faltantes, textos vacíos o solo con espacios, textos de más de 300 caracteres, tipos incorrectos (por ejemplo, edad como texto), edad decimal o fuera de 0 a 120, fecha mal escrita y nulos en campos obligatorios.
- [x] Una respuesta de IA válida pasa, incluida una con `alertas` vacía.
- [x] Las alertas repetidas se eliminan sin rechazar la respuesta.
- [x] Se rechazan: alerta desconocida, profesional fuera de la lista, prioridad o confianza fuera de alta/media/baja, justificación vacía o de más de 300 caracteres y campos de más.
- [x] Los mensajes de error están en español e indican el campo.
- [x] `npm test` y `npm run lint` pasan.
- [x] Decisión técnica 004 escrita.
- [x] Sin `console.log`.
- [x] `TASKS.md` actualizado.
- [x] Rama unida a `main` por Pull Request (#3).

## Archivos modificados/creados

**Archivos creados**:

- `src/schemas/catalogos.js`: listas de valores permitidos. Además de lo planeado, tiene `EDAD` (mínimo 0 y máximo 120), para que esos límites también queden en un solo lugar.
- `src/schemas/utilidades.js`: **no estaba en el plan.** Tiene las piezas que usan los dos esquemas: la regla de "texto no vacío", la regla de "valor de la lista" y la función que convierte los errores en la lista `{ campo, mensaje }`. Lo separé para no repetir el mismo código en dos archivos.
- `src/schemas/solicitud.schema.js`: esquema de entrada y `validarSolicitud`.
- `src/schemas/clasificacion.schema.js`: esquema de salida y `validarClasificacion`.
- `tests/schemas/catalogos.test.js`, `tests/schemas/solicitud.schema.test.js` y `tests/schemas/clasificacion.schema.test.js`: 95 pruebas nuevas (97 en total con las de la tarea 001).
- `docs/decisiones/004-entrada-flexible-salida-estricta.md`

**Archivos modificados**: `package.json` y `package-lock.json` (se agregó `zod` 4.6.7), `TASKS.md`.

**Cómo funcionan dos detalles aprobados**:

- A. `edad` o `especificidad_consulta` con `null`: la solicitud se acepta y el campo se quita de los datos limpios.
- B. Fecha: se acepta `2026-11-19T10:30:00` o `2026-11-19T10:30`. Se rechazan las fechas con zona horaria, con milisegundos y las que no existen (por ejemplo, 30 de febrero o las 25:00).

**Algo que encontré y no corregí (está fuera de esta tarea)**: Git en este computador convierte los saltos de línea al formato de Windows al descargar archivos. Por eso, Prettier marca `tests/configuracion.test.js` como "mal formateado", aunque el contenido está bien. No afecta a las pruebas ni a ESLint. Se puede corregir en una tarea aparte, con un archivo `.gitattributes` (que le dice a Git qué formato de salto de línea usar).

## Cómo probarlo

1. Descargar la rama y ejecutar `npm install`.
2. Ejecutar `npm test`: deben pasar las 97 pruebas (puede aparecer un aviso "ExperimentalWarning", es normal).
3. Ejecutar `npm run lint`: no debe mostrar errores.

## Notas de cierre

**Fecha de cierre**: 2026-11-19

**Resumen**: el MVP ya tiene los moldes que dicen qué datos son válidos. El de entrada revisa las solicitudes de Telesalud y es flexible con las etiquetas. El de salida revisa las respuestas de la IA y es estricto. Las listas de valores permitidos están en un solo archivo (`catalogos.js`). Pasan las 97 pruebas y ESLint no muestra errores. La rama se unió a `main` con el Pull Request #3.

**Checklist de "Terminado"**:

- [x] Pruebas escritas y pasando
- [x] Sin `console.log` en el código
- [x] Documentación de la tarea actualizada
- [x] Rama mergeada (Pull Request #3)
- [x] Índice general (`TASKS.md`) actualizado

**Pendientes para tareas futuras**:

- Validar con la gestora de Telesalud del CESFAM Boris Soler: los campos reales de la exportación, la categoría "Otros", los valores de `especificidad_consulta` y las prioridades 1 a 4. Con esa información se ajustan `catalogos.js` y la decisión 004.
- El largo máximo de `especificidad_consulta` (300) es provisional.
- Tareas 4 y 5: si viene la edad, la alerta de 60 años o más la calcula el código, no la IA. Su nombre puede cambiar según el alcance de la Ley 21.168.
- Tarea 5: maneja el estado "no clasificada" cuando `validarClasificacion` rechaza una respuesta.
- Saltos de línea: Git en este computador los convierte al formato de Windows. Se puede corregir con un `.gitattributes` en una tarea aparte.

**Uso de IA (para la pregunta 52 del formulario)**: se usó Claude Code (modelo Claude Opus 5.5) para hacer las preguntas de alcance, escribir el archivo de la tarea y el plan técnico, programar los esquemas y sus 95 pruebas nuevas, redactar la decisión técnica 004, ejecutar las pruebas y hacer los commits. Candela entregó las listas reales del formulario de Telesalud, respondió las preguntas, aprobó el plan y revisó y unió el Pull Request.
