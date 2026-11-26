import express from 'express';
import { fileURLToPath } from 'node:url';
import { manejarErrores, rutaNoEncontrada } from './middlewares/errores.js';
import { crearRutasBandeja } from './routes/bandeja.routes.js';

const CARPETA_PUBLICA = fileURLToPath(new URL('../public/', import.meta.url));

/**
 * Crea la aplicación web: la pantalla (carpeta public/) y la API de la bandeja.
 * @param opciones.demo la demo de la bandeja (ver services/demo-bandeja.service.js).
 */
export const crearApp = ({ demo }) => {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));
  app.use('/api/bandeja', crearRutasBandeja(demo));
  app.use('/api', rutaNoEncontrada);
  app.use(express.static(CARPETA_PUBLICA));
  app.use(manejarErrores);
  return app;
};
