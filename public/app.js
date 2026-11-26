import { $, el, NOMBRES_ALERTAS, NOMBRES_PRIORIDAD } from './dom.js';
import { mostrarEvaluacion } from './evaluacion.js';
import { icono } from './iconos.js';

/**
 * Pantalla de la bandeja (tarea 006).
 *
 * Todos los datos se muestran como texto (textContent), nunca como HTML, para que un texto
 * de una solicitud no pueda cambiar la página. Solo los íconos, que son fijos, se insertan como SVG.
 */

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

const DURACION_AVISO_MS = 8000;
/** La pantalla de carga dura unos 3 segundos: el anillo sube de 0 a 100 % en este tiempo. */
const DURACION_CARGA_MS = 3000;
const CUADRO_CARGA_MS = 30;
const PAUSA_AL_100_MS = 350;
/** Largo del círculo del anillo (2·π·52), el mismo de estilos.css. */
const LARGO_ANILLO = 326.73;
const SALIDA_CARGA_MS = 300;

const FILTROS_VACIOS = Object.freeze({ prioridad: '', alerta: '', estado: '', texto: '' });

/**
 * Tarjetas de resumen. Las que tienen "filtro" muestran solo esas solicitudes al hacer clic;
 * "Total" quita todos los filtros y "No clasificadas" lleva a la sección de revisión manual.
 * El número de cada tarjeta es siempre el total de la bandeja, sin importar los filtros.
 */
const TARJETAS = Object.freeze([
  {
    id: 'total',
    icono: 'bandeja',
    clase: 'icono-total',
    etiqueta: 'Total en bandeja',
    campo: 'total',
    filtro: {},
  },
  {
    id: 'critica',
    icono: 'alerta',
    clase: 'icono-critica',
    etiqueta: 'Con alerta crítica',
    campo: 'con_alerta_critica',
    filtro: { alerta: 'critica' },
    extra: 'tarjeta--critica',
  },
  {
    id: 'alta',
    icono: 'flechaDiagonal',
    clase: 'icono-alta',
    etiqueta: 'Prioridad alta',
    campo: 'prioridad_alta',
    filtro: { prioridad: 'alta' },
  },
  {
    id: 'pendientes',
    icono: 'pulso',
    clase: 'icono-pendientes',
    etiqueta: 'Pendientes de revisión',
    campo: 'pendientes',
    filtro: { estado: 'pendiente' },
  },
  {
    id: 'no_clasificadas',
    icono: 'documentoAdvertencia',
    clase: 'icono-no-clasificadas',
    etiqueta: 'No clasificadas',
    campo: 'no_clasificadas',
  },
]);

const estado = {
  bandeja: null,
  seleccionada: null, // id de la solicitud abierta en el panel
  modo: 'detalle', // 'detalle' o 'corregir'
  destellar: null, // id que debe destellar en el próximo dibujo
  filtros: { ...FILTROS_VACIOS },
};

let temporizadorAviso = null;

// ── Utilidades del DOM ───────────────────────────────────────────

/** Ícono SVG fijo (de iconos.js). */
const svg = (nombre, opciones) => {
  const plantilla = document.createElement('template');
  plantilla.innerHTML = icono(nombre, opciones);
  return plantilla.content.firstChild;
};

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));

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

/** Una tarjeta está activa cuando los filtros son exactamente los suyos. */
const tarjetaActiva = (tarjeta) =>
  Boolean(tarjeta.filtro) &&
  Object.entries({ ...FILTROS_VACIOS, ...tarjeta.filtro }).every(
    ([campo, valor]) => estado.filtros[campo] === valor,
  );

const dibujarResumen = () => {
  const { resumen } = estado.bandeja;
  $('resumen').replaceChildren(
    ...TARJETAS.map((tarjeta) =>
      el(
        'button',
        {
          type: 'button',
          clase: `tarjeta ${tarjeta.extra ?? ''}`,
          'aria-pressed': tarjeta.filtro ? String(tarjetaActiva(tarjeta)) : undefined,
          alClick: () => alElegirTarjeta(tarjeta),
        },
        el(
          'span',
          { clase: `tarjeta__icono ${tarjeta.clase}` },
          svg(tarjeta.icono, { tamano: 20 }),
        ),
        el('span', { clase: 'tarjeta__etiqueta' }, tarjeta.etiqueta),
        el('span', { clase: 'tarjeta__valor' }, resumen[tarjeta.campo]),
      ),
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
  // Las no clasificadas no tienen grupo: no aparecen al filtrar por alerta.
  if (alerta === 'critica' && (!elemento.grupo || elemento.grupo === 'sin_alerta_critica')) {
    return false;
  }
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

  const noClasificadasVisibles = noClasificadas.filter(pasaFiltros);
  if (noClasificadasVisibles.length > 0) {
    partes.push(
      el(
        'section',
        { clase: 'grupo', id: 'seccion-revision-manual' },
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

/** "Cargar exportación de Telesalud" la primera vez; después, "Cargar nueva exportación". */
const textoBotonCargar = () =>
  estado.bandeja.exportaciones.cargadas === 0
    ? 'Cargar exportación de Telesalud'
    : 'Cargar nueva exportación';

const dibujarBotones = () => {
  const { siguiente } = estado.bandeja.exportaciones;
  for (const id of ['boton-cargar', 'boton-cargar-vacia']) {
    const boton = $(id);
    boton.replaceChildren(svg('archivo', { tamano: 18 }), textoBotonCargar());
    boton.disabled = siguiente === null;
    boton.title =
      siguiente === null ? 'No hay más exportaciones de demostración. Usa "Reiniciar demo".' : '';
  }
  $('boton-reiniciar').replaceChildren(svg('flechaCircular', { tamano: 18 }), 'Reiniciar demo');
};

const dibujar = () => {
  const { datos, triajista } = estado.bandeja;
  $('franja-datos').textContent = datos.texto_franja;
  $('triajista').textContent = triajista;
  // Antes de cargar la primera exportación, la bandeja está vacía.
  const vacia = estado.bandeja.exportaciones.cargadas === 0;
  $('bandeja-vacia').hidden = !vacia;
  $('contenido-bandeja').hidden = vacia;
  $('acciones').hidden = vacia;
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
    // Qué datos recibió la IA (y cuáles no): los personales se separan antes, con código.
    el('p', { clase: 'nota-datos-ia' }, estado.bandeja.nota_datos_ia),
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

const mostrarAviso = (texto, { deshacer = false, icono: nombreIcono = 'check' } = {}) => {
  const aviso = $('aviso-flotante');
  const partes = [
    el('span', {}, nombreIcono ? [svg(nombreIcono, { tamano: 18 }), ' '] : null, texto),
  ];
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

// ── Cargar exportación (ventana) ─────────────────────────────────

const textoSolicitudes = (exportacion) =>
  exportacion.numero === 1
    ? `${exportacion.solicitudes_nuevas} solicitudes`
    : `${exportacion.solicitudes_nuevas} ${exportacion.solicitudes_nuevas === 1 ? 'solicitud nueva' : 'solicitudes nuevas'}`;

/**
 * Abre la ventana con el archivo de demostración ya elegido. Regla R1: no hay forma de elegir
 * ni subir un archivo del computador.
 */
/** Solo se carga si se presionó "Cargar" (cerrar con Esc o "Cancelar" no carga nada). */
let cargarAlCerrar = false;

const abrirVentanaCarga = () => {
  const { siguiente } = estado.bandeja.exportaciones;
  if (!siguiente) return;
  $('ventana-titulo').textContent = textoBotonCargar();
  $('ventana-nombre').textContent = siguiente.nombre;
  $('ventana-detalle').textContent = textoSolicitudes(siguiente);
  cargarAlCerrar = false;
  $('ventana-carga').showModal();
  $('ventana-cargar').focus();
};

const cargarExportacion = () =>
  conError(async () => {
    estado.seleccionada = null;
    $('panel').hidden = true;
    const bandeja = await conPantallaDeCarga(() =>
      llamar('POST', '/api/bandeja/cargar-exportacion'),
    );
    actualizar(bandeja);
    if (!bandeja.ultima_cambiada) window.scrollTo({ top: 0 });
  });

// ── Filtros y tarjetas de resumen ────────────────────────────────

/** Cambia los filtros y deja las listas desplegables y el buscador iguales a ellos. */
const aplicarFiltros = (filtros) => {
  estado.filtros = { ...FILTROS_VACIOS, ...filtros };
  $('filtro-prioridad').value = estado.filtros.prioridad;
  $('filtro-alerta').value = estado.filtros.alerta;
  $('filtro-estado').value = estado.filtros.estado;
  $('buscar').value = estado.filtros.texto;
  dibujarResumen();
  dibujarLista();
};

const desplazarA = (nodo) =>
  nodo?.scrollIntoView({ block: 'start', behavior: sinMovimiento() ? 'auto' : 'smooth' });

const alElegirTarjeta = (tarjeta) => {
  if (tarjeta.id === 'no_clasificadas') {
    if (estado.bandeja.resumen.no_clasificadas === 0) {
      mostrarAviso('No hay solicitudes sin clasificar', { icono: null });
      return;
    }
    if (!$('seccion-revision-manual')) aplicarFiltros({});
    desplazarA($('seccion-revision-manual'));
    return;
  }
  // Un segundo clic en la tarjeta activa quita su filtro.
  aplicarFiltros(tarjeta.id !== 'total' && tarjetaActiva(tarjeta) ? {} : tarjeta.filtro);
  desplazarA(document.querySelector('.filtros'));
};

// ── Pantalla de carga ────────────────────────────────────────────

/**
 * Los cuatro pasos de la carga y desde qué porcentaje se muestra cada uno.
 * Los textos describen lo que de verdad pasa: la separación de datos personales se hace con
 * código y antes de la IA; las sugerencias se leen de una corrida guardada, no se clasifica en vivo.
 */
const PASOS_CARGA = [
  {
    desde: 0,
    texto: (bandeja) =>
      `Cargando la exportación de Telesalud… (${textoSolicitudes(bandeja.exportaciones.ultima)})`,
  },
  {
    desde: 25,
    texto: (bandeja) =>
      `Separando los datos personales… (${bandeja.exportaciones.ultima.columnas_personales_separadas} columnas)`,
  },
  {
    desde: 50,
    texto: (bandeja) => `Aplicando las sugerencias de ${bandeja.datos.nombre_corto}…`,
  },
  { desde: 75, texto: () => 'Ordenando la bandeja…' },
];

/** Sube y baja suave al principio y al final (0 → 0, 1 → 1). */
const suavizar = (x) => 0.5 - Math.cos(Math.PI * x) / 2;

const dibujarAvanceCarga = (porcentaje) => {
  $('carga-porcentaje').textContent = `${porcentaje}%`;
  $('carga-progreso').style.strokeDashoffset = String(LARGO_ANILLO * (1 - porcentaje / 100));
};

/**
 * Sube el anillo de 0 a 100 % en unos 3 segundos y cambia el texto en cada paso.
 * Usa setTimeout (y no requestAnimationFrame) para que termine aunque la pestaña quede oculta.
 */
const animarCarga = (bandeja) =>
  new Promise((listo) => {
    const inicio = performance.now();
    let pasoActual = -1;
    const cuadro = () => {
      const avance = Math.min(1, (performance.now() - inicio) / DURACION_CARGA_MS);
      const porcentaje = Math.round(suavizar(avance) * 100);
      dibujarAvanceCarga(porcentaje);
      const paso = PASOS_CARGA.findLastIndex((p) => porcentaje >= p.desde);
      if (paso !== pasoActual) {
        pasoActual = paso;
        $('carga-titulo').textContent = PASOS_CARGA[paso].texto(bandeja);
      }
      if (avance < 1) setTimeout(cuadro, CUADRO_CARGA_MS);
      else setTimeout(listo, PAUSA_AL_100_MS);
    };
    cuadro();
  });

/** Muestra la pantalla de carga mientras carga la exportación y recorre sus cuatro pasos. */
const conPantallaDeCarga = async (pedirBandeja) => {
  const carga = $('carga');
  carga.classList.remove('carga--saliendo');
  dibujarAvanceCarga(0);
  $('carga-titulo').textContent = 'Cargando la exportación de Telesalud…';
  carga.hidden = false;
  try {
    const bandeja = await pedirBandeja();
    await animarCarga(bandeja);
    return bandeja;
  } finally {
    carga.classList.add('carga--saliendo');
    await esperar(sinMovimiento() ? 0 : SALIDA_CARGA_MS);
    carga.hidden = true;
  }
};

const reiniciar = () =>
  conError(async () => {
    estado.seleccionada = null;
    $('panel').hidden = true;
    // Vuelve a la bandeja vacía: no hay nada que cargar, así que no se muestra la pantalla de carga.
    const bandeja = await llamar('POST', '/api/bandeja/reiniciar');
    estado.filtros = { ...FILTROS_VACIOS };
    actualizar(bandeja, { destellar: null });
    aplicarFiltros({});
    window.scrollTo({ top: 0 });
    mostrarAviso('Demo reiniciada');
  });

// ── Teclado ──────────────────────────────────────────────────────

const idsVisibles = () =>
  [...document.querySelectorAll('#lista [data-id]')].map((nodo) => nodo.dataset.id);

const alPresionarTecla = (evento) => {
  const escribiendo = ['INPUT', 'TEXTAREA', 'SELECT'].includes(evento.target.tagName);
  if (escribiendo || evento.ctrlKey || evento.metaKey || evento.altKey) return;
  if (!$('carga').hidden || $('ventana-carga').open || $('vista-bandeja').hidden) return;
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

// ── Pestañas ─────────────────────────────────────────────────────

/** Muestra la pestaña que indica la dirección (#bandeja o #evaluacion). */
const mostrarPestana = () => {
  const evaluacion = window.location.hash === '#evaluacion';
  if (evaluacion && estado.seleccionada) cerrarPanel();
  $('vista-bandeja').hidden = evaluacion;
  $('vista-evaluacion').hidden = !evaluacion;
  for (const [id, activa] of [
    ['pestana-bandeja', !evaluacion],
    ['pestana-evaluacion', evaluacion],
  ]) {
    $(id).classList.toggle('pestana--activa', activa);
    if (activa) $(id).setAttribute('aria-current', 'page');
    else $(id).removeAttribute('aria-current');
  }
  if (evaluacion) mostrarEvaluacion(llamar);
};

// ── Inicio ───────────────────────────────────────────────────────

const iniciar = async () => {
  $('icono-buscar').replaceChildren(svg('buscar', { tamano: 18 }));
  $('ventana-icono').replaceChildren(svg('archivo', { tamano: 22 }));
  $('boton-cargar').addEventListener('click', abrirVentanaCarga);
  $('boton-cargar-vacia').addEventListener('click', abrirVentanaCarga);
  $('ventana-cargar').addEventListener('click', () => {
    cargarAlCerrar = true;
  });
  $('ventana-carga').addEventListener('close', () => {
    if (!cargarAlCerrar) return;
    cargarAlCerrar = false;
    cargarExportacion();
  });
  $('boton-reiniciar').addEventListener('click', reiniciar);
  for (const [campo, id] of [
    ['prioridad', 'filtro-prioridad'],
    ['alerta', 'filtro-alerta'],
    ['estado', 'filtro-estado'],
  ]) {
    $(id).addEventListener('change', (evento) => {
      estado.filtros[campo] = evento.target.value;
      dibujarResumen();
      dibujarLista();
    });
  }
  $('buscar').addEventListener('input', (evento) => {
    estado.filtros.texto = evento.target.value.trim();
    dibujarResumen();
    dibujarLista();
  });
  document.addEventListener('keydown', alPresionarTecla);
  window.addEventListener('hashchange', mostrarPestana);
  mostrarPestana();

  try {
    actualizar(await llamar('GET', '/api/bandeja'), { destellar: null });
  } catch (error) {
    $('lista').replaceChildren(
      el('p', { clase: 'vacio' }, `No se pudo cargar la bandeja: ${error.message}`),
    );
  }
};

iniciar();
