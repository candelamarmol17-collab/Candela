import { readFile } from 'node:fs/promises';
import { crearAdaptadorCompatibleOpenAI } from '../adaptadores/adaptador-compatible-openai.js';
import { crearAdaptadorRepeticion } from '../adaptadores/adaptador-repeticion.js';
import { crearAdaptadorSimulado } from '../adaptadores/adaptador-simulado.js';
import { MODOS } from '../config/ia.js';
import { construirMensajes, VERSION_PROMPT } from '../prompts/clasificacion.js';
import { ALERTA_PERSONA_MAYOR } from '../schemas/catalogos.js';
import { validarClasificacion } from '../schemas/clasificacion.schema.js';
import { validarSolicitud } from '../schemas/solicitud.schema.js';
import { esperar as esperarPorDefecto } from '../utilidades/esperar.js';

/**
 * Servicio de clasificación: une la solicitud, el prompt, el adaptador y los esquemas.
 *
 * Nunca inventa datos: si algo falla, la solicitud queda "no_clasificada" con su motivo,
 * para que la revise una persona.
 */

export const ESTADOS = Object.freeze({
  clasificada: 'clasificada',
  noClasificada: 'no_clasificada',
});

export const MOTIVOS_NO_CLASIFICADA = Object.freeze({
  solicitudInvalida: 'solicitud_invalida',
  errorProveedor: 'error_proveedor',
  jsonInvalido: 'json_invalido',
  esquemaInvalido: 'esquema_invalido',
  idDistinto: 'id_distinto',
});

const EDAD_PERSONA_MAYOR = 60;

/** Crea el adaptador que corresponde al modo de la configuración. */
export const crearAdaptadorSegunConfiguracion = async (configuracion) => {
  if (configuracion.modo === MODOS.real) {
    return crearAdaptadorCompatibleOpenAI(configuracion);
  }
  if (configuracion.modo === MODOS.repeticion) {
    const corrida = JSON.parse(await readFile(configuracion.archivoRepeticion, 'utf8'));
    return crearAdaptadorRepeticion(corrida);
  }
  return crearAdaptadorSimulado();
};

/**
 * Saca el JSON del texto del modelo. Solo se permite quitar un envoltorio ```json ... ```,
 * que no cambia ningún dato. Cualquier otro texto extra hace fallar la lectura.
 */
export const extraerJson = (texto) => {
  const limpio = texto.trim();
  const envoltorio = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(limpio);
  return JSON.parse(envoltorio ? envoltorio[1] : limpio);
};

/** Regla fija (no la decide la IA): la alerta de persona mayor depende solo de la edad. */
export const aplicarReglaPersonaMayor = (clasificacion, edad) => {
  const alertas = clasificacion.alertas.filter((alerta) => alerta !== ALERTA_PERSONA_MAYOR);
  if (typeof edad === 'number' && edad >= EDAD_PERSONA_MAYOR) {
    alertas.push(ALERTA_PERSONA_MAYOR);
  }
  return { ...clasificacion, alertas };
};

const noClasificada = (id, origen, motivo, detalle, respuestaCruda) => ({
  id_solicitud: id,
  estado: ESTADOS.noClasificada,
  origen,
  motivo,
  detalle,
  ...(respuestaCruda !== undefined ? { respuesta_cruda: respuestaCruda } : {}),
});

/** Clasifica una solicitud con el adaptador indicado. Nunca lanza un error. */
export const clasificarSolicitud = async (solicitud, adaptador) => {
  const id = typeof solicitud?.id_solicitud === 'string' ? solicitud.id_solicitud : null;
  const { origen } = adaptador;

  const entrada = validarSolicitud(solicitud);
  if (!entrada.exito) {
    return noClasificada(
      id,
      origen,
      MOTIVOS_NO_CLASIFICADA.solicitudInvalida,
      entrada.errores.map((error) => error.mensaje).join(' '),
    );
  }

  let texto;
  try {
    texto = await adaptador.completar(construirMensajes(entrada.datos), entrada.datos);
  } catch (error) {
    return noClasificada(id, origen, MOTIVOS_NO_CLASIFICADA.errorProveedor, error.message);
  }

  let datos;
  try {
    datos = extraerJson(texto);
  } catch {
    return noClasificada(
      id,
      origen,
      MOTIVOS_NO_CLASIFICADA.jsonInvalido,
      'La respuesta no es un JSON válido.',
      texto,
    );
  }

  const salida = validarClasificacion(datos);
  if (!salida.exito) {
    return noClasificada(
      id,
      origen,
      MOTIVOS_NO_CLASIFICADA.esquemaInvalido,
      salida.errores.map((error) => error.mensaje).join(' '),
      texto,
    );
  }

  if (salida.datos.id_solicitud !== id) {
    return noClasificada(
      id,
      origen,
      MOTIVOS_NO_CLASIFICADA.idDistinto,
      `La respuesta trae el id "${salida.datos.id_solicitud}" en vez de "${id}".`,
      texto,
    );
  }

  return {
    id_solicitud: id,
    estado: ESTADOS.clasificada,
    origen,
    clasificacion: aplicarReglaPersonaMayor(salida.datos, entrada.datos.edad),
  };
};

/**
 * Clasifica una lista de solicitudes de a una, con una pausa entre cada una.
 * Devuelve la corrida completa, con los datos que dicen de dónde vienen los resultados.
 * Cada resultado guarda cuánto tardó (duracion_ms), sin contar la pausa.
 */
export const clasificarEnSerie = async (
  solicitudes,
  adaptador,
  {
    pausaMs = 0,
    esperar = esperarPorDefecto,
    alAvanzar = () => {},
    ahora = () => new Date(),
    reloj = () => performance.now(),
  } = {},
) => {
  const resultados = [];

  for (const [indice, solicitud] of solicitudes.entries()) {
    if (indice > 0 && pausaMs > 0) {
      await esperar(pausaMs);
    }
    const inicio = reloj();
    const resultado = {
      ...(await clasificarSolicitud(solicitud, adaptador)),
      duracion_ms: Math.round(reloj() - inicio),
    };
    resultados.push(resultado);
    alAvanzar(resultado, indice + 1, solicitudes.length);
  }

  const clasificadas = resultados.filter((r) => r.estado === ESTADOS.clasificada).length;
  const duracionTotal = resultados.reduce((suma, r) => suma + r.duracion_ms, 0);

  return {
    aviso:
      'Resultados sobre datos sintéticos (inventados). La clasificación es una sugerencia: siempre decide el triajista.',
    origen: adaptador.origen,
    modelo: adaptador.modelo,
    ...(adaptador.corridaOriginal ? { corrida_original: adaptador.corridaOriginal } : {}),
    version_prompt: VERSION_PROMPT,
    generado_en: ahora().toISOString(),
    total: resultados.length,
    clasificadas,
    no_clasificadas: resultados.length - clasificadas,
    tiempo_promedio_ms: resultados.length > 0 ? Math.round(duracionTotal / resultados.length) : 0,
    resultados,
  };
};
