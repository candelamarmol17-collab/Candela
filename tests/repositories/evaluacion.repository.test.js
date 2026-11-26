import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CORRIDAS_EVALUADAS,
  ErrorDatosEvaluacion,
  leerDatosEvaluacion,
  leerHallazgosR3,
} from '../../src/repositories/evaluacion.repository.js';
import { evaluarModelos } from '../../src/services/evaluacion.service.js';

// Archivos temporales con datos inventados.
let carpeta;
beforeEach(async () => {
  carpeta = await mkdtemp(join(tmpdir(), 'evaluacion-'));
});
afterEach(async () => {
  await rm(carpeta, { recursive: true, force: true });
});

const escribir = async (nombre, texto) => {
  const ruta = join(carpeta, nombre);
  await writeFile(ruta, texto, 'utf8');
  return ruta;
};

describe('leerHallazgosR3', () => {
  test('lee solo las filas con comentario (CSV con punto y coma y comillas)', async () => {
    const ruta = await escribir(
      'r3.csv',
      '﻿id_solicitud;justificacion;comentario_revision\r\n' +
        'SINT-0001;texto;\r\n' +
        'SINT-0002;"con ; punto y coma";"Dice ""en la cara"" y no ""en la guata""."\r\n',
    );
    expect(await leerHallazgosR3(ruta)).toEqual([
      { id: 'SINT-0002', comentario: 'Dice "en la cara" y no "en la guata".' },
    ]);
  });

  test('si la tabla no existe, no hay hallazgos', async () => {
    expect(await leerHallazgosR3(join(carpeta, 'no-existe.csv'))).toEqual([]);
  });

  test('si faltan las columnas, lo dice', async () => {
    const ruta = await escribir('r3.csv', 'a;b\r\n1;2\r\n');
    await expect(leerHallazgosR3(ruta)).rejects.toThrow(ErrorDatosEvaluacion);
  });
});

describe('leerDatosEvaluacion', () => {
  test('si falta una corrida, esa entrada trae el error y las demás se leen', async () => {
    const referencia = await escribir('referencia.json', '[]');
    const corrida = await escribir('corrida.json', JSON.stringify({ resultados: [] }));
    const datos = await leerDatosEvaluacion({
      archivoReferencia: referencia,
      corridas: [
        { modelo: 'a/uno', corrida, revisionR3: join(carpeta, 'nada.csv') },
        { modelo: 'b/dos', corrida: join(carpeta, 'falta.json'), revisionR3: '' },
      ],
    });
    expect(datos.referencia).toEqual([]);
    expect(datos.corridas[0]).toEqual({ corrida: { resultados: [] }, hallazgosR3: [] });
    expect(datos.corridas[1]).toEqual({
      modelo: 'b/dos',
      error: 'No se encontró la corrida de b/dos.',
    });
  });

  test('sin referencia, no se puede evaluar', async () => {
    await expect(
      leerDatosEvaluacion({ archivoReferencia: join(carpeta, 'falta.json'), corridas: [] }),
    ).rejects.toThrow('No se encontró la clasificación de referencia.');
  });

  test('con los archivos del proyecto: totales de las dos corridas y hallazgos R3', async () => {
    expect(CORRIDAS_EVALUADAS.map((c) => c.modelo)).toEqual([
      'mistralai/mistral-large-4-1t-a52b',
      'minimaxai/minimax-m3.1-flash',
    ]);
    const evaluacion = evaluarModelos(await leerDatosEvaluacion());
    const [mistral, minimax] = evaluacion.modelos;
    expect(evaluacion.casos).toBe(60);
    // Coinciden con lo que dicen los archivos de las corridas.
    expect([mistral.total, mistral.clasificadas]).toEqual([60, 56]);
    expect([minimax.total, minimax.clasificadas]).toEqual([60, 60]);
    expect(mistral.tiempo.promedio_ms).toBe(154055);
    expect(minimax.tiempo.promedio_ms).toBe(56570);
    expect(mistral.reintentos.necesitaron_reintento).toBe(14);
    expect(minimax.reintentos.necesitaron_reintento).toBe(7);
    // Las críticas no detectadas de Mistral son las que quedaron sin clasificar.
    expect(mistral.alertas_criticas.casos_no_detectados.every((c) => c.sin_clasificar)).toBe(true);
    expect(mistral.no_clasificadas.error_proveedor).toHaveLength(4);
    // El hallazgo de MiniMax en SINT-0016 ("en la cara" en vez de "en la guata").
    expect(minimax.hallazgos_r3.find((h) => h.id === 'SINT-0016').comentario).toContain(
      'en la guata',
    );
  });
});
