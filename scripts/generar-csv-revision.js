import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Genera la tabla de revisión de los datos sintéticos: cada solicitud junto a su referencia.
 * Pensada para Excel configurado en español: separador ";" y UTF-8 con BOM.
 *
 * Uso: npm run revision:csv
 */

const SEPARADOR = ';';
const SALTO_DE_LINEA = '\r\n';
const BOM = '﻿';

const COLUMNAS = [
  'id_solicitud',
  'fecha_ingreso',
  'tipo_profesional',
  'motivo',
  'edad',
  'texto_libre',
  'prioridad_ref',
  'profesional_ref',
  'alertas_ref',
  'nota_ref',
  'comentario_revision',
];

const CARPETA_DATOS = new URL('../data/sinteticos/', import.meta.url);

/**
 * Prepara un valor para una celda del CSV.
 * - Si empieza con =, +, - o @, se le antepone un apóstrofo para que Excel no lo trate como fórmula.
 * - Si trae el separador, comillas o saltos de línea, va entre comillas (y las comillas se duplican).
 */
export const celda = (valor) => {
  let texto = valor === undefined || valor === null ? '' : String(valor);

  if (/^[=+\-@]/.test(texto)) {
    texto = `'${texto}`;
  }

  if (/[;"\r\n]/.test(texto)) {
    texto = `"${texto.replaceAll('"', '""')}"`;
  }

  return texto;
};

/** Arma el contenido completo del CSV. Falla si una solicitud no tiene referencia. */
export const generarCsvRevision = (solicitudes, referencias) => {
  const referenciaPorId = new Map(
    referencias.map((referencia) => [referencia.id_solicitud, referencia]),
  );

  const filas = solicitudes.map((solicitud) => {
    const referencia = referenciaPorId.get(solicitud.id_solicitud);
    if (!referencia) {
      throw new Error(`La solicitud ${solicitud.id_solicitud} no tiene referencia.`);
    }

    return [
      solicitud.id_solicitud,
      solicitud.fecha_ingreso,
      solicitud.tipo_profesional,
      solicitud.motivo,
      solicitud.edad,
      solicitud.texto_libre,
      referencia.prioridad,
      referencia.profesional,
      referencia.alertas.join(', '),
      referencia.nota,
      '',
    ]
      .map(celda)
      .join(SEPARADOR);
  });

  return BOM + [COLUMNAS.join(SEPARADOR), ...filas].join(SALTO_DE_LINEA) + SALTO_DE_LINEA;
};

const leerJson = async (nombre) =>
  JSON.parse(await readFile(new URL(nombre, CARPETA_DATOS), 'utf8'));

const ejecutar = async () => {
  try {
    const [solicitudes, referencias] = await Promise.all([
      leerJson('solicitudes.json'),
      leerJson('referencia.json'),
    ]);
    const destino = new URL('revision.csv', CARPETA_DATOS);
    await writeFile(destino, generarCsvRevision(solicitudes, referencias), 'utf8');
    process.stdout.write(`Tabla de revisión generada: ${fileURLToPath(destino)}\n`);
  } catch (error) {
    process.stderr.write(`No se pudo generar la tabla de revisión: ${error.message}\n`);
    process.exitCode = 1;
  }
};

// Solo se ejecuta cuando se llama directamente (npm run revision:csv), no cuando lo importan las pruebas.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await ejecutar();
}
