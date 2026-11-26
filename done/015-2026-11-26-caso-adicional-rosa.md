# [015] Caso adicional SINT-0061 "Rosa" para la demo del video

**Estado**: done
**Fecha creación**: 2026-11-26
**Rama asociada**: `feat/015-caso-rosa` (parte de `feat/007-registro`)

## Objetivo

Agregar una solicitud sintética más, SINT-0061 ("Rosa", un nombre que solo usamos nosotras y que no aparece en pantalla), para que en el video se vea llegar en la segunda exportación. La IA la clasifica de verdad con MiniMax, una sola vez, y la bandeja muestra esa respuesta tal como llegó.

## Preguntas y respuestas

- **¿Qué fecha de ingreso?** Candela eligió 22 nov 2026 a las 11:58. Así queda en el **lugar 60 de 61 por orden de llegada**: justo después de SINT-0009 (11:57) y antes de SINT-0023 (11:59).
- **Datos de la solicitud** (los dio Candela): profesional "Medicina", motivo "Otros", edad 81 y el texto "Se me acabaron los remedios del corazón hace una semana. Ando con malestar y dolor de cabeza, y nadie me puede llevar al consultorio. Vivo sola." (144 caracteres; el máximo es 300).
- **Referencia** (la dio Candela): prioridad alta, profesional Medicina y alerta de descompensación. La alerta de **urgencia queda [PENDIENTE]**: se valida con la gestora de Telesalud, porque los criterios congelados piden señales de alarma vital. La alerta de persona mayor la calcula el código; en el archivo de referencia aparece igual que en los otros casos de 60 años o más.
- **¿En qué exportación?** En la "Exportación de demostración 2", junto a SINT-0009.
- **En pantalla** se ve como cualquier otra solicitud, sin etiquetas especiales.
- **No entra en la evaluación**: las métricas de la tarea 008 siguen siendo las de los 60 casos.

Decisiones que tomé yo:

- Rosa va en **archivos aparte**, para no tocar los 60 casos, la referencia ni las corridas guardadas: `data/sinteticos/casos-adicionales.json`, `data/sinteticos/referencia-casos-adicionales.json` y `data/resultados/clasificaciones-adicionales-minimaxai-minimax-m3.1-flash.json`.
- La bandeja suma el resultado de Rosa a la corrida de MiniMax **solo en memoria**, al encender el programa. Si se elige otra corrida (Mistral o la simulada), Rosa aparece "sin clasificar".
- En la exportación tiene identificadores claramente inventados, como el resto: "Vecina Demo 61", "DEMO-0061", "demo61@example.com", "+56 9 0000 0061", "Calle Ficticia 161".

## Qué respondió MiniMax M3.1 Flash (sin cambios a mano)

- **Primer intento**: el proveedor respondió con un error temporal (HTTP 503). Se reintentó con el mismo mecanismo que usaron los 60 casos; el archivo deja anotados el intento fallido y el reintento.
- **Segundo intento** (34 s):
  - **Prioridad**: media (la referencia dice alta).
  - **Profesional**: Medicina (igual que la referencia).
  - **Alertas**: solo persona mayor (60+). **No marcó descompensación**, que es una alerta crítica en la referencia.
  - **Justificación**: "Se le acabaron los remedios del corazón hace una semana y refiere malestar y dolor de cabeza. También menciona que vive sola y no tiene quien la lleve al consultorio."
  - **Confianza**: media.

**Dónde queda:**

- Por orden de llegada: **60 de 61**.
- En la bandeja ordenada por Pulso: **41 de 61**, la primera de prioridad media en el grupo "Sin alerta crítica". Lo que la deja ahí es que el modelo no marcó la descompensación.

Si se midiera contra su referencia, sería una **alerta crítica no detectada** (nivel "Crítico") y una prioridad distinta. No entra en las métricas porque así se acordó.

## Criterios de aceptación

- [x] SINT-0061 cumple los esquemas de solicitud y de referencia, sin cambiar los esquemas.
- [x] Los 60 casos, la referencia y las corridas guardadas no cambiaron (las pruebas revisan que sigan siendo 60).
- [x] La "Exportación de demostración 2" trae SINT-0009 y SINT-0061; la 1 no cambió.
- [x] La respuesta de MiniMax quedó guardada tal como llegó, para la repetición.
- [x] En pantalla se ve como cualquier otra solicitud.
- [x] Las métricas de la evaluación son idénticas a las de antes. Lo revisé: `npm run evaluar` da el mismo resultado salvo la fecha de cálculo, y SINT-0061 no aparece en la evaluación.

## Archivos modificados/creados

- `data/sinteticos/casos-adicionales.json` (nuevo): la solicitud de Rosa.
- `data/sinteticos/referencia-casos-adicionales.json` (nuevo): su referencia, con la urgencia [PENDIENTE].
- `data/resultados/clasificaciones-adicionales-minimaxai-minimax-m3.1-flash.json` (nuevo): la respuesta de MiniMax.
- `data/sinteticos/exportacion-demo-2.csv`: ahora trae 2 solicitudes.
- `scripts/clasificar-casos-adicionales.js` (nuevo) y `package.json`: comando `npm run clasificar:adicionales`. No vuelve a llamar al modelo si el caso ya está clasificado.
- `scripts/generar-exportacion-demo.js` y `src/services/exportacion-demo.service.js`: la segunda exportación trae SINT-0009 y SINT-0061.
- `src/repositories/bandeja.repository.js`: suma los casos adicionales del mismo modelo, en memoria.
- `tests/datos/casos-adicionales.test.js` (nuevo, 9 pruebas), `tests/api/bandeja.api.test.js`, `tests/repositories/bandeja.repository.test.js`, `tests/scripts/exportar-diseno.test.js`.
- `docs/guion-demo.md` (la segunda carga trae 2 solicitudes), `README.md`, `TASKS.md`.

## Cómo probarlo

1. Apaga y vuelve a encender el programa (`Ctrl+C`, luego `npm.cmd run iniciar`) y recarga con `Ctrl+F5`.
2. Carga la primera exportación y después "Cargar nueva exportación": la ventana dice "2 solicitudes nuevas" y el total sube a 61.
3. Escribe "0061" en el buscador: aparece en "Sin alerta crítica", con prioridad Media y Persona mayor (60+).
4. Abre "Evaluación": los números son los mismos de antes (60 casos).
5. Pruebas automáticas: `npm.cmd test` (518 pruebas).

## Notas de cierre

Rosa está en la demo y la clasificó MiniMax de verdad. El resultado es honesto y no se tocó: el modelo la dejó en prioridad media y sin la alerta de descompensación. Por eso no sube a los grupos críticos.

Para el video, Candela decide si eso se muestra como ejemplo de por qué la decisión es del triajista (puede corregirla en vivo) o si se cuenta de otra forma. Lo que no se puede hacer es cambiar a mano la respuesta del modelo.
