import { Router } from 'express';
import { crearControladorEvaluacion } from '../controllers/evaluacion.controller.js';

/** Dirección web de la evaluación de los modelos (GET /api/evaluacion). */
export const crearRutasEvaluacion = (evaluacion) => {
  const controlador = crearControladorEvaluacion(evaluacion);
  const rutas = Router();
  rutas.get('/', controlador.obtener);
  return rutas;
};
