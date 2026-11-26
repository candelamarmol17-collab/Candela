import { icono } from './iconos.js';

/**
 * Pantalla de la bandeja (tarea 006).
 *
 * Todos los datos se muestran como texto (textContent), nunca como HTML, para que un texto
 * de una solicitud no pueda cambiar la página. Solo los íconos, que son fijos, se insertan como SVG.
 */

const NOMBRES_ALERTAS = Object.freeze({
  urgencia: 'Urgencia',
  violencia: 'Violencia',
  ideacion_suicida: 'Riesgo suicida',
  descompensacion: 'Descompensación',
  persona_mayor_60: 'Persona mayor (60+)',
  ges: 'GES',
});

const NOMBRES_PRIORIDAD = Object.freeze({ alta: 'Alta', media: 'Media', baja: 'Baja' });
const NOMBRES_CONFIANZA = Object.freeze({ alta: 'Alta', media: 'Media', baja: 'Baja' });

const GRUPOS = Object.freeze([
  { id: 'urgencia', titulo: 'Con alerta crítica · Urgencia', critico: true },
  {
    id: 'otra_alerta_critica',
    titulo: 'Con alerta crítica · Violencia, riesgo suicida o descompensación',
    critico: true,
  },
  { id: 'sin_alerta_critica', titulo: 'Sin alerta crítica', critico: false },
]);

const AVISO_R2 =
  'Es una sugerencia. La decisión es del triajista. La IA no entrega indicaciones clínicas.';

/** Tiempo que se muestra "Aplicando la sugerencia guardada…" antes de que entre la solicitud. */
const ESPERA_INGRESO_MS = 1200;
const DURACION_AVISO_MS = 8000;

const estado = {
  bandeja: null,
  seleccionada: null, // id de la solicitud abierta en el panel
  modo: 'detalle', // 'detalle' o 'corregir'
  ingresando: false,
  destellar: null, // id que debe destellar en el próximo dibujo
  filtros: { prioridad: '', alerta: '', estado: '', texto: '' },
};

let temporizadorAviso = null;

// ── Utilidades del DOM ───────────────────────────────────────────

/** Crea un elemento. Los hijos de texto se agregan como texto, nunca como HTML. */
const el = (etiqueta, atributos = {}, ...hijos) => {
  const nodo = document.createElement(etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (nombre === 'clase') nodo.className = valor;
    else if (nombre.startsWith('al')) nodo.addEventListener(nombre.slice(2).toLowerCase(), valor);
    else nodo.setAttribute(nombre, valor === true ? '' : valor);
  }
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return nodo;
};

/** Ícono SVG fijo (de iconos.js). */
const svg = (nombre, opciones) => {
  const plantilla = document.createElement('template');
  plantilla.innerHTML = icono(nombre, opciones);
  return plantilla.content.firstChild;
};

const $ = (id) => document.getElementById(id);

/** "2026-11-17T12:15:00" → "17-11 12:15". Se lee el texto tal cual, sin cambiar de zona horaria. */
const fechaCorta = (texto) => {
  const partes = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(texto ?? '');
  return partes ? `${partes[3]}-${partes[2]} ${partes[4]}:${partes[5]}` : 'Sin fecha';
};

const fechaLarga = (texto) => {
  const partes = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(texto ?? '');
  return partes
    ? `${partes[3]}-${partes[2]}-${partes[1]} ${partes[4]}:${partes[5]}`
    : 'Fecha no informada';
};

const esCritica = (alerta) => estado.bandeja.catalogos.alertas_criticas.includes(alerta);

// ── Comunicación con la API ──────────────────────────────────────

const llamar = async (metodo, ruta, cuerpo) => {
  const respuesta = await fetch(ruta, {
    method: metodo,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok || !datos?.ok) {
    const error = new Error(datos?.error?.mensaje ?? 'No se pudo completar la acción.');
    error.detalles = datos?.error?.detalles ?? [];
    throw error;
  }
  return datos.datos;
};

const actualizar = (bandeja, { destellar = bandeja.ultima_cambiada } = {}) => {
  estado.bandeja = bandeja;
  estado.destellar = destellar;
  dibujar();
};

// ── Dibujo de la página ──────────────────────────────────────────

const dibujarResumen = () => {
  const { resumen } = estado.bandeja;
  const tarjeta = (clase, nombreIcono, etiqueta, valor, extra = '') =>
    el(
      'article',
      { clase: `tarjeta ${extra}` },
      el('span', { clase: `tarjeta__icono ${clase}` }, svg(nombreIcono, { tamano: 20 })),
      el('p', { clase: 'tarjeta__etiqueta' }, etiqueta),
      el('p', { clase: 'tarjeta__valor' }, valor),
    );
  $('resumen').replaceChildren(
    tarjeta('icono-total', 'bandeja', 'Total en bandeja', resumen.total),
    tarjeta(
      'icono-critica',
      'alerta',
      'Con alerta crítica',
      resumen.con_alerta_critica,
      'tarjeta--critica',
    ),
    tarjeta('icono-alta', 'flechaDiagonal', 'Prioridad alta', resumen.prioridad_alta),
    tarjeta('icono-pendientes', 'pulso', 'Pendientes de revisión', resumen.pendientes),
    tarjeta(
      'icono-no-clasificadas',
      'documentoAdvertencia',
      'No clasificadas',
      resumen.no_clasificadas,
    ),
  );
};

const chipsAlertas = (alertas) =>
  el(
    'div',
    { clase: 'chips' },
    alertas.map((alerta) =>
      esCritica(alerta)
        ? el(
            'span',
            { clase: 'chip chip--critica' },
            svg('alerta', { tamano: 15 }),
            NOMBRES_ALERTAS[alerta] ?? alerta,
          )
        : el(
            'span',
            { clase: 'chip' },
            svg('check', { tamano: 15 }),
            NOMBRES_ALERTAS[alerta] ?? alerta,
          ),
    ),
  );

const pildoraPrioridad = (prioridad) =>
  el(
    'span',
    { clase: `prioridad prioridad--${prioridad}` },
    svg('reloj', { tamano: 16 }),
    NOMBRES_PRIORIDAD[prioridad] ?? prioridad,
  );

const etiquetaEstado = (revision) => {
  if (revision.estado === 'confirmada') {
    return el(
      'span',
      { clase: 'estado estado--confirmada' },
      svg('check', { tamano: 16 }),
      'Confirmada',
    );
  }
  if (revision.estado === 'corregida') {
    return el(
      'span',
      { clase: 'estado estado--corregida' },
      svg('lapiz', { tamano: 14 }),
      'Corregida por triajista',
    );
  }
  return el('span', { clase: 'estado' }, svg('reloj', { tamano: 16 }), 'Pendiente');
};

const pasaFiltros = (elemento) => {
  const { prioridad, alerta, estado: filtroEstado, texto } = estado.filtros;
  const clasificacion = elemento.clasificacion;
  if (texto && !elemento.solicitud.id_solicitud.toLowerCase().includes(texto.toLowerCase())) {
    return false;
  }
  if (prioridad && clasificacion?.prioridad_sugerida !== prioridad) return false;
  if (alerta === 'critica' && elemento.grupo === 'sin_alerta_critica') return false;
  if (alerta === 'sin' && elemento.grupo !== 'sin_alerta_critica') return false;
  if (filtroEstado && elemento.revision.estado !== filtroEstado) return false;
  return true;
};

const filaClasificada = (elemento) => {
  const { solicitud, clasificacion, revision } = elemento;
  const id = solicitud.id_solicitud;
  const critica = elemento.grupo !== 'sin_alerta_critica';
  const clases = [
    'fila',
    critica ? 'fila--critica' : '',
    estado.seleccionada === id ? 'fila--seleccionada' : '',
    estado.destellar === id ? 'destello' : '',
  ].join(' ');
  return el(
    'article',
    {
      clase: clases,
      tabindex: '0',
      'data-id': id,
      'aria-label': `Solicitud ${id}`,
      alClick: () => abrirPanel(id),
      alKeydown: (evento) => {
        if (evento.key === 'Enter') abrirPanel(id);
      },
    },
    el(
      'div',
      {},
      el('p', { clase: 'fila__id' }, id),
      el('p', { clase: 'fila__fecha' }, fechaCorta(solicitud.fecha_ingreso)),
    ),
    el(
      'div',
      {},
      el(
        'p',
        { clase: 'fila__profesional' },
        el('span', { clase: 'pidio' }, `Pidió ${solicitud.tipo_profesional} → `),
        clasificacion.profesional_sugerido,
      ),
      el('p', { clase: 'fila__texto' }, `${solicitud.motivo} · ${solicitud.texto_libre}`),
      chipsAlertas(clasificacion.alertas),
    ),
    el('div', { clase: 'fila__prioridad' }, pildoraPrioridad(clasificacion.prioridad_sugerida)),
    el(
      'div',
      { clase: 'fila__estado' },
      elemento.fuente === 'ia'
        ? el(
            'span',
            { clase: 'confianza' },
            `Confianza ${NOMBRES_CONFIANZA[clasificacion.confianza] ?? clasificacion.confianza}`,
          )
        : null,
      etiquetaEstado(revision),
    ),
    el('span', { clase: 'fila__chevron' }, svg('chevron', { tamano: 20 })),
  );
};

const filaNoClasificada = (elemento) => {
  const id = elemento.solicitud.id_solicitud;
  return el(
    'article',
    {
      clase: `revision-manual ${estado.destellar === id ? 'destello' : ''}`,
      tabindex: '0',
      'data-id': id,
      alClick: () => abrirPanel(id),
      alKeydown: (evento) => {
        if (evento.key === 'Enter') abrirPanel(id);
      },
    },
    el('p', { clase: 'fila__id' }, id),
    el(
      'div',
      {},
      el('p', { clase: 'revision-manual__titulo' }, 'Requiere revisión manual'),
      el(
        'p',
        { clase: 'revision-manual__texto' },
        'La IA no entregó una respuesta válida. Clasificar manualmente.',
      ),
    ),
    el('p', { clase: 'fila__fecha' }, fechaCorta(elemento.solicitud.fecha_ingreso)),
  );
};

const dibujarLista = () => {
  const { ordenadas, no_clasificadas: noClasificadas } = estado.bandeja;
  const partes = [];

  if (estado.ingresando) {
    partes.push(
      el(
        'div',
        { clase: 'ingresando' },
        el('p', { clase: 'fila__id' }, estado.bandeja.ingreso_simulado.id),
        el(
          'div',
          {},
          el(
            'p',
            { clase: 'ingresando__titulo' },
            el('span', { clase: 'ingresando__punto' }),
            `Aplicando la sugerencia guardada de ${estado.bandeja.datos.nombre_modelo}…`,
          ),
          el(
            'p',
            { clase: 'dato-suave' },
            'Solicitud recibida · resultado reproducido desde archivo',
          ),
        ),
      ),
    );
  }

  const noClasificadasVisibles = noClasificadas.filter(pasaFiltros);
  if (noClasificadasVisibles.length > 0) {
    partes.push(
      el(
        'section',
        { clase: 'grupo' },
        el(
          'h3',
          { clase: 'grupo__titulo' },
          el(
            'span',
            {},
            'Requiere revisión manual',
            el('span', { clase: 'grupo__cuenta' }, `${noClasificadasVisibles.length}`),
          ),
        ),
        noClasificadasVisibles.map(filaNoClasificada),
      ),
    );
  }

  for (const grupo of GRUPOS) {
    const elementos = ordenadas.filter((e) => e.grupo === grupo.id && pasaFiltros(e));
    if (elementos.length === 0) continue;
    partes.push(
      el(
        'section',
        { clase: 'grupo' },
        el(
          'h3',
          { clase: `grupo__titulo ${grupo.critico ? 'grupo__titulo--critico' : ''}` },
          el(
            'span',
            {},
            grupo.titulo,
            el('span', { clase: 'grupo__cuenta' }, `${elementos.length}`),
          ),
          grupo.critico ? svg('alerta', { tamano: 22 }) : null,
        ),
        elementos.map(filaClasificada),
      ),
    );
  }

  if (partes.length === 0) {
    partes.push(el('p', { clase: 'vacio' }, 'No hay solicitudes con esos filtros.'));
  }
  $('lista').replaceChildren(...partes);
};

const dibujarBotones = () => {
  const boton = $('boton-ingreso');
  boton.replaceChildren(svg('mas', { tamano: 18 }), 'Simular ingreso de nueva solicitud');
  boton.disabled = estado.ingresando || !estado.bandeja.ingreso_simulado.disponible;
  boton.title = boton.disabled && !estado.ingresando ? 'Ya ingresó. Usa "Reiniciar demo".' : '';
  $('boton-reiniciar').replaceChildren(svg('flechaCircular', { tamano: 18 }), 'Reiniciar demo');
};

const dibujar = () => {
  const { datos, triajista } = estado.bandeja;
  $('origen-datos').replaceChildren(
    svg('archivo', { tamano: 18 }),
    `${datos.etiqueta} · Modelo: ${datos.modelo ?? 'simulado por reglas'} · Prompt v${datos.version_prompt ?? '?'}`,
  );
  $('triajista').textContent = triajista;
  dibujarBotones();
  dibujarResumen();
  dibujarLista();
  dibujarPanel();

  if (estado.destellar) {
    document
      .querySelector(`[data-id="${CSS.escape(estado.destellar)}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    estado.destellar = null;
  }
};

// ── Panel de detalle y corrección ────────────────────────────────

const buscarElemento = (id) =>
  estado.bandeja.ordenadas.find((e) => e.solicitud.id_solicitud === id) ??
  estado.bandeja.no_clasificadas.find((e) => e.solicitud.id_solicitud === id) ??
  null;

const abrirPanel = (id, modo = 'detalle') => {
  const yaAbierto = !$('panel').hidden;
  estado.seleccionada = id;
  estado.modo = modo;
  dibujarLista();
  dibujarPanel({ animar: !yaAbierto });
};

const cerrarPanel = () => {
  estado.seleccionada = null;
  $('panel').hidden = true;
  dibujarLista();
};

const seccionVecino = (solicitud) => {
  const largoMaximo = 300;
  return [
    el('h3', { clase: 'seccion-titulo' }, 'Solicitud del vecino'),
    el(
      'p',
      { clase: 'dato-suave' },
      `${fechaLarga(solicitud.fecha_ingreso)}${
        typeof solicitud.edad === 'number' ? ` · ${solicitud.edad} años` : ' · Edad no informada'
      }`,
    ),
    el('p', { clase: 'dato-suave' }, `Pidió ${solicitud.tipo_profesional} · ${solicitud.motivo}`),
    el('p', { clase: 'texto-vecino' }, solicitud.texto_libre),
    el('p', { clase: 'contador' }, `${solicitud.texto_libre.length}/${largoMaximo}`),
  ];
};

const cajaSugerencia = (sugerencia) => {
  const { datos } = estado.bandeja;
  if (!sugerencia) {
    return el(
      'div',
      { clase: 'caja-ia' },
      el('p', { clase: 'caja-ia__titulo' }, svg('destellos', { tamano: 22 }), 'Sugerencia IA'),
      el(
        'p',
        {},
        'La IA no entregó una respuesta válida para esta solicitud. Clasificar manualmente.',
      ),
    );
  }
  const alertas = sugerencia.alertas.map((a) => NOMBRES_ALERTAS[a] ?? a).join(' · ');
  return el(
    'div',
    { clase: 'caja-ia' },
    el('p', { clase: 'caja-ia__titulo' }, svg('destellos', { tamano: 22 }), 'Sugerencia IA'),
    el(
      'div',
      { clase: 'caja-ia__fila' },
      pildoraPrioridad(sugerencia.prioridad_sugerida),
      el('span', { clase: 'caja-ia__profesional' }, sugerencia.profesional_sugerido),
    ),
    el('p', {}, `Alertas: ${alertas || 'ninguna'}`),
    el('p', {}, sugerencia.justificacion),
    el(
      'p',
      {},
      el(
        'strong',
        {},
        `Confianza: ${NOMBRES_CONFIANZA[sugerencia.confianza] ?? sugerencia.confianza}`,
      ),
    ),
    el(
      'p',
      { clase: 'caja-ia__pie' },
      `Modelo: ${datos.modelo ?? 'simulado por reglas'} · Prompt v${datos.version_prompt ?? '?'} · Reproducido desde archivo`,
    ),
  );
};

const cajaTriajista = (elemento) => {
  if (elemento.revision?.estado !== 'corregida') return null;
  const c = elemento.clasificacion;
  const alertas = c.alertas.map((a) => NOMBRES_ALERTAS[a] ?? a).join(' · ');
  return el(
    'div',
    { clase: 'caja-triajista' },
    el('p', {}, el('strong', {}, 'Decisión del triajista')),
    el('p', {}, `${NOMBRES_PRIORIDAD[c.prioridad_sugerida]} · ${c.profesional_sugerido}`),
    el('p', {}, `Alertas: ${alertas || 'ninguna'}`),
    el('p', {}, `Motivo: ${elemento.revision.motivo ?? 'sin motivo registrado'}`),
  );
};

const vistaDetalle = (elemento) => {
  const pendiente = elemento.revision.estado === 'pendiente';
  const tieneSugerencia = Boolean(elemento.sugerencia_ia);
  return [
    ...seccionVecino(elemento.solicitud),
    cajaSugerencia(elemento.sugerencia_ia),
    cajaTriajista(elemento),
    el('p', { clase: 'aviso-r2' }, AVISO_R2),
    el(
      'div',
      { clase: 'botones-panel' },
      tieneSugerencia
        ? el(
            'button',
            {
              type: 'button',
              clase: 'boton boton--principal',
              disabled: !pendiente,
              alClick: () => confirmar(elemento.solicitud.id_solicitud),
            },
            pendiente ? 'Confirmar sugerencia' : etiquetaEstadoTexto(elemento.revision.estado),
          )
        : null,
      el(
        'button',
        {
          type: 'button',
          clase: tieneSugerencia ? 'boton boton--secundario' : 'boton boton--principal',
          alClick: () => abrirPanel(elemento.solicitud.id_solicitud, 'corregir'),
        },
        tieneSugerencia ? 'Corregir' : 'Clasificar manualmente',
      ),
    ),
    el(
      'p',
      { clase: 'atajos' },
      'C = confirmar · E = corregir · ↑ ↓ = cambiar de solicitud · Esc = cerrar',
    ),
  ];
};

const etiquetaEstadoTexto = (valor) =>
  valor === 'confirmada' ? 'Ya confirmada' : valor === 'corregida' ? 'Ya corregida' : 'Pendiente';

const vistaCorregir = (elemento) => {
  const { catalogos } = estado.bandeja;
  const base = elemento.clasificacion ?? elemento.sugerencia_ia;
  const opcion = (valor, texto, seleccionado) =>
    el('option', { value: valor, selected: seleccionado }, texto);
  const edad = elemento.solicitud.edad;
  const esMayor = typeof edad === 'number' && edad >= 60;

  const formulario = el(
    'form',
    {
      clase: 'formulario',
      alSubmit: (evento) => {
        evento.preventDefault();
        guardarCorreccion(elemento.solicitud.id_solicitud, formulario);
      },
    },
    el('h3', {}, 'Decisión del triajista'),
    el(
      'p',
      { clase: 'dato-suave' },
      `${elemento.solicitud.id_solicitud} · Corregir en el mismo panel`,
    ),
    el(
      'p',
      { clase: 'aviso-info' },
      'Recorrido de demostración: la corrección se guarda solo mientras el programa está encendido. Puedes guardar o cancelar.',
    ),
    el('label', { clase: 'titulo-campo', for: 'campo-prioridad' }, 'Prioridad'),
    el(
      'select',
      { id: 'campo-prioridad', name: 'prioridad', required: true },
      catalogos.prioridades.map((p) =>
        opcion(p, NOMBRES_PRIORIDAD[p] ?? p, base?.prioridad_sugerida === p),
      ),
    ),
    el('label', { clase: 'titulo-campo', for: 'campo-profesional' }, 'Profesional'),
    el(
      'select',
      { id: 'campo-profesional', name: 'profesional', required: true },
      catalogos.profesionales.map((p) =>
        opcion(
          p,
          p,
          base ? base.profesional_sugerido === p : elemento.solicitud.tipo_profesional === p,
        ),
      ),
    ),
    el('span', { clase: 'titulo-campo', style: 'display:block' }, 'Alertas'),
    el(
      'div',
      { clase: 'casillas' },
      catalogos.alertas.map((alerta) => {
        const editable = catalogos.alertas_editables.includes(alerta);
        const marcada = editable ? Boolean(base?.alertas.includes(alerta)) : esMayor;
        return el(
          'label',
          { clase: `casilla ${editable ? '' : 'casilla--bloqueada'}` },
          el('input', {
            type: 'checkbox',
            name: 'alertas',
            value: alerta,
            checked: marcada,
            disabled: !editable,
          }),
          NOMBRES_ALERTAS[alerta] ?? alerta,
        );
      }),
    ),
    el(
      'p',
      { clase: 'nota-campo' },
      '"Persona mayor (60+)" no se cambia a mano: se calcula con la edad de la solicitud.',
    ),
    el(
      'label',
      { clase: 'titulo-campo', for: 'campo-motivo' },
      'Motivo de la corrección (opcional)',
    ),
    el('textarea', {
      id: 'campo-motivo',
      name: 'motivo',
      rows: '3',
      maxlength: String(catalogos.largo_maximo_motivo),
      placeholder: 'Sin motivo registrado',
    }),
    el(
      'p',
      { clase: 'nota-campo' },
      'No escribas datos personales (nombres, RUT, teléfonos ni direcciones).',
    ),
    el('p', { clase: 'error-formulario', id: 'error-formulario', role: 'alert' }),
    el(
      'div',
      { clase: 'botones-panel', style: 'margin-top:18px' },
      el('button', { type: 'submit', clase: 'boton boton--principal' }, 'Guardar corrección'),
      el(
        'button',
        {
          type: 'button',
          clase: 'boton boton--secundario',
          alClick: () => abrirPanel(elemento.solicitud.id_solicitud, 'detalle'),
        },
        'Cancelar',
      ),
    ),
  );
  return [formulario];
};

const dibujarPanel = ({ animar = false } = {}) => {
  const panel = $('panel');
  const elemento = estado.seleccionada ? buscarElemento(estado.seleccionada) : null;
  if (!elemento) {
    panel.hidden = true;
    estado.seleccionada = null;
    return;
  }
  // La animación de entrada solo se repite cuando el panel se abre de nuevo.
  panel.style.animation = animar ? '' : 'none';
  panel.replaceChildren(
    el(
      'div',
      { clase: 'panel__cabecera' },
      el('h2', { clase: 'panel__titulo' }, elemento.solicitud.id_solicitud),
      el(
        'button',
        { type: 'button', clase: 'boton-cerrar', 'aria-label': 'Cerrar', alClick: cerrarPanel },
        svg('cerrar', { tamano: 20 }),
      ),
    ),
    el(
      'div',
      { clase: 'panel__cuerpo' },
      estado.modo === 'corregir' ? vistaCorregir(elemento) : vistaDetalle(elemento),
    ),
  );
  panel.hidden = false;
};

// ── Acciones ─────────────────────────────────────────────────────

const mostrarAviso = (texto, { deshacer = false } = {}) => {
  const aviso = $('aviso-flotante');
  const partes = [el('span', {}, svg('check', { tamano: 18 }), ` ${texto}`)];
  if (deshacer) {
    partes.push(
      el(
        'button',
        { type: 'button', clase: 'aviso-flotante__boton', alClick: deshacerUltima },
        'Deshacer',
      ),
    );
  }
  aviso.replaceChildren(...partes);
  aviso.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => {
    aviso.hidden = true;
  }, DURACION_AVISO_MS);
};

const conError = async (accion) => {
  try {
    await accion();
  } catch (error) {
    mostrarAviso(error.message);
  }
};

const confirmar = (id) =>
  conError(async () => {
    actualizar(await llamar('POST', `/api/bandeja/${encodeURIComponent(id)}/confirmar`));
    estado.modo = 'detalle';
    dibujarPanel();
    mostrarAviso('Clasificación confirmada', { deshacer: true });
  });

const guardarCorreccion = async (id, formulario) => {
  const datos = new FormData(formulario);
  const cuerpo = {
    prioridad: datos.get('prioridad'),
    profesional: datos.get('profesional'),
    alertas: datos.getAll('alertas'),
    motivo: String(datos.get('motivo') ?? '').trim() || null,
  };
  try {
    const bandeja = await llamar('POST', `/api/bandeja/${encodeURIComponent(id)}/corregir`, cuerpo);
    estado.modo = 'detalle';
    actualizar(bandeja);
    mostrarAviso('Corrección guardada', { deshacer: true });
  } catch (error) {
    const detalle = error.detalles.map((d) => d.mensaje).join(' ');
    $('error-formulario').textContent = `${error.message} ${detalle}`.trim();
  }
};

const deshacerUltima = () =>
  conError(async () => {
    actualizar(await llamar('POST', '/api/bandeja/deshacer'));
    mostrarAviso('Acción deshecha');
  });

const simularIngreso = () =>
  conError(async () => {
    estado.ingresando = true;
    dibujarBotones();
    dibujarLista();
    window.scrollTo({ top: $('lista').offsetTop - 120, behavior: 'smooth' });
    await new Promise((listo) => setTimeout(listo, ESPERA_INGRESO_MS));
    try {
      actualizar(await llamar('POST', '/api/bandeja/simular-ingreso'));
    } finally {
      estado.ingresando = false;
      dibujarBotones();
      dibujarLista();
    }
  });

const reiniciar = () =>
  conError(async () => {
    estado.seleccionada = null;
    $('panel').hidden = true;
    actualizar(await llamar('POST', '/api/bandeja/reiniciar'), { destellar: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarAviso('Demo reiniciada');
  });

// ── Teclado ──────────────────────────────────────────────────────

const idsVisibles = () =>
  [...document.querySelectorAll('#lista [data-id]')].map((nodo) => nodo.dataset.id);

const alPresionarTecla = (evento) => {
  const escribiendo = ['INPUT', 'TEXTAREA', 'SELECT'].includes(evento.target.tagName);
  if (escribiendo || evento.ctrlKey || evento.metaKey || evento.altKey) return;
  if (evento.key === 'Escape' && estado.seleccionada) {
    cerrarPanel();
    return;
  }
  if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
    const ids = idsVisibles();
    if (ids.length === 0) return;
    evento.preventDefault();
    const actual = ids.indexOf(estado.seleccionada);
    const siguiente =
      actual === -1
        ? 0
        : Math.min(Math.max(actual + (evento.key === 'ArrowDown' ? 1 : -1), 0), ids.length - 1);
    abrirPanel(ids[siguiente]);
    document
      .querySelector(`[data-id="${CSS.escape(ids[siguiente])}"]`)
      ?.scrollIntoView({ block: 'nearest' });
    return;
  }
  if (!estado.seleccionada || estado.modo !== 'detalle') return;
  const elemento = buscarElemento(estado.seleccionada);
  if (
    evento.key.toLowerCase() === 'c' &&
    elemento?.sugerencia_ia &&
    elemento.revision.estado === 'pendiente'
  ) {
    confirmar(estado.seleccionada);
  } else if (evento.key.toLowerCase() === 'e') {
    abrirPanel(estado.seleccionada, 'corregir');
  }
};

// ── Inicio ───────────────────────────────────────────────────────

const iniciar = async () => {
  $('icono-buscar').replaceChildren(svg('buscar', { tamano: 18 }));
  $('boton-ingreso').addEventListener('click', simularIngreso);
  $('boton-reiniciar').addEventListener('click', reiniciar);
  for (const [campo, id] of [
    ['prioridad', 'filtro-prioridad'],
    ['alerta', 'filtro-alerta'],
    ['estado', 'filtro-estado'],
  ]) {
    $(id).addEventListener('change', (evento) => {
      estado.filtros[campo] = evento.target.value;
      dibujarLista();
    });
  }
  $('buscar').addEventListener('input', (evento) => {
    estado.filtros.texto = evento.target.value.trim();
    dibujarLista();
  });
  document.addEventListener('keydown', alPresionarTecla);

  try {
    actualizar(await llamar('GET', '/api/bandeja'), { destellar: null });
  } catch (error) {
    $('lista').replaceChildren(
      el('p', { clase: 'vacio' }, `No se pudo cargar la bandeja: ${error.message}`),
    );
  }
};

iniciar();
