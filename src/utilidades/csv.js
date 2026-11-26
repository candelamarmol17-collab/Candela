/**
 * Lectura y escritura de CSV con el formato de la exportación de Telesalud:
 * separador coma, UTF-8 con BOM (marca inicial que usa Excel) y comillas dobles cuando hace falta.
 */

const BOM = '﻿';
const SEPARADOR = ',';

/**
 * Convierte el texto de un CSV en una lista de filas (cada fila, una lista de textos).
 * Acepta comillas dobles (con "" para una comilla dentro), saltos de línea dentro de comillas,
 * y finales de línea de Windows o de Linux. Ignora las filas completamente vacías.
 */
export const leerCsv = (texto) => {
  if (typeof texto !== 'string') {
    throw new Error('El contenido del CSV debe ser texto.');
  }
  const contenido = texto.startsWith(BOM) ? texto.slice(1) : texto;
  const filas = [];
  let fila = [];
  let celda = '';
  let entreComillas = false;

  const cerrarCelda = () => {
    fila.push(celda);
    celda = '';
  };
  const cerrarFila = () => {
    cerrarCelda();
    if (!(fila.length === 1 && fila[0] === '')) filas.push(fila);
    fila = [];
  };

  for (let i = 0; i < contenido.length; i += 1) {
    const caracter = contenido[i];
    if (entreComillas) {
      if (caracter === '"' && contenido[i + 1] === '"') {
        celda += '"';
        i += 1;
      } else if (caracter === '"') {
        entreComillas = false;
      } else {
        celda += caracter;
      }
    } else if (caracter === '"') {
      entreComillas = true;
    } else if (caracter === SEPARADOR) {
      cerrarCelda();
    } else if (caracter === '\n' || caracter === '\r') {
      if (caracter === '\r' && contenido[i + 1] === '\n') i += 1;
      cerrarFila();
    } else {
      celda += caracter;
    }
  }
  if (entreComillas) {
    throw new Error('El CSV tiene unas comillas que no se cierran.');
  }
  if (celda !== '' || fila.length > 0) cerrarFila();
  return filas;
};

const celdaCsv = (valor) => {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return /[",\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
};

/** Convierte filas en el texto de un CSV (con BOM y finales de línea de Windows). */
export const escribirCsv = (filas) =>
  `${BOM}${filas.map((fila) => fila.map(celdaCsv).join(SEPARADOR)).join('\r\n')}\r\n`;
