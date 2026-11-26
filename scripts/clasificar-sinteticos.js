import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
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
  reintentarNoClasificadas,
} from '../src/services/clasificacion.service.js';

/**
 * Clasifica las 60 solicitudes sintéticas y guarda los resultados en data/resultados/.
 *
 * Uso: npm run clasificar:sinteticos
 *      npm run clasificar:sinteticos -- --modelo <id>
 *      npm run clasificar:sinteticos -- --tiempo-espera 240000 --pausa 10000
 *      npm run clasificar:sinteticos -- --reintentar data/resultados/<archivo>.json
 *      --modelo, --tiempo-espera y --pausa cambian el valor solo para esta corrida, sin tocar el .env.
 *      --reintentar vuelve a clasificar solo las no clasificadas de esa corrida, con el mismo
 *      modelo, y actualiza el mismo archivo.
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

const USO = [
  'Uso: npm run clasificar:sinteticos -- [--modelo <id>] [--tiempo-espera <ms>] [--pausa <ms>]',
  '     npm run clasificar:sinteticos -- --reintentar <archivo de data/resultados> [--tiempo-espera <ms>] [--pausa <ms>]',
].join('\n');

const OPCIONES = Object.freeze({
  '--modelo': 'modelo',
  '--reintentar': 'reintentar',
  '--tiempo-espera': 'tiempoEsperaMs',
  '--pausa': 'pausaMs',
});

/**
 * Lee las opciones de la línea de comandos. Cada opción va seguida de su valor.
 * Devuelve { modelo, reintentar, tiempoEsperaMs, pausaMs } (null si no se indicó).
 * Los números los valida después leerConfiguracionIa, con los mismos mensajes que el .env.
 */
export const leerArgumentos = (argumentos) => {
  const leidos = { modelo: null, reintentar: null, tiempoEsperaMs: null, pausaMs: null };
  if (argumentos.length % 2 !== 0) {
    throw new Error(`Argumentos no válidos: a una opción le falta su valor.\n${USO}`);
  }
  for (let i = 0; i < argumentos.length; i += 2) {
    const nombre = OPCIONES[argumentos[i]];
    const valor = argumentos[i + 1].trim();
    if (!nombre || valor === '' || valor.startsWith('--') || leidos[nombre] !== null) {
      throw new Error(`Argumentos no válidos: "${argumentos[i]}".\n${USO}`);
    }
    leidos[nombre] = valor;
  }
  if (leidos.modelo !== null && leidos.reintentar !== null) {
    throw new Error(
      `Argumentos no válidos: con --reintentar el modelo sale del archivo; no uses --modelo.\n${USO}`,
    );
  }
  return leidos;
};

/**
 * Ruta del archivo a reintentar. Por seguridad (regla R1) solo se aceptan archivos .json
 * dentro de data/resultados/.
 */
export const rutaParaReintentar = (archivo, carpeta = fileURLToPath(CARPETA_RESULTADOS)) => {
  const ruta = resolve(archivo);
  const dentro = relative(resolve(carpeta), ruta);
  if (dentro === '' || dentro.startsWith('..') || isAbsolute(dentro) || extname(ruta) !== '.json') {
    throw new Error(
      'Con --reintentar solo se aceptan archivos .json de la carpeta data/resultados/.',
    );
  }
  return ruta;
};

const mostrarAvance = (resultado, numero, total) => {
  const detalle =
    resultado.estado === 'clasificada'
      ? resultado.clasificacion.prioridad_sugerida
      : resultado.motivo;
  escribir(`[${numero}/${total}] ${resultado.id_solicitud}: ${resultado.estado} (${detalle})`);
};

const mostrarResumen = (corrida, destino) => {
  escribir(
    `Listo: ${corrida.clasificadas} clasificadas y ${corrida.no_clasificadas} no clasificadas.`,
  );
  escribir(`Tiempo promedio por solicitud: ${(corrida.tiempo_promedio_ms / 1000).toFixed(1)} s`);
  escribir(`Resultados guardados en: ${fileURLToPath(destino)}`);
};

const ejecutar = async () => {
  try {
    cargarArchivoEnv();
    const argumentos = leerArgumentos(process.argv.slice(2));
    const rutaReintento = argumentos.reintentar ? rutaParaReintentar(argumentos.reintentar) : null;
    const corridaAnterior = rutaReintento
      ? JSON.parse(await readFile(rutaReintento, 'utf8'))
      : null;
    const modelo = corridaAnterior?.modelo ?? argumentos.modelo;

    const configuracion = leerConfiguracionIa({
      ...process.env,
      ...(modelo ? { IA_MODELO: modelo } : {}),
      ...(argumentos.tiempoEsperaMs ? { IA_TIEMPO_ESPERA_MS: argumentos.tiempoEsperaMs } : {}),
      ...(argumentos.pausaMs ? { IA_PAUSA_MS: argumentos.pausaMs } : {}),
    });
    const cambiosSoloParaEstaVez = Object.values(argumentos).some((valor) => valor !== null);
    if (cambiosSoloParaEstaVez && configuracion.modo !== MODOS.real) {
      throw new Error(
        'Estas opciones solo sirven con el modelo real (hace falta IA_API_KEY en el .env).',
      );
    }
    escribir(describirConfiguracion(configuracion));
    if (cambiosSoloParaEstaVez) {
      escribir(
        `(Solo para esta corrida: espera de ${configuracion.tiempoEsperaMs} ms y pausa de ${configuracion.pausaMs} ms. El .env no se modificó.)`,
      );
    }

    const solicitudes = JSON.parse(await readFile(ARCHIVO_SOLICITUDES, 'utf8'));
    const adaptador = await crearAdaptadorSegunConfiguracion(configuracion);
    const pausaMs = configuracion.modo === MODOS.real ? configuracion.pausaMs : 0;

    if (corridaAnterior) {
      const pendientes = corridaAnterior.no_clasificadas;
      if (pendientes === 0) {
        escribir('La corrida no tiene no clasificadas: no hay nada que reintentar.');
        return;
      }
      escribir(`Reintentando ${pendientes} no clasificadas (las clasificadas no se tocan).`);
      const corrida = await reintentarNoClasificadas(corridaAnterior, solicitudes, adaptador, {
        pausaMs,
        tiempoEsperaMs: configuracion.tiempoEsperaMs,
        alAvanzar: mostrarAvance,
      });
      const destino = pathToFileURL(rutaReintento);
      await writeFile(destino, `${JSON.stringify(corrida, null, 2)}\n`, 'utf8');
      const ultimo = corrida.reintentos.at(-1);
      escribir(
        `Reintento: ${ultimo.clasificadas} de ${ultimo.solicitudes.length} se clasificaron.`,
      );
      mostrarResumen(corrida, destino);
      return;
    }

    const corrida = await clasificarEnSerie(solicitudes, adaptador, {
      pausaMs,
      alAvanzar: mostrarAvance,
    });
    await mkdir(CARPETA_RESULTADOS, { recursive: true });
    const destino = new URL(nombreArchivoResultados(configuracion), CARPETA_RESULTADOS);
    await writeFile(destino, `${JSON.stringify(corrida, null, 2)}\n`, 'utf8');
    mostrarResumen(corrida, destino);
  } catch (error) {
    process.stderr.write(`No se pudo completar la clasificación: ${error.message}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await ejecutar();
}
