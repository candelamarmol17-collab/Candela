# 012 — Cómo se evalúan los modelos y cómo se muestra

**Fecha**: 2026-11-26 · **Tarea**: 008 · **Decidió**: Candela (los criterios y los textos) y yo (cómo se hace en el código)

## Qué se decidió

- **La métrica principal se cuenta por solicitud**: una solicitud con alerta crítica en la referencia cuenta como detectada si el modelo marcó **al menos una** alerta crítica, porque así sube a los grupos de arriba en la bandeja. Una solicitud crítica que quedó **sin clasificar cuenta como no detectada**. Debajo va el detalle por alerta, donde se ve la urgencia que faltó aunque se haya marcado otra alerta crítica.
- **"Persona mayor (60+)" no se mide**: no la decide la IA, la calcula el programa con la edad.
- **Se evalúan solo las corridas del modelo real** (Mistral y MiniMax). La simulada no, porque sus palabras clave se escribieron conociendo los 60 textos.
- **Diferencias con la referencia en tres niveles**, según el orden de importancia de la sección 6 de los requerimientos: **Crítico** (alerta crítica no detectada), **Moderado** (otra prioridad o sin respuesta) y **Menor** (falsa alerta). Una solicitud que ya es "Crítico" no se repite como "Moderado".
- **Un solo servicio** (`src/services/evaluacion.service.js`) con funciones puras. Lo usan el comando `npm run evaluar`, la dirección `GET /api/evaluacion` y la copia de diseño. El programa calcula la evaluación al encenderse; si falla, la bandeja sigue funcionando y la pestaña dice por qué.
- **La pestaña "Evaluación" va en la misma página** que la bandeja (`#evaluacion`), para que también funcione en la copia de diseño de un solo archivo.
- **Diseño de tablero**: una tarjeta grande por modelo, gráficos de barras horizontales hechos con HTML y CSS (sin librerías), la matriz de prioridad, la tabla de diferencias, el detalle por alerta, los hallazgos R3 y la tabla "Modelos considerados". Mistral en azul petróleo y MiniMax en gris pizarra; el rojo queda solo para lo crítico.
- **Sin veredicto**: nunca dice "ganador", "aprobado" ni que un modelo sea mejor. Una prueba lo revisa.

## Por qué

- Una alerta crítica que no se ve es el error más grave: por eso va primero y en grande.
- Calcular todo desde las corridas evita escribir números a mano (los de `docs/diseno/evaluacion.png` eran inventados).
- Los gráficos sin librerías no agregan dependencias y funcionan sin internet.

## Alternativas descartadas

- **Contar la detección por alerta como número principal**: castiga igual que una omisión total un caso que igual sube a los grupos críticos.
- **Una página aparte (`/evaluacion.html`)**: no funcionaría en la copia de diseño, que es un solo archivo.
- **Una librería de gráficos**: más peso y dependencia externa para dos gráficos simples.
