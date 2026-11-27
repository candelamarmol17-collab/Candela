# Arquitectura de Pulso

Pulso es una **capa de apoyo** sobre la exportación de Telesalud: no escribe en Telesalud (regla R8) y la IA solo sugiere (regla R2). La pestaña "Cómo funciona" muestra este mismo recorrido.

**Diagrama tecnológico** (piezas del programa, frontera de privacidad y propuesta para el piloto): [arquitectura-pulso.html](arquitectura/arquitectura-pulso.html) · [imagen PNG](arquitectura/arquitectura-pulso.png). Ver la decisión 014.

```mermaid
flowchart LR
  subgraph CENTRO["Centro de salud"]
    A["1. Exportación de Telesalud<br/>(archivo; Telesalud no se modifica)"]
    B["2. Separación de datos personales<br/>con código, sin IA<br/>(quita nombre, RUT, contacto y dirección;<br/>tapa RUT, teléfonos y correos del texto;<br/>asigna un código)"]
    T[("Tabla de códigos y<br/>datos personales<br/>(no salen del centro)")]
    D["4. Validación de la respuesta<br/>(formato; si falla, revisión manual)"]
    E["5. Bandeja ordenada<br/>(lo urgente primero)"]
    F["6. Triajista confirma o corrige<br/>(decisión humana)"]
    G["7. Evaluación<br/>(contra una referencia, sin veredicto)"]
  end
  subgraph FUERA["Proveedor de IA (intercambiable)"]
    C["3. IA generativa<br/>prompt versionado"]
  end
  A --> B
  B -. guarda .-> T
  B -- "profesional pedido, motivo,<br/>texto tapado, edad y código" --> C
  C -- "sugerencia: prioridad,<br/>profesional, alertas" --> D
  D --> E --> F
  F --> G
```

## Qué viaja a la IA y qué no

- **Viaja**: profesional pedido, motivo, texto libre (con RUT, teléfonos y correos tapados) y edad, con un código en vez del ID.
- **No viaja**: nombre, RUT, contacto, dirección, columnas de funcionarios y notas, ni la tabla de códigos. Todo eso se queda en el centro de salud.
- El mapeo de las 48 columnas está en `src/schemas/exportacion-telesalud.js` (decisión 011).

## Piezas del código

| Paso | Dónde está |
|---|---|
| Leer la exportación | `src/repositories/bandeja.repository.js`, `src/utilidades/csv.js` |
| Separar datos personales | `src/services/seudonimizacion.service.js` |
| IA (adaptadores y modo simulado) | `src/adaptadores/`, `src/prompts/clasificacion.js` |
| Validar la respuesta | `src/schemas/clasificacion.schema.js`, `src/services/clasificacion.service.js` |
| Ordenar la bandeja | `src/services/bandeja.service.js` |
| Confirmar o corregir | `src/services/demo-bandeja.service.js`, `src/controllers/bandeja.controller.js` |
| Evaluar | `src/services/evaluacion.service.js`, `scripts/evaluar.js` |
| Pantalla | `public/` |

## En esta demostración

- Los datos son 100 % sintéticos. Lo único real es el encabezado de la exportación.
- Las sugerencias se **reproducen desde una corrida guardada** de MiniMax (no se llama a la IA en vivo durante el video).
