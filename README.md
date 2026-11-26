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

## Sobre los datos sintéticos y la evaluación

El proyecto incluye 60 solicitudes inventadas en `data/sinteticos/solicitudes.json`. Cada una tiene su clasificación de referencia, es decir, la "respuesta correcta", en `data/sinteticos/referencia.json`. Esa respuesta se usa para medir qué tan bien clasifica la IA.

Para leer bien los resultados de la evaluación, hay que tener en cuenta dos cosas:

- **La clasificación de referencia la definimos nosotras, no los triajistas.** Usamos criterios provisionales, propios y no clínicos. Por eso, la evaluación demuestra **el método** para medir a la IA, no su calidad real.
- **Los textos sintéticos los escribió una IA.** Es posible que una IA entienda mejor los textos escritos por otra IA que los que escriben los vecinos. Por eso, la evaluación podría mostrar resultados mejores que los que se obtendrían con textos reales.

**Qué significa la alerta "urgencia"** (criterio provisional, nuestro y no clínico): se agrega cuando hay riesgo inmediato. Esto incluye un intento reciente o una autolesión activa; señales de alarma vital en una descompensación; o violencia con amenaza grave, o contra una víctima vulnerable (una embarazada, un niño o niña, o una persona mayor) que convive con quien la agrede o depende de esa persona. Esta alerta indica que la gestora tiene que gestionar el caso de inmediato, sin esperar el plazo de la prioridad.

Para revisar los casos en Excel, ejecuta `npm run revision:csv`. Así se genera `data/sinteticos/revision.csv`, una tabla con cada solicitud junto a su referencia.

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

## Cómo se conecta con la IA

El MVP clasifica de tres formas. Cada resultado dice de cuál viene (su `origen`), para que nunca parezca real algo que es simulado:

| Modo | Cuándo se usa | Qué hace |
|---|---|---|
| **Simulado** (predeterminado) | No hay clave, o `MODO_IA=simulado` | Busca palabras clave. **No es un modelo de IA**, y su justificación lo dice. |
| **Modelo real** | Hay una clave en `IA_API_KEY` y `MODO_IA` está vacío | Llama al proveedor configurado en el `.env`. |
| **Repetición** | `MODO_IA=repeticion` | Muestra las respuestas guardadas de una corrida real anterior, sin internet. |

Para cambiar de proveedor (NVIDIA, OpenAI u otro compatible con OpenAI) basta con editar `IA_URL_BASE`, `IA_MODELO` e `IA_API_KEY` en el `.env`. Los modelos del catálogo pueden retirarse: `npm run ia:modelos` muestra los disponibles hoy. El modelo principal es `mistralai/mistral-large-4-1t-a52b`, y `minimaxai/minimax-m3.1-flash` se usa como respaldo y comparación (ver la decisión 005). La clave nunca se muestra en pantalla ni se guarda en los resultados.

**Aviso**: las palabras clave del modo simulado se escribieron conociendo los 60 textos sintéticos. Por eso, sobre esos casos coincide mucho con la referencia, pero ese número no mide nada. Solo los resultados del modelo real sirven para evaluar.

## Comandos disponibles

| Comando | Qué hace |
|---|---|
| `npm run iniciar` | Enciende la pantalla de la bandeja en http://localhost:3000 (en Windows: `npm.cmd run iniciar`). Se apaga con Ctrl + C. |
| `npm test` | Ejecuta las pruebas automáticas. |
| `npm run lint` | Revisa que el código no tenga errores ni malas prácticas. |
| `npm run format` | Ordena el formato del código. |
| `npm run revision:csv` | Genera la tabla de revisión de los datos sintéticos para Excel. |
| `npm run ia:modelos` | Muestra los modelos que el proveedor del `.env` ofrece hoy, para elegir `IA_MODELO`. |
| `npm run ia:probar` | Manda una solicitud sintética al modelo real para confirmar que la clave y el modelo funcionan. |
| `npm run clasificar:sinteticos` | Clasifica las 60 solicitudes sintéticas de a una y guarda los resultados en `data/resultados/`, con el tiempo de cada respuesta. Con `-- --modelo <id>` usa otro modelo solo para esa corrida, sin cambiar el `.env`. Con `--tiempo-espera <ms>` y `--pausa <ms>` cambia la espera máxima por respuesta y la pausa entre casos, también solo para esa corrida. Con `-- --reintentar data/resultados/<archivo>.json` vuelve a clasificar solo las no clasificadas de esa corrida, con el mismo modelo, y actualiza el archivo. |
| `npm run revision:r3 -- <archivo> [<otro archivo>]` | Genera una tabla para Excel con las justificaciones del modelo, para revisar a mano que no den indicaciones clínicas (regla R3). Con dos archivos, genera una tabla por modelo y marca los casos donde difieren en prioridad, profesional o alertas críticas. Nunca sobrescribe una tabla que ya existe, para no borrar los comentarios de la revisión. |

## Cómo está organizado

| Carpeta | Contenido |
|---|---|
| `src/` | Código de la aplicación, separado por capas (controladores, servicios y repositorios). |
| `tests/` | Pruebas automáticas. |
| `data/sinteticos/` | Solicitudes inventadas, su clasificación de referencia y la tabla de revisión. |
| `data/resultados/` | Resultados de cada corrida de clasificación, con su origen, modelo, versión del prompt y fecha. |
| `scripts/` | Programas de apoyo que se ejecutan con un comando (por ejemplo, el que genera la tabla de revisión). |
| `public/` | La pantalla: HTML, estilos, código del navegador, logo, íconos y la fuente Inter. |
| `docs/` | Requerimientos del proyecto, decisiones técnicas y referencias de diseño (`docs/diseno/`). |
| `backlog/`, `in-progress/`, `done/` | Tareas por hacer, en curso y terminadas. |
| `TASKS.md` | Índice de todas las tareas. |

La forma de trabajar está descrita en [`CLAUDE.md`](CLAUDE.md) y lo que se construye, en [`docs/requerimientos.md`](docs/requerimientos.md).

## Licencias de terceros

- Fuente **Inter**: licencia SIL Open Font License 1.1 (`public/fuentes/LICENCIA-Inter-OFL.txt`).
- Íconos y logo basados en **Lucide**: licencia ISC (`public/LICENCIA-Lucide.txt`).

## Licencia

**Pendiente.** El código se publicará con una licencia abierta, que se definirá con la Universidad Adolfo Ibáñez.
