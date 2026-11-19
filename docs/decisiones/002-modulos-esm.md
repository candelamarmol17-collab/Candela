# 002 · Módulos ESM (`import`) y no CommonJS (`require`)

**Fecha**: 2026-11-19 · **Tarea**: 001

## Qué se decidió

Los archivos del proyecto se conectan entre sí con la forma moderna de JavaScript, `import` / `export` (llamada ESM). En `package.json` esto se indica con `"type": "module"`.

## Por qué

- Es el estándar actual del lenguaje y la forma que usan la mayoría de las librerías nuevas.
- Node 26 la soporta por completo.

## Alternativas descartadas

- **CommonJS (`require`)**: es la forma antigua de Node. Funciona, pero se está dejando de usar.

## Consecuencia a tener en cuenta

Jest todavía trata ESM como función experimental. Por eso, el comando `npm test` ejecuta Jest con la opción `--experimental-vm-modules`. Puede aparecer un aviso de "ExperimentalWarning" al correr las pruebas: es normal y no es un error.
