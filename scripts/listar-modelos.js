import { pathToFileURL } from 'node:url';
import { cargarArchivoEnv } from '../src/config/ia.js';
import { listarModelos } from '../src/adaptadores/adaptador-compatible-openai.js';

/**
 * Muestra los modelos que el proveedor configurado en el .env ofrece HOY.
 * Usa IA_URL_BASE e IA_API_KEY. La clave nunca se muestra.
 *
 * Uso: npm run ia:modelos            (todos los modelos)
 *      npm run ia:modelos -- llama   (solo los que contienen "llama")
 */

const TIEMPO_ESPERA_MS = 30000;

const escribir = (texto) => process.stdout.write(`${texto}\n`);

/** Filtra los modelos por un texto (sin distinguir mayúsculas). Sin filtro, devuelve todos. */
export const filtrarModelos = (modelos, filtro = '') => {
  const buscado = filtro.trim().toLowerCase();
  return buscado === '' ? modelos : modelos.filter((id) => id.toLowerCase().includes(buscado));
};

const ejecutar = async () => {
  try {
    cargarArchivoEnv();
    const urlBase = (process.env.IA_URL_BASE ?? '').trim().replace(/\/+$/, '');
    const apiKey = (process.env.IA_API_KEY ?? '').trim();
    const modeloActual = (process.env.IA_MODELO ?? '').trim();

    if (urlBase === '' || apiKey === '') {
      escribir('Faltan IA_URL_BASE o IA_API_KEY en el archivo .env.');
      process.exitCode = 1;
      return;
    }

    escribir(`Proveedor: ${urlBase} · Clave: configurada (oculta)`);
    const modelos = filtrarModelos(
      await listarModelos({ urlBase, apiKey, tiempoEsperaMs: TIEMPO_ESPERA_MS }),
      process.argv[2] ?? '',
    );

    escribir(`Modelos disponibles hoy: ${modelos.length}`);
    for (const id of modelos) {
      escribir(`  ${id}${id === modeloActual ? '   ← el que tienes en IA_MODELO' : ''}`);
    }
    if (modeloActual !== '' && !modelos.includes(modeloActual) && !process.argv[2]) {
      escribir(`Atención: el modelo de IA_MODELO (${modeloActual}) NO está en la lista.`);
    }
  } catch (error) {
    process.stderr.write(`No se pudo obtener la lista: ${error.message}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await ejecutar();
}
