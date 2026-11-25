# [003] Datos sintéticos con clasificación de referencia

**Estado**: in-progress
**Fecha creación**: 2026-11-24
**Rama asociada**: `feat/003-datos-sinteticos`

## Objetivo

Crear un conjunto de **60 solicitudes inventadas** (sintéticas), parecidas a las que llegan por Telesalud pero completamente ficticias. Cada una lleva su **clasificación de referencia**, es decir, la "respuesta correcta" que después se usará para medir qué tan bien clasifica la IA.

Además, se genera una tabla para Excel donde Candela puede revisar los 60 casos a mano antes de cerrar la tarea.

## Preguntas y respuestas

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Nombre de la rama? | `feat/003-datos-sinteticos`. |
| 2 | ¿Cuántas solicitudes? | **60.** Candela las revisa todas a mano y el plazo es corto. Hay que verificar que con 60 se cumplan los mínimos de las preguntas 3 a 9 (ver "Revisión de los mínimos con 60 solicitudes"). |
| 3 | ¿Reparto de la prioridad de referencia? | Sin una regla fija, pero con al menos 15 de cada nivel (alta, media y baja). |
| 4 | ¿Casos mínimos por alerta? | Al menos 5 de cada alerta (urgencia, violencia, ideación suicida, descompensación, 60 años o más y GES). Además, al menos 20 casos **sin ninguna alerta que decida la IA** (urgencia, violencia, ideación suicida, descompensación y GES). **Corrección de Candela**: esos 20 casos sí pueden tener la alerta de 60 años o más, porque esa la calcula el código y no la IA (acordado en la tarea 002). Por lo tanto, no sirve para medir falsas alertas de la IA. |
| 5 | ¿Casos ambiguos? | Al menos 10 casos con motivo "Otros" y una urgencia escondida en el texto libre. |
| 6 | ¿Proporción de "Otros"? | Cerca de un 30%, no el 56% real, para no quitarle espacio a los motivos de la lista. |
| 7 | ¿Profesional mal elegido? | Sí, al menos 8 casos donde la referencia sugiere un profesional distinto al que eligió el vecino. |
| 8 | ¿Tipos de profesional en las solicitudes? | Solo los 10 de la lista. |
| 9 | ¿Edad? | 80% con edad y 20% sin edad. **Corrección de Candela**: entre 15 y 20 de las 60 solicitudes tienen 60 años o más. |
| 10 | ¿`especificidad_consulta`? | Se deja fuera de todas las solicitudes: sus valores siguen [PENDIENTE]. |
| 11 | ¿Fechas? | Dos semanas de noviembre de 2026, entre las 8:00 y las 22:00. |
| 12 | ¿Identificadores? | `SINT-0001` a `SINT-0060`. |
| 13 | ¿Cómo se escribe el texto libre? | Como lo escribiría un vecino: con abreviaturas, faltas de ortografía y algunas expresiones chilenas. |
| 14 | ¿Temas sensibles? | De forma breve y sin detalles explícitos, solo lo necesario para que la señal se reconozca. |
| 15 | ¿Datos personales? (regla R1) | Prohibido cualquier nombre, RUT, teléfono, dirección o nombre de un centro real. Una prueba automática busca números parecidos a RUT o teléfonos. **Además, ningún texto puede copiar ni adaptar solicitudes reales, aunque estén anonimizadas: todo se inventa desde cero.** |
| 16 | ¿Campos de la referencia? | `id_solicitud`, `prioridad`, `profesional`, `alertas` y una `nota` corta que explica por qué. Sin `confianza`. |
| 17 | ¿Archivos separados? | Sí. Solicitudes y referencia van en archivos distintos, para que la IA nunca reciba la respuesta correcta por error. |
| 18 | ¿Formato? | JSON (un formato de texto ordenado que el código lee fácil). |
| 19 | ¿Ubicación? | `data/sinteticos/solicitudes.json` y `data/sinteticos/referencia.json`. |
| 20 | ¿Alerta de 60 años o más en la referencia? | Se marca siempre que la edad sea 60 o más. Si la solicitud no trae edad, no se marca. |
| 21 | ¿Cómo se decide la alerta GES? | Solo para problemas que están claramente en la lista GES (por ejemplo diabetes, hipertensión, depresión o cáncer). Es criterio nuestro, no clínico. |
| 22 | ¿Archivo fijo o script generador? | Archivo fijo, escrito por Claude en esta sesión. |
| 23 | ¿Cómo revisa Candela? | Con una tabla CSV (archivo de planilla que abre Excel) con solicitud y referencia lado a lado. Candela marca lo que cambiaría y Claude aplica los cambios antes de cerrar la tarea. **El CSV tiene que abrirse bien en Excel configurado en español: separador punto y coma (`;`) y codificación UTF-8 con BOM (una marca invisible al inicio que le avisa a Excel que el archivo trae tildes y ñ).** |
| 24 | ¿Aviso de método? | Sí, en el README: la referencia la definimos nosotras y no los triajistas, así que la evaluación demuestra el método y no la calidad real de la IA. **Además: los textos sintéticos los escribió una IA, así que la evaluación podría mostrar resultados mejores que con textos reales escritos por vecinos.** |
| 25 | ¿Qué revisan las pruebas? | Que cada solicitud cumpla el esquema de entrada; que cada solicitud tenga exactamente una referencia, y al revés; que la referencia use valores permitidos; que se cumplan los mínimos de las preguntas 3 a 9 (con la corrección de la pregunta 4); que la alerta de 60 años o más calce con la edad; y que no haya números parecidos a RUT o teléfonos. |
| — | (Pedido nuevo) Criterios de prioridad | Antes de escribir los casos, dejar escritos los criterios para decidir la prioridad de referencia, anotados como criterio nuestro y no clínico. **Son PROVISIONALES y están pendientes de validar con Fernanda Mena.** Ver la sección siguiente, que es el único lugar donde están escritos. |

## Criterios para decidir la prioridad de referencia [PROVISIONALES]

> **Importante: estos criterios son PROVISIONALES, nuestros y no clínicos.** No los definió ni validó un profesional de salud. Sirven solo para armar la "respuesta correcta" de los datos sintéticos, y así demostrar el método de evaluación.
>
> **Este es el único lugar donde están escritos.** Si hay que ajustarlos, se cambian solo aquí y después se revisan las referencias afectadas.

**[PENDIENTE] Por validar con Fernanda Mena, gestora de Telesalud del CESFAM Boris Soler**, en especial:

- (a) Los criterios de alta, media y baja.
- (b) Si las alertas de 60 años o más y GES deben subir la prioridad.
- (c) Qué cuenta como "medicamento que no se puede suspender" y como "síntomas de alarma en el embarazo".

Los plazos son los de Telesalud: alta, cierre en 72 horas; media, en 14 días; baja, en 30 días.

**Alta**: la solicitud muestra al menos una de estas señales.

- Alguna alerta crítica: urgencia, violencia, ideación suicida o descompensación.
- Un síntoma que empeora rápido o que suena a urgencia, aunque el motivo elegido no lo diga. Por ejemplo, fiebre alta en una guagua, dolor fuerte en el pecho o dificultad para respirar.
- Embarazo con síntomas de alarma, por ejemplo sangrado o dolor fuerte.
- La persona se queda sin un medicamento que no puede suspender (por ejemplo insulina o anticonvulsivantes) en 3 días o menos.

**Media**: no hay señales de alta, pero hay un problema de salud que conviene ver pronto.

- Un síntoma nuevo o que dura varios días, sin señales de alarma.
- Exámenes que la persona dice que salieron alterados.
- Ingreso de embarazo o control prenatal sin síntomas de alarma.
- Renovación de receta cuando el medicamento se acaba en menos de 2 semanas.
- Problema que le impide hacer sus actividades diarias (por ejemplo, caminar o trabajar), sin señales de alarma.

**Baja**: trámites y controles sin un problema activo.

- Certificados, informes y consultas sobre el estado de una interconsulta.
- Controles preventivos o de rutina sin síntomas.
- Renovación de receta con medicamento suficiente para más de 2 semanas.
- Solicitudes informativas: por ejemplo, preservativos o métodos anticonceptivos sin problemas.
- Entrega de ayudas técnicas cuando no hay un riesgo inmediato.

**Reglas para casos que calzan en más de un nivel**:

1. Si calza en dos niveles, gana el más alto.
2. Las alertas de **60 años o más** y **GES** no suben la prioridad por sí solas. Sirven para avisar al triajista, pero la prioridad se decide por las señales de arriba.
3. Si el texto libre no dice nada útil (por ejemplo "necesito hora"), la prioridad se decide por el motivo elegido.

**Criterio para elegir el profesional de referencia** (también nuestro, no clínico): el profesional del formulario que mejor calza con lo que pide el texto libre. Si el texto no aporta nada, se mantiene el que eligió el vecino.

## Revisión de los mínimos con 60 solicitudes

Revisé que todos los mínimos caben en 60 solicitudes, con las correcciones de Candela a las preguntas 4 y 9. **Se cumplen todos.**

En esta tabla, "alertas de la IA" son las 5 alertas que decide la IA: urgencia, violencia, ideación suicida, descompensación y GES. La alerta de 60 años o más la calcula el código.

| Mínimo | Cuánto se necesita | Cómo cabe en 60 |
|---|---|---|
| 15 de cada prioridad | 45 | Quedan 15 libres, que se reparten entre los tres niveles. |
| 5 de cada alerta de la IA (5 alertas) | 25 alertas | Una solicitud puede tener más de una alerta, así que bastan como máximo 25 solicitudes con alerta de la IA. |
| 20 sin ninguna alerta de la IA | 20 | Quedan hasta 40 solicitudes para las 25 alertas de la IA. Alcanza con holgura. |
| Entre 15 y 20 personas de 60 años o más | 15 a 20 | Salen de las 48 solicitudes con edad. Cada una lleva la alerta de 60 años o más, así que esa alerta queda con 15 a 20 casos y supera el mínimo de 5. Como ya no bloquean el grupo "sin alerta de la IA", pueden estar en cualquier grupo. |
| 10 "Otros" con urgencia escondida | 10 | Caben dentro de las ~18 solicitudes con "Otros" (30% de 60). También aportan a las 5 de urgencia y a las 15 de alta. |
| 8 con profesional mal elegido | 8 | Se mezclan con cualquiera de los grupos anteriores. |
| 80% con edad | 48 con edad y 12 sin edad | De las 48 con edad, entre 15 y 20 tienen 60 años o más y entre 28 y 33 tienen menos de 60. |

**Para la tarea de evaluación (tarea 8)**: como la alerta de 60 años o más no la decide la IA, la métrica de falsas alertas tiene que dejarla fuera. Si no, culparía a la IA de algo que calcula el código.

## Plan técnico

**Carpeta nueva**: `data/sinteticos/`.

**Archivos que se crean**:

1. `data/sinteticos/solicitudes.json`: las 60 solicitudes, con los campos del esquema de entrada de la tarea 2 (sin `especificidad_consulta`).
2. `data/sinteticos/referencia.json`: las 60 clasificaciones de referencia. Cada una tiene `id_solicitud`, `prioridad`, `profesional`, `alertas` y `nota`.
3. `src/schemas/referencia.schema.js`: molde de la referencia, con la función `validarReferencia`. Usa las listas de `catalogos.js`, las mismas reglas que la salida de la IA (valores de la lista y sin campos de más) y una `nota` no vacía de máximo 300 caracteres.
4. `scripts/generar-csv-revision.js`: script (pequeño programa que se ejecuta con un comando) que junta las solicitudes con su referencia y genera la tabla de revisión. Se ejecuta con `npm run revision:csv`.
5. `data/sinteticos/revision.csv`: la tabla de revisión. Se guarda en el repositorio para que Candela la pueda descargar.
   - Separador `;` y codificación UTF-8 con BOM.
   - Columnas: `id_solicitud`, `fecha_ingreso`, `tipo_profesional`, `motivo`, `edad`, `texto_libre`, `prioridad_ref`, `profesional_ref`, `alertas_ref`, `nota_ref`, `comentario_revision`. La última va vacía, para que Candela anote sus cambios.
   - Los textos que traen `;`, comillas o saltos de línea van entre comillas, para que Excel no los corte.
6. `tests/datos/sinteticos.test.js`: las pruebas de la pregunta 25.
7. `tests/scripts/generar-csv-revision.test.js`: pruebas del CSV (separador, BOM, textos con `;` o comillas, una fila por solicitud).
8. `README.md`: se agrega una sección "Sobre los datos sintéticos y la evaluación" con los dos avisos de la pregunta 24.

**Lo que revisa la prueba de datos personales**:

- Números parecidos a un RUT (por ejemplo `12.345.678-9` o `12345678-9`).
- Números parecidos a un teléfono chileno (por ejemplo `+56 9 1234 5678` o `912345678`).
- Correos electrónicos.
- Una lista de palabras prohibidas: `Melipilla`, `Boris Soler`, `Rayén` y `El Gueta`, para que no aparezcan nombres de lugares, centros o sistemas reales. La búsqueda no distingue entre mayúsculas y minúsculas: por ejemplo, también encuentra `MELIPILLA` o `el gueta`. "CESFAM" no está en la lista porque es una palabra general que escribiría cualquier vecino y no identifica a ningún centro.

La prueba no puede detectar un nombre de persona inventado. Eso se cuida al escribir los textos y en la revisión de Candela.

**Cómo se escriben los textos**: Claude los inventa desde cero en esta sesión. No se usa como base ninguna solicitud real.

**Sin dependencias nuevas.**

### Detalles fuera de las preguntas

Estos puntos no salieron de las preguntas. Candela aprobó A, B, C y E tal como están, y corrigió D:

- **A. Esquema de la referencia** (`src/schemas/referencia.schema.js`): hace falta para que la prueba revise que la referencia use valores permitidos.
- **B. El CSV se guarda en el repositorio**: así lo puedes descargar desde GitHub. La alternativa es generarlo solo en tu computador con `npm run revision:csv`.
- **C. Mensaje del script**: el contrato prohíbe `console.log`. El script avisa que terminó escribiendo una línea en la terminal con `process.stdout.write`. ESLint no bloquea esa forma. Si prefieres que el script no muestre nada, lo dejo en silencio.
- **D. Palabras prohibidas**: **corregido por Candela**. La lista es `Melipilla`, `Boris Soler`, `Rayén` y `El Gueta`, y la búsqueda no distingue entre mayúsculas y minúsculas. Se sacó "CESFAM".
- **E. Protección del CSV en Excel**: si un texto empieza con `=`, `+`, `-` o `@`, Excel podría tratarlo como fórmula. Propongo anteponerle un apóstrofo (`'`) en el CSV. Solo cambia la tabla de revisión, no el JSON.

## Criterios de aceptación

- [ ] Hay 60 solicitudes y 60 referencias, con los identificadores `SINT-0001` a `SINT-0060`.
- [ ] Todas las solicitudes cumplen el esquema de entrada de la tarea 2.
- [ ] Todas las referencias cumplen su esquema.
- [ ] Se cumplen los mínimos de las preguntas 3 a 9.
- [ ] La alerta de 60 años o más está exactamente en las solicitudes con edad 60 o más.
- [ ] La prueba de datos personales no encuentra nada.
- [ ] El CSV se abre bien en Excel en español: columnas separadas, tildes y ñ visibles.
- [ ] Candela revisó los 60 casos y sus cambios están aplicados.
- [ ] El README tiene los dos avisos de método.
- [ ] `npm test` y `npm run lint` pasan.
- [ ] Sin `console.log`.
- [ ] `TASKS.md` actualizado.
- [ ] Rama unida a `main` por Pull Request.

## Archivos modificados/creados

(se completa al implementar)

## Cómo probarlo

1. Descargar la rama y ejecutar `npm install`.
2. Ejecutar `npm test`: todas las pruebas deben pasar.
3. Ejecutar `npm run lint`: no debe mostrar errores.
4. Ejecutar `npm run revision:csv` y abrir `data/sinteticos/revision.csv` con Excel: deben verse 60 filas, columnas separadas, y tildes y ñ correctas.

## Notas de cierre

(se completa al mover a /done; incluir si se usó Claude Code y para qué)
