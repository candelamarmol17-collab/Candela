import { readFile } from 'node:fs/promises';
import {
  COLUMNAS_EXPORTACION,
  COLUMNAS_PERSONALES,
  columnasConUso,
  ENCABEZADO_EXPORTACION,
  leerCampos,
  letraDeColumna,
  USOS,
  validarEncabezado,
} from '../../src/schemas/exportacion-telesalud.js';
import { leerCsv } from '../../src/utilidades/csv.js';

const letras = (columnas) => columnas.map((c) => c.letra);

describe('mapeo de la exportación de Telesalud', () => {
  test('coincide columna por columna con el encabezado real de docs/', async () => {
    const texto = await readFile('docs/formato-exportacion-telesalud.csv', 'utf8');
    const [encabezado, ...datos] = leerCsv(texto);
    expect(datos).toEqual([]); // el archivo de formato no trae datos
    expect(encabezado).toEqual([...ENCABEZADO_EXPORTACION]);
    expect(validarEncabezado(encabezado)).toEqual({ exito: true });
  });

  test('tiene 48 columnas, de A a AV, y E y AV se llaman igual', () => {
    expect(COLUMNAS_EXPORTACION).toHaveLength(48);
    expect(COLUMNAS_EXPORTACION.at(-1).letra).toBe('AV');
    expect(COLUMNAS_EXPORTACION[4].nombre).toBe('Información adicional');
    expect(COLUMNAS_EXPORTACION[47].nombre).toBe('Información adicional');
    expect(COLUMNAS_EXPORTACION[4].uso).toBe(USOS.ia);
    expect(COLUMNAS_EXPORTACION[47].uso).toBe(USOS.pendiente);
  });

  test('la IA recibe solo R, S, E y N (Especificidad, T, queda pendiente)', () => {
    expect(letras(columnasConUso(USOS.ia)).sort()).toEqual(['E', 'N', 'R', 'S']);
    expect(letras(columnasConUso(USOS.iaPendiente))).toEqual(['T']);
  });

  test('los datos personales del vecino son A, D, G a M, y O a Q', () => {
    expect(letras(COLUMNAS_PERSONALES)).toEqual([
      'A',
      'D',
      'G',
      'H',
      'I',
      'J',
      'K',
      'L',
      'M',
      'O',
      'P',
      'Q',
    ]);
  });

  test('funcionarios y notas: X a AT; evaluación: B, C, F, U, V, W y AU', () => {
    const funcionarios = letras(columnasConUso(USOS.funcionario));
    expect(funcionarios[0]).toBe('X');
    expect(funcionarios.at(-1)).toBe('AT');
    expect(funcionarios).toHaveLength(23);
    expect(letras(columnasConUso(USOS.evaluacion))).toEqual(['B', 'C', 'F', 'U', 'V', 'W', 'AU']);
  });

  test('toda columna tiene un solo uso conocido', () => {
    const usos = new Set(Object.values(USOS));
    expect(COLUMNAS_EXPORTACION.every((c) => usos.has(c.uso))).toBe(true);
  });

  test('letraDeColumna', () => {
    expect([0, 25, 26, 47].map(letraDeColumna)).toEqual(['A', 'Z', 'AA', 'AV']);
  });

  test('leerCampos lee por posición y no confunde las dos "Información adicional"', () => {
    const fila = ENCABEZADO_EXPORTACION.map((_, indice) => `valor-${indice}`);
    expect(leerCampos(fila)).toEqual({
      id_exportacion: 'valor-0',
      texto_libre: 'valor-4',
      fecha_solicitud: 'valor-5',
      edad: 'valor-13',
      tipo_profesional: 'valor-17',
      motivo: 'valor-18',
      especificidad_consulta: 'valor-19',
    });
  });

  test.each([
    ['con menos columnas', ENCABEZADO_EXPORTACION.slice(1), /48 columnas/],
    [
      'con E y AV cambiadas de lugar con otras',
      ['Cesfam', 'ID', ...ENCABEZADO_EXPORTACION.slice(2)],
      /columna A debería ser "ID"/,
    ],
    ['que no es una lista', null, /48 columnas/],
  ])('rechaza un encabezado %s', (_caso, encabezado, mensaje) => {
    const resultado = validarEncabezado(encabezado);
    expect(resultado.exito).toBe(false);
    expect(resultado.errores.join(' ')).toMatch(mensaje);
  });
});
