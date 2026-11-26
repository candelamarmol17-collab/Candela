# 011 — Formato real de la exportación de Telesalud y separación de datos personales antes de la IA

**Fecha**: 2026-11-26 · **Tarea**: 012 · **Decidió**: Candela (el mapeo de columnas y qué se separa) y yo (cómo se hace en el código, anotado abajo)

## Qué se decidió

- **Un solo lugar para el mapeo**: `src/schemas/exportacion-telesalud.js` describe las 48 columnas **por posición** (E y AV se llaman igual, "Información adicional"). Cada columna tiene un solo uso: para la IA, datos personales, funcionarios, evaluación del piloto o pendiente. Una prueba lo compara con el encabezado real de `docs/formato-exportacion-telesalud.csv`.
- **La separación de datos personales se hace con código, sin IA y antes de la IA** (`src/services/seudonimizacion.service.js`):
  1. Se quedan solo las columnas que Pulso usa (las de la IA y la fecha para ordenar). Todo lo demás se descarta.
  2. Cada solicitud recibe un **código interno**. La tabla "ID de Telesalud → código" vive en la memoria del programa, es decir, en el centro de salud, y nunca se muestra ni se envía.
  3. En el texto libre se tapan los **RUT, teléfonos y correos** que el vecino haya escrito ("[RUT oculto]", "[teléfono oculto]", "[correo oculto]").
- **Especificidad (columna T) no pasa todavía**: queda para un prompt v2 [PENDIENTE]. Así la línea del panel ("La IA recibió: profesional pedido, motivo, texto y edad…") dice exactamente lo que pasa.
- **Exportación de demostración**: `data/sinteticos/exportacion-demo-1.csv` (59) y `-2.csv` (1), con las 48 columnas y datos personales claramente inventados ("Vecina Demo 01", "DEMO-0001", "+56 9 0000 0001", "demo01@example.com", "Calle Ficticia 101"). Se generan con `npm run exportacion:demo` desde las 60 solicitudes sintéticas.
- **En la demo, la tabla de códigos viene armada**: "DEMO-ID-0001" recibe el código "SINT-0001", para que coincida con la corrida de MiniMax guardada. En el piloto los códigos serían nuevos (PUL-0001, PUL-0002…).

## Por qué

- La IA solo necesita lo que describe el problema de salud. Quitar lo demás antes de enviarlo reduce el riesgo de que datos personales salgan del centro de salud.
- Hacerlo con código (y no con IA) hace que sea predecible y se pueda probar.
- Leer por posición evita confundir las dos columnas "Información adicional".

## Límites que hay que decir

- Tapar RUT, teléfonos y correos con patrones **no es perfecto**: un nombre propio o una dirección escritos en el texto libre no se tapan. Por eso el triajista siempre lee el texto original y la revisión humana sigue siendo obligatoria.
- Los patrones están pensados para no tapar números clínicos (temperaturas, presiones, glicemias, semanas de embarazo); hay pruebas para esos casos.
- El formato de fecha de la exportación real está por confirmar [PENDIENTE]: hoy se aceptan "AAAA-MM-DD HH:MM" y "AAAA-MM-DD HH:MM:SS".

## Alternativas descartadas

- **Leer por nombre de columna**: falla con las dos "Información adicional".
- **Pedirle a la IA que quite los datos personales**: sería enviarle justamente lo que se quiere proteger.
- **Crear los códigos nuevos (PUL-…) también en la demo**: no calzarían con la corrida guardada y la demo mostraría solicitudes sin sugerencia.
