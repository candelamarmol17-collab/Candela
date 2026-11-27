import { ALERTAS_CRITICAS, PRIORIDADES } from '../schemas/catalogos.js';
import { validarClasificacion } from '../schemas/clasificacion.schema.js';
import { validarSolicitud } from '../schemas/solicitud.schema.js';

/**
 * Servicio de la bandeja: ordena las solicitudes para que lo urgente aparezca primero.
 *
 * Orden [INFERENCIA, por validar con los triajistas] (docs/requerimientos.md, sección 7, y tarea 005):
 *   1. Grupo: primero "urgencia"; después otra alerta crítica; después sin alerta crítica.
 *   2. Prioridad: alta, media, baja.
 *   3. Fecha de ingreso: la más antigua primero.
 *   4. Empate total: por id_solicitud.
 * Las alertas no críticas (persona_mayor_60, ges) no cambian el orden.
 *
 * Las solicitudes que no se pudieron clasificar van en una lista aparte, la más antigua primero.
 * Nunca se esconde ni se pierde una solicitud.
 */

export const GRUPOS = Object.freeze({
  urgencia: 'urgencia',
  otraAlertaCritica: 'otra_alerta_critica',
  sinAlertaCritica: 'sin_alerta_critica',
});

const ORDEN_GRUPOS = Object.freeze([
  GRUPOS.urgencia,
  GRUPOS.otraAlertaCritica,
  GRUPOS.sinAlertaCritica,
]);

/** De dónde viene la clasificación vigente. */
export const FUENTES = Object.freeze({ ia: 'ia', triajista: 'triajista' });

/** Por qué una solicitud quedó en la lista de no clasificadas. */
export const MOTIVOS_BANDEJA = Object.freeze({
  sinResultado: 'sin_resultado',
  resultadoInvalido: 'resultado_invalido',
  solicitudInvalida: 'solicitud_invalida',
});

const ALERTA_URGENCIA = 'urgencia';

/** Grupo de la bandeja según las alertas. */
export const grupoSegunAlertas = (alertas) => {
  if (alertas.includes(ALERTA_URGENCIA)) {
    return GRUPOS.urgencia;
  }
  if (alertas.some((alerta) => ALERTAS_CRITICAS.includes(alerta))) {
    return GRUPOS.otraAlertaCritica;
  }
  return GRUPOS.sinAlertaCritica;
};

// Las fechas válidas tienen siempre el mismo formato (AAAA-MM-DDTHH:MM:SS), así que se pueden
// comparar como texto. Una fecha que falta queda primero, para que se vea.
const compararAntiguedad = (a, b) =>
  String(a.solicitud.fecha_ingreso ?? '').localeCompare(String(b.solicitud.fecha_ingreso ?? '')) ||
  String(a.solicitud.id_solicitud).localeCompare(String(b.solicitud.id_solicitud));

const compararClasificadas = (a, b) =>
  ORDEN_GRUPOS.indexOf(a.grupo) - ORDEN_GRUPOS.indexOf(b.grupo) ||
  PRIORIDADES.indexOf(a.clasificacion.prioridad_sugerida) -
    PRIORIDADES.indexOf(b.clasificacion.prioridad_sugerida) ||
  compararAntiguedad(a, b);

const indexarPorId = (lista, nombre) => {
  const mapa = new Map();
  for (const elemento of lista) {
    const id = elemento?.id_solicitud;
    if (mapa.has(id)) {
      throw new Error(`Hay dos ${nombre} con el id_solicitud "${id}". Revisa el archivo de datos.`);
    }
    mapa.set(id, elemento);
  }
  return mapa;
};

const noClasificada = (solicitud, motivo, origen = null) => ({
  solicitud,
  estado: 'no_clasificada',
  motivo,
  origen,
});

/** La clasificación vigente: la del triajista si existe y es válida; si no, la de la IA. */
const clasificacionVigente = (resultado, correccion) => {
  if (correccion) {
    const validada = validarClasificacion(correccion.clasificacion);
    if (validada.exito) {
      return { clasificacion: validada.datos, fuente: FUENTES.triajista };
    }
  }
  if (resultado?.estado === 'clasificada') {
    const validada = validarClasificacion(resultado.clasificacion);
    if (validada.exito) {
      return { clasificacion: validada.datos, fuente: FUENTES.ia };
    }
  }
  return null;
};

/**
 * Arma la bandeja.
 *
 * @param solicitudes lista de solicitudes (formato de entrada, tarea 002).
 * @param resultados lista de resultados de una corrida: { id_solicitud, estado, origen, clasificacion }.
 * @param opciones.correcciones lista de { id_solicitud, clasificacion } del triajista. Su formato
 *   es [PROVISIONAL]: se define en la tarea 006. Mientras, usa el mismo esquema de salida de la IA.
 * @returns {{ ordenadas: object[], no_clasificadas: object[], resultados_sin_solicitud: string[] }}
 */
export const armarBandeja = (solicitudes, resultados, { correcciones = [] } = {}) => {
  const resultadoPorId = indexarPorId(resultados, 'resultados');
  const correccionPorId = indexarPorId(correcciones, 'correcciones');
  indexarPorId(solicitudes, 'solicitudes');

  const ordenadas = [];
  const noClasificadas = [];

  for (const solicitud of solicitudes) {
    const id = solicitud?.id_solicitud;
    const resultado = resultadoPorId.get(id);
    const origen = resultado?.origen ?? null;

    if (!validarSolicitud(solicitud).exito) {
      noClasificadas.push(noClasificada(solicitud, MOTIVOS_BANDEJA.solicitudInvalida, origen));
      continue;
    }

    const vigente = clasificacionVigente(resultado, correccionPorId.get(id));
    if (vigente) {
      ordenadas.push({
        solicitud,
        estado: 'clasificada',
        clasificacion: vigente.clasificacion,
        fuente: vigente.fuente,
        origen,
        grupo: grupoSegunAlertas(vigente.clasificacion.alertas),
      });
    } else if (!resultado) {
      noClasificadas.push(noClasificada(solicitud, MOTIVOS_BANDEJA.sinResultado));
    } else if (resultado.estado === 'no_clasificada') {
      noClasificadas.push(noClasificada(solicitud, resultado.motivo, origen));
    } else {
      noClasificadas.push(noClasificada(solicitud, MOTIVOS_BANDEJA.resultadoInvalido, origen));
    }
  }

  const idsDeSolicitudes = new Set(solicitudes.map((solicitud) => solicitud?.id_solicitud));

  return {
    ordenadas: ordenadas.sort(compararClasificadas),
    no_clasificadas: noClasificadas.sort(compararAntiguedad),
    resultados_sin_solicitud: [...resultadoPorId.keys()]
      .filter((id) => !idsDeSolicitudes.has(id))
      .sort(),
  };
};

/**
 * Nombres para mostrar de los modelos. Si un modelo no está en la lista, se muestra su id.
 * "MiniMax M3.1 Flash" lo definió Candela (tarea 005).
 */
const NOMBRES_MODELOS = Object.freeze({
  'minimaxai/minimax-m3.1-flash': 'MiniMax M3.1 Flash',
});

/** Nombre corto del modelo, para la franja superior de la pantalla. */
const NOMBRES_CORTOS_MODELOS = Object.freeze({
  'minimaxai/minimax-m3.1-flash': 'MiniMax',
});

const MESES = Object.freeze([
  'ene.',
  'feb.',
  'mar.',
  'abr.',
  'may.',
  'jun.',
  'jul.',
  'ago.',
  'sept.',
  'oct.',
  'nov.',
  'dic.',
]);

/** Zona horaria para mostrar la fecha de la corrida (las corridas guardan la hora en UTC). */
const ZONA_HORARIA = 'America/Santiago';

/** Fecha corta en español, por ejemplo "26 nov. 2026". Devuelve null si la fecha no sirve. */
export const fechaCorta = (fechaIso, zonaHoraria = ZONA_HORARIA) => {
  const fecha = new Date(fechaIso ?? '');
  if (typeof fechaIso !== 'string' || Number.isNaN(fecha.getTime())) {
    return null;
  }
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: zonaHoraria,
    })
      .formatToParts(fecha)
      .map((parte) => [parte.type, parte.value]),
  );
  return `${partes.day} ${MESES[Number(partes.month) - 1]} ${partes.year}`;
};

/**
 * Describe de dónde vienen los datos de la bandeja, para mostrarlo siempre en la pantalla.
 * La bandeja lee una corrida guardada: los resultados no se generan en vivo. Por eso la etiqueta
 * dice qué los generó: el modelo de IA o las reglas de respaldo (tarea 018: sin avisos de demo).
 */
export const describirDatosBandeja = (corrida) => {
  if (corrida?.origen === 'modelo_real') {
    const nombre = NOMBRES_MODELOS[corrida.modelo] ?? corrida.modelo ?? 'modelo sin nombre';
    const fecha = fechaCorta(corrida.generado_en);
    return {
      origen: corrida.origen,
      modelo: corrida.modelo ?? null,
      nombre_modelo: nombre,
      nombre_corto: NOMBRES_CORTOS_MODELOS[corrida.modelo] ?? nombre,
      fecha_corrida: corrida.generado_en ?? null,
      reproducido_desde_archivo: true,
      texto_franja: `Clasificación con ${nombre}`,
      etiqueta: `Clasificación de ${nombre} (${fecha ? `corrida del ${fecha}` : 'fecha de la corrida desconocida'})`,
    };
  }
  if (corrida?.origen === 'simulado_reglas') {
    return {
      origen: corrida.origen,
      modelo: null,
      nombre_modelo: 'las reglas simuladas',
      nombre_corto: 'las reglas simuladas',
      fecha_corrida: corrida.generado_en ?? null,
      reproducido_desde_archivo: true,
      texto_franja: 'Clasificación por reglas de respaldo (sin IA)',
      etiqueta: 'Clasificación por reglas de respaldo (sin IA)',
    };
  }
  throw new Error(
    'La bandeja solo muestra corridas del modelo real o del modo simulado. Usa el archivo de la corrida original.',
  );
};

/** Arma la bandeja a partir de una corrida guardada y agrega la descripción de sus datos. */
export const armarBandejaDesdeCorrida = (solicitudes, corrida, opciones) => ({
  datos: describirDatosBandeja(corrida),
  ...armarBandeja(solicitudes, corrida?.resultados ?? [], opciones),
});
