# [005] Orden de la bandeja

**Estado**: backlog
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
| 5 | ¿De dónde salen los datos? | De las 60 solicitudes sintéticas más una corrida guardada en `data/resultados/`. En el video, la de Mistral en modo repetición. |
| 6 | ¿Qué entra en esta tarea? | Solo el servicio que ordena, la lectura de los datos y sus pruebas. La dirección web (por ejemplo `GET /api/bandeja`) y Express (una librería para crear el servidor web) quedan para la tarea 006, junto con la pantalla. |
| 7 | ¿Cómo se ordenan las "no clasificadas"? | En su lista aparte, **la más antigua primero** (y por número de solicitud si empatan). |

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

## Criterios de aceptación

- [ ] Las solicitudes con "urgencia" quedan primero; después las con otra alerta crítica; después el resto.
- [ ] Dentro de cada grupo, el orden es: prioridad alta, media y baja; la más antigua primero; luego el número de solicitud.
- [ ] Las no clasificadas (o sin resultado) quedan en una lista aparte, la más antigua primero.
- [ ] Si hay una corrección del triajista, el orden usa la corrección.
- [ ] Cada elemento indica su origen (modelo real, simulado o repetición).
- [ ] `npm test` y `npm run lint` pasan. Sin `console.log`.
- [ ] `TASKS.md` actualizado y rama unida a `main` por Pull Request.

## Archivos modificados/creados

(se completa al implementar)

## Cómo probarlo

(se completa al implementar)

## Notas de cierre

(se completa al mover a /done; incluir si se usó Claude Code y para qué)
