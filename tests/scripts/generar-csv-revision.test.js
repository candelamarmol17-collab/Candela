import { readFileSync } from 'node:fs';
import { celda, generarCsvRevision } from '../../scripts/generar-csv-revision.js';

// Datos sintéticos (inventados). Nunca usar datos reales.
const solicitud = (cambios = {}) => ({
  id_solicitud: 'SINT-0001',
  fecha_ingreso: '2026-11-19T10:30:00',
  tipo_profesional: 'Nutrición',
  motivo: 'Otros',
  texto_libre: 'texto de ejemplo con ñ y tildes',
  edad: 40,
  ...cambios,
});

const referencia = (cambios = {}) => ({
  id_solicitud: 'SINT-0001',
  prioridad: 'media',
  profesional: 'Nutrición',
  alertas: ['ges', 'persona_mayor_60'],
  nota: 'Nota de ejemplo.',
  ...cambios,
});

const lineas = (csv) => csv.slice(1).split('\r\n');

describe('celda', () => {
  test('deja igual un texto simple', () => {
    expect(celda('hola')).toBe('hola');
  });

  test('deja vacío un valor que falta', () => {
    expect(celda(undefined)).toBe('');
    expect(celda(null)).toBe('');
  });

  test('pone entre comillas un texto con punto y coma', () => {
    expect(celda('uno; dos')).toBe('"uno; dos"');
  });

  test('duplica las comillas internas', () => {
    expect(celda('dijo "hola"')).toBe('"dijo ""hola"""');
  });

  test('pone entre comillas un texto con salto de línea', () => {
    expect(celda('uno\ndos')).toBe('"uno\ndos"');
  });

  test.each(['=SUMA(1)', '+56', '-3', '@usuario'])(
    'antepone un apóstrofo a %p para que Excel no lo trate como fórmula',
    (texto) => {
      expect(celda(texto)).toBe(`'${texto}`);
    },
  );
});

describe('generarCsvRevision', () => {
  test('empieza con BOM y usa punto y coma como separador', () => {
    const csv = generarCsvRevision([solicitud()], [referencia()]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lineas(csv)[0]).toBe(
      'id_solicitud;fecha_ingreso;tipo_profesional;motivo;edad;texto_libre;prioridad_ref;profesional_ref;alertas_ref;nota_ref;comentario_revision',
    );
  });

  test('arma una fila por solicitud, con la referencia al lado y la columna de revisión vacía', () => {
    const csv = generarCsvRevision([solicitud()], [referencia()]);
    expect(lineas(csv)[1]).toBe(
      'SINT-0001;2026-11-19T10:30:00;Nutrición;Otros;40;texto de ejemplo con ñ y tildes;media;Nutrición;ges, persona_mayor_60;Nota de ejemplo.;',
    );
  });

  test('deja la edad vacía si la solicitud no la trae', () => {
    const sinEdad = solicitud();
    delete sinEdad.edad;
    const columnas = lineas(generarCsvRevision([sinEdad], [referencia()]))[1].split(';');
    expect(columnas[4]).toBe('');
  });

  test('falla si una solicitud no tiene referencia', () => {
    expect(() => generarCsvRevision([solicitud()], [])).toThrow(
      'La solicitud SINT-0001 no tiene referencia.',
    );
  });
});

describe('revision.csv guardado en el repositorio', () => {
  const leerJson = (nombre) =>
    JSON.parse(readFileSync(new URL(`../../data/sinteticos/${nombre}`, import.meta.url), 'utf8'));

  test('está al día con solicitudes.json y referencia.json', () => {
    const guardado = readFileSync(
      new URL('../../data/sinteticos/revision.csv', import.meta.url),
      'utf8',
    ).replaceAll('\r\n', '\n');
    const esperado = generarCsvRevision(
      leerJson('solicitudes.json'),
      leerJson('referencia.json'),
    ).replaceAll('\r\n', '\n');
    expect(guardado).toBe(esperado);
  });
});
