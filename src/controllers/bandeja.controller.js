import { validarCorreccion } from '../schemas/correccion.schema.js';
import { ErrorHttp } from '../middlewares/errores.js';
import { MENSAJE_SOLO_DEMOSTRACION } from '../services/demo-bandeja.service.js';

/**
 * Controlador de la bandeja: recibe la petición, valida lo que llega y llama a la demo.
 * Todas las respuestas exitosas son { ok: true, datos: <estado de la bandeja> }.
 */

const FORMATO_ID = /^SINT-\d{4}$/;

const leerId = (req) => {
  const { id } = req.params;
  if (!FORMATO_ID.test(id)) {
    throw new ErrorHttp(400, `El número de solicitud "${id}" no tiene el formato SINT-0000.`);
  }
  return id;
};

const responder = (res, datos, codigo = 200) => res.status(codigo).json({ ok: true, datos });

export const crearControladorBandeja = (demo) => ({
  obtener: (req, res) => responder(res, demo.estado()),

  confirmar: (req, res) => responder(res, demo.confirmar(leerId(req))),

  corregir: (req, res) => {
    const id = leerId(req);
    const validada = validarCorreccion(req.body);
    if (!validada.exito) {
      throw new ErrorHttp(400, 'La corrección no es válida.', validada.errores);
    }
    responder(res, demo.corregir(id, validada.datos));
  },

  deshacer: (req, res) => responder(res, demo.deshacer()),

  /** Regla R1: solo se cargan las exportaciones de demostración; no se recibe ningún archivo. */
  cargarExportacion: (req, res) => {
    const traeCuerpo =
      Number(req.get('content-length') ?? 0) > 0 ||
      req.get('transfer-encoding') !== undefined ||
      (req.body && Object.keys(req.body).length > 0);
    if (traeCuerpo) {
      throw new ErrorHttp(400, MENSAJE_SOLO_DEMOSTRACION);
    }
    responder(res, demo.cargarExportacion());
  },

  reiniciar: (req, res) => responder(res, demo.reiniciar()),
});
