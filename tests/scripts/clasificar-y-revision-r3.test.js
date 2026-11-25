import {
  leerModeloDeArgumentos,
  nombreArchivoResultados,
} from '../../scripts/clasificar-sinteticos.js';
import {
  compararResultados,
  generarCsvRevisionR3,
  rutaCsvR3,
} from '../../scripts/generar-csv-revision-r3.js';
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

describe('comparación entre dos modelos', () => {
  // Datos sintéticos (inventados). Nunca usar datos reales.
  const clasificada = (prioridad, profesional, alertas) => ({
    estado: 'clasificada',
    clasificacion: {
      prioridad_sugerida: prioridad,
      profesional_sugerido: profesional,
      alertas,
      justificacion: 'x',
    },
  });

  test('"no" cuando coinciden, aunque difieran en alertas no críticas', () => {
    expect(
      compararResultados(
        clasificada('alta', 'Medicina', ['urgencia', 'ges']),
        clasificada('alta', 'Medicina', ['urgencia', 'persona_mayor_60']),
      ),
    ).toBe('no');
  });

  test('describe cada diferencia: este modelo / el otro', () => {
    expect(
      compararResultados(
        clasificada('alta', 'Medicina', ['violencia', 'urgencia']),
        clasificada('media', 'Psicología', []),
      ),
    ).toBe(
      'prioridad: alta / media | profesional: Medicina / Psicología | alertas críticas: urgencia, violencia / (ninguna)',
    );
  });

  test('avisa cuando un modelo no la clasificó o falta el resultado', () => {
    expect(
      compararResultados(clasificada('alta', 'Medicina', []), { estado: 'no_clasificada' }),
    ).toBe('no comparable: un modelo no la clasificó');
    expect(compararResultados(clasificada('alta', 'Medicina', []), undefined)).toBe(
      'sin resultado del otro modelo',
    );
  });

  test('con otra corrida agrega la columna con el nombre del otro modelo', () => {
    const corrida = {
      resultados: [
        {
          id_solicitud: 'SINT-0001',
          origen: 'modelo_real',
          ...clasificada('alta', 'Medicina', []),
        },
      ],
    };
    const otra = {
      modelo: 'otro/modelo',
      resultados: [{ id_solicitud: 'SINT-0001', ...clasificada('baja', 'Medicina', []) }],
    };
    const lineas = generarCsvRevisionR3(
      corrida,
      [{ id_solicitud: 'SINT-0001', texto_libre: 't' }],
      otra,
    )
      .slice(1)
      .trimEnd()
      .split('\r\n');
    expect(lineas).toEqual([
      'id_solicitud;origen;estado;texto_libre;justificacion;difiere_de_otro/modelo;comentario_revision',
      'SINT-0001;modelo_real;clasificada;t;x;prioridad: alta / baja;',
    ]);
  });
});

describe('leerModeloDeArgumentos', () => {
  test('sin argumentos usa el modelo del .env', () => {
    expect(leerModeloDeArgumentos([])).toBeNull();
  });

  test('lee el modelo de --modelo', () => {
    expect(leerModeloDeArgumentos(['--modelo', 'minimaxai/minimax-m3.1-flash'])).toBe(
      'minimaxai/minimax-m3.1-flash',
    );
  });

  test.each([[['--modelo']], [['--otro', 'x']], [['--modelo', 'x', 'y']], [['--modelo', '--x']]])(
    'rechaza argumentos no válidos: %p',
    (argumentos) => {
      expect(() => leerModeloDeArgumentos(argumentos)).toThrow('Argumentos no válidos');
    },
  );
});
