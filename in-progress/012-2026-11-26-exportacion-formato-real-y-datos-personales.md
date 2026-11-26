# [012] Exportación con el formato real de Telesalud y separación de datos personales

**Estado**: in-progress
**Fecha creación**: 2026-11-26
**Rama asociada**: `feat/012-exportacion-formato-real` (sale de la 011)

## Objetivo

Que Pulso lea la exportación de Telesalud con su **formato real** (48 columnas) y que, **antes de la IA**, separe los datos personales del vecino. Los datos personales se quedan en el centro de salud y la IA recibe solo lo necesario para sugerir.

Lo único real es el encabezado (`docs/formato-exportacion-telesalud.csv` y `.xlsx`, sin datos). Todos los datos siguen siendo sintéticos (regla R1).

## Preguntas y respuestas

Candela pidió el cambio con todo el detalle el 2026-11-26. Hice dos preguntas porque tocaban datos personales y lo que el video muestra:

| # | Pregunta | Respuesta de Candela |
|---|---|---|
| 1 | La columna A ("ID") no estaba en ninguna lista. ¿Qué se hace con ella? | **Se separa** como dato identificatorio: nunca llega a la IA y es la llave de la tabla de códigos que se queda en el centro de salud. |
| 2 | El prompt v1 (congelado) no envía "Especificidad" y las corridas guardadas no la recibieron. ¿Qué dice el panel? | **Decir lo que pasó:** Especificidad queda en el mapeo como "para la IA desde un prompt v2 [PENDIENTE]", va vacía en la exportación de demostración, y el panel dice "La IA recibió: profesional pedido, motivo, texto y edad. No recibió: nombre, RUT, contacto ni dirección." |

Pedido completo de Candela:
1. Mapeo de columnas en un solo lugar, por posición (las columnas E y AV se llaman igual: "Información adicional").
2. Separación de datos personales (seudonimización: se cambian los datos que identifican por un código), hecha con código y sin IA: quitar las columnas identificatorias, asignar un código interno y tapar en el texto libre los RUT, teléfonos y correos. Con pruebas.
3. Exportación de demostración con las 48 columnas e identificadores claramente inventados. La carga de la demo usa este archivo.
4. Pantalla de carga con un anillo de progreso y cuatro pasos.
5. Una línea en el panel de detalle sobre qué recibió la IA.
6. Anotar el flujo para el diagrama de la 009.

## Mapeo de columnas (definido por Candela)

| Uso | Columnas |
|---|---|
| **Lo que recibe la IA** | Tipo prestador (R), Motivo consulta (S), Información adicional (la primera, E) y Edad (N). Especificidad (T): **[PENDIENTE]** hasta un prompt v2. |
| **Datos personales del vecino** (nunca llegan a la IA) | ID (A), Código seguimiento (D), Género (G), Nombre (H), Apellido paterno (I), Apellido materno (J), Nombre social (K), Tipo identificador (L), Nº identificador (M), Email (O), Telefono (P) y Dirección (Q). |
| **Funcionarios y notas** (no llegan a la IA) | Cerrado por, Cargo, Profesión, Fecha agenda, Nota cierre (X a AB) y las 18 columnas de derivación (AC a AT). |
| **Evaluación del piloto** (no llegan a la IA) | Cesfam (B), Prioridad (C), Fecha solicitud (F), Estado (U), Fecha cierre (V), Tipo cierre (W) y Contactado (AU). |
| **[PENDIENTE]** | La segunda "Información adicional" (AV): no se usa hasta confirmar qué contiene. |

"Fecha solicitud" no llega a la IA, pero la bandeja la usa para ordenar por antigüedad.

## Decisiones que tomé

(se completan al implementar)

## Criterios de aceptación

- [ ] El mapeo de las 48 columnas está en un solo archivo y una prueba lo compara con el encabezado real.
- [ ] La separación quita las columnas identificatorias, asigna un código interno y tapa RUT, teléfonos y correos en el texto. Con pruebas.
- [ ] La exportación de demostración tiene las 48 columnas e identificadores claramente inventados, y la demo la usa.
- [ ] Ningún dato personal sale del programa hacia la pantalla ni hacia la IA (con pruebas).
- [ ] Pantalla de carga con anillo y cuatro pasos, de unos 3 segundos.
- [ ] Línea del panel de detalle sobre qué recibió la IA.
- [ ] Notas para el diagrama de la 009.
- [ ] `npm test` y `npm run lint` pasan. Probado en el navegador.

## Archivos modificados/creados

(se completa al implementar)

## Cómo probarlo

(se completa al implementar)

## Notas de cierre

(se completa al mover a /done)
