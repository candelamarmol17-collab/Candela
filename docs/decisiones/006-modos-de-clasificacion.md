# 006 · Tres modos de clasificación, siempre visibles

**Fecha**: 2026-11-25 · **Tarea**: 004

## Qué se decidió

El MVP clasifica de una de tres formas. Cada resultado guarda su `origen`, para que nunca parezca real algo que es simulado:

| Modo | `origen` | Cuándo se usa |
|---|---|---|
| Modelo real | `modelo_real` | Hay una clave en `IA_API_KEY` y `MODO_IA` está vacío. |
| Simulado por reglas | `simulado_reglas` | **Es el predeterminado.** No hay clave, o `MODO_IA=simulado`. |
| Repetición | `repeticion` | `MODO_IA=repeticion` e `IA_ARCHIVO_REPETICION` apunta a una corrida real guardada. |

- **El simulado** busca palabras clave en el texto. Su justificación siempre empieza con "SIMULADO por reglas fijas (no es un modelo de IA)". Nunca lee la clasificación de referencia.
- **La repetición** devuelve las respuestas de una corrida real guardada en `data/resultados/`, e informa el modelo y la fecha de esa corrida. Solo acepta corridas del modelo real.
- `MODO_IA=repeticion` no estaba en las preguntas de la tarea. Se agregó para poder elegir la repetición desde el `.env`, igual que los otros modos.

## Por qué

- **Regla R5**: la demo no puede depender de internet ni de créditos.
- Candela pidió que en el video quede claro de dónde viene cada clasificación.
- La repetición permite mostrar respuestas reales del modelo sin conexión, diciendo que son respuestas guardadas.

## Advertencia importante sobre el simulado

**Las palabras clave del simulado se escribieron conociendo los 60 textos sintéticos.** Por eso, sobre esos 60 casos coincide mucho con la referencia (54 de 60 en prioridad). **Ese número no significa nada**: con textos nuevos funcionaría mucho peor. La evaluación de la tarea 008 nunca debe presentar resultados del simulado como calidad de la IA.

## Alternativas descartadas

- **Que el simulado devuelva la clasificación de referencia**: la evaluación daría 100% y sería engañosa.
- **Activar el modelo real solo con `MODO_IA=real`**: Candela pidió que el modo real se active solo cuando hay una clave.
