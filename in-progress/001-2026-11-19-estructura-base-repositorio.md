# [001] Estructura base del repositorio

**Estado**: in-progress
**Fecha creación**: 2026-11-19
**Rama asociada**: `chore/001-estructura-base`

## Objetivo

Dejar el proyecto ordenado y listo para empezar a programar. Esto significa crear las carpetas de trabajo, los archivos de configuración básicos, el primer README y preparar el proyecto Node.js (el programa que va a ejecutar el código) con su herramienta de pruebas. Esta tarea no construye ninguna función del MVP todavía.

## Preguntas y respuestas

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Nombre de la rama? | `chore/001-estructura-base` ("chore" = tarea de preparación, no una función nueva). |
| 2 | ¿Los cambios pendientes en `CLAUDE.md` y `docs/requerimientos.md` se guardan en esta rama? | Sí, en un commit aparte (ya hecho). |
| 3 | ¿Cómo se junta la rama con `main`? | Con un Pull Request (una solicitud de revisión) en GitHub. |
| 4 | ¿Se usan archivos `.gitkeep` para guardar las carpetas vacías? | Sí. |
| 5 | ¿Esta tarea prepara el proyecto Node.js (`package.json`, Jest)? | Sí. |
| 6 | ¿Lenguaje, versión de Node, gestor de paquetes y forma de importar? | JavaScript + Zod. La versión de Node que está instalada: **Node 26** (v26.13.1). npm (v11.20.0). Forma moderna de importar (`import`, llamada ESM). |
| 7 | ¿Se crean ya las carpetas por capas? | Sí, vacías: `src/controllers`, `src/services`, `src/repositories` y `tests/`. |
| 8 | ¿Se agregan ESLint y Prettier (herramientas que revisan y ordenan el estilo del código)? | Sí, con configuración básica. |
| 9 | ¿Qué variables lleva `.env.example`? | Solo `MODO_IA=simulado` y `PUERTO=3000`. Las del proveedor de IA se agregan en la tarea 4. |
| 10 | ¿Licencia? | Queda fuera de esta tarea. Se anota como pendiente en el README (depende de la UAI). |
| 11 | ¿Qué dice el primer README? | Para qué sirve el MVP, aviso de que solo usa datos sintéticos (inventados), cómo instalarlo y la licencia como pendiente. |
| 12 | ¿Qué prueba basta para cerrar? | Una prueba mínima que confirme que Jest funciona. |
| 13 | ¿Cómo se documentan las decisiones técnicas? | Un archivo corto por decisión en `/docs/decisiones`. |

## Plan técnico

**Carpetas que se crean** (cada una con `.gitkeep` si queda vacía):

```
/backlog
/in-progress
/done
/docs/decisiones
/src/controllers
/src/services
/src/repositories
/tests
```

**Archivos que se crean**:

- `TASKS.md`: índice de tareas.
- `.gitignore`: lista de archivos que git no debe subir (`node_modules/`, `.env`, registros, etc.).
- `.env.example`: plantilla de configuración sin secretos (`MODO_IA=simulado`, `PUERTO=3000`).
- `README.md`: presentación del proyecto.
- `package.json`: ficha del proyecto Node.js, con `"type": "module"` (ESM), versión de Node `>=26` y comandos `test`, `lint` y `format`.
- Configuración de Jest con soporte para ESM.
- `eslint.config.js` y `.prettierrc`: configuración básica de estilo.
- `tests/configuracion.test.js`: prueba mínima de que Jest funciona.
- `docs/decisiones/001-javascript-con-zod.md`
- `docs/decisiones/002-modulos-esm.md`
- `docs/decisiones/003-eslint-y-prettier.md`

**Dependencias de desarrollo** (solo se usan al programar, no en la app): `jest`, `eslint`, `@eslint/js`, `globals`, `prettier`.

No se instala Zod todavía: se agrega en la tarea 2, que es la que lo usa.

## Criterios de aceptación

- [ ] Existen todas las carpetas del plan y quedan guardadas en git.
- [ ] `.env` está en `.gitignore` y `.env.example` no tiene secretos.
- [ ] `npm install` funciona sin errores.
- [ ] `npm test` pasa.
- [ ] `npm run lint` no muestra errores.
- [ ] El README explica el proyecto, avisa que solo usa datos sintéticos y deja la licencia como pendiente.
- [ ] Las tres decisiones técnicas quedan escritas en `/docs/decisiones`.
- [ ] `TASKS.md` está actualizado.
- [ ] No hay `console.log` en el código.
- [ ] La rama se junta con `main` mediante Pull Request.

## Archivos modificados/creados

(se completa al implementar)

## Cómo probarlo

1. Descargar la rama y abrir una terminal en la carpeta del proyecto.
2. Ejecutar `npm install`.
3. Ejecutar `npm test`: debe decir que la prueba pasó.
4. Ejecutar `npm run lint`: no debe mostrar errores.

## Notas de cierre

(se completa al mover a /done; incluir si se usó Claude Code y para qué)
