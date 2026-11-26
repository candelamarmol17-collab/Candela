import { $, el, NOMBRES_ALERTAS, NOMBRES_PRIORIDAD } from './dom.js';

/**
 * Pestaña "Registro" (tarea 007): lo que pasó en esta sesión de demostración.
 *
 * Los eventos vienen de /api/bandeja (estado.registro). Viven en la memoria del programa y se
 * borran con "Reiniciar demo" o al apagarlo. No guardan el texto de la solicitud ni datos
 * personales: solo códigos, catálogos y el motivo de la corrección.
 */

export const NOMBRES_ACCION = Object.freeze({
  confirmada: 'Confirmada',
  corregida: 'Corregida',
  deshecha: 'Deshecha',
  exportacion_cargada: 'Exportación cargada',
});

const NOMBRES_ESTADO = Object.freeze({
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  corregida: 'Corregida',
});

const ZONA_HORARIA = 'America/Santiago';

const hora = (iso) =>
  new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: ZONA_HORARIA,
  }).format(new Date(iso));

// Estado de la pestaña: los eventos, el filtro y la fila elegida.
const vista = { registro: null, texto: '', accion: '', elegido: null };

const eventosFiltrados = () => {
  const texto = vista.texto.trim().toLowerCase();
  return vista.registro.eventos.filter(
    (e) =>
      (!vista.accion || e.accion === vista.accion) &&
      (!texto || (e.id_solicitud ?? '').toLowerCase().includes(texto)),
  );
};

const etiquetaResultado = (evento) =>
  el('span', { clase: `reg-resultado reg-resultado--${evento.accion}` }, evento.resultado);

// ── Contadores ───────────────────────────────────────────────────

const contador = (valor, texto, clase = '') =>
  el(
    'div',
    { clase: `reg-contador ${clase}` },
    el('span', { clase: 'reg-contador__valor' }, valor),
    el('span', { clase: 'reg-contador__texto' }, texto),
  );

const dibujarContadores = () => {
  const { confirmadas, corregidas, porcentaje_correccion: porcentaje } = vista.registro.resumen;
  $('registro-contadores').replaceChildren(
    contador(String(confirmadas), 'confirmadas', 'reg-contador--confirmada'),
    contador(String(corregidas), 'corregidas', 'reg-contador--corregida'),
    contador(porcentaje === null ? '—' : `${porcentaje} %`, 'de corrección'),
  );
};

// ── Tabla ────────────────────────────────────────────────────────

const elegir = (numero) => {
  vista.elegido = numero;
  dibujarTabla();
  dibujarFicha();
};

const fila = (evento) =>
  el(
    'tr',
    {
      clase: `reg-fila${evento.numero === vista.elegido ? ' reg-fila--elegida' : ''}`,
      tabindex: '0',
      'aria-selected': evento.numero === vista.elegido ? 'true' : 'false',
      alClick: () => elegir(evento.numero),
      alKeydown: (tecla) => {
        if (tecla.key === 'Enter' || tecla.key === ' ') {
          tecla.preventDefault();
          elegir(evento.numero);
        }
      },
    },
    el('td', { clase: 'reg-hora' }, hora(evento.hora)),
    el('td', { clase: 'reg-solicitud' }, evento.id_solicitud ?? '—'),
    el('td', {}, NOMBRES_ACCION[evento.accion] ?? evento.accion),
    el('td', { clase: 'reg-quien' }, evento.quien),
    el('td', { clase: 'reg-celda-resultado' }, etiquetaResultado(evento)),
  );

const dibujarTabla = () => {
  const total = vista.registro.eventos.length;
  const lista = eventosFiltrados();
  $('registro-cantidad').textContent =
    lista.length === total ? `${total} eventos` : `${lista.length} de ${total} eventos`;
  if (total === 0) {
    $('registro-tabla').replaceChildren(
      el(
        'p',
        { clase: 'reg-vacio' },
        'Todavía no hay eventos. Carga la exportación en la Bandeja y confirma o corrige una sugerencia.',
      ),
    );
    return;
  }
  if (lista.length === 0) {
    $('registro-tabla').replaceChildren(
      el('p', { clase: 'reg-vacio' }, 'Ningún evento coincide con la búsqueda.'),
    );
    return;
  }
  $('registro-tabla').replaceChildren(
    el(
      'table',
      { clase: 'reg-tabla' },
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          el('th', { scope: 'col' }, 'Hora'),
          el('th', { scope: 'col' }, 'Solicitud'),
          el('th', { scope: 'col' }, 'Acción'),
          el('th', { scope: 'col' }, 'Quién'),
          el('th', { scope: 'col', clase: 'reg-celda-resultado' }, 'Resultado'),
        ),
      ),
      el('tbody', {}, lista.map(fila)),
    ),
  );
};

// ── Ficha de decisión ────────────────────────────────────────────

const clasificacion = (c) => {
  if (!c) return el('span', { clase: 'reg-suave' }, 'Sin sugerencia: la IA no pudo clasificarla.');
  return el(
    'span',
    { clase: 'reg-clasificacion' },
    el(
      'span',
      { clase: `reg-chip reg-chip--${c.prioridad}` },
      `Prioridad ${NOMBRES_PRIORIDAD[c.prioridad] ?? c.prioridad}`,
    ),
    el('span', { clase: 'reg-chip' }, c.profesional),
    c.alertas.length === 0
      ? el('span', { clase: 'reg-suave' }, 'sin alertas')
      : c.alertas.map((a) =>
          el('span', { clase: 'reg-chip reg-chip--alerta' }, NOMBRES_ALERTAS[a] ?? a),
        ),
  );
};

const renglon = (titulo, valor) =>
  el('div', { clase: 'reg-renglon' }, el('dt', {}, titulo), el('dd', {}, valor));

const modeloYPrompt = (ficha) =>
  `${ficha.modelo} · prompt versión ${ficha.version_prompt ?? 'desconocida'}`;

const renglonesFicha = (evento) => {
  const { ficha } = evento;
  if (evento.accion === 'exportacion_cargada') {
    return [
      renglon('Exportación', ficha.exportacion),
      renglon('Solicitudes nuevas', String(ficha.solicitudes_nuevas)),
      renglon(
        'Datos personales separados',
        `${ficha.columnas_personales_separadas} columnas antes de la IA · ${ficha.datos_tapados_en_texto} datos tapados en el texto`,
      ),
      renglon('Modelo y prompt', modeloYPrompt(ficha)),
      renglon('Hora', hora(evento.hora)),
    ];
  }
  const anulada = evento.accion === 'deshecha';
  return [
    anulada &&
      renglon(
        'Qué se deshizo',
        `${ficha.accion_anulada === 'corregida' ? 'Una corrección' : 'Una confirmación'}. La solicitud vuelve a "${NOMBRES_ESTADO[ficha.vuelve_a] ?? ficha.vuelve_a}".`,
      ),
    renglon('Qué sugirió la IA', clasificacion(ficha.sugerencia_ia)),
    renglon(
      anulada ? 'Decisión anulada' : 'Qué decidió el triajista',
      clasificacion(ficha.decision),
    ),
    (ficha.motivo || evento.accion === 'corregida' || ficha.accion_anulada === 'corregida') &&
      renglon(
        'Motivo de la corrección',
        ficha.motivo ?? el('span', { clase: 'reg-suave' }, 'No se escribió un motivo.'),
      ),
    renglon('Modelo y prompt', modeloYPrompt(ficha)),
    renglon('Hora', hora(evento.hora)),
  ];
};

const dibujarFicha = () => {
  $('registro-ficha').hidden = vista.registro.eventos.length === 0;
  const evento = vista.registro.eventos.find((e) => e.numero === vista.elegido);
  if (!evento) {
    $('registro-ficha').replaceChildren(
      el('p', { clase: 'reg-vacio' }, 'Elige una fila para ver su ficha de decisión.'),
    );
    return;
  }
  $('registro-ficha').replaceChildren(
    el(
      'div',
      { clase: 'reg-ficha__cabeza' },
      el('h3', { clase: 'reg-ficha__titulo' }, 'Ficha de decisión'),
      el(
        'span',
        { clase: 'reg-ficha__dato' },
        `${hora(evento.hora)} · evento ${evento.numero}`,
        evento.id_solicitud ? ` · ${evento.id_solicitud}` : '',
      ),
      etiquetaResultado(evento),
    ),
    el('dl', { clase: 'reg-ficha__renglones' }, ...renglonesFicha(evento).filter(Boolean)),
  );
};

// ── Pestaña ──────────────────────────────────────────────────────

let conectada = false;

const conectarFiltros = () => {
  if (conectada) return;
  conectada = true;
  $('registro-buscar').addEventListener('input', (evento) => {
    vista.texto = evento.target.value;
    dibujarTabla();
  });
  $('registro-accion').addEventListener('change', (evento) => {
    vista.accion = evento.target.value;
    dibujarTabla();
  });
};

/** Dibuja la pestaña con el estado actual de la demo (se pide cada vez que se abre). */
export const mostrarRegistro = async (llamar) => {
  conectarFiltros();
  try {
    const bandeja = await llamar('GET', '/api/bandeja');
    vista.registro = bandeja.registro;
  } catch (error) {
    $('registro-tabla').replaceChildren(
      el('p', { clase: 'vacio' }, `No se pudo cargar el registro: ${error.message}`),
    );
    return;
  }
  $('registro-aviso').textContent = vista.registro.aviso;
  // Si el evento elegido ya no existe (por ejemplo, tras reiniciar), se elige el más nuevo.
  if (!vista.registro.eventos.some((e) => e.numero === vista.elegido)) {
    vista.elegido = vista.registro.eventos[0]?.numero ?? null;
  }
  dibujarContadores();
  dibujarTabla();
  dibujarFicha();
};
