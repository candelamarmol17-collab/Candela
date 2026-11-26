# 010 — La bandeja parte vacía y se llena "cargando" la exportación de Telesalud

**Fecha**: 2026-11-26 · **Tarea**: 011 · **Decidió**: Candela (opción A de la arquitectura: Pulso es una capa sobre la exportación de Telesalud)

## Qué se decidió

- La pantalla parte con la **bandeja vacía**: "No hay solicitudes. Carga la exportación de Telesalud para empezar."
- El botón "Cargar exportación de Telesalud" abre una ventana con el **archivo de demostración ya elegido** ("Exportación de demostración 1", 59 solicitudes) y la nota "En el piloto: archivo exportado desde Telesalud".
- Después, "Cargar nueva exportación" carga la "Exportación de demostración 2", que trae SINT-0009 con el mismo resaltado de antes.
- "Reiniciar demo" vuelve a la bandeja vacía.
- Reemplaza al botón "Simular ingreso de nueva solicitud" de la tarea 006.

## Regla R1: no se recibe nada de afuera

- La ventana **no tiene** cómo elegir ni subir un archivo del computador.
- La dirección `POST /api/bandeja/cargar-exportacion` no acepta cuerpo: si llega cualquier dato o archivo, responde 400 y no carga nada.
- Las dos "exportaciones" no son archivos aparte: son las mismas 60 solicitudes sintéticas de `data/sinteticos/solicitudes.json`, separadas en dos entregas (59 y 1). Por eso la pantalla las llama "Exportación de demostración" y no les inventa un nombre de archivo.

## Por qué

- Muestra en el video cómo funcionaría en el piloto: Telesalud exporta, Pulso ordena y sugiere, el equipo decide.
- No se procesa ningún archivo real ni externo, así que no hay riesgo de que entren datos personales.

## Alternativas descartadas

- **Un botón para subir un archivo**: abriría la puerta a datos reales (regla R1).
- **Mostrar un nombre de archivo inventado** (por ejemplo, `.csv`): haría parecer real un archivo que no existe.
