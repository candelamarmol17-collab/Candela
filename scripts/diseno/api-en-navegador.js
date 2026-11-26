import { validarCorreccion } from '../../src/schemas/correccion.schema.js';
import { ErrorDemo, MENSAJE_SOLO_DEMOSTRACION } from '../../src/services/demo-bandeja.service.js';

/**
 * Reemplazo de la API de la bandeja para la copia de diseño (un solo archivo HTML, sin servidor).
 *
 * Responde las mismas direcciones que src/routes/bandeja.routes.js, con el mismo formato:
 *   éxito: { ok: true, datos }   ·   error: { ok: false, error: { mensaje, detalles? } }
 * Usa la misma demo (src/services/demo-bandeja.service.js), así que se comporta igual.
 * No incluye nada del servidor: ni Express, ni la configuración, ni el .env.
 */

const FORMATO_ID = /^SINT-\d{4}$/;
const DIRECCION_ID = /^\/api\/bandeja\/([^/]+)\/(confirmar|corregir)$/;

class ErrorApi extends Error {
  constructor(codigo, mensaje, detalles) {
    super(mensaje);
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

const respuesta = (codigo, cuerpo) =>
  new Response(JSON.stringify(cuerpo), {
    status: codigo,
    headers: { 'Content-Type': 'application/json' },
  });

const leerCuerpo = (texto) => {
  if (texto === undefined || texto === null || texto === '') return {};
  try {
    return JSON.parse(texto);
  } catch {
    throw new ErrorApi(400, 'El cuerpo de la petición no es JSON válido.');
  }
};

const leerId = (textoId) => {
  const id = decodeURIComponent(textoId);
  if (!FORMATO_ID.test(id)) {
    throw new ErrorApi(400, `El número de solicitud "${id}" no tiene el formato SINT-0000.`);
  }
  return id;
};

/** Devuelve [código, datos] para una petición, o lanza un error. */
const atender = (demo, evaluacion, metodo, ruta, cuerpo) => {
  if (metodo === 'GET' && ruta === '/api/bandeja') return [200, demo.estado()];
  if (metodo === 'GET' && ruta === '/api/evaluacion') {
    if (!evaluacion || evaluacion.error) {
      throw new ErrorApi(500, evaluacion?.error ?? 'La evaluación no está disponible.');
    }
    return [200, evaluacion];
  }
  if (metodo === 'POST' && ruta === '/api/bandeja/deshacer') return [200, demo.deshacer()];
  if (metodo === 'POST' && ruta === '/api/bandeja/cargar-exportacion') {
    // Regla R1: no se recibe ningún archivo, igual que en el servidor.
    if (cuerpo !== undefined && cuerpo !== null && cuerpo !== '') {
      throw new ErrorApi(400, MENSAJE_SOLO_DEMOSTRACION);
    }
    return [200, demo.cargarExportacion()];
  }
  if (metodo === 'POST' && ruta === '/api/bandeja/reiniciar') return [200, demo.reiniciar()];
  const partes = metodo === 'POST' ? DIRECCION_ID.exec(ruta) : null;
  if (partes) {
    const id = leerId(partes[1]);
    if (partes[2] === 'confirmar') return [200, demo.confirmar(id)];
    const validada = validarCorreccion(leerCuerpo(cuerpo));
    if (!validada.exito) {
      throw new ErrorApi(400, 'La corrección no es válida.', validada.errores);
    }
    return [200, demo.corregir(id, validada.datos)];
  }
  throw new ErrorApi(404, 'Esa dirección de la API no existe.');
};

/**
 * Crea una función con la misma forma que fetch. Las direcciones /api/... las responde la demo;
 * cualquier otra cosa se rechaza, porque la copia de diseño no se conecta a nada.
 */
export const crearFetchDeDemo =
  (demo, { evaluacion = null } = {}) =>
  async (direccion, opciones = {}) => {
    const ruta = new URL(String(direccion), 'http://pulso.local').pathname;
    const metodo = (opciones.method ?? 'GET').toUpperCase();
    try {
      const [codigo, datos] = atender(demo, evaluacion, metodo, ruta, opciones.body);
      return respuesta(codigo, { ok: true, datos });
    } catch (error) {
      if (error instanceof ErrorApi || error instanceof ErrorDemo) {
        return respuesta(error.codigo, {
          ok: false,
          error: {
            mensaje: error.message,
            ...(error.detalles ? { detalles: error.detalles } : {}),
          },
        });
      }
      return respuesta(500, { ok: false, error: { mensaje: 'Ocurrió un error inesperado.' } });
    }
  };
