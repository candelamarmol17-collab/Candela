import { ENCABEZADO_EXPORTACION } from '../schemas/exportacion-telesalud.js';

/**
 * Exportación de DEMOSTRACIÓN con el formato real de Telesalud (tarea 012).
 *
 * Usa las mismas solicitudes sintéticas de data/sinteticos/solicitudes.json, puestas en las 48
 * columnas. Los datos personales son claramente inventados ("Vecina Demo 01", "DEMO-0001",
 * "+56 9 0000 0001", "demo01@example.com", "Calle Ficticia 101"): imposibles de confundir con
 * personas reales. Las columnas de funcionarios, notas y cierre van vacías.
 */

/** La segunda exportación trae solo esta solicitud (decisión de las tareas 006 y 011). */
export const ID_SEGUNDA_EXPORTACION = 'SINT-0009';

const numeroDe = (idSolicitud) => {
  const partes = /^SINT-(\d{4})$/.exec(idSolicitud);
  if (!partes) throw new Error(`El id "${idSolicitud}" no tiene el formato SINT-0000.`);
  return Number(partes[1]);
};

const dosDigitos = (numero) => String(numero).padStart(2, '0');
const cuatroDigitos = (numero) => String(numero).padStart(4, '0');

/** Llave de la columna ID en la demo: DEMO-ID-0001, … */
export const llaveDemo = (idSolicitud) => `DEMO-ID-${cuatroDigitos(numeroDe(idSolicitud))}`;

/**
 * Tabla de códigos de la demo: ya viene armada para que DEMO-ID-0001 sea SINT-0001, y así los
 * códigos coincidan con la corrida guardada. En el piloto, los códigos serían nuevos (PUL-0001…).
 */
export const codigoFijoDemo = (llave) => {
  const partes = /^DEMO-ID-(\d{4})$/.exec(llave);
  return partes ? `SINT-${partes[1]}` : null;
};

/** "2026-11-12T13:13:00" → "2026-11-12 13:13:00" (formato real por confirmar: [PENDIENTE]). */
const fechaDeExportacion = (fecha) => fecha.replace('T', ' ');

/** Fila de 48 columnas para una solicitud sintética. */
export const filaDeDemostracion = (solicitud) => {
  const numero = numeroDe(solicitud.id_solicitud);
  const valores = {
    ID: llaveDemo(solicitud.id_solicitud),
    Cesfam: 'CESFAM Demo',
    'Código seguimiento': `DEMO-SEG-${cuatroDigitos(numero)}`,
    'Información adicional': solicitud.texto_libre,
    'Fecha solicitud': fechaDeExportacion(solicitud.fecha_ingreso),
    Nombre: `Vecina Demo ${dosDigitos(numero)}`,
    'Apellido paterno': 'Demo',
    'Apellido materno': 'Ficticia',
    'Tipo identificador': 'DEMO',
    'Nº identificador': `DEMO-${cuatroDigitos(numero)}`,
    Edad: typeof solicitud.edad === 'number' ? String(solicitud.edad) : '',
    Email: `demo${dosDigitos(numero)}@example.com`,
    Telefono: `+56 9 0000 ${cuatroDigitos(numero)}`,
    Dirección: `Calle Ficticia ${100 + numero}`,
    'Tipo prestador': solicitud.tipo_profesional,
    'Motivo consulta': solicitud.motivo,
  };
  // Por posición: la segunda "Información adicional" (AV) y todo lo demás van vacíos.
  return ENCABEZADO_EXPORTACION.map((nombre, indice) =>
    indice === ENCABEZADO_EXPORTACION.length - 1 ? '' : (valores[nombre] ?? ''),
  );
};

/** Las dos exportaciones de demostración (cada una con su encabezado). */
export const armarExportacionesDemo = (solicitudes, idSegunda = ID_SEGUNDA_EXPORTACION) => {
  const primera = solicitudes.filter((s) => s.id_solicitud !== idSegunda);
  const segunda = solicitudes.filter((s) => s.id_solicitud === idSegunda);
  return [primera, segunda].map((lista) => [
    [...ENCABEZADO_EXPORTACION],
    ...lista.map(filaDeDemostracion),
  ]);
};
