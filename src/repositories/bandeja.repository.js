import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCsv } from '../utilidades/csv.js';

/**
 * Repositorio de la bandeja: lee los datos que la bandeja necesita desde archivos.
 *
 * Por seguridad (regla R1), solo lee:
 *   - las solicitudes sintéticas (data/sinteticos/solicitudes.json), y
 *   - una corrida guardada (.json) de la carpeta data/resultados/, y
 *   - las dos exportaciones de demostración (data/sinteticos/exportacion-demo-1.csv y -2.csv).
 * Nunca lee la clasificación de referencia ni archivos de otras carpetas.
 */

const ARCHIVO_SOLICITUDES = fileURLToPath(
  new URL('../../data/sinteticos/solicitudes.json', import.meta.url),
);
/** Rutas FIJAS: la demo no acepta otros archivos (regla R1). */
export const ARCHIVOS_EXPORTACION_DEMO = Object.freeze(
  [1, 2].map((numero) =>
    fileURLToPath(new URL(`../../data/sinteticos/exportacion-demo-${numero}.csv`, import.meta.url)),
  ),
);
const CARPETA_RESULTADOS = fileURLToPath(new URL('../../data/resultados/', import.meta.url));

/** Error de lectura de datos, con un mensaje pensado para quien usa el programa. */
export class ErrorDatosBandeja extends Error {
  constructor(mensaje, opciones) {
    super(mensaje, opciones);
    this.name = 'ErrorDatosBandeja';
  }
}

/**
 * Ruta completa de una corrida. Solo acepta archivos .json dentro de la carpeta de resultados.
 * Una ruta relativa se resuelve desde la carpeta donde se corre el programa (la raíz del proyecto).
 */
export const rutaDeCorrida = (archivo, carpeta = CARPETA_RESULTADOS) => {
  if (typeof archivo !== 'string' || archivo.trim() === '') {
    throw new ErrorDatosBandeja('Falta indicar el archivo de la corrida (data/resultados/...).');
  }
  const ruta = resolve(archivo.trim());
  const dentro = relative(resolve(carpeta), ruta);
  if (dentro === '' || dentro.startsWith('..') || isAbsolute(dentro) || extname(ruta) !== '.json') {
    throw new ErrorDatosBandeja(
      'La bandeja solo lee corridas guardadas: archivos .json de la carpeta data/resultados/.',
    );
  }
  return ruta;
};

const leerJson = async (ruta, nombre) => {
  let texto;
  try {
    texto = await readFile(ruta, 'utf8');
  } catch (error) {
    throw new ErrorDatosBandeja(`No se encontró ${nombre}: ${ruta}`, { cause: error });
  }
  try {
    return JSON.parse(texto);
  } catch (error) {
    throw new ErrorDatosBandeja(`${nombre} no es un JSON válido: ${ruta}`, { cause: error });
  }
};

/**
 * Lee las solicitudes sintéticas y la corrida indicada.
 *
 * @param opciones.archivoCorrida ruta de la corrida, dentro de data/resultados/.
 * @param opciones.archivoSolicitudes y opciones.carpetaResultados solo se cambian en las pruebas.
 * @returns {Promise<{ solicitudes: object[], corrida: object }>}
 */
export const leerDatosBandeja = async ({
  archivoCorrida,
  archivoSolicitudes = ARCHIVO_SOLICITUDES,
  carpetaResultados = CARPETA_RESULTADOS,
} = {}) => {
  const rutaCorrida = rutaDeCorrida(archivoCorrida, carpetaResultados);
  const [solicitudes, corrida] = await Promise.all([
    leerJson(archivoSolicitudes, 'el archivo de solicitudes'),
    leerJson(rutaCorrida, 'el archivo de la corrida'),
  ]);

  if (!Array.isArray(solicitudes)) {
    throw new ErrorDatosBandeja('El archivo de solicitudes debe ser una lista.');
  }
  if (!Array.isArray(corrida?.resultados)) {
    throw new ErrorDatosBandeja(
      'El archivo de la corrida no trae la lista "resultados". ¿Es una corrida de clasificar:sinteticos?',
    );
  }
  return { solicitudes, corrida };
};

/**
 * Lee las exportaciones de demostración (formato real de Telesalud, datos sintéticos).
 * Devuelve, por cada una, sus filas (la primera es el encabezado). No separa los datos
 * personales: eso lo hace la demo al cargar (seudonimizacion.service.js).
 */
export const leerExportacionesDemo = async (archivos = ARCHIVOS_EXPORTACION_DEMO) =>
  Promise.all(
    archivos.map(async (ruta, indice) => {
      let texto;
      try {
        texto = await readFile(ruta, 'utf8');
      } catch (error) {
        throw new ErrorDatosBandeja(
          `No se encontró la exportación de demostración ${indice + 1}: ${ruta}. Genérala con "npm run exportacion:demo".`,
          { cause: error },
        );
      }
      try {
        return leerCsv(texto);
      } catch (error) {
        throw new ErrorDatosBandeja(
          `La exportación de demostración ${indice + 1} no es un CSV válido: ${error.message}`,
          { cause: error },
        );
      }
    }),
  );

/**
 * Todo lo que la demo necesita: las exportaciones de demostración y la corrida guardada.
 * @returns {Promise<{ exportaciones: string[][][], corrida: object }>}
 */
export const leerDatosDemo = async ({ archivoCorrida, archivosExportacion } = {}) => {
  const [{ corrida }, exportaciones] = await Promise.all([
    leerDatosBandeja({ archivoCorrida }),
    leerExportacionesDemo(archivosExportacion),
  ]);
  return { exportaciones, corrida };
};
