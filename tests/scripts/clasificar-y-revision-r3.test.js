import { nombreArchivoResultados } from '../../scripts/clasificar-sinteticos.js';
import { generarCsvRevisionR3, rutaCsvR3 } from '../../scripts/generar-csv-revision-r3.js';
import { join } from 'node:path';

describe('nombreArchivoResultados', () => {
  test('usa el nombre del modelo en modo real', () => {
    expect(nombreArchivoResultados({ modo: 'real', modelo: 'meta/llama-3.3-70b-instruct' })).toBe(
      'clasificaciones-meta-llama-3.3-70b-instruct.json',
    );
  });

  test('usa el modo cuando no es real', () => {
    expect(nombreArchivoResultados({ modo: 'simulado' })).toBe('clasificaciones-simulado.json');
    expect(nombreArchivoResultados({ modo: 'repeticion' })).toBe('clasificaciones-repeticion.json');
  });
});

describe('generarCsvRevisionR3', () => {
  // Datos sintéticos (inventados). Nunca usar datos reales.
  const corrida = {
    resultados: [
      {
        id_solicitud: 'SINT-0001',
        estado: 'clasificada',
        origen: 'modelo_real',
        clasificacion: { justificacion: 'Dice tener; tos' },
      },
      { id_solicitud: 'SINT-0002', estado: 'no_clasificada', origen: 'modelo_real' },
    ],
  };
  const solicitudes = [
    { id_solicitud: 'SINT-0001', texto_libre: 'tengo tos' },
    { id_solicitud: 'SINT-0002', texto_libre: 'necesito hora' },
  ];

  test('empieza con BOM, usa ";" y tiene una fila por resultado', () => {
    const csv = generarCsvRevisionR3(corrida, solicitudes);
    expect(csv.startsWith('﻿')).toBe(true);
    const lineas = csv.slice(1).trimEnd().split('\r\n');
    expect(lineas).toEqual([
      'id_solicitud;origen;estado;texto_libre;justificacion;comentario_revision',
      'SINT-0001;modelo_real;clasificada;tengo tos;"Dice tener; tos";',
      'SINT-0002;modelo_real;no_clasificada;necesito hora;;',
    ]);
  });

  test('guarda el CSV junto al archivo de resultados', () => {
    const carpeta = join('data', 'resultados');
    expect(rutaCsvR3(join(carpeta, 'clasificaciones-meta-llama-3.3-70b-instruct.json'))).toBe(
      join(carpeta, 'revision-r3-meta-llama-3.3-70b-instruct.csv'),
    );
  });
});
