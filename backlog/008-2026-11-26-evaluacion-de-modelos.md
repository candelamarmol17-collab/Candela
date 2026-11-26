# [008] Script y pantalla de evaluación de los modelos

**Estado**: backlog
**Fecha creación**: 2026-11-26
**Rama asociada**: `feat/008-evaluacion-modelos` (sale de la rama de la 006, porque usa su pantalla; cuando Candela una la 006 a `main`, la 008 queda al día sola)

## Objetivo

Medir qué tan bien clasificaron Mistral y MiniMax las 60 solicitudes sintéticas, comparando cada sugerencia con la clasificación de referencia, y mostrarlo en la pestaña "Evaluación" de Pulso.

Lo más importante es cuántas **alertas críticas no detectó** cada modelo (urgencia, violencia, riesgo suicida o descompensación), porque es el error más grave.

La pantalla deja claro que la referencia la definimos nosotras y no los triajistas: los números muestran **el método**, no la calidad real de la IA.

## Qué se va a medir (sección 6 de los requerimientos y notas de la tarea 004)

Por cada modelo, con las mismas reglas:

| Métrica | Cómo se calcula |
|---|---|
| **Alertas críticas no detectadas** (la principal) | Solicitudes que en la referencia tienen alerta crítica y que el modelo no marcó (ver pregunta 1). **Una solicitud crítica que quedó sin clasificar cuenta como no detectada**, sea cual sea la causa. |
| Detalle por alerta | Para cada alerta (urgencia, violencia, riesgo suicida, descompensación, GES): cuántas tenía la referencia, cuántas detectó el modelo y cuántas marcó de más. |
| Concordancia de prioridad | Porcentaje de coincidencia y una tabla de aciertos y errores por nivel (matriz de confusión). Las no clasificadas aparecen en una columna "Sin respuesta". |
| Concordancia de profesional | Porcentaje de coincidencia. |
| Falsas alertas | Alertas marcadas que la referencia no tiene. Se separan las críticas de las demás. |
| No clasificadas | Separadas en **error del proveedor** (el servicio no respondió a tiempo o dio error) y **respuesta inválida del modelo** (respondió, pero mal). |
| Confiabilidad | Cuántos casos fallaron en la primera pasada y necesitaron reintento, y por qué (por ejemplo, 503 o 429). |
| Tiempo | Tiempo promedio de respuesta por solicitud (con la duración del último intento de cada caso). |

Además:
- **Hallazgos de la revisión R3** de Candela, por modelo. Se leen de la columna `comentario_revision` de los CSV, así que no se escriben dos veces.
- Tabla **"Modelos considerados"** (ver pregunta 2).
- **Sin veredicto:** los umbrales para pasar a uso real están [PENDIENTE], así que la pantalla no dice "aprobado" ni cuál modelo "gana". Solo muestra los números.

## Preguntas y respuestas

Siguiendo la regla de Candela hasta la 009, solo pregunto lo que toca criterios de evaluación o lo que podría hacer parecer real algo que no lo es. Lo técnico y lo visual lo decido yo (ver más abajo).

| # | Pregunta | Mi propuesta | Respuesta de Candela |
|---|---|---|---|
| 1 | ¿Cuándo una solicitud crítica cuenta como "detectada"? Ejemplo: la referencia dice urgencia + violencia y el modelo marca solo violencia. | **Número principal por solicitud:** cuenta como detectada si el modelo marcó **al menos una** alerta crítica, porque así la solicitud sube a los grupos de arriba en la bandeja. **Debajo, el detalle por alerta**, donde sí se ve que faltó la urgencia (en el ejemplo, la solicitud queda en "otra alerta crítica" y no en "urgencia"). | |
| 2 | Tabla "Modelos considerados": ¿qué dicen las celdas de Mistral y MiniMax? | Desempeño en español: "Ver métricas de esta pantalla (60 casos sintéticos)". Privacidad y retención: **"Por evaluar"** (no revisamos las condiciones de NVIDIA para datos reales; solo usamos datos sintéticos). Costo: "Catálogo de prueba gratuito de NVIDIA; el piloto necesita un servicio pagado con disponibilidad garantizada". Alojamiento: "Servidores de NVIDIA, vía API". OpenAI, Claude, Gemini y Grok: **todas sus celdas "Por evaluar"**. | |
| 3 | Texto del aviso fijo de la pantalla | "La clasificación de referencia la definimos nosotras, no los triajistas, con criterios provisionales y no clínicos. Estos números muestran el método para medir a la IA, no su calidad real. Los textos sintéticos también los escribió una IA, así que con textos reales los resultados podrían ser peores." | |

## Decisiones técnicas y visuales (las tomo yo y las anoto)

- **Un servicio de evaluación** (`src/services/evaluacion.service.js`) con funciones puras: recibe la referencia y una corrida y devuelve las métricas. Lo usan dos cosas:
  - el comando `npm run evaluar`, que guarda `data/resultados/evaluacion.json` (el "script" de la sección G de los requerimientos);
  - la dirección `GET /api/evaluacion`, que la pantalla usa.
- **Se evalúan solo las corridas del modelo real** (Mistral y MiniMax). La corrida simulada no se mide, porque sus palabras clave se escribieron conociendo los 60 textos.
- **"Persona mayor (60+)" no se mide**: no la decide la IA, la calcula el programa con la edad.
- Los números se calculan siempre desde los archivos de las corridas. **Nunca se copian los números de `evaluacion.png`**, que son inventados.
- **Pantalla:** se activa la pestaña "Evaluación" (deja de decir "Próximamente"). Diseño de `docs/diseno/evaluacion.png`, con la misma paleta:
  - arriba, el aviso de la pregunta 3;
  - tarjetas por modelo con las alertas críticas no detectadas en grande;
  - después, las tablas de detalle, prioridad, profesional, confiabilidad y tiempo, los hallazgos R3 y "Modelos considerados".
- La bandeja sigue igual. La pestaña "Evaluación" es otra página (`/evaluacion.html`) servida por el mismo programa.
- Si falta el archivo de una corrida, la pantalla lo dice ("No se encontró la corrida de …") en vez de mostrar ceros.
- Pruebas: casos pequeños hechos a mano para cada métrica (incluidos nulos, no clasificadas y alertas duplicadas), una prueba con los archivos reales que revisa los totales, y pruebas de la API con Supertest.

## Criterios de aceptación

- [ ] `npm run evaluar` calcula las métricas de Mistral y MiniMax y guarda `data/resultados/evaluacion.json`.
- [ ] Una solicitud crítica sin clasificar cuenta como alerta crítica no detectada.
- [ ] Las no clasificadas se separan en error del proveedor y respuesta inválida del modelo.
- [ ] Se muestran, por modelo, los casos que necesitaron reintento y el tiempo promedio.
- [ ] La pestaña "Evaluación" muestra las métricas de los dos modelos, los hallazgos R3, la tabla "Modelos considerados" y el aviso de que la referencia es nuestra.
- [ ] Ningún número está escrito a mano en la pantalla: todos salen de las corridas.
- [ ] Sin veredicto de "aprobado" ni de "ganador".
- [ ] `npm test` y `npm run lint` pasan. Sin `console.log`.
- [ ] Probado en el navegador.
- [ ] `TASKS.md` actualizado y rama unida a `main` por Pull Request.

## Archivos modificados/creados

(se completa al implementar)

## Cómo probarlo

(se completa al implementar)

## Notas de cierre

(se completa al mover a /done; incluir si se usó Claude Code y para qué)
