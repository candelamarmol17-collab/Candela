# 013 — El Registro guarda solo la sesión, en memoria

**Fecha**: 2026-11-26 · **Tarea**: 007 · **Decidió**: Candela (qué se guarda y el aviso) y yo (cómo se hace en el código)

## Qué se decidió

- **Los eventos viven en la memoria del programa**, dentro de la misma demo que guarda las confirmaciones y correcciones (`src/services/demo-bandeja.service.js`). Se borran con "Reiniciar demo" o al apagar el programa. No hay archivo ni base de datos.
- **Cuatro acciones**: Confirmada, Corregida, Deshecha y Exportación cargada. "Deshacer" **agrega** un evento; nunca borra el anterior, como en un registro de auditoría (lista de lo que pasó, en orden).
- **Qué guarda cada evento**: número, hora, acción, código de la solicitud, quién ("Triajista de demostración"), resultado y la "Ficha de decisión": lo que sugirió la IA (prioridad, profesional, alertas), lo que decidió el triajista, el motivo de la corrección si se escribió uno, el modelo y la versión del prompt.
- **Qué NO guarda**: el texto de la solicitud, la justificación de la IA, la edad ni ningún dato personal. Una prueba lo revisa. El único texto escrito a mano que entra es el motivo de la corrección, porque es parte de la decisión del triajista y se pidió en la ficha.
- **Los contadores salen del estado actual** (confirmadas, corregidas y porcentaje de corrección): si se deshace una decisión, deja de contar.
- **Viaja junto con la bandeja** (`GET /api/bandeja` → `registro`). Así no hace falta otra dirección y la copia de diseño de un solo archivo lo muestra sin cambios.
- **Colores de los resultados sin rojo**: aceptada en azul petróleo, corregida en ámbar, anulada en gris y exportación en lavanda. El rojo queda para lo crítico.
- **Aviso fijo**: "Registro de esta sesión de demostración." No se promete guardar nada por más tiempo.

## Por qué

- Es una demo con datos ficticios: guardar en disco haría pensar que hay un registro real con retención, y eso no existe.
- Guardar solo códigos y catálogos evita que el registro se transforme en una copia de las solicitudes.

## Alternativas descartadas

- **Un archivo o base de datos**: promete una retención que el prototipo no tiene y suma riesgo de guardar datos.
- **Una dirección aparte (`/api/registro`)**: obligaba a repetirla en la copia de diseño, sin ganar nada.
- **Que "Deshacer" borre el evento**: en un registro de auditoría lo que pasó no se borra.
