import { z } from 'zod';
import { ALERTAS, LARGOS_MAXIMOS, PRIORIDADES, TIPOS_PRESTADOR } from './catalogos.js';
import { formatearErrores, textoNoVacio, valorDeLista } from './utilidades.js';

/**
 * Esquema de la CLASIFICACIÓN DE REFERENCIA: la "respuesta correcta" de cada solicitud sintética.
 *
 * La definimos nosotras (criterio PROVISIONAL, no clínico). Se usa para evaluar a la IA.
 * Sigue las mismas reglas que la salida de la IA: valores de las listas, sin campos de más
 * y alertas repetidas eliminadas.
 */

const alertas = z
  .array(valorDeLista('alertas', ALERTAS), {
    error: (problema) =>
      problema.input === undefined || problema.input === null
        ? 'El campo "alertas" es obligatorio (puede ser una lista vacía).'
        : 'El campo "alertas" debe ser una lista.',
  })
  .transform((lista) => [...new Set(lista)]);

export const referenciaSchema = z.strictObject(
  {
    id_solicitud: textoNoVacio('id_solicitud'),
    prioridad: valorDeLista('prioridad', PRIORIDADES),
    profesional: valorDeLista('profesional', TIPOS_PRESTADOR),
    alertas,
    nota: textoNoVacio('nota', LARGOS_MAXIMOS.nota_referencia),
  },
  { error: 'La referencia debe ser un objeto con campos.' },
);

/**
 * Revisa si una clasificación de referencia cumple su esquema. Nunca lanza un error.
 * @returns {{ exito: true, datos: object } | { exito: false, errores: { campo: string, mensaje: string }[] }}
 */
export const validarReferencia = (datos) => {
  const resultado = referenciaSchema.safeParse(datos);

  if (!resultado.success) {
    return { exito: false, errores: formatearErrores(resultado.error.issues) };
  }

  return { exito: true, datos: resultado.data };
};
