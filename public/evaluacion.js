import { $, el, NOMBRES_ALERTAS, NOMBRES_PRIORIDAD } from './dom.js';

/**
 * Pestaña "Evaluación" (tarea 008), con estilo de tablero analítico.
 *
 * Todos los números salen de /api/evaluacion, que los calcula desde las corridas guardadas.
 * Ninguno se escribe a mano aquí. No hay veredicto ni "ganador": son 60 casos sintéticos con una
 * referencia del equipo, y los umbrales para uso real están por definir con el equipo clínico.
 *
 * Colores: cada modelo tiene su tono (azul petróleo y gris pizarra). El rojo se usa solo para lo
 * crítico.
 */

const ALERTAS_CRITICAS = ['urgencia', 'violencia', 'ideacion_suicida', 'descompensacion'];

const NIVELES = Object.freeze({
  critico: { texto: 'Crítico', clase: 'eval-nivel--critico' },
  moderado: { texto: 'Moderado', clase: 'eval-nivel--moderado' },
  menor: { texto: 'Menor', clase: 'eval-nivel--menor' },
});

/** 85.7 → "85,7 %" (con coma, como se escribe en Chile). */
const formatoPorcentaje = (valor) =>
  valor === null || valor === undefined
    ? '—'
    : `${valor.toLocaleString('es-CL', { maximumFractionDigits: 1 })} %`;

const segundos = (ms) => (ms === null || ms === undefined ? '—' : `${Math.round(ms / 1000)} s`);

const nombresAlertas = (alertas) => alertas.map((a) => NOMBRES_ALERTAS[a] ?? a).join(' + ');

const lista = (ids) => (ids.length === 0 ? 'ninguna' : ids.join(', '));

/** Clase de color de cada modelo, según su posición (el primero, azul petróleo; el segundo, gris). */
const claseModelo = (indice) => `eval-modelo-${indice === 0 ? 'a' : 'b'}`;

const punto = (indice) =>
  el('span', { clase: `eval-punto ${claseModelo(indice)}`, 'aria-hidden': 'true' });

const seccion = (titulo, ...contenido) =>
  el(
    'section',
    { clase: 'eval-seccion' },
    el('h3', { clase: 'eval-seccion__titulo' }, titulo),
    ...contenido,
  );

const leyenda = (modelos) =>
  el(
    'p',
    { clase: 'eval-leyenda' },
    modelos.map((m, i) => el('span', {}, punto(i), m.nombre)),
  );

// ── Tarjetas grandes ─────────────────────────────────────────────

const indicador = (valor, titulo, { critico = false } = {}) =>
  el(
    'div',
    { clase: 'eval-indicador' },
    el('p', { clase: `eval-indicador__valor${critico ? ' eval-critico' : ''}` }, valor),
    el('p', { clase: 'eval-indicador__titulo' }, titulo),
  );

const tarjetaModelo = (m, indice) => {
  if (m.error) {
    return el(
      'article',
      { clase: 'eval-tarjeta' },
      el('h3', { clase: 'eval-tarjeta__nombre' }, m.nombre ?? m.modelo),
      el('p', { clase: 'vacio' }, m.error),
    );
  }
  const c = m.alertas_criticas;
  return el(
    'article',
    { clase: `eval-tarjeta ${claseModelo(indice)}` },
    el('h3', { clase: 'eval-tarjeta__nombre' }, punto(indice), m.nombre),
    el('p', { clase: 'eval-nota' }, `${m.modelo} · prompt v${m.version_prompt ?? '?'}`),
    el(
      'div',
      { clase: 'eval-indicadores' },
      indicador(`${c.no_detectadas} de ${c.total}`, 'Alertas críticas no detectadas', {
        critico: c.no_detectadas > 0,
      }),
      indicador(`${m.clasificadas} de ${m.total}`, 'Clasificadas'),
      indicador(formatoPorcentaje(m.prioridad.porcentaje), 'Concordancia de prioridad'),
      indicador(segundos(m.tiempo.promedio_ms), 'Tiempo promedio por solicitud'),
    ),
    c.casos_no_detectados.length > 0
      ? el(
          'ul',
          { clase: 'eval-casos-criticos' },
          c.casos_no_detectados.map((caso) =>
            el(
              'li',
              {},
              el('strong', {}, caso.id),
              ` · ${nombresAlertas(caso.alertas_referencia)} · `,
              caso.sin_clasificar ? 'quedó sin clasificar' : 'no marcó alerta crítica',
            ),
          ),
        )
      : null,
    el(
      'p',
      { clase: 'eval-nota eval-tarjeta__pie' },
      `Profesional: ${formatoPorcentaje(m.profesional.porcentaje)} · ` +
        `falsas alertas críticas: ${m.falsas_alertas.criticas} (otras: ${m.falsas_alertas.otras}) · ` +
        `no clasificadas: ${m.no_clasificadas.error_proveedor.length} por error del proveedor, ` +
        `${m.no_clasificadas.respuesta_invalida.length} por respuesta inválida · ` +
        `${m.reintentos.necesitaron_reintento} necesitaron reintento (${m.reintentos.recuperados} recuperados)`,
    ),
  );
};

// ── Gráficos de barras ───────────────────────────────────────────

/**
 * Gráfico de barras horizontales: una fila por categoría y una barra por modelo.
 * Cada barra lleva su número escrito, así el gráfico se entiende también sin colores.
 */
const graficoBarras = (titulo, nota, categorias, modelos) =>
  el(
    'div',
    { clase: 'eval-grafico' },
    el('p', { clase: 'eval-grafico__titulo' }, titulo),
    el('p', { clase: 'eval-nota' }, nota),
    leyenda(modelos),
    categorias.map((categoria) =>
      el(
        'div',
        { clase: 'eval-grafico__fila' },
        el('p', { clase: 'eval-grafico__etiqueta' }, categoria.nombre),
        el(
          'div',
          { clase: 'eval-grafico__barras' },
          modelos.map((m, i) => {
            const { porcentaje, texto } = categoria.valor(m);
            return el(
              'div',
              { clase: 'eval-barra' },
              el(
                'div',
                { clase: 'eval-barra__pista', 'aria-hidden': 'true' },
                el('div', {
                  clase: `eval-barra__relleno ${claseModelo(i)}`,
                  style: `width: ${Math.max(0, Math.min(100, porcentaje ?? 0))}%`,
                }),
              ),
              el('span', { clase: 'eval-barra__valor' }, `${m.nombre}: ${texto}`),
            );
          }),
        ),
      ),
    ),
    el(
      'div',
      { clase: 'eval-grafico__eje', 'aria-hidden': 'true' },
      ['0', '50', '100 %'].map((t) => el('span', {}, t)),
    ),
  );

const graficoAlertas = (modelos) =>
  graficoBarras(
    'Detección por tipo de alerta crítica',
    'De las solicitudes que tienen esa alerta en la referencia, cuántas marcó el modelo.',
    ALERTAS_CRITICAS.map((alerta) => ({
      nombre: NOMBRES_ALERTAS[alerta],
      valor: (m) => {
        const a = m.por_alerta.find((x) => x.alerta === alerta);
        const porcentaje = a.referencia === 0 ? null : (a.detectadas / a.referencia) * 100;
        return {
          porcentaje,
          texto: `${a.detectadas} de ${a.referencia} (${formatoPorcentaje(
            porcentaje === null ? null : Math.round(porcentaje * 10) / 10,
          )})`,
        };
      },
    })),
    modelos,
  );

const graficoPrioridad = (modelos) =>
  graficoBarras(
    'Concordancia por nivel de prioridad',
    'De las solicitudes con esa prioridad en la referencia, en cuántas el modelo sugirió la misma.',
    ['alta', 'media', 'baja'].map((nivel) => ({
      nombre: NOMBRES_PRIORIDAD[nivel],
      valor: (m) => {
        const n = m.prioridad.por_nivel.find((x) => x.prioridad === nivel);
        return {
          porcentaje: n.porcentaje,
          texto: `${n.coincidencias} de ${n.total} (${formatoPorcentaje(n.porcentaje)})`,
        };
      },
    })),
    modelos,
  );

// ── Tablas ───────────────────────────────────────────────────────

const tabla = (encabezados, filas, clase = 'eval-tabla') =>
  el(
    'div',
    { clase: 'eval-tabla-marco' },
    el(
      'table',
      { clase },
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          encabezados.map((t) => el('th', { scope: 'col' }, t)),
        ),
      ),
      el('tbody', {}, filas),
    ),
  );

const tablaPorAlerta = (modelos) =>
  tabla(
    ['Alerta', 'En la referencia', ...modelos.map((m) => m.nombre)],
    modelos[0].por_alerta.map((referencia) =>
      el(
        'tr',
        {},
        el(
          'th',
          { scope: 'row', clase: referencia.critica ? 'eval-critico' : '' },
          NOMBRES_ALERTAS[referencia.alerta] ?? referencia.alerta,
          referencia.critica ? ' (crítica)' : '',
        ),
        el('td', {}, String(referencia.referencia)),
        modelos.map((m) => {
          const a = m.por_alerta.find((x) => x.alerta === referencia.alerta);
          return el(
            'td',
            {},
            el('span', {}, `${a.detectadas} de ${a.referencia} marcadas`),
            el('span', { clase: 'eval-nota eval-bloque' }, `Faltaron: ${lista(a.no_detectadas)}`),
            el('span', { clase: 'eval-nota eval-bloque' }, `De más: ${lista(a.de_mas)}`),
          );
        }),
      ),
    ),
  );

const matrizPrioridad = (m, indice) => {
  const nombreColumna = (c) => (c === 'sin_respuesta' ? 'Sin respuesta' : NOMBRES_PRIORIDAD[c]);
  return el(
    'div',
    {},
    el('p', { clase: 'eval-subtitulo' }, punto(indice), m.nombre),
    tabla(
      ['Referencia ↓ · IA →', ...m.prioridad.columnas.map(nombreColumna)],
      Object.entries(m.prioridad.matriz).map(([fila, valores]) =>
        el(
          'tr',
          {},
          el('th', { scope: 'row' }, NOMBRES_PRIORIDAD[fila]),
          m.prioridad.columnas.map((col) =>
            el(
              'td',
              { clase: col === fila ? 'eval-acierto' : valores[col] > 0 ? 'eval-error' : '' },
              String(valores[col]),
            ),
          ),
        ),
      ),
      'eval-tabla eval-tabla--matriz',
    ),
  );
};

const tablaDiferencias = (m, indice) =>
  el(
    'div',
    {},
    el('p', { clase: 'eval-subtitulo' }, punto(indice), m.nombre),
    m.diferencias.length === 0
      ? el('p', { clase: 'eval-nota' }, 'Sin diferencias con la referencia.')
      : tabla(
          ['Nivel', 'Solicitud', 'Diferencia'],
          m.diferencias.map((d) =>
            el(
              'tr',
              {},
              el(
                'td',
                {},
                el(
                  'span',
                  { clase: `eval-nivel ${NIVELES[d.nivel].clase}` },
                  NIVELES[d.nivel].texto,
                ),
              ),
              el('td', { clase: 'eval-id' }, d.id),
              el('td', {}, d.descripcion),
            ),
          ),
        ),
  );

const motivosReintento = (modelos) =>
  el(
    'ul',
    { clase: 'eval-lista' },
    modelos.map((m) =>
      el(
        'li',
        {},
        el('strong', {}, `${m.nombre}: `),
        m.reintentos.motivos_primera_pasada.length === 0
          ? 'ningún caso necesitó reintento.'
          : m.reintentos.motivos_primera_pasada
              .map((x) => `${x.motivo} (${x.cantidad})`)
              .join(' · '),
      ),
    ),
  );

const hallazgosR3 = (modelos) => {
  const hallazgos = modelos.flatMap((m) => m.hallazgos_r3.map((h) => ({ ...h, modelo: m.nombre })));
  return [
    el(
      'p',
      { clase: 'eval-nota' },
      'Por qué el triajista siempre lee el texto original: en la revisión manual de las justificaciones (regla R3) aparecieron estos casos.',
    ),
    hallazgos.length === 0
      ? el('p', { clase: 'eval-nota' }, 'Sin hallazgos anotados.')
      : el(
          'ul',
          { clase: 'eval-lista' },
          hallazgos.map((h) =>
            el('li', {}, el('strong', {}, `${h.modelo} · ${h.id}: `), h.comentario),
          ),
        ),
  ];
};

/** Tabla "Modelos considerados" (también la usa la pestaña "Cómo funciona"). */
export const modelosConsiderados = (filas) =>
  tabla(
    ['Modelo', 'Lo medido (60 casos sintéticos)', 'Privacidad y retención', 'Costo', 'Alojamiento'],
    filas.map((f) =>
      el(
        'tr',
        {},
        el('th', { scope: 'row' }, f.modelo),
        el('td', {}, f.medido),
        el('td', {}, f.privacidad),
        el('td', {}, f.costo),
        el('td', {}, f.alojamiento),
      ),
    ),
  );

// ── Pantalla ─────────────────────────────────────────────────────

const dibujar = (datos) => {
  const evaluados = datos.modelos.filter((m) => !m.error);
  const partes = [
    el('p', { clase: 'eval-aviso' }, datos.aviso),
    el('div', { clase: 'eval-tarjetas' }, datos.modelos.map(tarjetaModelo)),
    el(
      'p',
      { clase: 'eval-nota eval-sin-veredicto' },
      `Comparación sobre ${datos.casos} casos sintéticos. Sin veredicto: los umbrales para uso real se definirán con el equipo clínico. Esta pantalla no aprueba ni elige un modelo.`,
    ),
    evaluados.length > 0
      ? [
          el(
            'section',
            { clase: 'eval-seccion eval-graficos' },
            graficoAlertas(evaluados),
            graficoPrioridad(evaluados),
          ),
          seccion(
            'Matriz de prioridad',
            el('div', { clase: 'eval-columnas' }, evaluados.map(matrizPrioridad)),
          ),
          seccion(
            'Diferencias entre la IA y la referencia',
            el(
              'p',
              { clase: 'eval-nota' },
              'Crítico: alerta crítica no detectada. Moderado: otra prioridad. Menor: falsa alerta.',
            ),
            el('div', { clase: 'eval-columnas' }, evaluados.map(tablaDiferencias)),
          ),
          seccion('Detalle por alerta', tablaPorAlerta(evaluados)),
          seccion('Hallazgos de la revisión R3', ...hallazgosR3(evaluados)),
          seccion('Por qué fallaron en la primera pasada', motivosReintento(evaluados)),
        ]
      : null,
    seccion('Modelos considerados', modelosConsiderados(datos.modelos_considerados)),
    el(
      'div',
      { clase: 'eval-piloto' },
      el('p', { clase: 'eval-seccion__titulo' }, 'Se medirá en el piloto real'),
      el(
        'p',
        { clase: 'eval-nota' },
        'Tiempo desde el ingreso hasta la primera revisión; cumplimiento del plazo según la prioridad.',
      ),
    ),
  ];
  // Las secciones de detalle vienen en una lista: se aplanan antes de ponerlas en la página.
  $('evaluacion-contenido').replaceChildren(...partes.flat().filter(Boolean));
};

let pedido = null;

/** Pide la evaluación una sola vez: las corridas no cambian mientras se usa el programa. */
export const obtenerEvaluacion = (llamar) => {
  pedido ??= llamar('GET', '/api/evaluacion').catch((error) => {
    pedido = null; // si falló, se puede volver a intentar
    throw error;
  });
  return pedido;
};

let cargada = false;

/** Muestra la evaluación. */
export const mostrarEvaluacion = async (llamar) => {
  if (cargada) return;
  $('evaluacion-contenido').replaceChildren(el('p', { clase: 'eval-nota' }, 'Calculando…'));
  try {
    dibujar(await obtenerEvaluacion(llamar));
    cargada = true;
  } catch (error) {
    $('evaluacion-contenido').replaceChildren(
      el('p', { clase: 'vacio' }, `No se pudo cargar la evaluación: ${error.message}`),
    );
  }
};
