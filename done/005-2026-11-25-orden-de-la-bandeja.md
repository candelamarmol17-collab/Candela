# [005] Orden de la bandeja

**Estado**: done
**Fecha creación**: 2026-11-25
**Rama asociada**: `feat/005-orden-bandeja`

## Objetivo

Ordenar las solicitudes para que **lo urgente aparezca primero** en la bandeja del triajista. El orden usa la clasificación sugerida por la IA (o la corregida por el triajista, cuando exista), y las solicitudes que no se pudieron clasificar se muestran en una lista aparte, nunca escondidas.

Esta tarea prepara el orden y los datos. La pantalla y la dirección web que la muestra son de la tarea 006.

## Preguntas y respuestas

| # | Pregunta | Respuesta de Candela |
|---|---|---|
| 1 | ¿Se usa el orden propuesto en los requerimientos (sección 7, marcado como [INFERENCIA])? | **Sí**, para la demo: primero las solicitudes con alerta crítica; después por prioridad (alta, media, baja); dentro de cada grupo, la más antigua primero. Sigue siendo una propuesta por validar con los triajistas. |
| 2 | Dentro de las alertas críticas, ¿va primero la "urgencia"? | **Sí.** Primero las que tienen "urgencia" (la gestora debe gestionarlas de inmediato). Después, las que tienen otra alerta crítica (violencia, ideación suicida o descompensación), todas con el mismo peso. |
| 3 | ¿Cómo se resuelve un empate total (mismo grupo, prioridad, fecha y hora)? | Por número de solicitud (`SINT-0001` antes que `SINT-0002`), para que el orden salga siempre igual. |
| 4 | ¿Con qué clasificación se ordena? | Con la **clasificación vigente**: la corregida por el triajista si existe (tarea 006); si no, la de la IA. |
| 5 | ¿De dónde salen los datos? | De las 60 solicitudes sintéticas más una corrida guardada en `data/resultados/`. En el video, la de Mistral en modo repetición. **Cambio del 2026-11-26:** Candela eligió la corrida de **MiniMax** para el video (60 de 60 clasificadas). |
| 6 | ¿Qué entra en esta tarea? | Solo el servicio que ordena, la lectura de los datos y sus pruebas. La dirección web (por ejemplo `GET /api/bandeja`) y Express (una librería para crear el servidor web) quedan para la tarea 006, junto con la pantalla. |
| 7 | ¿Cómo se ordenan las "no clasificadas"? | En su lista aparte, **la más antigua primero** (y por número de solicitud si empatan). |
| 8 | La corrida de MiniMax, ¿se marca como "modelo real" o como "repetición"? | **Las dos cosas juntas**, con una etiqueta como "Resultados reales de MiniMax M3.1 Flash (corrida del 26 nov. 2026), reproducidos desde archivo". Así no parece que responde en vivo, pero queda claro que no es una simulación (decisión 007). |

## Plan técnico

- **Orden de grupos** (de arriba hacia abajo):
  1. con alerta "urgencia";
  2. con otra alerta crítica (violencia, ideación suicida o descompensación);
  3. sin alerta crítica.
  
  Dentro de cada grupo: prioridad alta, media, baja; luego la fecha de ingreso más antigua; luego el número de solicitud.
- Las alertas no críticas ("persona_mayor_60" y "ges") **no cambian el orden**; solo se muestran.
- `src/services/bandeja.service.js`: recibe las solicitudes, los resultados de una corrida y, de forma opcional, las correcciones del triajista. Devuelve dos listas: `ordenadas` y `no_clasificadas`. Cada elemento lleva la solicitud, la clasificación vigente, si viene de la IA o del triajista, y el `origen` (modelo real, simulado o repetición), para que nunca parezca real algo simulado.
- Una solicitud que no tiene resultado en la corrida va a `no_clasificadas`, con el motivo "sin resultado". Nunca desaparece.
- `src/repositories/bandeja.repository.js`: lee las solicitudes sintéticas y la corrida indicada. Solo lee archivos de datos sintéticos (regla R1).
- Pruebas: cada regla del orden, los empates, una lista vacía, solicitudes sin resultado, resultados de solicitudes que no existen y que las correcciones del triajista cambien el orden.
- Sin dependencias nuevas.

## Cómo se trabaja esta tarea (excepción aprobada)

- **Excepción al contrato**: `CLAUDE.md` dice que nunca se trabaja más de una tarea a la vez. Candela aprobó empezar la 005 el 2026-11-25 mientras la 004 espera sus corridas reales, por el plazo del sábado 28. La 005 parte desde `main`, sin el código de la 004.
- **Orden de trabajo**: primero el servicio de orden con sus pruebas (solo depende de los esquemas de la tarea 002). La lectura de los resultados guardados en `data/resultados/` se hace al final, cuando la 004 esté unida a `main` y esta rama se actualice con `main`.
- Se trabaja en una carpeta aparte (`Candela-005`, un "worktree" de git), para no interrumpir las corridas de la 004 en la carpeta `Candela`.
- La lista `ALERTAS_CRITICAS` se copió tal cual desde la rama 004, para que al unir las ramas no haya conflicto.
- **Revisión pedida por Candela al actualizar con `main`**: con la referencia de la 004 (SINT-0008 sin urgencia), la bandeja debe tener **16 solicitudes en el grupo "urgencia" y 5 en "otra alerta crítica"**. Se agrega una prueba que lo verifique con los 60 casos. Revisión previa del 2026-11-25, con la referencia de la rama 004: 16 urgencia, 5 otra alerta crítica (incluida SINT-0008) y 39 sin alerta crítica.

## Criterios de aceptación

- [x] Las solicitudes con "urgencia" quedan primero; después las con otra alerta crítica; después el resto.
- [x] Dentro de cada grupo, el orden es: prioridad alta, media y baja; la más antigua primero; luego el número de solicitud.
- [x] Las no clasificadas (o sin resultado) quedan en una lista aparte, la más antigua primero.
- [x] Si hay una corrección del triajista, el orden usa la corrección.
- [x] Cada elemento indica su origen, y la bandeja trae una etiqueta que dice si los datos son reales o simulados y que se reproducen desde archivo.
- [x] Con la referencia de la 004, la bandeja tiene 16 solicitudes con "urgencia" y 5 con otra alerta crítica (prueba automática).
- [x] `npm test` y `npm run lint` pasan (17 grupos, 332 pruebas). Sin `console.log`.
- [x] `TASKS.md` actualizado. La rama se une a `main` con el Pull Request de esta tarea.

## Archivos modificados/creados

- `src/services/bandeja.service.js` (nuevo):
  - `armarBandeja` ordena las solicitudes y separa las no clasificadas;
  - `describirDatosBandeja` arma la etiqueta de los datos;
  - `armarBandejaDesdeCorrida` junta las dos cosas.
- `src/repositories/bandeja.repository.js` (nuevo): lee las 60 solicitudes sintéticas y una corrida de `data/resultados/`. Por la regla R1, rechaza cualquier otro archivo, incluida la referencia.
- `src/schemas/catalogos.js`: lista `ALERTAS_CRITICAS` (la misma de la tarea 004).
- `tests/services/bandeja.service.test.js`: cada regla del orden, empates, listas vacías, no clasificadas, correcciones del triajista y la etiqueta.
- `tests/services/bandeja.datos-del-proyecto.test.js`: los conteos 16 y 5 con la referencia, y la bandeja del video con MiniMax.
- `tests/repositories/bandeja.repository.test.js`: lectura de archivos y rechazo de rutas no permitidas.
- `docs/decisiones/007-etiqueta-de-los-datos-de-la-bandeja.md`.
- `TASKS.md`.

## Cómo probarlo

1. `npm.cmd test` y `npm.cmd run lint`: todo debe pasar.
2. La prueba "bandeja con la clasificación de referencia" verifica los conteos pedidos por Candela: 16 con urgencia, 5 con otra alerta crítica (incluida SINT-0008) y 39 sin alerta crítica.
3. La prueba "bandeja del video" verifica la corrida de MiniMax:
   - 60 de 60 clasificadas;
   - 14 con urgencia, 7 con otra alerta crítica y 39 sin alerta crítica;
   - la etiqueta "Resultados reales de MiniMax M3.1 Flash (corrida del 26 nov. 2026), reproducidos desde archivo".

   Todavía no hay pantalla: la bandeja se ve en la tarea 006.

## Notas de cierre

**Cerrada el 2026-11-26.**

**Qué quedó hecho:** el orden de la bandeja (primero urgencia, después otra alerta crítica, después el resto; dentro de cada grupo, por prioridad, antigüedad y número), la lista aparte de no clasificadas, el uso de las correcciones del triajista, la lectura segura de los datos y la etiqueta que dice de dónde vienen.

**Para saber antes del video:** con la corrida de MiniMax la bandeja queda con **14 con urgencia y 7 con otra alerta crítica**, y no con 16 y 5 como la referencia. MiniMax no marcó "urgencia" en algunos casos que la referencia sí marca (por ejemplo SINT-0015 y SINT-0018). Igual quedan arriba, en "otra alerta crítica", porque tienen violencia.

**Pendiente para la tarea 006:**
- la dirección web y la pantalla que muestran la bandeja y la etiqueta;
- el formato definitivo de las correcciones del triajista (hoy es [PROVISIONAL]).

**Uso de IA en esta tarea:** se usó Claude Code (asistente de programación con IA) para:
- proponer el plan y escribir el código y las pruebas;
- actualizar la rama con `main`;
- redactar esta documentación.

Candela respondió las preguntas, definió el orden y la etiqueta, y aprobó cada paso. Solo se usaron datos sintéticos (inventados).
