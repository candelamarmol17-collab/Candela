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

## Prueba de modelos (2026-11-25)

Se probó un solo caso sintético (renovar las pastillas de la presión, le quedan 5 días) con los modelos de chat que aparecían en la lista ese día.

**Lo que se aprendió:** casi todos los modelos actuales "piensan" antes de responder (escriben un razonamiento interno que no se muestra). Con el límite original de 500 tokens se quedaban sin espacio y la respuesta llegaba vacía. Con 4.000 tokens y 2 minutos de espera, tres respondieron un JSON válido, y los tres sugirieron prioridad media, Medicina y la alerta GES:

| Modelo | Tiempo | Resultado | Decisión |
|---|---|---|---|
| `mistralai/mistral-large-4-1t-a52b` | 32 a 81 s | Justificación con las palabras de la persona ("la presión"). | **Modelo principal.** |
| `minimaxai/minimax-m3.1-flash` | 13 a 89 s | Justificación con las palabras de la persona. | **Respaldo y comparación**: se corren los mismos 60 casos con los dos. |
| `nvidia/nemotron-3-ultra-550b-a55b` | 16 a 80 s | Cambió "presión" por "hipertensión": le puso nombre de diagnóstico a algo que la persona no dijo, lo que **choca con la regla R3**. | Tercera opción. |

No sirvieron: `google/gemma-3-12b-it` (respondió "no encontrado" para la cuenta), `z-ai/glm-5.3-flash` (no respondió en 2 minutos) y `nvidia/nemotron-3.5-lightning-30b-a3b` (siguió pensando sin responder, incluso con 4.000 tokens).

**Límites de esta prueba:** fue un solo caso. La documentación no dice nada sobre la calidad en español. La corrida de los 60 casos y la revisión R3 son las que lo muestran.

## Corrida de los 60 casos y modelo del video (2026-11-26)

| | Mistral | MiniMax |
|---|---|---|
| Clasificadas | 56 de 60 | 60 de 60 |
| Fallaron en la primera pasada | 14, por tiempo agotado | 7: 5 con HTTP 503 y 2 con HTTP 429 |
| Siguen sin clasificar tras un reintento | 4, por tiempo agotado: SINT-0016, 0017, 0021 (con alerta crítica) y 0030 | 0 |
| Tiempo promedio por solicitud | 154 s | 57 s |

Ningún caso fue bloqueado por su contenido. La revisión R3 de Candela encontró problemas en las justificaciones de los dos modelos (ver la tarea 004 y la columna `comentario_revision` de los CSV). El más importante: MiniMax **inventó un dato** en SINT-0016.

**Decisión de Candela:**
- La bandeja del video usa la **corrida de MiniMax en modo repetición**, porque tiene 60 de 60 clasificadas y ninguna alerta crítica sin clasificar.
- La pantalla de evaluación (tarea 008) compara los dos modelos.
- Los criterios y el prompt quedan **congelados**: los hallazgos no cambian el prompt ni las clasificaciones guardadas.

**Hallazgo de confiabilidad:** el catálogo gratuito de NVIDIA sirve para el prototipo, pero falló de dos maneras: tiempo agotado con Mistral, y servicio no disponible o "demasiadas consultas" con MiniMax. Un piloto necesita un servicio con disponibilidad garantizada.

## Detalles

- Temperatura 0 (para que repita las mismas respuestas).
- El límite de respuesta se configura en el `.env` (`IA_MAX_TOKENS`, 4000 por defecto) y no queda fijo en el código. Era 500 y se subió por la prueba de modelos. Si el modelo agota el límite pensando, el error lo dice y sugiere subirlo.
- Tiempo de espera de 2 minutos por respuesta (`IA_TIEMPO_ESPERA_MS=120000`). Era 30 segundos.
- Un solo reintento, después de 10 segundos, ante un error 429, un error 500 o más, o si se agota el tiempo de espera. Ante una clave rechazada (401 o 403) no se reintenta.
- La clave nunca aparece en pantalla, en mensajes de error ni en los resultados.
