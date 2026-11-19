import { z } from 'zod';
import { EDAD, LARGOS_MAXIMOS } from './catalogos.js';
import { formatearErrores, textoNoVacio } from './utilidades.js';

/**
 * Esquema de ENTRADA: una solicitud de Telesalud.
 *
 * Es flexible a propósito (ver docs/decisiones/004):
 *   - tipo_profesional y motivo aceptan cualquier texto no vacío (no se comparan con catalogos.js).
 *   - Los campos de más se descartan sin error.
 *
 * Equivalencia con el formulario de Telesalud:
 *   - tipo_profesional = "Tipo Prestador"
 *   - motivo           = "Motivo Consulta"
 */

/** Fecha y hora sin zona horaria, con o sin segundos. Ejemplo: 2026-11-19T10:30:00 */
const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Revisa el formato y que la fecha exista (por ejemplo, rechaza el 30 de febrero o las 25:00). */
const esFechaValida = (texto) => {
  const partes = FORMATO_FECHA.exec(texto);
  if (!partes) {
    return false;
  }

  const [anio, mes, dia, hora, minuto, segundo = 0] = partes
    .slice(1)
    .map((parte) => (parte === undefined ? undefined : Number(parte)));
  const fecha = new Date(Date.UTC(anio, mes - 1, dia, hora, minuto, segundo));

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia &&
    fecha.getUTCHours() === hora &&
    fecha.getUTCMinutes() === minuto &&
    fecha.getUTCSeconds() === segundo
  );
};

const fechaIngreso = textoNoVacio('fecha_ingreso').refine(esFechaValida, {
  error:
    'El campo "fecha_ingreso" debe ser una fecha y hora válida sin zona horaria, por ejemplo 2026-11-19T10:30:00.',
});

const edad = z
  .number({ error: 'El campo "edad" debe ser un número.' })
  .int({ error: 'El campo "edad" debe ser un número entero.' })
  .min(EDAD.minima, { error: `El campo "edad" no puede ser menor que ${EDAD.minima}.` })
  .max(EDAD.maxima, { error: `El campo "edad" no puede ser mayor que ${EDAD.maxima}.` });

/** Campos opcionales: si vienen vacíos (null), se tratan como si no vinieran. */
const CAMPOS_OPCIONALES = ['edad', 'especificidad_consulta'];

export const solicitudSchema = z.object(
  {
    id_solicitud: textoNoVacio('id_solicitud'),
    fecha_ingreso: fechaIngreso,
    tipo_profesional: textoNoVacio('tipo_profesional'),
    motivo: textoNoVacio('motivo'),
    texto_libre: textoNoVacio('texto_libre', LARGOS_MAXIMOS.texto_libre),
    edad: edad.nullish(),
    // [PENDIENTE] Valores reales desconocidos. Largo máximo PROVISIONAL.
    especificidad_consulta: textoNoVacio(
      'especificidad_consulta',
      LARGOS_MAXIMOS.especificidad_consulta,
    ).nullish(),
  },
  { error: 'La solicitud debe ser un objeto con campos.' },
);

/**
 * Revisa si una solicitud cumple el esquema de entrada. Nunca lanza un error.
 * @returns {{ exito: true, datos: object } | { exito: false, errores: { campo: string, mensaje: string }[] }}
 */
export const validarSolicitud = (datos) => {
  const resultado = solicitudSchema.safeParse(datos);

  if (!resultado.success) {
    return { exito: false, errores: formatearErrores(resultado.error.issues) };
  }

  const limpia = { ...resultado.data };
  for (const campo of CAMPOS_OPCIONALES) {
    if (limpia[campo] === null || limpia[campo] === undefined) {
      delete limpia[campo];
    }
  }

  return { exito: true, datos: limpia };
};
