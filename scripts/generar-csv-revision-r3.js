import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ALERTAS_CRITICAS } from '../src/schemas/catalogos.js';
import { celda } from './generar-csv-revision.js';

/**
 * Genera la tabla para revisar a mano la regla R3: que ninguna justificación del modelo dé
 * diagnósticos, tratamientos ni consejos. Para Excel en español: separador ";" y UTF-8 con BOM.
 *
 * Uso: npm run revision:r3 -- <resultados.json>
 *      npm run revision:r3 -- <resultados-modelo-a.json> <resultados-modelo-b.json>
 *
 * Con dos archivos genera una tabla por modelo, y cada una agrega una columna que marca los casos
 * donde los dos modelos difieren en prioridad, profesional o alertas críticas.
 */

const SEPARADOR = ';';
const SALTO_DE_LINEA = '\r\n';
const BOM = '﻿';

const COLUMNAS = ['id_solicitud', 'origen', 'estado', 'texto_libre', 'justificacion'];
const COLUMNA_COMENTARIO = 'comentario_revision';

const ARCHIVO_SOLICITUDES = new URL('../data/sinteticos/solicitudes.json', import.meta.url);

const alertasCriticas = (clasificacion) =>
  clasificacion.alertas.filter((alerta) => ALERTAS_CRITICAS.includes(alerta)).sort();

const listaOVacia = (lista) => (lista.length > 0 ? lista.join(', ') : '(ninguna)');

/**
 * Compara dos resultados de la misma solicitud. Devuelve "no" si coinciden en prioridad,
 * profesional y alertas críticas; si no, describe cada diferencia ("este / el otro").
 */
export const compararResultados = (resultado, otro) => {
  if (!otro) {
    return 'sin resultado del otro modelo';
  }
  if (resultado.estado !== 'clasificada' || otro.estado !== 'clasificada') {
    return 'no comparable: un modelo no la clasificó';
  }
  const a = resultado.clasificacion;
  const b = otro.clasificacion;
  const diferencias = [];
  if (a.prioridad_sugerida !== b.prioridad_sugerida) {
    diferencias.push(`prioridad: ${a.prioridad_sugerida} / ${b.prioridad_sugerida}`);
  }
  if (a.profesional_sugerido !== b.profesional_sugerido) {
    diferencias.push(`profesional: ${a.profesional_sugerido} / ${b.profesional_sugerido}`);
  }
  const criticasA = alertasCriticas(a);
  const criticasB = alertasCriticas(b);
  if (criticasA.join() !== criticasB.join()) {
    diferencias.push(`alertas críticas: ${listaOVacia(criticasA)} / ${listaOVacia(criticasB)}`);
  }
  return diferencias.length > 0 ? diferencias.join(' | ') : 'no';
};

/**
 * Arma el CSV de revisión R3 a partir de una corrida y de las solicitudes sintéticas.
 * Si se entrega otraCorrida, agrega la columna de diferencias con ese modelo.
 */
export const generarCsvRevisionR3 = (corrida, solicitudes, otraCorrida = null) => {
  const textoPorId = new Map(
    solicitudes.map((solicitud) => [solicitud.id_solicitud, solicitud.texto_libre]),
  );
  const otroPorId = new Map(
    (otraCorrida?.resultados ?? []).map((resultado) => [resultado.id_solicitud, resultado]),
  );

  const columnas = [
    ...COLUMNAS,
    ...(otraCorrida ? [`difiere_de_${otraCorrida.modelo ?? otraCorrida.origen}`] : []),
    COLUMNA_COMENTARIO,
  ];

  const filas = corrida.resultados.map((resultado) =>
    [
      resultado.id_solicitud,
      resultado.origen,
      resultado.estado,
      textoPorId.get(resultado.id_solicitud),
      resultado.clasificacion?.justificacion ?? '',
      ...(otraCorrida
        ? [compararResultados(resultado, otroPorId.get(resultado.id_solicitud))]
        : []),
      '',
    ]
      .map(celda)
      .join(SEPARADOR),
  );

  return BOM + [columnas.join(SEPARADOR), ...filas].join(SALTO_DE_LINEA) + SALTO_DE_LINEA;
};

/** revision-r3-<modelo>.csv, en la misma carpeta que el archivo de resultados. */
export const rutaCsvR3 = (rutaResultados) =>
  join(
    dirname(rutaResultados),
    `revision-r3-${basename(rutaResultados, '.json').replace(/^clasificaciones-/, '')}.csv`,
  );

/**
 * Escribe la tabla solo si el archivo no existe. Así nunca se borran los comentarios que la
 * revisora ya anotó en una tabla anterior.
 */
export const escribirCsvNuevo = async (destino, contenido) => {
  try {
    await writeFile(destino, contenido, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(
        `Ya existe ${destino}. No se sobrescribe, para no borrar los comentarios de la revisión. Si quieres generarla de nuevo, renombra o mueve primero ese archivo.`,
        { cause: error },
      );
    }
    throw error;
  }
};

const leerJson = async (ruta) => JSON.parse(await readFile(ruta, 'utf8'));

const ejecutar = async () => {
  try {
    const rutas = process.argv.slice(2).map((ruta) => resolve(ruta));
    if (rutas.length < 1 || rutas.length > 2) {
      throw new Error(
        'Indica uno o dos archivos de resultados. Ejemplo: npm run revision:r3 -- data/resultados/clasificaciones-<modelo>.json',
      );
    }
    const corridas = await Promise.all(rutas.map(leerJson));
    const solicitudes = await leerJson(ARCHIVO_SOLICITUDES);

    for (const [indice, ruta] of rutas.entries()) {
      const otra = corridas.length === 2 ? corridas[1 - indice] : null;
      const destino = rutaCsvR3(ruta);
      try {
        await escribirCsvNuevo(destino, generarCsvRevisionR3(corridas[indice], solicitudes, otra));
        process.stdout.write(`Tabla de revisión R3 generada: ${destino}\n`);
      } catch (error) {
        // Se sigue con el otro archivo: que una tabla ya exista no frena a la otra.
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
      }
    }
  } catch (error) {
    process.stderr.write(`No se pudo generar la tabla de revisión R3: ${error.message}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await ejecutar();
}
