import { Router } from 'express';
import { crearControladorBandeja } from '../controllers/bandeja.controller.js';

/** Direcciones web de la bandeja (todas bajo /api/bandeja). */
export const crearRutasBandeja = (demo) => {
  const controlador = crearControladorBandeja(demo);
  const rutas = Router();
  rutas.get('/', controlador.obtener);
  rutas.post('/deshacer', controlador.deshacer);
  rutas.post('/simular-ingreso', controlador.simularIngreso);
  rutas.post('/reiniciar', controlador.reiniciar);
  rutas.post('/:id/confirmar', controlador.confirmar);
  rutas.post('/:id/corregir', controlador.corregir);
  return rutas;
};
