# Contrato de Trabajo — Desarrollo Guiado por Especificaciones (SDD) - Node.js

> Última actualización: 2026-08-25

## 0. Regla de Oro: Cero Inferencias

- Si un requisito, nombre de variable, estructura de datos o decisión de diseño no está explícitamente definido, DETENTE y pregunta. No asumas, no rellenes vacíos "a tu criterio".
- Toda ambigüedad se resuelve con una pregunta directa antes de avanzar, nunca con una suposición silenciosa.

## 0.1 Regla de Oro: Nunca en Main

- Ninguna solicitud, por pequeña que sea, se trabaja directo sobre `main`/`develop`. Toda tarea, sin excepción, se hace en una rama nueva y distinta (ver Regla 5).
- Antes de tocar cualquier archivo se verifica en qué rama se está parado; si es `main`, se crea la rama de la tarea primero.

## 1. Método de Trabajo: Solo por Tareas

- El trabajo se inicia únicamente cuando el usuario dice "crea una tarea: [nombre]". No se avanza en nada sin este disparador.
- Al recibir el nombre de la tarea, se hacen todas las preguntas necesarias para entender el alcance completo antes de escribir nada (aplica Regla 0).
- Con las respuestas, se documenta la tarea en `/backlog` y se espera aprobación explícita para pasarla a `/in-progress`.
- Mientras la tarea esté activa, cualquier duda nueva que surja se pregunta de inmediato, no se asume ni se avanza a ciegas.
- Al terminar, el archivo se mueve a `/done` documentando el resultado final.
- **Nunca se trabaja más de una tarea a la vez.**

## 2. Flujo de Fases por Tarea

1. **Especificación**: preguntas + plan técnico (arquitectura, rutas, modelos, dependencias).
2. **Validación**: se espera aprobación explícita antes de programar.
3. **Implementación**: código en bloques pequeños, un solo archivo a la vez.
4. **Cierre**: pruebas pasando, documentación actualizada, tarea movida a `/done`.

Prohibido escribir código funcional antes de completar la fase de Especificación y recibir aprobación.

## 3. Estándar de Código Node.js

- **Modularidad**: Arquitectura en Capas (Controladores, Servicios, Repositorios/Modelos).
- **Asincronía**: exclusivamente `async/await`, errores con `try/catch`.
- **Tipado/Validación**: esquemas rígidos (Zod, Joi o TypeScript) para `req.body` y `req.query`.
- **Respuestas HTTP**: JSON estandarizado con códigos de estado correctos (200, 201, 400, 401, 404, 500).

## 4. Control de Calidad y Pruebas

- Cada endpoint o servicio incluye su archivo de prueba (Jest / Mocha / Supertest).
- Errores centralizados en middleware global. Nada de `console.log` en producción.
- Casos borde: inputs vacíos, tipos incorrectos, desbordamientos y nulos, validados antes de la lógica.
- **Definición de "Terminado" (Definition of Done)** — checklist obligatorio antes de mover una tarea a `/done`:
  - [ ] Pruebas escritas y pasando
  - [ ] Sin `console.log` en el código
  - [ ] Documentación de la tarea actualizada
  - [ ] Rama mergeada
  - [ ] Índice general (`TASKS.md`) actualizado

## 5. Control de Versiones

- **Rama nueva por tarea**: cada tarea se trabaja en su propia rama, nunca directo sobre main/develop (ver Regla 0.1, sin excepciones).
- **Nomenclatura**: `tipo/id-descripcion-corta` (ej. `feat/003-auth-login`, `fix/007-validacion-body`).
- **Documentación de rama obligatoria**: cada rama incluye un resumen (en el PR o en el archivo de la tarea) con objetivo, archivos modificados/creados, decisiones técnicas y cómo probarlo.
- Commits descriptivos y atómicos, alineados con la tarea de la rama.

## 6. Gestión de Tareas (Kanban de Carpetas)

Estructura obligatoria en la raíz del proyecto:

```
/backlog        → tareas por hacer, en refinamiento
/in-progress    → SOLO la tarea que se está desarrollando ahora (máximo 1 archivo)
/done           → tareas completadas
/docs/decisiones → decisiones técnicas importantes (ver punto 8)
TASKS.md        → índice general de todas las tareas
```

**Nomenclatura de archivos de tarea**: `ID-fecha-nombre-tarea.md`
Ejemplo: `001-2026-08-25-crear-login.md`

El ID es correlativo y nunca se reutiliza, incluso si una tarea se cancela.

## 7. Plantilla de Archivo de Tarea

Todo archivo en `/backlog`, `/in-progress` o `/done` sigue este formato:

```markdown
# [ID] Nombre de la tarea

**Estado**: backlog | in-progress | done
**Fecha creación**: 
**Rama asociada**: 

## Objetivo
(qué se quiere lograr, en lenguaje simple)

## Preguntas y respuestas
(preguntas hechas antes de iniciar y las respuestas del usuario)

## Criterios de aceptación
(cómo se sabe que la tarea está bien hecha)

## Archivos modificados/creados
(lista, se completa al implementar)

## Cómo probarlo
(pasos simples para verificar que funciona)

## Notas de cierre
(resumen final, se completa al mover a /done)
```

## 8. Documentación en Lenguaje Simple

- Todo archivo de tarea se escribe en lenguaje simple y claro, evitando jerga técnica, pensado para alguien con poco conocimiento de informática.
- Términos técnicos inevitables se explican brevemente entre paréntesis.

## 9. Decisiones Técnicas (ADR liviano)

- Cuando se tome una decisión técnica relevante (ej. "usamos Zod y no Joi"), se documenta en `/docs/decisiones` con un archivo corto: qué se decidió, por qué, y qué alternativas se descartaron.
- Esto evita repetir la misma discusión más adelante en el proyecto.

## 10. Índice General

- El archivo `TASKS.md` en la raíz mantiene una tabla actualizada con todas las tareas:

| ID | Nombre | Estado | Fecha |
|----|--------|--------|-------|
| 001 | Crear login | done | 2026-08-25 |

- Se actualiza cada vez que una tarea cambia de estado.


## 11. Requerimientos del Proyecto

- Qué se construye, el alcance y las reglas del proyecto están en `docs/requerimientos.md`. Léelo antes de iniciar cualquier tarea.
- Las marcas [PENDIENTE] e [INFERENCIA] de ese documento activan la Regla 0: se pregunta antes de usarlas.
- Si `docs/requerimientos.md` contradice este contrato, manda este contrato y se avisa de la contradicción.