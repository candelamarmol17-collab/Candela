# [004] Prompt del modelo y adaptador de IA con modo simulado

**Estado**: in-progress
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

- [ ] Sin clave, todo funciona en modo simulado.
- [ ] Con `MODO_IA=simulado`, se usa el modo simulado aunque haya clave.
- [ ] Cambiar de proveedor es solo editar el `.env`.
- [ ] La clave no aparece en pantalla, en errores ni en resultados.
- [ ] El prompt tiene versión, la regla R3 y los criterios [PROVISIONALES].
- [ ] Una respuesta que no cumple el esquema queda "no clasificada", sin inventar datos.
- [ ] Cada resultado indica su origen: modelo real, simulado o repetición.
- [ ] El script clasifica los 60 casos de a uno, con pausa, y guarda los resultados.
- [ ] Hay un CSV con BOM para la revisión R3 después de la primera corrida real.
- [ ] `npm test` y `npm run lint` pasan, sin llamadas a internet en las pruebas.
- [ ] Sin `console.log`.
- [ ] Decisiones técnicas 005 y 006 escritas.
- [ ] `TASKS.md` actualizado y rama unida a `main` por Pull Request.

## Archivos modificados/creados

(se completa al implementar)

## Cómo probarlo

(se completa al implementar)

## Notas de cierre

(se completa al mover a /done; incluir si se usó Claude Code y para qué)
