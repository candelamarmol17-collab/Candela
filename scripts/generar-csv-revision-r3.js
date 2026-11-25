import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { celda } from './generar-csv-revision.js';

/**
 * Genera la tabla para revisar a mano la regla R3: que ninguna justificación del modelo dé
 * diagnósticos, tratamientos ni consejos. Para Excel en español: separador ";" y UTF-8 con BOM.
 *
 * Uso: npm run revision:r3 -- data/resultados/clasificaciones-<modelo>.json
 */

const SEPARADOR = ';';
const SALTO_DE_LINEA = '\r\n';
const BOM = '﻿';

const COLUMNAS = [
  'id_solicitud',
  'origen',
  'estado',
  'texto_libre',
  'justificacion',
  'comentario_revision',
];

const ARCHIVO_SOLICITUDES = new URL('../data/sinteticos/solicitudes.json', import.meta.url);

/** Arma el CSV de revisión R3 a partir de una corrida y de las solicitudes sintéticas. */
export const generarCsvRevisionR3 = (corrida, solicitudes) => {
  const textoPorId = new Map(
    solicitudes.map((solicitud) => [solicitud.id_solicitud, solicitud.texto_libre]),
  );

  const filas = corrida.resultados.map((resultado) =>
    [
      resultado.id_solicitud,
      resultado.origen,
      resultado.estado,
      textoPorId.get(resultado.id_solicitud),
      resultado.clasificacion?.justificacion ?? '',
      '',
    ]
      .map(celda)
      .join(SEPARADOR),
  );

  return BOM + [COLUMNAS.join(SEPARADOR), ...filas].join(SALTO_DE_LINEA) + SALTO_DE_LINEA;
};

/** revision-r3-<modelo>.csv, en la misma carpeta que el archivo de resultados. */
export const rutaCsvR3 = (rutaResultados) =>
  join(
    dirname(rutaResultados),
    `revision-r3-${basename(rutaResultados, '.json').replace(/^clasificaciones-/, '')}.csv`,
  );

const ejecutar = async () => {
  try {
    const rutaResultados = process.argv[2];
    if (!rutaResultados) {
      throw new Error(
        'Indica el archivo de resultados. Ejemplo: npm run revision:r3 -- data/resultados/clasificaciones-meta-llama-3.3-70b-instruct.json',
      );
    }
    const corrida = JSON.parse(await readFile(resolve(rutaResultados), 'utf8'));
    const solicitudes = JSON.parse(await readFile(ARCHIVO_SOLICITUDES, 'utf8'));
    const destino = rutaCsvR3(resolve(rutaResultados));
    await writeFile(destino, generarCsvRevisionR3(corrida, solicitudes), 'utf8');
    process.stdout.write(`Tabla de revisión R3 generada: ${destino}\n`);
  } catch (error) {
    process.stderr.write(`No se pudo generar la tabla de revisión R3: ${error.message}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await ejecutar();
}
