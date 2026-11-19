import { z } from 'zod';
import {
  ALERTAS,
  LARGOS_MAXIMOS,
  NIVELES_CONFIANZA,
  PRIORIDADES,
  TIPOS_PRESTADOR,
} from './catalogos.js';
import { formatearErrores, textoNoVacio, valorDeLista } from './utilidades.js';

/**
 * Esquema de SALIDA: la respuesta de la IA para una solicitud.
 *
 * Es estricto a propósito (ver docs/decisiones/004):
 *   - profesional_sugerido tiene que ser uno de los tipos de prestador de catalogos.js.
 *   - Un campo de más rechaza la respuesta: no se acepta información que no pedimos.
 *   - Una alerta desconocida rechaza la respuesta. Las alertas repetidas se eliminan sin rechazarla.
 */

const alertas = z
  .array(valorDeLista('alertas', ALERTAS), {
    error: (problema) =>
      problema.input === undefined || problema.input === null
        ? 'El campo "alertas" es obligatorio (puede ser una lista vacía).'
        : 'El campo "alertas" debe ser una lista.',
  })
  .transform((lista) => [...new Set(lista)]);

export const clasificacionSchema = z.strictObject(
  {
    id_solicitud: textoNoVacio('id_solicitud'),
    prioridad_sugerida: valorDeLista('prioridad_sugerida', PRIORIDADES),
    profesional_sugerido: valorDeLista('profesional_sugerido', TIPOS_PRESTADOR),
    alertas,
    justificacion: textoNoVacio('justificacion', LARGOS_MAXIMOS.justificacion),
    confianza: valorDeLista('confianza', NIVELES_CONFIANZA),
  },
  { error: 'La respuesta de la IA debe ser un objeto con campos.' },
);

/**
 * Revisa si una respuesta de la IA cumple el esquema de salida. Nunca lanza un error.
 * @returns {{ exito: true, datos: object } | { exito: false, errores: { campo: string, mensaje: string }[] }}
 */
export const validarClasificacion = (datos) => {
  const resultado = clasificacionSchema.safeParse(datos);

  if (!resultado.success) {
    return { exito: false, errores: formatearErrores(resultado.error.issues) };
  }

  return { exito: true, datos: resultado.data };
};
