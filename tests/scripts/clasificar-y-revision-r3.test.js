import {
  leerArgumentos,
  nombreArchivoResultados,
  rutaParaReintentar,
} from '../../scripts/clasificar-sinteticos.js';
import {
  compararResultados,
  escribirCsvNuevo,
  generarCsvRevisionR3,
  rutaCsvR3,
} from '../../scripts/generar-csv-revision-r3.js';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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

describe('leerArgumentos', () => {
  const vacio = { modelo: null, reintentar: null, tiempoEsperaMs: null, pausaMs: null };

  test('sin argumentos usa todo del .env', () => {
    expect(leerArgumentos([])).toEqual(vacio);
  });

  test('lee el modelo de --modelo', () => {
    expect(leerArgumentos(['--modelo', 'minimaxai/minimax-m3.1-flash'])).toEqual({
      ...vacio,
      modelo: 'minimaxai/minimax-m3.1-flash',
    });
  });

  test('lee --reintentar, --tiempo-espera y --pausa en cualquier orden', () => {
    expect(
      leerArgumentos([
        '--pausa',
        '10000',
        '--reintentar',
        'data/resultados/x.json',
        '--tiempo-espera',
        '240000',
      ]),
    ).toEqual({
      modelo: null,
      reintentar: 'data/resultados/x.json',
      tiempoEsperaMs: '240000',
      pausaMs: '10000',
    });
  });

  test.each([
    [['--modelo']],
    [['--otro', 'x']],
    [['--modelo', 'x', 'y']],
    [['--modelo', '--x']],
    [['--pausa', '1', '--pausa', '2']],
    [['--modelo', 'x', '--reintentar', 'data/resultados/x.json']],
  ])('rechaza argumentos no válidos: %p', (argumentos) => {
    expect(() => leerArgumentos(argumentos)).toThrow('Argumentos no válidos');
  });
});

describe('rutaParaReintentar', () => {
  const carpeta = join(process.cwd(), 'data', 'resultados');

  test('acepta un .json dentro de data/resultados', () => {
    expect(rutaParaReintentar('data/resultados/corrida.json', carpeta)).toBe(
      join(carpeta, 'corrida.json'),
    );
  });

  test.each([
    ['data/sinteticos/solicitudes.json'],
    ['data/resultados/../sinteticos/referencia.json'],
    ['data/resultados/revision.csv'],
    ['data/resultados'],
  ])('rechaza %s', (archivo) => {
    expect(() => rutaParaReintentar(archivo, carpeta)).toThrow('solo se aceptan archivos .json');
  });
});

describe('escribirCsvNuevo', () => {
  test('escribe una tabla nueva, pero nunca sobrescribe una que ya existe', async () => {
    const carpeta = await mkdtemp(join(tmpdir(), 'r3-'));
    try {
      const destino = join(carpeta, 'revision-r3-x.csv');
      await escribirCsvNuevo(destino, 'con comentarios');
      await expect(escribirCsvNuevo(destino, 'tabla nueva')).rejects.toThrow('No se sobrescribe');
      expect(await readFile(destino, 'utf8')).toBe('con comentarios');
    } finally {
      await rm(carpeta, { recursive: true, force: true });
    }
  });
});

describe('comando revision:r3', () => {
  test('no sobrescribe una tabla que ya existe, pero sí crea la que falta', async () => {
    const { execFile } = await import('node:child_process');
    const { copyFile, writeFile } = await import('node:fs/promises');
    const carpeta = await mkdtemp(join(tmpdir(), 'r3-cli-'));
    try {
      const corrida = join(carpeta, 'clasificaciones-prueba.json');
      const otra = join(carpeta, 'clasificaciones-otra.json');
      await copyFile('data/resultados/clasificaciones-simulado.json', corrida);
      await copyFile('data/resultados/clasificaciones-simulado.json', otra);
      const existente = join(carpeta, 'revision-r3-prueba.csv');
      await writeFile(existente, 'con comentarios de la revisora', 'utf8');

      const salida = await new Promise((resolver) => {
        execFile(
          process.execPath,
          ['scripts/generar-csv-revision-r3.js', corrida, otra],
          (error, stdout, stderr) => resolver({ codigo: error?.code ?? 0, stdout, stderr }),
        );
      });

      expect(salida.codigo).toBe(1);
      expect(salida.stderr).toContain('No se sobrescribe');
      expect(await readFile(existente, 'utf8')).toBe('con comentarios de la revisora');
      expect(await readFile(join(carpeta, 'revision-r3-otra.csv'), 'utf8')).toContain(
        'id_solicitud',
      );
    } finally {
      await rm(carpeta, { recursive: true, force: true });
    }
  });
});
