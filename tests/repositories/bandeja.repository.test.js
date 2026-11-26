import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ARCHIVOS_EXPORTACION_DEMO,
  ErrorDatosBandeja,
  leerDatosBandeja,
  leerExportacionesDemo,
  rutaDeCorrida,
} from '../../src/repositories/bandeja.repository.js';
import { armarExportacionesDemo } from '../../src/services/exportacion-demo.service.js';

// Datos sintéticos (inventados). Nunca usar datos reales.
const solicitudes = [
  {
    id_solicitud: 'SINT-0001',
    fecha_ingreso: '2026-11-10T09:00:00',
    tipo_profesional: 'Medicina',
    motivo: 'Otros',
    texto_libre: 'texto inventado',
  },
];
const corrida = {
  origen: 'modelo_real',
  modelo: 'modelo/prueba',
  resultados: [{ id_solicitud: 'SINT-0001', estado: 'no_clasificada', motivo: 'error_proveedor' }],
};

let raiz;
let carpetaResultados;
let archivoSolicitudes;

beforeEach(async () => {
  raiz = await mkdtemp(join(tmpdir(), 'bandeja-'));
  carpetaResultados = join(raiz, 'resultados');
  await mkdir(carpetaResultados);
  archivoSolicitudes = join(raiz, 'solicitudes.json');
  await writeFile(archivoSolicitudes, JSON.stringify(solicitudes), 'utf8');
});

afterEach(async () => {
  await rm(raiz, { recursive: true, force: true });
});

const leer = (archivoCorrida) =>
  leerDatosBandeja({ archivoCorrida, archivoSolicitudes, carpetaResultados });

describe('rutaDeCorrida', () => {
  test('acepta un .json dentro de la carpeta de resultados', () => {
    const carpeta = join(process.cwd(), 'data', 'resultados');
    expect(rutaDeCorrida('data/resultados/corrida.json', carpeta)).toBe(
      join(carpeta, 'corrida.json'),
    );
  });

  test.each([
    ['data/sinteticos/referencia.json'],
    ['data/resultados/../sinteticos/referencia.json'],
    ['data/resultados/revision.csv'],
    ['data/resultados'],
  ])('rechaza %s (regla R1)', (archivo) => {
    const carpeta = join(process.cwd(), 'data', 'resultados');
    expect(() => rutaDeCorrida(archivo, carpeta)).toThrow('solo lee corridas guardadas');
  });

  test.each([[undefined], [''], ['   '], [42]])('rechaza un archivo vacío: %p', (archivo) => {
    expect(() => rutaDeCorrida(archivo)).toThrow(ErrorDatosBandeja);
  });
});

describe('leerDatosBandeja', () => {
  test('lee las solicitudes y la corrida', async () => {
    const archivo = join(carpetaResultados, 'corrida.json');
    await writeFile(archivo, JSON.stringify(corrida), 'utf8');
    await expect(leer(archivo)).resolves.toEqual({ solicitudes, corrida });
  });

  test('avisa si la corrida no existe', async () => {
    await expect(leer(join(carpetaResultados, 'no-existe.json'))).rejects.toThrow(
      'No se encontró el archivo de la corrida',
    );
  });

  test('avisa si la corrida no es JSON', async () => {
    const archivo = join(carpetaResultados, 'roto.json');
    await writeFile(archivo, '{ esto no es json', 'utf8');
    await expect(leer(archivo)).rejects.toThrow('no es un JSON válido');
  });

  test('avisa si la corrida no trae la lista de resultados', async () => {
    const archivo = join(carpetaResultados, 'otra-cosa.json');
    await writeFile(archivo, JSON.stringify({ origen: 'modelo_real' }), 'utf8');
    await expect(leer(archivo)).rejects.toThrow('no trae la lista "resultados"');
  });

  test('avisa si las solicitudes no son una lista', async () => {
    const archivo = join(carpetaResultados, 'corrida.json');
    await writeFile(archivo, JSON.stringify(corrida), 'utf8');
    await writeFile(archivoSolicitudes, JSON.stringify({ solicitudes }), 'utf8');
    await expect(leer(archivo)).rejects.toThrow('debe ser una lista');
  });

  test('por defecto lee las 60 solicitudes sintéticas del proyecto', async () => {
    const archivo = join(carpetaResultados, 'corrida.json');
    await writeFile(archivo, JSON.stringify(corrida), 'utf8');
    const datos = await leerDatosBandeja({ archivoCorrida: archivo, carpetaResultados });
    expect(datos.solicitudes).toHaveLength(60);
  });
});

describe('leerExportacionesDemo', () => {
  test('lee las dos exportaciones del proyecto, iguales a las que arma el generador', async () => {
    const leidas = await leerExportacionesDemo();
    const leer = async (archivo) => JSON.parse(await readFile(archivo, 'utf8'));
    // Las 60 sintéticas y el caso adicional para el video (SINT-0061, tarea 015).
    const sinteticas = [
      ...(await leer('data/sinteticos/solicitudes.json')),
      ...(await leer('data/sinteticos/casos-adicionales.json')),
    ];
    // Si esto falla, los archivos quedaron viejos: correr "npm run exportacion:demo".
    expect(leidas).toEqual(armarExportacionesDemo(sinteticas));
    expect(leidas.map((filas) => filas.slice(1).map((fila) => fila[0]))[1]).toEqual([
      'DEMO-ID-0009',
      'DEMO-ID-0061',
    ]);
    expect(ARCHIVOS_EXPORTACION_DEMO).toHaveLength(2);
  });

  test('si falta un archivo, dice cómo generarlo', async () => {
    await expect(leerExportacionesDemo([join(raiz, 'no-existe.csv')])).rejects.toThrow(
      /npm run exportacion:demo/,
    );
  });

  test('si el CSV está roto, lo dice', async () => {
    const roto = join(raiz, 'roto.csv');
    await writeFile(roto, 'ID,"sin cerrar', 'utf8');
    await expect(leerExportacionesDemo([roto])).rejects.toThrow(ErrorDatosBandeja);
  });
});
