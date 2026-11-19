# [002] Esquemas de entrada y salida

**Estado**: in-progress
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

- [ ] `catalogos.js` tiene las listas copiadas tal cual del formulario.
- [ ] Una solicitud válida pasa, y los campos de más se descartan.
- [ ] Una solicitud con un motivo o tipo de profesional que no está en la lista pasa igual.
- [ ] Se rechazan: campos obligatorios faltantes, textos vacíos o solo con espacios, textos de más de 300 caracteres, tipos incorrectos (por ejemplo, edad como texto), edad decimal o fuera de 0 a 120, fecha mal escrita y nulos en campos obligatorios.
- [ ] Una respuesta de IA válida pasa, incluida una con `alertas` vacía.
- [ ] Las alertas repetidas se eliminan sin rechazar la respuesta.
- [ ] Se rechazan: alerta desconocida, profesional fuera de la lista, prioridad o confianza fuera de alta/media/baja, justificación vacía o de más de 300 caracteres y campos de más.
- [ ] Los mensajes de error están en español e indican el campo.
- [ ] `npm test` y `npm run lint` pasan.
- [ ] Decisión técnica 004 escrita.
- [ ] Sin `console.log`.
- [ ] `TASKS.md` actualizado y rama unida a `main` por Pull Request.

## Archivos modificados/creados

(se completa al implementar)

## Cómo probarlo

1. Descargar la rama y ejecutar `npm install`.
2. Ejecutar `npm test`: todas las pruebas deben pasar.
3. Ejecutar `npm run lint`: no debe mostrar errores.

## Notas de cierre

(se completa al mover a /done; incluir si se usó Claude Code y para qué)
