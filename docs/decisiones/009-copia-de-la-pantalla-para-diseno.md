# 009 — Copia de la pantalla en un solo archivo, para revisar el diseño

**Fecha**: 2026-11-26 · **Tarea**: 010 · **Pidió**: Candela (la parte técnica la decidí yo, según su regla hasta la tarea 009)

## Qué se decidió

- El comando `npm run exportar:diseno` genera **un solo archivo HTML** con la pantalla de la bandeja, que funciona con doble clic, sin servidor y sin internet.
- Para juntar todo el código del navegador en un solo bloque se usa **esbuild** (solo para desarrollo; no lo usa el programa).
- En vez del servidor, la copia trae una **API de reemplazo** (`scripts/diseno/api-en-navegador.js`) que responde las mismas direcciones con la **misma demo** del programa real (`demo-bandeja.service.js`). Así confirmar, corregir, deshacer, simular ingreso y reiniciar se comportan igual.
- El archivo se guarda **fuera del repositorio** (por defecto, `../Pulso-para-diseno/pulso-diseno.html`). El script se niega a guardarlo dentro, para que no se suba a GitHub.

## Por qué

- El amigo de Candela que ayuda con el diseño puede abrirlo sin instalar nada.
- Reusar la demo real evita tener dos versiones de la lógica que podrían comportarse distinto. Una prueba compara la API de reemplazo con el servidor real, respuesta por respuesta.
- La regla de "persona mayor (60+)" se pasó a su propio archivo (`regla-persona-mayor.js`), para que la copia no tenga que incluir el código que se conecta con la IA.

## Qué NO lleva la copia

- Ni la clave de la IA ni el `.env`: el script revisa el archivo final y, si encontrara la clave, no guarda nada (sin mostrarla).
- Nada del servidor: ni Express, ni la configuración, ni los adaptadores de IA.
- Solo datos sintéticos: las 60 solicitudes y la corrida guardada de MiniMax.

## Diferencias con el programa real

- Recargar la página vuelve la demo al inicio (en el programa real, las acciones duran mientras el programa está encendido).
- El código del navegador va junto en un bloque largo. Para cambios de estilo basta el bloque `<style>` del principio.

## Alternativas descartadas

- **Copiar la lógica a mano en el navegador**: dos versiones que se pueden desordenar.
- **Mandar el repositorio completo**: hay que instalar Node y encender el programa, y corre el riesgo de incluir el `.env`.
- **Servirla en internet**: depende de un servicio externo y la pantalla queda pública.
