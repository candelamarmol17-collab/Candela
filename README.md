# Bandeja priorizada de Telesalud (MVP)

Prototipo que muestra cómo una inteligencia artificial (IA) generativa podría ayudar a ordenar las solicitudes de Telesalud de un CESFAM, para que lo urgente se revise primero.

Lo prepara la Corporación Municipal de Melipilla junto con la Universidad Adolfo Ibáñez para postular a **Cities Deliver**.

## Qué hace

Por cada solicitud, la IA lee el motivo y el texto libre y **sugiere**:

- una prioridad (alta, media o baja);
- el profesional que debería atenderla;
- alertas (por ejemplo, urgencia o persona de 60 años o más);
- una justificación breve.

**Siempre decide una persona.** El triajista clínico confirma o corrige cada sugerencia. La IA no da indicaciones clínicas ni contacta al vecino.

## Avisos importantes

- **Solo usa datos sintéticos (inventados).** Este repositorio no contiene ni debe contener datos reales de pacientes.
- **No es un sistema productivo.** No se conecta a Telesalud, a Rayén ni a ningún sistema real.
- **Funciona sin internet.** Tiene un modo simulado que no necesita conectarse a un proveedor de IA.

## Cómo instalarlo

Necesitas tener instalado [Node.js](https://nodejs.org/) versión 26 o superior.

1. Abre una terminal en la carpeta del proyecto.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Copia el archivo `.env.example` con el nombre `.env`. Ahí va la configuración local, que nunca se sube a git.
4. Revisa que todo funcione:
   ```bash
   npm test
   ```

## Comandos disponibles

| Comando | Qué hace |
|---|---|
| `npm test` | Ejecuta las pruebas automáticas. |
| `npm run lint` | Revisa que el código no tenga errores ni malas prácticas. |
| `npm run format` | Ordena el formato del código. |

## Cómo está organizado

| Carpeta | Contenido |
|---|---|
| `src/` | Código de la aplicación, separado por capas (controladores, servicios y repositorios). |
| `tests/` | Pruebas automáticas. |
| `docs/` | Requerimientos del proyecto y decisiones técnicas. |
| `backlog/`, `in-progress/`, `done/` | Tareas por hacer, en curso y terminadas. |
| `TASKS.md` | Índice de todas las tareas. |

La forma de trabajar está descrita en [`CLAUDE.md`](CLAUDE.md) y lo que se construye, en [`docs/requerimientos.md`](docs/requerimientos.md).

## Licencia

**Pendiente.** El código se publicará con una licencia abierta, que se definirá con la Universidad Adolfo Ibáñez.
