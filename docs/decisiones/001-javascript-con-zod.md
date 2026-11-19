# 001 · JavaScript con Zod (y no TypeScript)

**Fecha**: 2026-11-19 · **Tarea**: 001

## Qué se decidió

El proyecto se escribe en JavaScript. Para revisar que los datos tengan el formato correcto se usa Zod (una librería que revisa los datos contra un esquema, o "molde").

## Por qué

- `docs/requerimientos.md` ya pide Zod para validar la respuesta de la IA.
- JavaScript no necesita un paso de traducción antes de ejecutarse, así que el proyecto queda más simple. Eso ayuda con un plazo corto.
- Zod revisa los datos mientras el programa se ejecuta, que es justo lo que importa con datos que vienen de afuera (el archivo exportado y la IA).

## Alternativas descartadas

- **TypeScript**: revisa los tipos antes de ejecutar, pero agrega configuración y un paso de compilación (traducción a JavaScript). Además, igual habría que validar los datos de afuera con algo como Zod.
- **Joi**: cumple lo mismo que Zod, pero el requerimiento ya nombra a Zod.

## Nota

Zod se instala en la tarea 2 (esquemas), que es la primera que lo usa.
