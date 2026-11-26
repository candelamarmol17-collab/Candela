import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { armarExportacionesDemo } from '../src/services/exportacion-demo.service.js';
import { escribirCsv } from '../src/utilidades/csv.js';

/**
 * Genera las dos exportaciones de demostración con el formato real de Telesalud (48 columnas):
 *   data/sinteticos/exportacion-demo-1.csv (59 solicitudes) y exportacion-demo-2.csv (1).
 *
 * Uso: npm run exportacion:demo   (en Windows: npm.cmd run exportacion:demo)
 * Solo usa datos sintéticos: el encabezado es lo único real.
 */

const CARPETA = new URL('../data/sinteticos/', import.meta.url);
export const ARCHIVOS_EXPORTACION_DEMO = Object.freeze([
  fileURLToPath(new URL('exportacion-demo-1.csv', CARPETA)),
  fileURLToPath(new URL('exportacion-demo-2.csv', CARPETA)),
]);

const principal = async () => {
  try {
    const solicitudes = JSON.parse(await readFile(new URL('solicitudes.json', CARPETA), 'utf8'));
    const exportaciones = armarExportacionesDemo(solicitudes);
    for (const [indice, filas] of exportaciones.entries()) {
      await writeFile(ARCHIVOS_EXPORTACION_DEMO[indice], escribirCsv(filas), 'utf8');
      process.stdout.write(
        `Exportación de demostración ${indice + 1}: ${filas.length - 1} solicitudes → ${ARCHIVOS_EXPORTACION_DEMO[indice]}\n`,
      );
    }
  } catch (error) {
    process.stderr.write(`No se pudo generar la exportación de demostración: ${error.message}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await principal();
}
