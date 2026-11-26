import { escribirCsv, leerCsv } from '../../src/utilidades/csv.js';

describe('leerCsv', () => {
  test('con separador punto y coma (tablas de revisión para Excel)', () => {
    expect(leerCsv('a;"b;c"\r\n1;2\r\n', { separador: ';' })).toEqual([
      ['a', 'b;c'],
      ['1', '2'],
    ]);
  });

  test('lee filas con BOM, comas y finales de línea de Windows', () => {
    expect(leerCsv('﻿a,b,c\r\n1,2,3\r\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  test('respeta comillas, comillas dobles internas y saltos de línea dentro de una celda', () => {
    expect(leerCsv('x,"hola, ""vecina""","línea 1\nlínea 2"\n')).toEqual([
      ['x', 'hola, "vecina"', 'línea 1\nlínea 2'],
    ]);
  });

  test('conserva las celdas vacías e ignora filas vacías', () => {
    expect(leerCsv('a,,c\n\n,,\n')).toEqual([
      ['a', '', 'c'],
      ['', '', ''],
    ]);
  });

  test('lee la última fila aunque no termine en salto de línea', () => {
    expect(leerCsv('a,b')).toEqual([['a', 'b']]);
  });

  test('rechaza comillas sin cerrar y contenido que no es texto', () => {
    expect(() => leerCsv('a,"b')).toThrow('comillas');
    expect(() => leerCsv(null)).toThrow('texto');
  });
});

describe('escribirCsv', () => {
  test('escribe con BOM, comillas cuando hace falta y finales de Windows, y se vuelve a leer igual', () => {
    const filas = [
      ['ID', 'Texto'],
      ['1', 'dice "hola", y\nsigue'],
      ['2', null],
    ];
    const texto = escribirCsv(filas);
    expect(texto.startsWith('﻿ID,Texto\r\n1,"dice ""hola"", y\nsigue"\r\n2,\r\n')).toBe(true);
    expect(leerCsv(texto)).toEqual([
      ['ID', 'Texto'],
      ['1', 'dice "hola", y\nsigue'],
      ['2', ''],
    ]);
  });
});
