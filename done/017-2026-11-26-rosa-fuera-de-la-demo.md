# [017] Sacar a Rosa (SINT-0061) de la exportación de demostración 2

**Estado**: done
**Fecha creación**: 2026-11-26
**Rama asociada**: `feat/017-rosa-fuera-de-la-demo` (parte de `feat/016-diagrama-arquitectura`)

## Objetivo

Para el video, la "Exportación de demostración 2" vuelve a traer solo SINT-0009, como antes de la tarea 015. El caso de Rosa (SINT-0061) y la respuesta de la IA no se borran: quedan guardados y documentados en la tarea 015, fuera de la demo.

## Preguntas y respuestas

No hubo preguntas: Candela pidió el cambio con estas reglas.

- La exportación 2 trae solo SINT-0009.
- No se borra el caso de Rosa ni su resultado.

Decisión que tomé yo: la función que sumaba el resultado de Rosa a la bandeja (`sumarCasosAdicionales`) se conserva en el código, con sus pruebas, pero la demo ya no la llama. Así se puede volver a agregar un caso adicional sin rehacer el trabajo.

## Criterios de aceptación

- [x] La exportación 2 trae solo SINT-0009. Los dos archivos de exportación son idénticos a los de antes de la tarea 015 (lo revisé comparándolos con la rama del Registro).
- [x] Al cargar las dos exportaciones, la bandeja tiene 60 solicitudes y SINT-0009 entra resaltada al grupo de urgencia. Rosa no aparece en ninguna parte de la respuesta de la API.
- [x] Los archivos de Rosa siguen en el repositorio, sin cambios.
- [x] La evaluación no cambia: nunca incluyó a Rosa.
- [x] Siguen siendo 523 pruebas, así que el número del diagrama de arquitectura (tarea 016) sigue siendo correcto.

## Archivos modificados/creados

- `src/services/exportacion-demo.service.js`: la segunda exportación vuelve a ser solo SINT-0009.
- `scripts/generar-exportacion-demo.js`: usa solo las 60 solicitudes sintéticas.
- `src/repositories/bandeja.repository.js`: la demo ya no suma los casos adicionales.
- `data/sinteticos/exportacion-demo-2.csv`: regenerado (solo SINT-0009).
- `tests/api/bandeja.api.test.js`, `tests/repositories/bandeja.repository.test.js`, `tests/scripts/exportar-diseno.test.js`.
- `docs/guion-demo.md`, `README.md`, `TASKS.md` y la nota de actualización en `done/015-2026-11-26-caso-adicional-rosa.md`.

## Cómo probarlo

1. Apaga y vuelve a encender el programa, y recarga con `Ctrl+F5`.
2. Carga la primera exportación y después "Cargar nueva exportación": la ventana dice "1 solicitud nueva" y el total queda en 60.
3. Escribe "0061" en el buscador: no aparece nada.
4. Pruebas automáticas: `npm.cmd test` (523 pruebas).

## Notas de cierre

Probado en el navegador con clics reales: la segunda exportación trae solo SINT-0009, que entra resaltada al grupo de urgencia. Las pestañas Registro, Evaluación y Cómo funciona cargan sin errores. La copia de diseño también quedó regenerada.
