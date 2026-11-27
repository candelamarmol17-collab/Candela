# [018] Presentar Pulso funcionando, sin avisos de "demo" en pantalla

**Estado**: done
**Fecha creación**: 2026-11-26
**Rama asociada**: feat/018-presentacion-como-producto

## Objetivo
Que Pulso se vea como un producto que funciona, sin avisos tipo "prototipo de demostración", "datos ficticios" o "reproducido desde archivo". Esas aclaraciones ya van en el formulario de postulación, y en el video jugaban en contra.

## Preguntas y respuestas
- Pedido de Candela (2026-11-26): "tenemos que vender la idea como si fuera realidad el funcionamiento". No hizo falta preguntar más: se cambian solo textos de pantalla, documentos y el diagrama.
- Límites que se mantienen (reglas anteriores): nunca decir "validado"; no se inventan cifras; la "Propuesta para el piloto" sigue marcada como propuesta (no se muestra como construida); el modo de respaldo por reglas sigue diciendo "sin IA" (solo aparece si se usa ese modo, no en el video).

## Criterios de aceptación
- En ninguna pestaña aparece "demostración", "ficticio", "sintético", "reproducido", "prototipo", "en vivo" ni "calidad clínica real" (revisado en el navegador).
- Las 523 pruebas pasan.
- Diagrama y guion sin esos avisos.

## Archivos modificados/creados
- Pantalla: `public/index.html` (título, franja de arriba, triajista, ventana de carga, aviso del Registro), `public/app.js` (pie de la sugerencia, aviso al corregir, botón "Reiniciar bandeja"), `public/evaluacion.js`, `public/como-funciona.js`.
- Servicios: `src/services/bandeja.service.js` (franja: "Clasificación con MiniMax M3.1 Flash"), `src/services/demo-bandeja.service.js` ("Triajista de turno", "Exportación de Telesalud N", "Registro de esta sesión de trabajo."), `src/services/evaluacion.service.js` (aviso con la frase acordada sobre los criterios).
- Pruebas: 6 archivos en `tests/` con los textos nuevos.
- Documentos: `docs/guion-demo.md`, `docs/arquitectura.md`, `README.md`, `TASKS.md`.
- Diagrama: `docs/arquitectura/arquitectura-pulso.archify.json`, `.html` y `.png` regenerados (tarjeta "IA responsable" en vez de "IA en la demo"; "Clasificación · por lotes, con el modelo de IA").

## Cómo probarlo
1. `npm.cmd test` → 523 pruebas pasando.
2. `npm.cmd run iniciar`, abrir http://localhost:3000 con `Ctrl + F5` y recorrer las 4 pestañas.

## Notas de cierre
Los datos, las corridas y la evaluación no cambiaron: solo los textos. Los documentos internos de tareas anteriores (carpeta `/done` y decisiones) se dejan como estaban, porque son el historial del proyecto.
