# 008 — Pantalla en HTML simple, servida con Express

**Fecha**: 2026-11-26 · **Tarea**: 006 · **Aprobó**: Candela

## Qué se decidió

- La pantalla es una página **HTML, CSS y JavaScript simple, sin framework**, en la carpeta `public/`.
- La sirve el mismo programa Node con **Express**, que también entrega la API de la bandeja (`/api/bandeja`).
- Las pruebas de la API usan **Supertest**.
- Dependencias nuevas: `express` (para el programa) y `supertest` (solo para pruebas).

## Por qué

- Es lo más rápido de hacer y de revisar antes del sábado 28. No hay que compilar nada: se enciende con un solo comando.
- Funciona **sin internet**:
  - la fuente Inter va dentro del repositorio (licencia OFL, `public/fuentes/`);
  - los íconos son SVG copiados de Lucide (licencia ISC, `public/LICENCIA-Lucide.txt`).
- Los datos se muestran siempre como texto y nunca como HTML. Así, un texto de una solicitud no puede cambiar la página.

## Alternativas descartadas

- **React u otro framework**: más herramientas y más pasos para una sola pantalla.
- **Una librería de íconos completa**: es pesada y la pantalla usa solo 16 íconos.
- **Cargar la fuente desde Google Fonts**: depende de internet y envía datos de la visita a un tercero.

## Detalles

- Las confirmaciones y correcciones se guardan **solo en memoria** (en el programa encendido). Recargar la página no las borra; apagar el programa o "Reiniciar demo", sí. El registro permanente es la tarea 007.
- Respuestas JSON iguales en toda la API:
  - éxito: `{ ok: true, datos }`;
  - error: `{ ok: false, error: { mensaje, detalles? } }`.
- Códigos: 200, 400, 404 y 500. (Hasta la tarea 011 también 201, para el "ingreso simulado", que se reemplazó por cargar exportaciones: ver la decisión 010.) Los errores pasan por un solo middleware (una función que los atrapa todos en un lugar).
