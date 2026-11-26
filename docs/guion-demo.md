# Guion de la demo para el video (máximo 4:40)

**Para qué:** el video de la primera etapa debe mostrar el diseño de la solución y cómo se usa, la arquitectura técnica básica, los modelos de IA considerados y cómo se evalúa la calidad. Este guion los recorre en ese orden, con la pantalla de Pulso.

**Frase acordada sobre los criterios** (decirla tal cual): "Los criterios se construyeron con el equipo del centro y su validación clínica formal es parte del piloto."
No decir "validado" ni "validado clínicamente" en ninguna parte del video.

## Antes de grabar

1. En la terminal: `Ctrl + C` y luego `npm.cmd run iniciar`.
2. Abrir http://localhost:3000, recargar con `Ctrl + F5` y dejar el zoom del navegador en 100 %.
3. Si la bandeja no está vacía, presionar "Reiniciar demo": debe verse la bienvenida "Hola, equipo."

## Guion

| Tiempo | Pantalla | Qué hacer | Qué decir (idea) |
|---|---|---|---|
| 0:00–0:25 | Bienvenida | Mostrar la bienvenida sin tocar nada. | En Telesalud llegan muchas solicitudes por escrito, y a veces lo urgente viene escondido en un "Otros". Pulso ayuda a encontrarlo: la IA sugiere y el equipo clínico decide. |
| 0:25–0:55 | Ventana y pantalla de carga | "Cargar exportación de Telesalud" → se ve la "Exportación de demostración 1 · 59 solicitudes" → "Cargar". Dejar correr el anillo. | Pulso no toca Telesalud: lee el archivo exportado. Antes de la IA, separa los datos personales con código, y esos datos se quedan en el centro. Esta demo usa solo datos ficticios. |
| 0:55–1:40 | Bandeja | Mostrar los grupos de arriba. Hacer clic en la tarjeta "Con alerta crítica". Abrir SINT-0001 (pidió Medicina · Otros: dolor de pecho que se va al brazo). | La bandeja pone primero lo urgente. Esta solicitud venía como "Otros", pero el texto describe una urgencia: la IA la sube y explica por qué. Abajo dice qué recibió la IA: sin nombre, RUT, contacto ni dirección. |
| 1:40–2:15 | Panel de detalle | Confirmar SINT-0001 (tecla C). Abrir otra y corregirla (por ejemplo, cambiar la prioridad, con motivo) y ver cómo cambia de lugar. | Es una sugerencia: el triajista confirma o corrige, y la corrección manda. La IA no da indicaciones clínicas. |
| 2:15–2:35 | Nueva exportación | "Cargar nueva exportación" → "Cargar" (trae 2 solicitudes: SINT-0009 y SINT-0061). SINT-0009 entra al grupo de urgencia, resaltada. SINT-0061 queda donde la puso la sugerencia de MiniMax (ver la tarea 015). | Cuando llega una nueva exportación, lo urgente aparece arriba sin que nadie tenga que buscarlo. |
| 2:35–3:25 | Cómo funciona | Abrir la pestaña. Recorrer los 7 pasos, la nota de qué viaja a la IA, la tabla de modelos y las tarjetas de IA responsable. | Arquitectura: exportación, separación de datos personales en el centro, IA, validación, bandeja, decisión del triajista y evaluación. El proveedor de IA se puede cambiar y hay un modo simulado. Ningún modelo está elegido: probamos Mistral y MiniMax; OpenAI, Claude, Gemini y Grok están por evaluar. **Frase acordada sobre los criterios.** |
| 3:25–4:25 | Evaluación | Abrir la pestaña. Mostrar las dos tarjetas, el gráfico de alertas críticas, la tabla de diferencias y el hallazgo R3 de SINT-0016. | Medimos sobre todo las alertas críticas que no se detectan, porque es el error más grave. En 60 casos sintéticos: Mistral no detectó 3 de 21, y las 3 fueron porque el proveedor no respondió; MiniMax detectó las 21, aunque en 2 casos marcó otra alerta crítica y no la urgencia. En la revisión manual, MiniMax escribió "en la cara" cuando el texto decía "en la guata": por eso el triajista siempre lee el texto original. La referencia la definió el equipo del proyecto, no triajistas: esto muestra el método, no la calidad clínica real. |
| 4:25–4:40 | Bandeja | Volver a la pestaña "Bandeja". | En el piloto mediremos el tiempo hasta la primera revisión y el cumplimiento de plazos. La IA sugiere, el equipo clínico decide. |

## Cuidados al grabar

- Las cifras de la evaluación se leen de la pantalla. Si cambian las corridas, se cambia el guion.
- No decir que algún modelo es "el mejor" ni que "ganó": son 60 casos sintéticos con una referencia del equipo.
- Si algo falla, "Reiniciar demo" vuelve al principio sin apagar el programa.
