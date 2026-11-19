# Requerimientos del proyecto: MVP "Bandeja priorizada de Telesalud"

> Postulación a Cities Deliver (Rockefeller Foundation y OpenAI Foundation), vía Seed
> Corporación Municipal de Melipilla (socio gubernamental) + Universidad Adolfo Ibáñez (organización líder)
> Responsable por la Corporación: Candela Mármol, Analista de Automatización de Procesos
> Versión 1, 19 de noviembre de 2026

---

## 0. Cómo usar este documento

- Este archivo es el **documento de requerimientos**. El documento que define **cómo** se trabaja es `CLAUDE.md`, y ese manda en todo lo relacionado con el método: tareas, ramas, fases, pruebas y documentación.
- Este documento define **qué** se construye, para qué y con qué restricciones.
- Cada dato lleva una de estas marcas:
  - **[CONFIRMADO]**: hay una fuente concreta.
  - **[INFERENCIA]**: es una deducción que todavía no está validada.
  - **[PENDIENTE]**: todavía no se sabe.
- Todo lo que esté marcado como [INFERENCIA] o [PENDIENTE] cae en la Regla 0 de `CLAUDE.md`. Antes de usarlo en una tarea, hay que preguntar. No se completa con supuestos.
- Si este documento contradice a `CLAUDE.md`, gana `CLAUDE.md`, y hay que avisar de la contradicción.
- Si este documento contradice las bases de la convocatoria, ganan las bases, y también hay que avisar.

---

## 1. Para qué sirve este MVP

La Corporación y la UAI postulan a un fondo que exige una solución con **IA generativa de frontera** para un servicio público. En la primera etapa (cierre: **29 nov. 2026**) hay que enviar un **video de 5 minutos**. Ese video debe mostrar:

- El diseño de la solución, sus resultados y cómo se usan.
- La arquitectura técnica básica.
- Los modelos de IA considerados.
- Cómo se evalúa la calidad de los resultados.

**El MVP sirve para grabar ese video y para respaldar las respuestas técnicas del formulario.** [CONFIRMADO]

**Lo que NO es:**
- No es un sistema productivo.
- No se conecta a Telesalud, a Rayén ni a ningún sistema real.
- No procesa datos reales de pacientes.
- No es la decisión técnica final. El modelo y la infraestructura definitivos los decide el líder técnico de la UAI. Este MVP es un insumo para esa decisión.

---

## 2. El problema

### 2.1 Cómo funciona hoy Telesalud

Fuente: gestora de Telesalud del CESFAM Dr. Francisco Boris Soler, 18 nov. 2026. [CONFIRMADO]

- Telesalud es una **plataforma ministerial nacional** (MINSAL). La Corporación no la controla.
- Cuando un vecino pide atención, llena un formulario con:
  - el tipo de profesional que necesita (médico, enfermera, matrona, nutricionista, etc.);
  - un motivo elegido de una lista (en Medicina, por ejemplo: renovación de receta, evaluación de exámenes, certificado);
  - un texto libre obligatorio, "Información Adicional", de **máximo 300 caracteres**.
- La solicitud llega al equipo gestor del centro y se reparte entre los **triajistas clínicos**. En el Boris Soler son tres: médico, matrona y enfermera.
- **El triajista asigna la prioridad cuando cierra la solicitud**, no cuando la recibe. Hay tres niveles:
  - Alta: cierre en 72 horas.
  - Media: cierre en 14 días.
  - Baja: cierre en 30 días.
- No hay API conocida ni interoperabilidad con Rayén.

### 2.2 El dolor

- **Las solicitudes crecen.** En Medicina General, en el Boris Soler, pasaron de 82 en enero a 150 en octubre de 2026. [CONFIRMADO; todavía falta revisar la fuente antes de citarlo]
- **El motivo de la lista no dice mucho.** El 56% de las solicitudes queda como "Otros", así que la necesidad real está en el texto libre. [CONFIRMADO; todavía falta revisar la fuente]
- **Una urgencia puede quedar esperando.** Si la bandeja se revisa en orden de llegada, una solicitud urgente escrita como "Otros" podría esperar días antes de que alguien la lea. [INFERENCIA]

### 2.3 La solución

Una IA generativa lee el motivo y el texto libre de cada solicitud **apenas ingresa** y propone:

1. Una **prioridad sugerida**: alta, media o baja.
2. El **profesional sugerido**.
3. **Alertas**: urgencia, violencia, ideación suicida, descompensación, persona de 60 años o más (Ley 21.168) y GES.
4. Una **justificación breve** de la sugerencia, en lenguaje simple.

Con eso, la bandeja se ordena para que lo urgente aparezca primero. **El triajista clínico confirma o corrige cada sugerencia.** La IA no da indicaciones clínicas, no contacta al vecino y no toma decisiones.

---

## 3. Reglas que nunca se rompen

Estas reglas vienen de las bases de la convocatoria o de un riesgo clínico o legal. Si una tarea choca con alguna de ellas, hay que detenerse y avisar.

| # | Regla | De dónde viene |
|---|---|---|
| R1 | **Solo datos sintéticos (inventados).** En el repositorio no puede entrar ningún dato real: ni RUT, ni nombres, ni teléfonos, ni direcciones, ni textos reales de pacientes, aunque estén "anonimizados". | Bases: el video no puede mostrar datos personales o sensibles. Ley 21.719 y Ley 20.584. |
| R2 | **Siempre decide un humano.** La IA solo sugiere. Toda pantalla debe dejar claro que es una sugerencia y que la puede confirmar o corregir el triajista. | Principios de IA responsable de las bases: supervisión humana. También el riesgo clínico de triage. |
| R3 | **La IA no da indicaciones clínicas.** Ni diagnósticos, ni tratamientos, ni consejos al paciente. Esto queda escrito en el prompt del modelo y se prueba. | Riesgo clínico. |
| R4 | **El proveedor de IA tiene que poder cambiarse.** El código no debe quedar amarrado a un solo proveedor. | Las bases son neutrales en tecnología, y la decisión final es de la UAI. |
| R5 | **Tiene que existir un modo simulado.** El MVP debe funcionar sin API key, con respuestas simuladas fijas, para que la demo no dependa de internet ni de créditos. | Riesgo de que la demo falle mientras se graba. |
| R6 | **Licencia abierta.** El código se publicará con una licencia abierta que acepte RFCC. | Bases: publicación abierta de lo financiado. **Cuál licencia: [PENDIENTE], hay que confirmarlo con la UAI.** |
| R7 | **Ningún secreto en el repositorio.** Las API keys van en `.env`, que no se sube a git. Se incluye un `.env.example` sin valores. | Seguridad. |
| R8 | **No se propone modificar Telesalud.** El MVP lee un archivo exportado; nunca escribe en la plataforma nacional. | FAQ actualizadas, sección 4: no se puede escalar a través de organismos nacionales. |

---

## 4. Alcance del MVP

### 4.1 Dentro del alcance

| Módulo | Qué hace |
|---|---|
| **A. Datos sintéticos** | Un conjunto de solicitudes inventadas, realistas pero ficticias, con el mismo formato que tendría la exportación. Incluye una **clasificación de referencia** (la "respuesta correcta") para poder evaluar. |
| **B. Carga** | Lee un archivo con solicitudes y valida que cada una tenga el formato correcto. |
| **C. Clasificación con IA** | Envía cada solicitud al modelo y recibe una respuesta estructurada (sección 5), validada con un esquema. Si la respuesta no cumple el esquema, se marca como "no clasificada": no se inventa nada. |
| **D. Bandeja ordenada** | Muestra las solicitudes ordenadas según la sugerencia, con la prioridad, el profesional, las alertas y la justificación. |
| **E. Confirmar o corregir** | El triajista confirma la sugerencia o la cambia. Si la corrige, puede anotar un motivo. |
| **F. Registro** | Cada sugerencia y cada decisión humana queda registrada, con fecha y hora, la versión del prompt y el modelo usado. El registro no lleva datos personales. |
| **G. Evaluación** | Un script compara las sugerencias de la IA con la clasificación de referencia y calcula las métricas (sección 6). |
| **H. Material para el video** | Un diagrama de arquitectura (Mermaid, en `/docs`), un README y una lista de pasos para la demo en pantalla. |

### 4.2 Fuera del alcance (no construir)

- Pedir, confirmar o reprogramar horas por voz o mensajería. Queda como fase futura.
- Contactar al vecino o hacerle preguntas.
- Integrarse con Telesalud, Rayén, Tu Hora Fácil o el sistema de agenda.
- Inicio de sesión real, usuarios y permisos. Para la demo basta con un solo usuario ficticio.
- Despliegue en la nube o en servidores de la Corporación.
- El mensaje fijo de urgencia para el vecino. Está pendiente de validación clínica y no aplica a la opción A.

---

## 5. Datos

### 5.1 Formato de entrada

**El formato real de la exportación de Telesalud está [PENDIENTE]:** todavía no se sabe qué columnas trae, en qué formato ni cada cuánto se descarga. Mientras tanto, se usa este formato **propuesto**, que hay que aprobar en la tarea correspondiente:

| Campo | Descripción | Estado |
|---|---|---|
| `id_solicitud` | Identificador ficticio | Propuesto |
| `fecha_ingreso` | Fecha y hora de ingreso | Propuesto |
| `tipo_profesional` | El profesional que eligió el vecino | [CONFIRMADO] que existe el campo. **La lista completa de valores está [PENDIENTE].** |
| `motivo` | El motivo elegido en la lista | [CONFIRMADO] que existe el campo. **La lista completa de valores está [PENDIENTE].** |
| `texto_libre` | "Información Adicional", máximo 300 caracteres | [CONFIRMADO] |
| `edad` | Edad en años, necesaria para la alerta de 60 años o más | **[PENDIENTE]** si viene en la exportación |

El formato tiene que quedar en un solo lugar (un esquema). Así, cuando se conozca el formato real, se ajusta en un solo archivo.

### 5.2 Formato de salida de la IA

Esta es la propuesta; hay que aprobarla en la tarea correspondiente.

```json
{
  "id_solicitud": "string",
  "prioridad_sugerida": "alta | media | baja",
  "profesional_sugerido": "string (de la lista permitida)",
  "alertas": ["urgencia", "violencia", "ideacion_suicida", "descompensacion", "persona_mayor_60", "ges"],
  "justificacion": "string breve, sin indicaciones clínicas",
  "confianza": "alta | media | baja"
}
```

- Los valores permitidos se validan con un esquema; con Zod, según `CLAUDE.md`.
- Que `alertas` venga vacío es válido.
- **[PENDIENTE]:** qué significan las prioridades "1 a 4" que se mencionaron en el centro. Fernanda describió tres niveles. Mientras no se aclare, se usan tres.

### 5.3 Datos sintéticos

- **Cantidad: [PENDIENTE].** La propuesta es entre 60 y 100 solicitudes, para que la evaluación tenga sentido como ejemplo.
- Tienen que cubrir casos fáciles, casos ambiguos (por ejemplo, "Otros" con un texto que esconde una urgencia), cada una de las alertas, y casos sin ninguna alerta.
- Cada solicitud lleva una clasificación de referencia, escrita a mano o revisada por Candela.
- **Importante:** la clasificación de referencia de los datos sintéticos **la definimos nosotras, no los triajistas**. Los resultados de la evaluación demuestran **el método**, no la calidad real de la IA. Esto debe quedar escrito en el README y en la pantalla de evaluación.

---

## 6. Evaluación

| Métrica | Qué mide | Importancia |
|---|---|---|
| **Alertas urgentes no detectadas** | Cuántas solicitudes con alerta crítica (urgencia, violencia, ideación suicida, descompensación) **no** fueron marcadas por la IA. Es la sensibilidad (tasa de detección). | **La más crítica.** Un error aquí es el más grave. |
| Concordancia de prioridad | Porcentaje de veces en que la prioridad sugerida coincide con la de referencia, más una tabla de aciertos y errores por nivel (matriz de confusión). | Alta |
| Concordancia de profesional | Porcentaje de coincidencia del profesional sugerido. | Media |
| Falsas alertas | Alertas marcadas sin que corresponda. | Media: generan carga de trabajo, pero no ponen en riesgo a nadie. |
| Respuestas inválidas | Porcentaje de respuestas que no cumplieron el esquema. | Técnica |

- **Umbrales para pasar a uso real: [PENDIENTE].** Se definen con la UAI y los triajistas. El MVP solo calcula y muestra las métricas, sin dar un "aprobado".
- El **tiempo desde el ingreso hasta la primera revisión** es un indicador del piloto real. El MVP no lo puede medir.

---

## 7. Orden de la bandeja

**Propuesta [INFERENCIA], por validar con los triajistas.** La bandeja se ordena con estos criterios, en este orden:

1. Primero, las solicitudes con alerta crítica.
2. Después, por prioridad sugerida: alta, media y baja.
3. Dentro de cada grupo, por antigüedad: la más antigua primero.

Las solicitudes "no clasificadas" se muestran aparte, en un lugar visible. Nunca se esconden al final.

---

## 8. Tecnología

- **Stack:** Node.js, según `CLAUDE.md` (arquitectura en capas, async/await, Zod, pruebas con Jest y Supertest).
- **Interfaz:** se necesita una pantalla simple para el video. Cómo hacerla (HTML servido por el mismo backend, un framework u otra opción) **se decide en la fase de Especificación** y se documenta en `/docs/decisiones`.
- **Proveedor de IA: [PENDIENTE].** Hay que confirmar a qué API hay acceso. El diseño debe tener un adaptador por proveedor y un modo simulado (R4 y R5).
- **El prompt del modelo** va en su propio archivo, con número de versión. Ese número se guarda en el registro de cada sugerencia.
- **Modelos a considerar para el video:** se comparan según su desempeño en español de Chile, su política de privacidad y retención de datos, el costo por solicitud y si se alojan con un proveedor o son modelos abiertos. **No se da ninguno por elegido.**

---

## 9. Tareas sugeridas

Según `CLAUDE.md`, las tareas las crea Candela con "crea una tarea: [nombre]". Este es el orden sugerido. Las marcadas con ★ son el mínimo para el video.

| Orden | Tarea sugerida | Mínimo para el video |
|---|---|---|
| 1 | Estructura base del repositorio (git, carpetas Kanban, `.gitignore`, `.env.example`, README inicial) | ★ |
| 2 | Esquemas de entrada y salida | ★ |
| 3 | Generador o archivo de datos sintéticos con clasificación de referencia | ★ |
| 4 | Prompt del modelo y adaptador de IA con modo simulado | ★ |
| 5 | Servicio de clasificación y orden de la bandeja | ★ |
| 6 | Interfaz de bandeja con confirmar o corregir | ★ |
| 7 | Registro de decisiones | |
| 8 | Script y pantalla de evaluación | ★ |
| 9 | Diagrama de arquitectura y guion de la demo | ★ |

**Plazo: [PENDIENTE].** El borrador para la UAI vence el lunes 23 de noviembre de 2026. Falta confirmar si el MVP debe estar listo ese día o antes del cierre del 29 de noviembre.

---

## 10. Preguntas abiertas

Antes de la tarea que corresponda, hay que preguntarle estas cosas a Candela:

1. ¿A qué API de modelo hay acceso para la demo? ¿O se trabaja solo en modo simulado?
2. ¿Qué licencia abierta se usará? Se confirma con la UAI.
3. ¿Cuál es la lista completa de tipos de profesional y de motivos de Telesalud?
4. ¿La exportación trae la edad o la fecha de nacimiento?
5. ¿Qué significan las prioridades 1 a 4?
6. ¿Cuántas solicitudes sintéticas se generan?
7. ¿Cuál es la fecha límite del MVP?
8. ¿Qué tecnología se usa para la interfaz?

---

## 11. Declaración de uso de IA

Las bases piden declarar qué herramientas de IA se usaron y para qué (pregunta 52 del formulario). Cada tarea cerrada en `/done` debe dejar anotado en "Notas de cierre" si se usó Claude Code y para qué. Así, la declaración se puede armar al final sin reconstruir nada.
