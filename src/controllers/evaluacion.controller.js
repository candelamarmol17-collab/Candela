import { ErrorHttp } from '../middlewares/errores.js';

/**
 * Controlador de la evaluación: devuelve las métricas ya calculadas al encender el programa
 * (las corridas no cambian mientras está encendido).
 * @param evaluacion resultado de evaluarModelos, o { error } si no se pudo calcular.
 */
export const crearControladorEvaluacion = (evaluacion) => ({
  obtener: (req, res) => {
    if (!evaluacion || evaluacion.error) {
      throw new ErrorHttp(500, evaluacion?.error ?? 'La evaluación no está disponible.');
    }
    res.status(200).json({ ok: true, datos: evaluacion });
  },
});
