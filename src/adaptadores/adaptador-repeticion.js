/**
 * Adaptador de REPETICIÓN: devuelve las respuestas de una corrida real guardada, sin llamar a
 * internet. Sirve para que la demo no dependa de la conexión, mostrando que son resultados
 * guardados de una corrida anterior (y de qué modelo y fecha).
 */

export const ORIGEN_REPETICION = 'repeticion';

export class ErrorRepeticion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorRepeticion';
  }
}

/**
 * @param corrida Contenido de un archivo de data/resultados/ generado por el modelo real.
 */
export const crearAdaptadorRepeticion = (corrida) => {
  if (corrida?.origen !== 'modelo_real' || !Array.isArray(corrida.resultados)) {
    throw new ErrorRepeticion(
      'Solo se puede repetir un archivo de resultados generado por el modelo real.',
    );
  }

  const porId = new Map(corrida.resultados.map((resultado) => [resultado.id_solicitud, resultado]));

  return {
    origen: ORIGEN_REPETICION,
    modelo: corrida.modelo,
    corridaOriginal: { generado_en: corrida.generado_en, modelo: corrida.modelo },
    completar: async (_mensajes, solicitud) => {
      const guardado = porId.get(solicitud.id_solicitud);
      if (!guardado) {
        throw new ErrorRepeticion(
          `La corrida guardada no tiene la solicitud ${solicitud.id_solicitud}.`,
        );
      }
      if (guardado.estado === 'clasificada') {
        return JSON.stringify(guardado.clasificacion);
      }
      if (typeof guardado.respuesta_cruda === 'string') {
        return guardado.respuesta_cruda;
      }
      throw new ErrorRepeticion(
        `En la corrida guardada, la solicitud ${solicitud.id_solicitud} quedó no clasificada: ${guardado.detalle ?? 'sin detalle'}`,
      );
    },
  };
};
