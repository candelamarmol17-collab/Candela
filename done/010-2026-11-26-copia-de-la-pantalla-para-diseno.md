# [010] Copia de la pantalla para revisar el diseño

**Estado**: done
**Fecha creación**: 2026-11-26
**Rama asociada**: `feat/010-exportar-diseno` (sale de la rama de la 006, porque copia su pantalla)

## Objetivo

Tener un comando que genere una copia de la pantalla de la bandeja en **un solo archivo**, para mandársela al amigo de Candela que la ayuda con el diseño. Tiene que abrirse con doble clic, sin servidor y sin internet, y funcionar igual que la pantalla real.

Cuando el amigo devuelva su archivo con cambios, esos cambios de estilo se pasan al código real (`public/estilos.css` y, si hace falta, `public/index.html`).

## Preguntas y respuestas

Candela pidió la tarea con todo el detalle el 2026-11-26, así que no hubo preguntas. Su pedido cuenta como la aprobación (regla hasta la tarea 009: lo técnico lo decido yo y lo anoto).

Lo que pidió:
- Un solo archivo HTML con todo adentro: CSS, JavaScript, la fuente, el logo y los datos de la bandeja (las 59 solicitudes sintéticas con la corrida de MiniMax).
- Que funcione igual: filtros, panel de detalle, confirmar, corregir, simular ingreso y reiniciar.
- Que **no** incluya la clave de la IA, el `.env` ni nada del servidor.
- Que se guarde fuera del repositorio, en `C:\Users\usuario\Desktop\Pulso-para-diseno\pulso-diseno.html`, para que no se suba a GitHub.
- Que se genere con un comando (`npm.cmd run exportar:diseno`), para volver a hacerlo cuando cambie la pantalla.

## Decisiones que tomé

- **esbuild** junta el código del navegador (la pantalla, la demo y Zod) en un solo bloque. Es una dependencia nueva, solo para desarrollo. Ver la decisión 009.
- La copia trae una **API de reemplazo** que usa la misma demo del programa real. Una prueba compara sus respuestas con las del servidor, una por una.
- La regla de "Persona mayor (60+)" pasó a su propio archivo, para no meter en la copia el código que se conecta con la IA.
- **Revisión de la clave:** antes de guardar, el script busca en el archivo final la clave del `.env` y el nombre `IA_API_KEY`. Si aparecieran, no guarda nada. Nunca muestra la clave.
- El script **se niega a guardar dentro del repositorio** y sobrescribe la copia anterior (así se puede generar de nuevo).
- El código va legible, no comprimido: pesa unos 990 KB.
- Recargar la página vuelve la demo al inicio, porque no hay servidor que guarde el estado.

## Criterios de aceptación

- [x] `npm.cmd run exportar:diseno` genera `C:\Users\usuario\Desktop\Pulso-para-diseno\pulso-diseno.html`.
- [x] Un solo archivo: no pide ningún otro archivo ni nada de internet.
- [x] Funcionan la pantalla de carga, las tarjetas, los filtros, el panel, confirmar, deshacer, corregir, simular ingreso y reiniciar.
- [x] No lleva la clave, el `.env` ni el servidor (revisado por el script y por las pruebas).
- [x] `npm test` (395 pruebas) y `npm run lint` pasan.
- [x] `TASKS.md` actualizado. La rama se une a `main` con el Pull Request de esta tarea.

## Archivos modificados/creados

- `scripts/exportar-diseno.js`: el comando.
- `scripts/diseno/api-en-navegador.js`, `scripts/diseno/instalar-api.js` y `scripts/diseno/entrada-navegador.js`: lo que corre dentro de la copia.
- `src/services/regla-persona-mayor.js` (nuevo), `src/services/clasificacion.service.js` y `src/services/demo-bandeja.service.js`: la regla de persona mayor en su propio archivo.
- Pruebas: `tests/scripts/exportar-diseno.test.js` y `tests/scripts/diseno/api-en-navegador.test.js`.
- `package.json` (comando `exportar:diseno` y `esbuild`), `eslint.config.js`, `README.md`.
- `docs/decisiones/009-copia-de-la-pantalla-para-diseno.md`.

## Cómo probarlo

1. En la terminal de VS Code: `npm.cmd run exportar:diseno`.
2. Abrir la carpeta `C:\Users\usuario\Desktop\Pulso-para-diseno` y hacer doble clic en `pulso-diseno.html`.
3. Probar las tarjetas, abrir una solicitud, confirmarla, deshacer, corregir otra, simular el ingreso y reiniciar.

**Cómo se probó:** el navegador integrado de Claude no puede abrir archivos fuera del proyecto. Por eso el archivo se abrió con un servidor de prueba que entregaba solo ese archivo y nada más, y todo funcionó sin pedir ningún otro archivo. La prueba con doble clic de verdad la hace Candela.

## Notas de cierre

**Cerrada el 2026-11-26.**

**Qué quedó hecho:** el comando que genera la copia de la pantalla en un solo archivo, sin servidor, sin internet y sin la clave.

**Para cuando vuelva el archivo del amigo:** Candela lo pasa, y los cambios de estilo se llevan al código real. El CSS está en el bloque `<style>` del principio del archivo, igual que `public/estilos.css`, así que las diferencias se pueden comparar directamente.

**Uso de IA en esta tarea:** se usó Claude Code (asistente de programación con IA) para escribir el script, la API de reemplazo, las pruebas y esta documentación, y para probar la copia en un navegador. Candela definió qué debía tener la copia y dónde guardarla. Solo se usaron datos sintéticos (inventados).
