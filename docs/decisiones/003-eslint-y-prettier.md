# 003 · ESLint y Prettier para revisar y ordenar el código

**Fecha**: 2026-11-19 · **Tarea**: 001

## Qué se decidió

- **ESLint** revisa el código y avisa de errores comunes y malas prácticas. Se usa su configuración recomendada, más una regla que **prohíbe `console.log`**, como exige `CLAUDE.md`.
- **Prettier** ordena el formato (espacios, comillas, saltos de línea) para que todo el código se vea igual.

Se ejecutan con `npm run lint` y `npm run format`.

## Por qué

- La regla de `console.log` queda revisada de forma automática, sin depender de que alguien se acuerde.
- Un formato uniforme hace que los cambios sean más fáciles de revisar.

## Alternativas descartadas

- **No usar herramientas**: obliga a revisar todo a mano y es fácil que se escapen errores.
- **Biome** (una herramienta que hace las dos cosas a la vez): es más nueva y menos conocida. ESLint y Prettier son el estándar más común en Node.js.
