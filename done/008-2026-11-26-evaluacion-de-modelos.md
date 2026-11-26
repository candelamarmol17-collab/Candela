# [008] Script y pantalla de evaluación de los modelos

**Estado**: done
**Fecha creación**: 2026-11-26
**Rama asociada**: `feat/008-evaluacion-modelos` (salió de la 006; el 2026-11-26 se le unió la 012 para trabajar sobre la pantalla actual. Se trabaja en una copia aparte de la carpeta, `Candela-008`, para no cambiar la versión que Candela tiene encendida)

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
| 1 | ¿Cuándo una solicitud crítica cuenta como "detectada"? Ejemplo: la referencia dice urgencia + violencia y el modelo marca solo violencia. | **Número principal por solicitud:** cuenta como detectada si el modelo marcó **al menos una** alerta crítica, porque así la solicitud sube a los grupos de arriba en la bandeja. **Debajo, el detalle por alerta**, donde sí se ve que faltó la urgencia (en el ejemplo, la solicitud queda en "otra alerta crítica" y no en "urgencia"). | **De acuerdo.** Debajo va el detalle por alerta, incluida la urgencia que faltó. |
| 2 | Tabla "Modelos considerados": ¿qué dicen las celdas de Mistral y MiniMax? | Desempeño en español: "Ver métricas de esta pantalla (60 casos sintéticos)". Privacidad y retención: **"Por evaluar"** (no revisamos las condiciones de NVIDIA para datos reales; solo usamos datos sintéticos). Costo: "Catálogo de prueba gratuito de NVIDIA; el piloto necesita un servicio pagado con disponibilidad garantizada". Alojamiento: "Servidores de NVIDIA, vía API". OpenAI, Claude, Gemini y Grok: **todas sus celdas "Por evaluar"**. | **De acuerdo**, con cambios: para Mistral y MiniMax se agrega lo medido (clasificadas de 60, alertas críticas no detectadas, casos que necesitaron reintento y tiempo promedio). Privacidad y retención: "Por evaluar". Costo: "Catálogo de prueba gratuito; el piloto necesita un servicio pagado". OpenAI, Claude, Gemini y Grok: todo "Por evaluar". |
| 3 | Texto del aviso fijo de la pantalla | "La clasificación de referencia la definimos nosotras, no los triajistas, con criterios provisionales y no clínicos. Estos números muestran el método para medir a la IA, no su calidad real. Los textos sintéticos también los escribió una IA, así que con textos reales los resultados podrían ser peores." | **Corto y discreto:** "Casos redactados con apoyo de IA y revisados por el equipo. La clasificación de referencia la definió el equipo del proyecto, no triajistas: estos resultados muestran el método de evaluación, no la calidad clínica real." Además, mostrar los hallazgos R3 como ejemplo de por qué el triajista siempre lee el texto original (por ejemplo, MiniMax en SINT-0016: "en la cara" en vez de "en la guata"). |

## Cambios pedidos el 2026-11-26 (diseño B)

Candela, como responsable de UX/UI, pidió el estilo de tablero analítico de `docs/diseno/ref-evaluacion-dashboard.png`:
- arriba, dos tarjetas grandes lado a lado (Mistral Large 4 y MiniMax M3.1 Flash) con alertas críticas no detectadas, clasificadas de 60, concordancia de prioridad y tiempo promedio;
- **nunca** "Winner", "ganador" ni nada que declare un modelo como mejor;
- gráficos de barras horizontales: detección por alerta crítica y concordancia por nivel de prioridad. **Mistral en azul petróleo y MiniMax en gris pizarra** (respuesta de Candela; ninguno en rojo);
- se mantienen la matriz de prioridad, la tabla de diferencias, los hallazgos R3, "Modelos considerados" y el aviso;
- **niveles de la tabla de diferencias aprobados por Candela**: Crítico (alerta crítica no detectada), Moderado (otra prioridad) y Menor (falsa alerta).

## Decisiones técnicas y visuales (las tomo yo y las anoto)

Lo principal quedó en la decisión 012 (`docs/decisiones/012-evaluacion-de-los-modelos.md`). Lo que cambió respecto del plan de abajo:
- La pestaña "Evaluación" **no es otra página**: va en la misma página que la bandeja (`#evaluacion`), para que también funcione en la copia de diseño de un solo archivo.
- Una solicitud que ya es "Crítico" no se repite como "Moderado" en la tabla de diferencias (las tres de Mistral quedaron sin clasificar y también tienen otra prioridad).
- Los gráficos se hacen con HTML y CSS, sin librerías. Cada barra lleva su número escrito ("14 de 16 (87,5 %)"), así se entiende también sin colores.
- Las utilidades de la pantalla que comparten la bandeja y la evaluación pasaron a `public/dom.js`.

Plan original:

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

- [x] `npm run evaluar` calcula las métricas de Mistral y MiniMax y guarda `data/resultados/evaluacion.json`.
- [x] Una solicitud crítica sin clasificar cuenta como alerta crítica no detectada.
- [x] Las no clasificadas se separan en error del proveedor y respuesta inválida del modelo.
- [x] Se muestran, por modelo, los casos que necesitaron reintento y el tiempo promedio.
- [x] La pestaña "Evaluación" muestra las métricas de los dos modelos, los hallazgos R3, la tabla "Modelos considerados" y el aviso de que la referencia es nuestra.
- [x] Ningún número está escrito a mano en la pantalla: todos salen de las corridas.
- [x] Sin veredicto de "aprobado" ni de "ganador".
- [x] `npm test` y `npm run lint` pasan. Sin `console.log`.
- [x] Probado en el navegador.
- [x] `TASKS.md` actualizado. La rama la une Candela con el Pull Request.

## Archivos modificados/creados

- Nuevos: `src/services/evaluacion.service.js` (métricas), `src/repositories/evaluacion.repository.js` (lee referencia, corridas y revisión R3), `src/controllers/evaluacion.controller.js`, `src/routes/evaluacion.routes.js`, `scripts/evaluar.js`, `data/resultados/evaluacion.json`, `public/evaluacion.js` (pestaña), `public/dom.js` (utilidades compartidas), `docs/decisiones/012-evaluacion-de-los-modelos.md`.
- Cambiados: `src/app.js` y `src/server.js` (dirección /api/evaluacion), `src/utilidades/csv.js` (separador punto y coma), `public/index.html`, `public/app.js` y `public/estilos.css` (pestañas y tablero), `scripts/exportar-diseno.js`, `scripts/diseno/api-en-navegador.js` e `instalar-api.js` (la copia de diseño también trae la evaluación), `package.json`, `README.md`, `TASKS.md`.
- Pruebas: `tests/services/evaluacion.service.test.js`, `tests/repositories/evaluacion.repository.test.js`, `tests/api/evaluacion.api.test.js` y ampliadas las de la copia de diseño y del CSV.

## Cómo probarlo

1. Une la rama, apaga el programa (Ctrl + C) y vuelve a encenderlo: `npm.cmd run iniciar`.
2. Abre http://localhost:3000 y recarga con Ctrl + F5. Presiona la pestaña "Evaluación".
3. Arriba están las dos tarjetas. Más abajo, los gráficos, la matriz, las diferencias, el detalle por alerta, los hallazgos R3 y "Modelos considerados".
4. En la terminal: `npm.cmd run evaluar` muestra el resumen y guarda `data/resultados/evaluacion.json`.
5. Pruebas automáticas: `npm.cmd test` y `npm.cmd run lint`.

## Notas de cierre

La pestaña "Evaluación" muestra las métricas de Mistral Large 4 y MiniMax M3.1 Flash calculadas desde las corridas guardadas, sin veredicto. Resultado sobre los 60 casos sintéticos: Mistral no detectó 3 de 21 solicitudes críticas (las 3 quedaron sin clasificar por el proveedor); MiniMax, 0 de 21, aunque en 2 casos marcó otra alerta crítica y no la urgencia (se ve en el detalle por alerta). Probado en el navegador. 492 pruebas pasando.

Se usó Claude Code para programar, probar y documentar la tarea; los criterios de evaluación y los textos los decidió Candela.
