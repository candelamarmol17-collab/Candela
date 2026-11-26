/**
 * Configuración de la aplicación web, leída desde el archivo .env (ver .env.example).
 */

export const ARCHIVO_CORRIDA_POR_DEFECTO =
  'data/resultados/clasificaciones-minimaxai-minimax-m3.1-flash.json';

const PUERTO_POR_DEFECTO = 3000;

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

/** Lee PUERTO y BANDEJA_ARCHIVO_CORRIDA. Lanza un error claro si el puerto no sirve. */
export const leerConfiguracionApp = (entorno = process.env) => {
  const puertoTexto = texto(entorno.PUERTO);
  const puerto = puertoTexto === '' ? PUERTO_POR_DEFECTO : Number(puertoTexto);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw new Error('PUERTO debe ser un número entero entre 1 y 65535 (por ejemplo 3000).');
  }
  return {
    puerto,
    archivoCorrida: texto(entorno.BANDEJA_ARCHIVO_CORRIDA) || ARCHIVO_CORRIDA_POR_DEFECTO,
  };
};
