import { ErrorDemo } from '../services/demo-bandeja.service.js';

/**
 * Respuestas de error en JSON, iguales en toda la aplicación:
 *   { ok: false, error: { mensaje, detalles? } }
 */

/** Error con código HTTP y detalles opcionales (por ejemplo, los errores de validación). */
export class ErrorHttp extends Error {
  constructor(codigo, mensaje, detalles) {
    super(mensaje);
    this.name = 'ErrorHttp';
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

/** Para las direcciones de la API que no existen. */
export const rutaNoEncontrada = (req, res) => {
  res.status(404).json({ ok: false, error: { mensaje: 'Esa dirección de la API no existe.' } });
};

/**
 * Middleware global de errores (atrapa todos los errores en un solo lugar).
 * Un error inesperado responde 500 con un mensaje general: nunca muestra detalles internos.
 */
// eslint-disable-next-line no-unused-vars -- Express reconoce este middleware por sus 4 parámetros.
export const manejarErrores = (error, req, res, next) => {
  if (error instanceof ErrorHttp || error instanceof ErrorDemo) {
    res.status(error.codigo).json({
      ok: false,
      error: { mensaje: error.message, ...(error.detalles ? { detalles: error.detalles } : {}) },
    });
    return;
  }
  // JSON mal escrito en el cuerpo de la petición.
  if (error?.type === 'entity.parse.failed') {
    res
      .status(400)
      .json({ ok: false, error: { mensaje: 'El cuerpo de la petición no es JSON válido.' } });
    return;
  }
  // Se anota en la terminal para poder revisarlo; a la pantalla no se le muestran detalles.
  process.stderr.write(`Error inesperado: ${error?.message ?? error}\n`);
  res.status(500).json({ ok: false, error: { mensaje: 'Ocurrió un error inesperado.' } });
};
