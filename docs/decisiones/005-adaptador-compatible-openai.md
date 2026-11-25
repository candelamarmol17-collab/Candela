# 005 · Un adaptador "compatible con OpenAI", con el fetch nativo de Node

**Fecha**: 2026-11-25 · **Tarea**: 004

## Qué se decidió

- El MVP habla con la IA mediante **un solo adaptador genérico** que usa el formato de la API de OpenAI (`POST <URL base>/chat/completions`). Se configura solo con tres variables del `.env`: `IA_URL_BASE`, `IA_API_KEY` e `IA_MODELO`.
- El proveedor inicial es el catálogo de NVIDIA (build.nvidia.com), con la URL base `https://integrate.api.nvidia.com/v1`, verificada en la documentación oficial de NVIDIA el 2026-11-25.
- Se usa el `fetch` que ya trae Node 26 y `process.loadEnvFile` para leer el `.env`. **No se agregan dependencias.**
- El JSON se pide en el prompt y se valida con el esquema de salida (tarea 002). No se usa un "modo JSON" del proveedor, porque la documentación de NVIDIA no lo menciona para `meta/llama-3.3-70b-instruct`.

## Por qué

- **Regla R4**: el proveedor tiene que poder cambiarse. Muchos proveedores (NVIDIA, OpenAI y otros) aceptan este mismo formato, así que cambiar es solo editar el `.env`.
- La decisión final de modelo e infraestructura es de la UAI. Un adaptador genérico no amarra el proyecto a nadie.
- Sin dependencias nuevas hay menos piezas que pueden fallar antes de grabar la demo.

## Alternativas descartadas

- **La librería oficial de OpenAI (`openai`)**: funciona con NVIDIA, pero agrega una dependencia para algo que `fetch` hace en pocas líneas.
- **Un adaptador distinto por proveedor**: más código, y por ahora no hace falta.
- **El "modo JSON" del proveedor**: no está documentado para el modelo elegido, y cada proveedor lo pide de forma distinta.

## Los modelos del catálogo pueden retirarse

- El 2026-11-25, al probar la clave, NVIDIA respondió **HTTP 410** (que significa "ya no existe"): el modelo `meta/llama-3.3-70b-instruct` fue retirado del catálogo el 26 de agosto de 2026. Lo habíamos elegido ese mismo día a partir de la documentación, que todavía lo mostraba.
- Por eso **el modelo se configura en el `.env` (`IA_MODELO`) y no en el código**. Si un modelo se retira, basta con cambiar esa línea, sin tocar el programa.
- Para ver qué modelos ofrece el proveedor ese día está el comando `npm run ia:modelos`. Consulta `GET <URL base>/models` y avisa si el modelo del `.env` ya no aparece en la lista. Antes de grabar la demo conviene correrlo de nuevo.

## Detalles

- Temperatura 0 (para que repita las mismas respuestas) y máximo 500 tokens de respuesta.
- Un solo reintento, después de 10 segundos, ante un error 429, un error 500 o más, o si se agota el tiempo de espera. Ante una clave rechazada (401 o 403) no se reintenta.
- La clave nunca aparece en pantalla, en mensajes de error ni en los resultados.
