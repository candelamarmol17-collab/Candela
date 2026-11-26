# [004] Prompt del modelo y adaptador de IA con modo simulado

**Estado**: done
**Fecha creación**: 2026-11-25
**Rama asociada**: `feat/004-prompt-adaptador-ia`

## Objetivo

Conectar el MVP con un modelo de IA para que clasifique las solicitudes. Esto incluye:

- **El prompt**: las instrucciones que se le dan al modelo, guardadas en su propio archivo y con número de versión.
- **Un adaptador** (pieza que habla con el proveedor de IA) que sirve para NVIDIA, OpenAI u otro proveedor compatible, cambiando solo el archivo `.env`.
- **Un modo simulado** que funciona sin internet ni clave (regla R5). Es el modo predeterminado.
- **Un script** que clasifica las 60 solicitudes sintéticas y guarda los resultados para la evaluación (tarea 8).

Solo se usan datos sintéticos. Nunca datos reales (regla R1).

## Preguntas y respuestas

**Información verificada en la documentación oficial de NVIDIA** (2026-11-25):

- URL base compatible con OpenAI: `https://integrate.api.nvidia.com/v1`. Las consultas van a `POST /v1/chat/completions`.
- La clave va en el encabezado `Authorization: Bearer <clave>`.
- La documentación de `meta/llama-3.3-70b-instruct` no menciona un modo JSON. Por eso el JSON se pide en el prompt y se valida con el esquema.
- La documentación revisada no indica los límites de uso del plan gratuito.

**Modelos recomendados** (los tres aparecen en el catálogo oficial de NVIDIA; ninguna página de NVIDIA dice "buen español", así que esa parte es recomendación de Claude):

| Modelo | Comentario |
|---|---|
| `meta/llama-3.3-70b-instruct` | Predeterminado. Es el mejor documentado en NVIDIA. |
| `qwen/qwen3-next-80b-a3b-instruct` | Segunda opción, para comparar. |
| `mistralai/mistral-large-4-1t-a52b` | Mistral asegura más de 160 idiomas y JSON estricto. Es muy grande y no se confirmó su nombre exacto en un ejemplo de llamada. |

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Nombre de la rama? | `feat/004-prompt-adaptador-ia`. |
| 2 | ¿Se mantiene `MODO_IA`? | Sí, como interruptor: `MODO_IA=simulado` fuerza el modo simulado aunque haya clave. El modo real se activa solo si hay clave y `MODO_IA` no fuerza el simulado. |
| 3 | ¿Qué valores lleva `.env.example`? | La URL de NVIDIA y el modelo `meta/llama-3.3-70b-instruct` quedan escritos porque no son secretos. La clave queda vacía. |
| 4 | ¿El prompt incluye los criterios provisionales? | Sí, marcados como [PROVISIONAL]: los de prioridad y la regla de "urgencia" de la tarea 3, más las señales de alarma de esta tarea. |
| 5 | ¿Qué pasa si el modelo devuelve la alerta de 60 años o más? | El código la quita y la vuelve a poner según la edad. El prompt le dice al modelo que no la use. |
| 6 | ¿Cómo responde el modo simulado? | Con reglas fijas por palabras clave. Además, como opción para la demo, puede repetir una corrida real guardada. Nunca devuelve la clasificación de referencia. |
| 7 | ¿Qué pasa si el JSON viene dentro de un bloque ```` ```json ````? | Se quita ese envoltorio, porque no cambia ningún dato. Cualquier otro texto extra deja la respuesta como "no clasificada". |
| 8 | ¿Se reintenta? | Un solo reintento, después de 10 segundos, si hay error 429 (demasiadas consultas), error del servidor (500 o más) o se agota el tiempo de espera. Si vuelve a fallar, queda "no clasificada". |
| 9 | ¿Pausa y tiempo de espera? | Pausa de 2 segundos entre solicitudes y un máximo de 30 segundos de espera por respuesta. Ambos se configuran en el `.env`. |
| 10 | ¿Parámetros del modelo? | Temperatura 0 (para que repita las mismas respuestas) y un máximo de 500 tokens (unidades de texto) de respuesta. |
| 11 | ¿Los resultados se guardan en git? | Sí, en `data/resultados/`. Si una respuesta queda "no clasificada", se guarda también el texto original que devolvió el modelo, para revisar qué falló. |
| 12 | ¿Cómo se prueba la regla R3 (sin indicaciones clínicas)? | En esta tarea, con una prueba que verifica que el prompt lo prohíbe. La revisión de las justificaciones reales se hace a mano (ver detalle 2 de abajo). |

**Detalles agregados por Candela**:

1. **Modo visible**: en los resultados, y en cualquier pantalla futura, tiene que quedar claro de dónde viene cada clasificación: del modelo real, del simulado por reglas o de la repetición de una corrida guardada. En el video no puede parecer real algo que es simulado.
2. **Revisión R3**: después de la primera corrida real, se genera un CSV con BOM (para Excel) con `id_solicitud`, `texto_libre` y la justificación del modelo. Candela revisa a mano que ninguna justificación dé diagnósticos, tratamientos ni consejos.
3. **Criterios clínicos en el prompt**: se agregan al prompt las señales de alarma, las reglas de medicamentos, la regla de texto vago, la regla de la duda y la regla de la justificación (ver "Criterios nuevos para el prompt"). Todo queda marcado como [PROVISIONAL], pendiente de validación con Fernanda Mena. No cambian los esquemas ni los 3 niveles de prioridad.
4. **Coherencia**: antes de escribir el prompt, se revisa que los criterios nuevos calcen con los criterios [PROVISIONALES] de la tarea 3 y con la referencia de los 60 casos. Si algún caso contradice las reglas, se le muestra la lista a Candela antes de cambiar nada. Las señales de alarma también se agregan a la sección de criterios de la tarea 3, para que el prompt y la referencia usen las mismas reglas.

## Criterios nuevos para el prompt [PROVISIONALES]

> Criterio propio, no clínico. Pendiente de validación con Fernanda Mena, gestora de Telesalud del CESFAM Boris Soler.

**Señales de alarma que activan la alerta "urgencia"**. Son **ejemplos**, no una lista cerrada (decisión A): el prompt dice "por ejemplo", y el modelo puede reconocer otras señales de igual gravedad.

- **Cardiovascular**: dolor de pecho opresivo o que se irradia a brazo, cuello o mandíbula; palpitaciones con mareo o desmayo.
- **Neurológico**: debilidad o parálisis de un lado del cuerpo o de la cara, dificultad repentina para hablar, confusión aguda, convulsiones, dolor de cabeza explosivo, visión borrosa con presión muy alta.
- **Respiratorio**: falta de aire en reposo, labios o uñas morados, no poder hablar de corrido.
- **Digestivo**: vómitos con sangre, deposiciones negras, dolor abdominal intenso y súbito.
- **Metabólico**: glicemia muy alta o muy baja con confusión o vómitos.
- **Sistémico**: fiebre alta con confusión, manchas que no desaparecen al presionar, hinchazón rápida de labios, lengua o garganta, hinchazón de la cara o del cuello con fiebre y dificultad para tragar o abrir la boca (este último ejemplo lo agregó Candela por `SINT-0006`).
- **Trauma**: sangrado que no se detiene.
- **Grupos de mayor riesgo**: lactante con fiebre, embarazada con sangrado o dolor fuerte.

**Otras reglas**:

- **Medicamentos que no se pueden suspender** (insulina, anticonvulsivantes, anticoagulantes, corticoides): si la persona se queda sin ellos en **3 días o menos**, la prioridad es "alta" (decisión B: la misma frase que en la tarea 3).
- **Texto vago**: confianza "baja", para revisión humana, **solo cuando no se entiende qué pide la persona**. Un trámite claro, aunque no describa síntomas, no queda con confianza baja (decisión C).
- **Ante la duda entre dos prioridades**: se elige la más alta.
- **Justificación**: describe solo lo que dice el texto. Puede repetir una enfermedad **solo si la persona la menciona**. Nunca supone una que no dijo ni nombra diagnósticos posibles (decisión D).
- **Ideación suicida** es una alerta crítica: el caso queda en prioridad alta aunque no tenga "urgencia".

**Criterios por área (segunda ronda, 2026-11-25)**: Candela agregó ejemplos para descompensación (moderada y crítica), salud mental, dental y una regla general de inicio brusco. Para no repetirlos en dos lugares, el texto completo está en la sección de criterios de `done/003-2026-11-24-datos-sinteticos-clasificacion-referencia.md`. El prompt usa exactamente esos criterios.

**Mínimo redefinido**: "10 casos 'Otros' con al menos una alerta crítica escondida (urgencia, violencia, ideación suicida o descompensación)". Se agregó `ALERTAS_CRITICAS` a `catalogos.js`, porque lo usan la prueba de este mínimo y la métrica de la tarea 008.

**Criterios congelados** desde el 2026-11-25 hasta la validación con Fernanda Mena.

### Coherencia de la segunda ronda con los 60 casos

**Todos los casos calzan. No hubo que cambiar ninguna referencia.**

| Área | Casos | Resultado |
|---|---|---|
| Descompensación crítica (alta + descompensación + urgencia) | `SINT-0007` (labios morados), `0009` (glicemia alta con vómitos y confusión), `0019` (presión alta con visión borrosa y dolor de cabeza), `0021` (ahogo al acostarse) | Calzan. |
| Descompensación moderada (alta + descompensación, sin urgencia) | `SINT-0022` (más tos y silbidos, el inhalador le dura poco) | Calza. |
| Salud mental con urgencia + ideación | `SINT-0012` (autolesión en curso), `0014` (intento reciente) | Calzan. |
| Ideación pasiva sin plan (alta, sin urgencia) | `SINT-0008`, `0011`, `0013` | Calzan. |
| Salud mental media | `SINT-0031` (ansiedad de un mes, insomnio, sin ideas de daño) | Calza. |
| Salud mental baja | `SINT-0052` (informe) | Calza. |
| Dental alta + urgencia | `SINT-0006` (cara hinchada, fiebre, dificultad para tragar y abrir la boca) | Calza. |
| Dental media | `SINT-0029` (dolor con el frío, sin hinchazón) | Calza. |
| Dental baja | `SINT-0046` (control preventivo), `0055` (tapadura sin dolor; decisión adelantada de Candela) | Calzan. |
| Inicio brusco + señal de alarma | `SINT-0001` ("desde anoche"), `0004` ("ayer... ahora"), `0005` ("desde la mañana") | Ya están en alta + urgencia. |

Ningún caso sin "descompensacion" menciona una enfermedad crónica con signos de la lista. `SINT-0028` (tos con flema de 10 días) no menciona una enfermedad crónica, así que no cuenta como descompensación.

## Revisión de coherencia con la tarea 3 [RESUELTA el 2026-11-25]

**Decisiones de Candela**:

- `SINT-0006`: se mantiene en alta + urgencia. Se agregó a las señales de alarma el ejemplo "hinchazón de la cara o del cuello con fiebre y dificultad para tragar o abrir la boca".
- `SINT-0008`: se quita "urgencia" y queda en alta + ideación suicida, igual que `SINT-0011` y `SINT-0013`. Ideación suicida es alerta crítica, así que el caso sigue arriba en la bandeja.
- A: la lista de señales son ejemplos. B: "3 días o menos". C: confianza "baja" solo cuando no se entiende qué pide la persona. D: la justificación repite una enfermedad solo si la persona la menciona.

Lo que sigue es la revisión original, tal como se le mostró a Candela.

Revisé los criterios nuevos contra los criterios [PROVISIONALES] de la tarea 3 y contra la referencia de los 60 casos. **No cambié nada todavía.**

**Casos de la referencia que no calzan con las reglas nuevas**:

| Caso | Texto (resumen) | Referencia actual | Qué no calza |
|---|---|---|---|
| `SINT-0006` | Cara hinchada por una muela, con fiebre y dificultad para tragar y abrir la boca. | alta, con "urgencia" | Ninguna señal de alarma de la lista lo cubre exactamente. Lo más cercano es "hinchazón rápida de labios, lengua o garganta", pero el texto habla de la cara. |
| `SINT-0008` | "Ya no quiero seguir viviendo, he pensado en hacerme daño, necesito hablar con alguien." | alta, con "urgencia" e "ideación suicida" | La regla de urgencia de la tarea 3 pide "intento reciente o autolesión activa". Este texto describe pensamientos, no un intento ni una autolesión. Además, `SINT-0011` y `SINT-0013`, con ideas parecidas, no tienen "urgencia". |

**Puntos que necesitan una aclaración**:

- **A. ¿La lista de señales de alarma es cerrada o son ejemplos?** Si es cerrada, solo esas señales (más la regla de urgencia de la tarea 3) activan la alerta, y `SINT-0006` tendría que perder la alerta. Si son ejemplos, `SINT-0006` puede mantenerla.
- **B. ¿"Pocos días" o "3 días o menos"?** La tarea 3 dice "3 días o menos" para quedarse sin un medicamento que no se puede suspender. La regla nueva dice "pocos días". Ningún caso cambia con esto, pero conviene usar una sola frase en el prompt y en la referencia.
- **C. ¿Qué es un texto "sin síntomas descritos"?** Si se aplica al pie de la letra, todos los trámites claros (certificados, controles, recetas con medicamento suficiente) quedarían con confianza "baja", aunque se entienda bien lo que piden. Eso son unos 18 casos de los 60.
- **D. ¿La justificación puede repetir una enfermedad que la persona dice tener?** Por ejemplo: "La persona dice ser diabética y tener la glicemia muy alta". Repetirlo describe lo que dice el texto, sin inventar un diagnóstico. Hace falta para justificar alertas como GES o descompensación.

**Casos revisados que sí calzan**: `SINT-0001` (dolor de pecho hacia el brazo), `0002` (lactante con fiebre), `0003` (sangrado que no se detiene), `0004` (habla raro, boca chueca, debilidad del brazo), `0005` (embarazada con sangrado), `0007` (labios morados), `0009` (glicemia alta con vómitos y confusión), `0019` (visión borrosa con presión muy alta), `0021` ("se ahoga acostada", que interpreté como falta de aire en reposo) y `0020` (se queda sin insulina en 2 días: alta, sin urgencia). Los casos de violencia e ideación suicida siguen la regla de urgencia de la tarea 3. Ningún caso sin "urgencia" muestra una señal de la lista.

## Plan técnico

**Sin dependencias nuevas.** El `.env` se lee con la función que ya trae Node 26 (`process.loadEnvFile`) y las consultas usan el `fetch` nativo.

**Archivos que se crean**:

1. `src/config/ia.js`: lee la configuración del `.env` y decide el modo (real o simulado). La clave nunca se muestra en pantalla ni se guarda.
2. `src/prompts/clasificacion.js`: el prompt, con `VERSION_PROMPT`. Incluye las listas permitidas, el formato JSON, la regla R3, los criterios [PROVISIONALES] y la indicación de no usar la alerta de 60 años o más.
3. `src/adaptadores/adaptador-compatible-openai.js`: llama a `/chat/completions` con `fetch`. Maneja el tiempo de espera y el reintento.
4. `src/adaptadores/adaptador-simulado.js`: reglas fijas por palabras clave.
5. `src/adaptadores/adaptador-repeticion.js`: repite una corrida real guardada.
6. `src/services/clasificacion.service.js`: valida la solicitud, llama al adaptador, lee y valida el JSON, revisa que el `id_solicitud` coincida, aplica la regla de la edad y devuelve `clasificada` o `no_clasificada` con su motivo.
7. `scripts/clasificar-sinteticos.js` (`npm run clasificar:sinteticos`): lee solo `data/sinteticos/solicitudes.json` (ruta fija, nunca la referencia), procesa de a una solicitud con pausa y guarda el resultado en `data/resultados/`.
8. `scripts/probar-ia.js` (`npm run ia:probar`): manda una solicitud sintética de prueba para confirmar que la clave y el modelo funcionan.
9. `scripts/generar-csv-revision-r3.js` (`npm run revision:r3`): genera el CSV para la revisión R3.
10. Pruebas en `tests/` para cada pieza. Ninguna prueba llama a internet.
11. `docs/decisiones/005-adaptador-compatible-openai.md` y `docs/decisiones/006-modos-de-clasificacion.md`.

**Modo visible**: cada resultado guarda `origen`, que puede ser `modelo_real`, `simulado_reglas` o `repeticion`. El archivo de resultados guarda además el modelo, la versión del prompt, la fecha y la corrida repetida (si corresponde).

**Archivos que se modifican**:

- `.env.example`: se agregan `IA_URL_BASE`, `IA_API_KEY` (vacía), `IA_MODELO`, `IA_PAUSA_MS` e `IA_TIEMPO_ESPERA_MS`.
- `package.json`: nuevos comandos.
- `done/003-...md`: se agregan las señales de alarma a la sección de criterios [PROVISIONALES], según lo que Candela decida sobre la revisión de coherencia.
- `README.md`: cómo configurar el `.env` y los modos.

## Criterios de aceptación

- [x] Sin clave, todo funciona en modo simulado.
- [x] Con `MODO_IA=simulado`, se usa el modo simulado aunque haya clave.
- [x] Cambiar de proveedor es solo editar el `.env`.
- [x] La clave no aparece en pantalla, en errores ni en resultados.
- [x] El prompt tiene versión, la regla R3 y los criterios [PROVISIONALES].
- [x] Una respuesta que no cumple el esquema queda "no clasificada", sin inventar datos.
- [x] Cada resultado indica su origen: modelo real, simulado o repetición.
- [x] El script clasifica los 60 casos de a uno, con pausa, y guarda los resultados. (Corridas reales de Mistral y MiniMax hechas.)
- [x] Hay un CSV con BOM para la revisión R3 de cada corrida real, con la revisión de Candela anotada.
- [x] `npm test` y `npm run lint` pasan, sin llamadas a internet en las pruebas (14 grupos, 278 pruebas).
- [x] Sin `console.log`.
- [x] Decisiones técnicas 005 y 006 escritas.
- [x] `TASKS.md` actualizado. La rama se une a `main` con el Pull Request de esta tarea.

## Archivos modificados/creados

**Nuevos**

- `src/config/ia.js`: lee el `.env` y decide el modo (real, simulado o repetición). Nunca muestra la clave.
- `src/prompts/clasificacion.js`: el prompt (las instrucciones para el modelo), versión 1, con la regla R3 y los criterios [PROVISIONALES].
- `src/adaptadores/adaptador-compatible-openai.js`: habla con el proveedor real (NVIDIA u otro compatible con OpenAI).
- `src/adaptadores/adaptador-simulado.js`: el modo simulado por palabras clave.
- `src/adaptadores/adaptador-repeticion.js`: repite las respuestas de una corrida real guardada.
- `src/services/clasificacion.service.js`: valida la respuesta con el esquema y procesa las solicitudes de a una, con pausa.
- `src/utilidades/esperar.js`: la pausa entre solicitudes.
- `scripts/probar-ia.js` (`npm run ia:probar`), `scripts/clasificar-sinteticos.js` (`npm run clasificar:sinteticos`) y `scripts/generar-csv-revision-r3.js` (`npm run revision:r3`).
- `data/resultados/clasificaciones-simulado.json`: corrida de prueba en modo simulado.
- Pruebas: `tests/config/`, `tests/prompts/`, `tests/adaptadores/`, `tests/services/` y `tests/scripts/clasificar-y-revision-r3.test.js`.
- `docs/decisiones/005-adaptador-compatible-openai.md` y `006-modos-de-clasificacion.md`.

**Modificados**

- `.env.example`: variables de la IA, sin valores, con la línea que indica dónde pegar la clave.
- `package.json`: los tres comandos nuevos.
- `README.md`: sección "Cómo se conecta con la IA" y los comandos nuevos.
- `tests/configuracion.test.js`: se reescribió para el nuevo `.env.example` (revisa que la clave y `MODO_IA` estén vacíos).
- `src/schemas/catalogos.js`: nueva lista `ALERTAS_CRITICAS`.
- `data/sinteticos/referencia.json`, `revision.csv`, `tests/datos/sinteticos.test.js` y `done/003-...md`: ajustes de coherencia y criterios por área (ver más arriba).

**Agregados después de las corridas reales (2026-11-25 y 26)**

- `scripts/clasificar-sinteticos.js`: opciones `--reintentar`, `--tiempo-espera` y `--pausa`.
- `src/services/clasificacion.service.js`: función `reintentarNoClasificadas`.
- `scripts/generar-csv-revision-r3.js`: no sobrescribe una tabla que ya existe.
- `data/resultados/`: corridas de Mistral y MiniMax y sus tablas de revisión R3, con los comentarios de Candela.
- `.env.example`: el ejemplo de repetición apunta a la corrida de MiniMax.
- Las pruebas de todo lo anterior.

**Cosas que no estaban en el plan** (se avisan para que no sorprendan)

- `MODO_IA=repeticion`: permite elegir la repetición desde el `.env`, igual que los otros modos (ver decisión 006).
- `ALERTAS_CRITICAS` y el mínimo de "Otros" redefinido, que Candela aprobó.
- **Advertencia del simulado**: sus palabras clave se escribieron conociendo los 60 textos, por eso coincide 54 de 60 veces en prioridad con la referencia. Ese número no mide nada y nunca debe mostrarse como calidad de la IA.

## Cómo probarlo

1. Sin clave (modo simulado):
   - `npm test` y `npm run lint`: todo debe pasar.
   - `npm run clasificar:sinteticos`: crea `data/resultados/clasificaciones-simulado.json`. Cada resultado dice `"origen": "simulado_reglas"` y su justificación empieza con "SIMULADO".
2. Con la clave en el `.env` (modo real):
   - `npm run ia:probar`: manda un solo caso sintético. Debe mostrar "Modo: MODELO REAL", "Clave: configurada (oculta)" y una clasificación.
   - `npm.cmd run clasificar:sinteticos -- --tiempo-espera 240000 --pausa 10000`: clasifica los 60 casos con el modelo del `.env` (Mistral). Tarda alrededor de una a tres horas, según el día. Crea `data/resultados/clasificaciones-mistralai-mistral-large-4-1t-a52b.json`.
   - Agregando `--modelo minimaxai/minimax-m3.1-flash` se corre MiniMax sin cambiar el `.env`.
   - `npm.cmd run clasificar:sinteticos -- --reintentar data/resultados/<archivo>.json --tiempo-espera 240000 --pausa 10000`: vuelve a clasificar solo las no clasificadas.
   - `npm.cmd run revision:r3 -- <archivo de MiniMax> <archivo de Mistral>`: crea los CSV para revisar las justificaciones en Excel. Si ya existen, no los sobrescribe.
3. Repetición (la que se usa en el video): en el `.env`, poner `MODO_IA=repeticion` e `IA_ARCHIVO_REPETICION=data/resultados/clasificaciones-minimaxai-minimax-m3.1-flash.json`. Las respuestas salen sin internet y con `"origen": "repeticion"`.

## Cambios después del HTTP 410 (2026-11-25)

El modelo elegido al principio (`meta/llama-3.3-70b-instruct`) fue retirado del catálogo de NVIDIA. Candela aprobó:

- **Modelo principal:** `mistralai/mistral-large-4-1t-a52b`. **Respaldo y comparación:** `minimaxai/minimax-m3.1-flash`. Nemotron 3 Ultra queda tercero porque cambió "presión" por "hipertensión" (regla R3). Detalle en la decisión 005.
- Límite de respuesta en el `.env` (`IA_MAX_TOKENS=4000`) y espera de 2 minutos (`IA_TIEMPO_ESPERA_MS=120000`).
- Correr los 60 casos con los dos modelos, uno después del otro y nunca al mismo tiempo. MiniMax se corre con `--modelo`, sin cambiar el `.env`.
- Un CSV R3 por modelo, con una columna que marca dónde difieren en prioridad, profesional o alertas críticas.
- Para la demo del video se usará el **modo repetición** con los resultados guardados.

Archivos agregados o cambiados por esto: `scripts/listar-modelos.js` (`npm run ia:modelos`) y su prueba, `src/config/ia.js`, `src/adaptadores/adaptador-compatible-openai.js`, `src/services/clasificacion.service.js` (guarda el tiempo de cada respuesta), `scripts/clasificar-sinteticos.js` (`--modelo`), `scripts/generar-csv-revision-r3.js` (columna de diferencias), `.env.example`, `README.md`, la decisión 005 y sus pruebas.

## Notas para la tarea 008 (evaluación)

Candela pidió dejar esto anotado para cuando se cree la tarea 008:

- La pantalla compara **Mistral y MiniMax con las mismas métricas**, empezando por las **alertas críticas no detectadas**.
- Muestra el **tiempo promedio de respuesta** de cada modelo. Cada corrida ya lo guarda (`tiempo_promedio_ms`, y `duracion_ms` por solicitud).
- Incluye la tabla **"Modelos considerados"**, con las columnas: desempeño en español, privacidad y retención de datos, costo por solicitud y alojamiento.
  - Mistral y MiniMax: modelos probados en el prototipo, vía el catálogo de NVIDIA y con datos sintéticos.
  - OpenAI, Claude, Gemini y Grok: opciones comerciales por evaluar en el piloto. **Todas sus celdas dicen "Por evaluar".** No se inventan datos de esos modelos.
- Deja claro que **la referencia es nuestra y no de triajistas**: los resultados muestran el método, no la calidad real.
- Separa dos tipos de "no clasificada" en las métricas:
  - **error del proveedor** (`error_proveedor`: el servicio no respondió a tiempo o respondió con error);
  - **respuesta inválida del modelo** (`json_invalido`, `esquema_invalido`, `id_distinto`: el modelo respondió, pero mal).
- **Un caso con alerta crítica que quede sin clasificar cuenta como alerta crítica no detectada**, sea cual sea la causa, porque así pasaría en la vida real.
- Muestra, por modelo, **cuántos casos se agotaron en la primera pasada y necesitaron reintento**. El dato está en cada corrida: la lista `reintentos` y, en cada caso reintentado, `intento` e `intento_anterior`.
  - Es un hallazgo de **confiabilidad**: el catálogo gratuito de NVIDIA sirve para el prototipo, pero el piloto necesita un servicio con disponibilidad garantizada.
- El tiempo promedio de una corrida con reintento usa la duración del último intento de cada caso. La duración del intento fallido queda en `intento_anterior.duracion_ms`.
- **Decisión de Candela (2026-11-26):** la bandeja del video usa la corrida de **MiniMax** en modo repetición (60 de 60 clasificadas, ninguna alerta crítica sin clasificar). La pantalla de evaluación compara los dos modelos.
- **Hallazgos de la revisión R3 de Candela** (ninguna justificación da tratamientos ni consejos). Están anotados también en la columna `comentario_revision` de cada CSV:

  | Modelo | Caso | Hallazgo |
  |---|---|---|
  | MiniMax | SINT-0016 | **Inventó un dato (hallazgo importante):** dice "la golpeó en la cara", pero el texto dice "en la guata". |
  | MiniMax | SINT-0022 | Lenguaje de diagnóstico: "compatible con descompensación respiratoria". |
  | Mistral | SINT-0009 | Juicio clínico: "Estos síntomas indican descompensación grave". |
  | Mistral | SINT-0012 | Supone quién escribe ("Madre reporta") sin que el texto lo diga. |
  | Mistral | SINT-0013 | Supone quién escribe ("Hijo refiere") sin que el texto lo diga. |

  - La pantalla debe mostrar estos hallazgos por modelo. Que un modelo clasifique todo no significa que sus justificaciones sean confiables: el triajista siempre debe leer el texto original.
  - **Los criterios y el prompt están congelados.** Estos hallazgos no cambian el prompt ni las clasificaciones guardadas: se informan como resultado.

## Corrida de Mistral: tiempo agotado y reintento (2026-11-25)

**Qué pasó:** la primera pasada de Mistral clasificó 46 de 60. Las 14 restantes quedaron como "error del proveedor" porque **el servicio no respondió a tiempo**: los dos intentos de cada caso (2 minutos cada uno) se agotaron. No hubo errores 429 (demasiadas consultas) ni 500 (falla del servidor), y **ningún caso fue bloqueado por su contenido**: un bloqueo responde en segundos con un error, no deja la conexión esperando.

**Casos:**
- 8 con alerta crítica en la referencia: SINT-0008, 0009, 0012, 0013, 0016, 0017, 0018 y 0021.
- 6 sin alerta crítica: SINT-0030, 0032, 0036, 0048, 0053 y 0054.

**¿Por qué más casos críticos?** Todo indica que fue la hora y no el tema:
- Los casos críticos están al comienzo de la lista y se procesaron en un rato en que el servicio estaba lento: ahí también tardaron 196 a 250 segundos los que sí respondieron.
- Hubo otro rato lento (SINT-0037 a 0054) con casos sin alerta.
- 13 de los 46 casos clasificados también se agotaron en el primer intento y respondieron en el segundo.
- MiniMax clasificó la mayoría de esos mismos casos críticos en una corrida que se detuvo a mitad de camino.

El reintento sirve de comprobación.

**Qué se hizo (aprobado por Candela):**
- Nueva opción `--reintentar`: vuelve a clasificar solo las no clasificadas de una corrida guardada, con el mismo modelo, y actualiza el mismo archivo. Cada caso reintentado queda marcado.
- Nuevas opciones `--tiempo-espera` y `--pausa`: cambian esos valores solo para una corrida, sin tocar el `.env`. Para el reintento y para MiniMax se usan 240000 ms (4 minutos) y 10000 ms (10 segundos).
- La primera pasada de Mistral quedó guardada en el historial de git (commit `21e2bdd`) antes del reintento.
- `revision:r3` ya no sobrescribe una tabla que existe, para no borrar los comentarios de la revisión.

**Resultado del reintento de Mistral:** 10 de 14 se clasificaron. Quedan 4 no clasificadas, de nuevo por tiempo agotado con 4 minutos por intento: SINT-0016, 0017, 0021 (con alerta crítica) y 0030. Total: 56 clasificadas y 4 no clasificadas.

**MiniMax (desde cero, 4 minutos de espera y 10 segundos de pausa):**
- En la primera pasada clasificó 53. Las 7 restantes fallaron porque el proveedor respondió con error, no por tiempo agotado: 2 con HTTP 429 (demasiadas consultas) y 5 con HTTP 503 (servicio no disponible).
- El reintento clasificó las 7. Total: 60 clasificadas.

**Error corregido:** en la primera versión de la protección de `revision:r3`, la función que no sobrescribe existía y tenía prueba, pero el comando no la usaba. Por eso, al final de la corrida, la tabla de Mistral se volvió a generar, ahora con la columna de diferencias. Ya está corregido, y una prueba nueva corre el comando completo y verifica que no sobrescribe.

## Notas de cierre

**Cerrada el 2026-11-26.**

**Qué quedó hecho:**
- El prompt (versión 1, con la regla R3 y los criterios [PROVISIONALES], ahora congelados).
- Tres modos de trabajo: modelo real, simulado y repetición. Cada resultado dice de dónde viene.
- Un adaptador para cualquier proveedor compatible con OpenAI. Cambiar de modelo es editar una línea del `.env`.
- Comandos para listar modelos, clasificar los 60 casos, reintentar solo los que fallaron y generar las tablas de revisión R3.

**Resultados:**
- Mistral: 56 de 60 clasificadas. Quedaron 3 alertas críticas sin clasificar por tiempo agotado.
- MiniMax: 60 de 60 clasificadas.
- Ningún caso fue bloqueado por su contenido.
- La revisión R3 encontró 5 problemas en las justificaciones (ver "Notas para la tarea 008").
- El video usará la corrida de MiniMax en modo repetición.

**Pendiente para otras tareas:** la comparación de los dos modelos es de la tarea 008, con las notas de arriba.

**Uso de IA en esta tarea:** se usó Claude Code (asistente de programación con IA) para:
- proponer el plan y escribir el código y las pruebas;
- diagnosticar los errores del proveedor;
- correr los comandos;
- redactar esta documentación.

Candela tomó las decisiones, revisó y aprobó cada paso, e hizo a mano la revisión R3 de las justificaciones. Los modelos Mistral y MiniMax se usaron solo con datos sintéticos (inventados).
