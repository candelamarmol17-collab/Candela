import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { leerCsv } from '../utilidades/csv.js';

/**
 * Repositorio de la evaluación (tarea 008): lee la referencia, las dos corridas del modelo real y
 * los comentarios de la revisión R3. Rutas FIJAS: no lee otros archivos.
 *
 * La corrida simulada no se evalúa: sus palabras clave se escribieron conociendo los 60 textos.
 */

const ruta = (relativa) => fileURLToPath(new URL(`../../${relativa}`, import.meta.url));

export const ARCHIVO_REFERENCIA = ruta('data/sinteticos/referencia.json');

export const CORRIDAS_EVALUADAS = Object.freeze(
  ['mistralai/mistral-large-4-1t-a52b', 'minimaxai/minimax-m3.1-flash'].map((modelo) => {
    const nombre = modelo.replace('/', '-');
    return Object.freeze({
      modelo,
      corrida: ruta(`data/resultados/clasificaciones-${nombre}.json`),
      revisionR3: ruta(`data/resultados/revision-r3-${nombre}.csv`),
    });
  }),
);

export class ErrorDatosEvaluacion extends Error {
  constructor(mensaje, opciones) {
    super(mensaje, opciones);
    this.name = 'ErrorDatosEvaluacion';
  }
}

const leerJson = async (archivo, nombre) => {
  let texto;
  try {
    texto = await readFile(archivo, 'utf8');
  } catch (error) {
    throw new ErrorDatosEvaluacion(`No se encontró ${nombre}.`, { cause: error });
  }
  try {
    return JSON.parse(texto);
  } catch (error) {
    throw new ErrorDatosEvaluacion(`${nombre} no es un JSON válido.`, { cause: error });
  }
};

/**
 * Hallazgos de la revisión R3: las filas con algo escrito en "comentario_revision".
 * Si la tabla no existe, no hay hallazgos (la revisión es opcional para evaluar).
 * @returns {Promise<{ id: string, comentario: string }[]>}
 */
export const leerHallazgosR3 = async (archivo) => {
  let texto;
  try {
    texto = await readFile(archivo, 'utf8');
  } catch {
    return [];
  }
  const [encabezado, ...filas] = leerCsv(texto, { separador: ';' });
  const columnaId = encabezado?.indexOf('id_solicitud') ?? -1;
  const columnaComentario = encabezado?.indexOf('comentario_revision') ?? -1;
  if (columnaId < 0 || columnaComentario < 0) {
    throw new ErrorDatosEvaluacion(
      'La tabla de revisión R3 no tiene las columnas "id_solicitud" y "comentario_revision".',
    );
  }
  return filas
    .map((fila) => ({
      id: (fila[columnaId] ?? '').trim(),
      comentario: (fila[columnaComentario] ?? '').trim(),
    }))
    .filter((hallazgo) => hallazgo.id !== '' && hallazgo.comentario !== '');
};

/**
 * Todo lo que la evaluación necesita. Si falta una corrida, esa entrada trae { modelo, error }
 * para que la pantalla lo diga en vez de mostrar ceros.
 */
export const leerDatosEvaluacion = async ({
  archivoReferencia = ARCHIVO_REFERENCIA,
  corridas = CORRIDAS_EVALUADAS,
} = {}) => {
  const referencia = await leerJson(archivoReferencia, 'la clasificación de referencia');
  if (!Array.isArray(referencia)) {
    throw new ErrorDatosEvaluacion('La clasificación de referencia debe ser una lista.');
  }
  const entradas = await Promise.all(
    corridas.map(async ({ modelo, corrida, revisionR3 }) => {
      try {
        const [datos, hallazgosR3] = await Promise.all([
          leerJson(corrida, `la corrida de ${modelo}`),
          leerHallazgosR3(revisionR3),
        ]);
        return { corrida: datos, hallazgosR3 };
      } catch (error) {
        if (!(error instanceof ErrorDatosEvaluacion)) throw error;
        return { modelo, error: error.message };
      }
    }),
  );
  return { referencia, corridas: entradas };
};
