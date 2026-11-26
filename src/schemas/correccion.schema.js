import { z } from 'zod';
import { ALERTAS_IA, LARGOS_MAXIMOS, PRIORIDADES, TIPOS_PRESTADOR } from './catalogos.js';
import { formatearErrores, valorDeLista } from './utilidades.js';

/**
 * Esquema de la corrección del triajista (tarea 006), que llega desde la pantalla.
 *
 * - Las alertas son las que decide una persona: la de persona mayor (60+) no se acepta,
 *   porque la calcula el código a partir de la edad.
 * - El motivo es opcional, de hasta 300 caracteres. La pantalla pide no escribir datos personales.
 * - Un campo de más rechaza la corrección.
 */
export const correccionSchema = z.strictObject(
  {
    prioridad: valorDeLista('prioridad', PRIORIDADES),
    profesional: valorDeLista('profesional', TIPOS_PRESTADOR),
    alertas: z
      .array(valorDeLista('alertas', ALERTAS_IA), {
        error: 'El campo "alertas" debe ser una lista (puede estar vacía).',
      })
      .transform((lista) => [...new Set(lista)]),
    motivo: z
      .string({ error: 'El campo "motivo" debe ser texto.' })
      .max(LARGOS_MAXIMOS.justificacion, {
        error: `El campo "motivo" no puede superar los ${LARGOS_MAXIMOS.justificacion} caracteres.`,
      })
      .nullable()
      .optional(),
  },
  { error: 'La corrección debe ser un objeto con campos.' },
);

/** Revisa una corrección. Nunca lanza un error. */
export const validarCorreccion = (datos) => {
  const resultado = correccionSchema.safeParse(datos);
  if (!resultado.success) {
    return { exito: false, errores: formatearErrores(resultado.error.issues) };
  }
  return { exito: true, datos: resultado.data };
};
