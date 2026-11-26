# 007 — Etiqueta de los datos de la bandeja

**Fecha**: 2026-11-26 · **Tarea**: 005 · **Decidió**: Candela

## Qué se decidió

La bandeja lee una **corrida guardada** en `data/resultados/` (en el video, la de MiniMax) y siempre muestra una etiqueta que dice **las dos cosas juntas**:

1. si los resultados son **reales** (de un modelo de IA) o **simulados** (por reglas fijas);
2. que se **reproducen desde un archivo**: no se generan en vivo.

Ejemplo: "Resultados reales de MiniMax M3.1 Flash (corrida del 26 nov. 2026), reproducidos desde archivo".

## Por qué

- Así no parece que la IA responde en vivo, pero queda claro que no es una simulación.
- Cumple la regla de no hacer pasar por real algo simulado, ni por "en vivo" algo grabado.

## Alternativas descartadas

- **Mostrar solo "repetición"**: escondía que los resultados son de un modelo real.
- **Mostrar solo "modelo real"**: podía hacer creer que la IA estaba respondiendo en ese momento.

## Detalles

- Cada solicitud mantiene su `origen` (`modelo_real` o `simulado_reglas`). La etiqueta es de toda la bandeja.
- La fecha es la del día de la corrida en hora de Chile (`America/Santiago`), porque las corridas guardan la hora en UTC (hora internacional).
- El nombre "MiniMax M3.1 Flash" está en una lista de nombres para mostrar. Un modelo que no esté en esa lista se muestra con su identificador (por ejemplo `mistralai/mistral-large-4-1t-a52b`).
- Un archivo de una corrida en modo repetición no se acepta: hay que usar el archivo de la corrida original.
