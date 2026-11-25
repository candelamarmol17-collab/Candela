import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  cargarArchivoEnv,
  describirConfiguracion,
  leerConfiguracionIa,
  MODOS,
} from '../src/config/ia.js';
import {
  clasificarEnSerie,
  crearAdaptadorSegunConfiguracion,
} from '../src/services/clasificacion.service.js';

/**
 * Clasifica las 60 solicitudes sintéticas y guarda los resultados en data/resultados/.
 *
 * Uso: npm run clasificar:sinteticos
 *
 * Por seguridad (regla R1), la ruta de entrada está fija: solo lee las solicitudes sintéticas.
 * Nunca lee la clasificación de referencia, para que el modelo no reciba la respuesta correcta.
 */

const ARCHIVO_SOLICITUDES = new URL('../data/sinteticos/solicitudes.json', import.meta.url);
const CARPETA_RESULTADOS = new URL('../data/resultados/', import.meta.url);

/** Nombre del archivo de resultados según el modo y el modelo. */
export const nombreArchivoResultados = (configuracion) => {
  if (configuracion.modo === MODOS.real) {
    const modelo = configuracion.modelo.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
    return `clasificaciones-${modelo}.json`;
  }
  return `clasificaciones-${configuracion.modo}.json`;
};

const escribir = (texto) => process.stdout.write(`${texto}\n`);

const ejecutar = async () => {
  try {
    cargarArchivoEnv();
    const configuracion = leerConfiguracionIa();
    escribir(describirConfiguracion(configuracion));

    const solicitudes = JSON.parse(await readFile(ARCHIVO_SOLICITUDES, 'utf8'));
    const adaptador = await crearAdaptadorSegunConfiguracion(configuracion);

    const corrida = await clasificarEnSerie(solicitudes, adaptador, {
      pausaMs: configuracion.modo === MODOS.real ? configuracion.pausaMs : 0,
      alAvanzar: (resultado, numero, total) => {
        const detalle =
          resultado.estado === 'clasificada'
            ? resultado.clasificacion.prioridad_sugerida
            : resultado.motivo;
        escribir(
          `[${numero}/${total}] ${resultado.id_solicitud}: ${resultado.estado} (${detalle})`,
        );
      },
    });

    await mkdir(CARPETA_RESULTADOS, { recursive: true });
    const destino = new URL(nombreArchivoResultados(configuracion), CARPETA_RESULTADOS);
    await writeFile(destino, `${JSON.stringify(corrida, null, 2)}\n`, 'utf8');

    escribir(
      `Listo: ${corrida.clasificadas} clasificadas y ${corrida.no_clasificadas} no clasificadas.`,
    );
    escribir(`Resultados guardados en: ${fileURLToPath(destino)}`);
  } catch (error) {
    process.stderr.write(`No se pudo completar la clasificación: ${error.message}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await ejecutar();
}
