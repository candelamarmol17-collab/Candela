import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ErrorDatosBandeja,
  leerDatosBandeja,
  rutaDeCorrida,
} from '../../src/repositories/bandeja.repository.js';

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
