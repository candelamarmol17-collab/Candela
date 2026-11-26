import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
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
import { nombreArchivoAdicional } from '../src/repositories/bandeja.repository.js';

/**
 * Clasifica SOLO los casos adicionales para el video (data/sinteticos/casos-adicionales.json,
 * hoy SINT-0061 "Rosa", tarea 015) con el modelo real MiniMax M3.1 Flash, y guarda la respuesta
 * tal como llegó en data/resultados/clasificaciones-adicionales-<modelo>.json.
 *
 * Uso: npm run clasificar:adicionales
 * Si el archivo ya existe y tiene casos sin clasificar (por ejemplo, el proveedor no respondió),
 * reintenta solo esos y anota el reintento en "reintentos", como clasificar:sinteticos.
 *
 * No toca las 60 solicitudes, la referencia ni las corridas guardadas. Estos casos no entran en
 * la evaluación (tarea 008). Por seguridad (regla R1) la ruta de entrada está fija, y nunca lee
 * la referencia, para que el modelo no reciba la respuesta correcta.
 */

/** Modelo con el que se clasifican los casos adicionales (el mismo de la bandeja del video). */
export const MODELO_CASOS_ADICIONALES = 'minimaxai/minimax-m3.1-flash';

/** MiniMax tardó cerca de 57 s por caso en la corrida de los 60: se le da margen. */
const TIEMPO_ESPERA_MS = '240000';

const ARCHIVO_CASOS = new URL('../data/sinteticos/casos-adicionales.json', import.meta.url);
const CARPETA_RESULTADOS = new URL('../data/resultados/', import.meta.url);

const escribir = (texto) => process.stdout.write(`${texto}\n`);

const ejecutar = async () => {
  try {
    cargarArchivoEnv();
    const configuracion = leerConfiguracionIa({
      ...process.env,
      IA_MODELO: MODELO_CASOS_ADICIONALES,
      IA_TIEMPO_ESPERA_MS: TIEMPO_ESPERA_MS,
    });
    if (configuracion.modo !== MODOS.real) {
      throw new Error('Hace falta el modelo real (IA_API_KEY en el .env) para clasificar.');
    }
    escribir(describirConfiguracion(configuracion));

    const casos = JSON.parse(await readFile(ARCHIVO_CASOS, 'utf8'));
    const adaptador = await crearAdaptadorSegunConfiguracion(configuracion);
    const alAvanzar = (resultado, numero, total) =>
      escribir(`[${numero}/${total}] ${resultado.id_solicitud}: ${resultado.estado}`);
    await mkdir(CARPETA_RESULTADOS, { recursive: true });
    const destino = new URL(nombreArchivoAdicional(configuracion.modelo), CARPETA_RESULTADOS);
    const anterior = existsSync(destino) ? JSON.parse(await readFile(destino, 'utf8')) : null;
    if (anterior && anterior.no_clasificadas === 0) {
      escribir('Los casos adicionales ya están clasificados: no se vuelve a llamar al modelo.');
      return;
    }
    const corrida = anterior
      ? await reintentarNoClasificadas(anterior, casos, adaptador, {
          pausaMs: configuracion.pausaMs,
          tiempoEsperaMs: configuracion.tiempoEsperaMs,
          alAvanzar,
        })
      : await clasificarEnSerie(casos, adaptador, { pausaMs: configuracion.pausaMs, alAvanzar });

    const conNota = {
      nota: 'Casos adicionales para el video (tarea 015). No entran en la evaluación de la tarea 008.',
      ...corrida,
    };
    await writeFile(destino, `${JSON.stringify(conNota, null, 2)}\n`, 'utf8');
    escribir(`Guardado en: data/resultados/${nombreArchivoAdicional(configuracion.modelo)}`);
  } catch (error) {
    process.stderr.write(`No se pudo clasificar los casos adicionales: ${error.message}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await ejecutar();
}
