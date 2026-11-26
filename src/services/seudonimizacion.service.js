import {
  COLUMNAS_PERSONALES,
  leerCampos,
  validarEncabezado,
} from '../schemas/exportacion-telesalud.js';
import { validarSolicitud } from '../schemas/solicitud.schema.js';

/**
 * Separación de datos personales (seudonimización), tarea 012.
 *
 * Se hace con código, SIN IA, y ANTES de la IA:
 *   1. se quitan las columnas con datos personales del vecino (y todas las que la IA no usa);
 *   2. cada solicitud recibe un código interno; la tabla "llave → código" se queda en el centro
 *      de salud (en la memoria del programa) y nunca se muestra ni se envía;
 *   3. en el texto libre se tapan los RUT, teléfonos y correos que el vecino haya escrito.
 *
 * Lo que sale de aquí es lo único que puede ver la pantalla o llegar a la IA.
 */

export class ErrorExportacion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorExportacion';
  }
}

export const MARCAS = Object.freeze({
  rut: '[RUT oculto]',
  telefono: '[teléfono oculto]',
  correo: '[correo oculto]',
});

// Correo: algo@algo.dominio
const PATRON_CORREO = /[\p{L}\d._%+-]+@[\p{L}\d.-]+\.[\p{L}]{2,}/gu;
// RUT: 12.345.678-9, 12345678-9 o 1.234.567-K (con o sin puntos, siempre con guion y dígito).
const PATRON_RUT = /(?<![\d.])\d{1,2}(?:\.?\d{3}){2}\s?-\s?[\dkK](?![\p{L}\d])/gu;
// Teléfono chileno: celular (9 XXXX XXXX) o fijo de Santiago (2 XXXX XXXX o 22 XXX XXXX), con o
// sin +56, con espacios o guiones solo entre esos grupos (así no se tapan listas de números).
const PATRON_TELEFONO =
  /(?<![\d+])(?:\+?\s?56[\s-]?)?(?:9[\s-]?\d{4}[\s-]?\d{4}|22[\s-]?\d{3}[\s-]?\d{4}|2[\s-]?\d{4}[\s-]?\d{4})(?!\d)/g;

/**
 * Tapa en un texto los RUT, teléfonos y correos. No usa IA: solo patrones.
 * @returns {{ texto: string, tapados: { rut: number, telefono: number, correo: number } }}
 */
export const taparDatosPersonales = (texto) => {
  const tapados = { rut: 0, telefono: 0, correo: 0 };
  const tapar = (entrada, patron, tipo) =>
    entrada.replace(patron, () => {
      tapados[tipo] += 1;
      return MARCAS[tipo];
    });
  let resultado = String(texto ?? '');
  // Primero los correos (pueden tener números) y los RUT (para que no parezcan teléfonos).
  resultado = tapar(resultado, PATRON_CORREO, 'correo');
  resultado = tapar(resultado, PATRON_RUT, 'rut');
  resultado = tapar(resultado, PATRON_TELEFONO, 'telefono');
  return { texto: resultado, tapados };
};

/**
 * Tabla de códigos internos: la misma llave (la columna ID de Telesalud) recibe siempre el mismo
 * código. Vive en la memoria del programa, en el centro de salud.
 *
 * @param opciones.prefijo prefijo de los códigos nuevos (PUL-0001, PUL-0002, …).
 * @param opciones.codigoFijo función opcional que da un código ya conocido para una llave
 *   (la demo la usa para que los códigos coincidan con la corrida guardada).
 */
export const crearTablaDeCodigos = ({ prefijo = 'PUL', codigoFijo = () => null } = {}) => {
  const tabla = new Map();
  let siguiente = 1;
  return {
    codigoPara: (llave) => {
      if (tabla.has(llave)) return tabla.get(llave);
      let codigo = codigoFijo(llave);
      if (!codigo) {
        codigo = `${prefijo}-${String(siguiente).padStart(4, '0')}`;
        siguiente += 1;
      }
      tabla.set(llave, codigo);
      return codigo;
    },
    cantidad: () => tabla.size,
  };
};

/** "2026-11-17 12:15" o "2026-11-17 12:15:00" (o con "T") → "2026-11-17T12:15:00". */
export const normalizarFecha = (texto) => {
  const partes = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/.exec(String(texto).trim());
  return partes ? `${partes[1]}T${partes[2]}${partes[3] ?? ':00'}` : null;
};

const leerEdad = (texto) => {
  const limpio = String(texto ?? '').trim();
  if (limpio === '') return undefined;
  return /^\d+$/.test(limpio) ? Number(limpio) : Number.NaN;
};

/**
 * Separa los datos personales de una exportación ya leída (lista de filas, la primera es el
 * encabezado) y devuelve solo lo que Pulso necesita.
 *
 * @returns {{ solicitudes: object[], resumen: { filas: number,
 *   columnas_personales_separadas: number, datos_tapados_en_texto: number } }}
 */
export const seudonimizarExportacion = (filas, tablaDeCodigos) => {
  if (!Array.isArray(filas) || filas.length === 0) {
    throw new ErrorExportacion('La exportación está vacía: no trae ni el encabezado.');
  }
  const [encabezado, ...datos] = filas;
  const revision = validarEncabezado(encabezado);
  if (!revision.exito) {
    throw new ErrorExportacion(
      `La exportación no tiene el formato de Telesalud. ${revision.errores.join(' ')}`,
    );
  }

  let datosTapados = 0;
  const solicitudes = datos.map((fila, posicion) => {
    const numeroFila = posicion + 2; // la fila 1 es el encabezado
    if (fila.length !== encabezado.length) {
      throw new ErrorExportacion(
        `La fila ${numeroFila} tiene ${fila.length} columnas y debería tener ${encabezado.length}.`,
      );
    }
    const campos = leerCampos(fila);
    const llave = campos.id_exportacion.trim();
    if (llave === '') {
      throw new ErrorExportacion(`La fila ${numeroFila} no tiene ID.`);
    }
    const { texto, tapados } = taparDatosPersonales(campos.texto_libre.trim());
    datosTapados += tapados.rut + tapados.telefono + tapados.correo;

    const solicitud = {
      id_solicitud: tablaDeCodigos.codigoPara(llave),
      fecha_ingreso: normalizarFecha(campos.fecha_solicitud) ?? campos.fecha_solicitud,
      tipo_profesional: campos.tipo_profesional.trim(),
      motivo: campos.motivo.trim(),
      texto_libre: texto,
    };
    const edad = leerEdad(campos.edad);
    if (edad !== undefined) solicitud.edad = edad;
    // Especificidad (columna T) queda para un prompt v2 [PENDIENTE]: hoy no pasa a la IA.

    const validada = validarSolicitud(solicitud);
    if (!validada.exito) {
      // Los mensajes hablan de campos, nunca repiten datos personales.
      throw new ErrorExportacion(
        `La fila ${numeroFila} no es válida: ${validada.errores.map((e) => e.mensaje).join(' ')}`,
      );
    }
    return validada.datos;
  });

  return {
    solicitudes,
    resumen: {
      filas: solicitudes.length,
      columnas_personales_separadas: COLUMNAS_PERSONALES.length,
      datos_tapados_en_texto: datosTapados,
    },
  };
};
