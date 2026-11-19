import { z } from 'zod';

/** Mensaje para un campo que falta o viene vacío (null). */
const mensajeObligatorio = (campo) => `El campo "${campo}" es obligatorio.`;

/**
 * Texto que no puede estar vacío ni tener solo espacios.
 * El texto no se modifica: solo se revisa.
 */
export const textoNoVacio = (campo, largoMaximo) => {
  let esquema = z
    .string({
      error: (problema) =>
        problema.input === undefined || problema.input === null
          ? mensajeObligatorio(campo)
          : `El campo "${campo}" debe ser texto.`,
    })
    .refine((valor) => valor.trim().length > 0, {
      error: `El campo "${campo}" no puede estar vacío.`,
    });

  if (largoMaximo !== undefined) {
    esquema = esquema.refine((valor) => valor.length <= largoMaximo, {
      error: `El campo "${campo}" no puede superar los ${largoMaximo} caracteres.`,
    });
  }

  return esquema;
};

/** Valor que tiene que ser uno de los de la lista, escrito exactamente igual. */
export const valorDeLista = (campo, lista) =>
  z.enum(lista, {
    error: (problema) =>
      problema.input === undefined || problema.input === null
        ? mensajeObligatorio(campo)
        : `El campo "${campo}" tiene un valor no permitido. Valores permitidos: ${lista.join(', ')}.`,
  });

/**
 * Convierte los problemas que encuentra Zod en una lista simple de { campo, mensaje }.
 * Un campo de más (no permitido) genera una entrada por cada campo.
 */
export const formatearErrores = (problemas) =>
  problemas.flatMap((problema) => {
    if (problema.code === 'unrecognized_keys') {
      return problema.keys.map((clave) => ({
        campo: clave,
        mensaje: `El campo "${clave}" no está permitido.`,
      }));
    }

    return [
      {
        campo: problema.path.length > 0 ? problema.path.join('.') : '(general)',
        mensaje: problema.message,
      },
    ];
  });
