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
 *      npm run clasificar:sinteticos -- --modelo <id>
 *      (con --modelo, usa otro modelo solo para esta corrida, sin cambiar el .env)
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

/**
 * Lee "--modelo <id>" de los argumentos. Devuelve el id, o null si no se indicó.
 * Lanza un error si falta el id o si hay argumentos que no se entienden.
 */
export const leerModeloDeArgumentos = (argumentos) => {
  if (argumentos.length === 0) {
    return null;
  }
  const [opcion, modelo, ...resto] = argumentos;
  if (opcion !== '--modelo' || !modelo || modelo.startsWith('--') || resto.length > 0) {
    throw new Error(
      'Argumentos no válidos. Uso: npm run clasificar:sinteticos -- --modelo <id del modelo>',
    );
  }
  return modelo.trim();
};

const ejecutar = async () => {
  try {
    cargarArchivoEnv();
    const modeloDeEstaCorrida = leerModeloDeArgumentos(process.argv.slice(2));
    const configuracion = leerConfiguracionIa(
      modeloDeEstaCorrida ? { ...process.env, IA_MODELO: modeloDeEstaCorrida } : process.env,
    );
    if (modeloDeEstaCorrida && configuracion.modo !== MODOS.real) {
      throw new Error('--modelo solo sirve con el modelo real (hace falta IA_API_KEY en el .env).');
    }
    escribir(describirConfiguracion(configuracion));
    if (modeloDeEstaCorrida) {
      escribir('(El modelo se cambió solo para esta corrida; el .env no se modificó.)');
    }

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
    escribir(`Tiempo promedio por solicitud: ${(corrida.tiempo_promedio_ms / 1000).toFixed(1)} s`);
    escribir(`Resultados guardados en: ${fileURLToPath(destino)}`);
  } catch (error) {
    process.stderr.write(`No se pudo completar la clasificación: ${error.message}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await ejecutar();
}
