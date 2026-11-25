import { existsSync } from 'node:fs';

/**
 * Configuración de la IA, leída desde el archivo .env (ver .env.example).
 *
 * Modos:
 *   - "real": solo si hay IA_API_KEY y MODO_IA no fuerza otro modo.
 *   - "simulado": el predeterminado. Funciona sin internet ni clave (regla R5).
 *   - "repeticion": repite una corrida real guardada (MODO_IA=repeticion + IA_ARCHIVO_REPETICION).
 *
 * La clave nunca se muestra ni se guarda: usar describirConfiguracion() para mostrarla en pantalla.
 */

export const MODOS = Object.freeze({
  real: 'real',
  simulado: 'simulado',
  repeticion: 'repeticion',
});

const VALORES_POR_DEFECTO = Object.freeze({
  pausaMs: 2000,
  tiempoEsperaMs: 30000,
});

/** Carga el archivo .env si existe. No falla si no existe (entonces se usa el modo simulado). */
export const cargarArchivoEnv = (ruta = '.env') => {
  if (existsSync(ruta)) {
    process.loadEnvFile(ruta);
  }
};

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

const enteroPositivo = (valor, nombre, porDefecto) => {
  const limpio = texto(valor);
  if (limpio === '') {
    return porDefecto;
  }
  const numero = Number(limpio);
  if (!Number.isInteger(numero) || numero < 0) {
    throw new Error(`${nombre} debe ser un número entero de milisegundos (por ejemplo 2000).`);
  }
  return numero;
};

/**
 * Lee la configuración desde las variables de entorno y decide el modo.
 * Lanza un error con un mensaje claro si la configuración del modo elegido está incompleta.
 */
export const leerConfiguracionIa = (entorno = process.env) => {
  const apiKey = texto(entorno.IA_API_KEY);
  const modoPedido = texto(entorno.MODO_IA).toLowerCase();

  if (modoPedido !== '' && !Object.values(MODOS).includes(modoPedido)) {
    throw new Error(
      `MODO_IA tiene un valor no permitido: "${modoPedido}". Usa "simulado", "repeticion" o déjalo vacío.`,
    );
  }

  let modo = MODOS.simulado;
  if (modoPedido === MODOS.repeticion) {
    modo = MODOS.repeticion;
  } else if (modoPedido !== MODOS.simulado && apiKey !== '') {
    modo = MODOS.real;
  }

  const configuracion = {
    modo,
    urlBase: texto(entorno.IA_URL_BASE).replace(/\/+$/, ''),
    apiKey,
    modelo: texto(entorno.IA_MODELO),
    pausaMs: enteroPositivo(entorno.IA_PAUSA_MS, 'IA_PAUSA_MS', VALORES_POR_DEFECTO.pausaMs),
    tiempoEsperaMs: enteroPositivo(
      entorno.IA_TIEMPO_ESPERA_MS,
      'IA_TIEMPO_ESPERA_MS',
      VALORES_POR_DEFECTO.tiempoEsperaMs,
    ),
    archivoRepeticion: texto(entorno.IA_ARCHIVO_REPETICION),
  };

  if (modo === MODOS.real && (configuracion.urlBase === '' || configuracion.modelo === '')) {
    throw new Error('Para usar el modelo real faltan IA_URL_BASE o IA_MODELO en el archivo .env.');
  }
  if (modo === MODOS.repeticion && configuracion.archivoRepeticion === '') {
    throw new Error('Para usar MODO_IA=repeticion falta IA_ARCHIVO_REPETICION en el archivo .env.');
  }

  return configuracion;
};

/** Texto para mostrar en pantalla, sin la clave. */
export const describirConfiguracion = (configuracion) => {
  if (configuracion.modo === MODOS.real) {
    return `Modo: modelo real · Modelo: ${configuracion.modelo} · URL: ${configuracion.urlBase} · Clave: configurada (oculta)`;
  }
  if (configuracion.modo === MODOS.repeticion) {
    return `Modo: repetición de una corrida guardada · Archivo: ${configuracion.archivoRepeticion}`;
  }
  return 'Modo: SIMULADO por reglas fijas (no es un modelo de IA)';
};
