import { esperar as esperarPorDefecto } from '../utilidades/esperar.js';

/**
 * Adaptador para cualquier proveedor compatible con la API de OpenAI (NVIDIA, OpenAI u otro).
 * Se configura solo con la URL base, la clave y el nombre del modelo.
 *
 * Todos los adaptadores tienen la misma forma:
 *   { origen, modelo, completar(mensajes, solicitud) → Promise<texto de la respuesta> }
 */

export const ORIGEN_MODELO_REAL = 'modelo_real';

const PARAMETROS_MODELO = Object.freeze({ temperature: 0, max_tokens: 500 });
const ESPERA_REINTENTO_MS = 10000;

/** Error del proveedor. Nunca incluye la clave. */
export class ErrorProveedor extends Error {
  constructor(mensaje, { reintentable = false } = {}) {
    super(mensaje);
    this.name = 'ErrorProveedor';
    this.reintentable = reintentable;
  }
}

const ocultarClave = (texto, apiKey) =>
  apiKey ? String(texto).replaceAll(apiKey, '[clave oculta]') : String(texto);

/**
 * Consulta GET <urlBase>/models y devuelve los identificadores de los modelos disponibles hoy,
 * ordenados alfabéticamente. Sirve para elegir IA_MODELO, porque los catálogos retiran modelos.
 */
export const listarModelos = async ({
  urlBase,
  apiKey,
  tiempoEsperaMs,
  fetchFn = globalThis.fetch,
}) => {
  let respuesta;
  try {
    respuesta = await fetchFn(`${urlBase}/models`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(tiempoEsperaMs),
    });
  } catch (error) {
    throw new ErrorProveedor(
      `No se pudo conectar con el proveedor: ${ocultarClave(error?.message, apiKey)}`,
    );
  }

  if (respuesta.status === 401 || respuesta.status === 403) {
    throw new ErrorProveedor(
      `El proveedor rechazó la clave (HTTP ${respuesta.status}). Revisa IA_API_KEY en el .env.`,
    );
  }
  if (respuesta.status !== 200) {
    throw new ErrorProveedor(`El proveedor respondió HTTP ${respuesta.status}.`);
  }

  let cuerpo;
  try {
    cuerpo = await respuesta.json();
  } catch {
    throw new ErrorProveedor('El proveedor devolvió una respuesta que no es JSON.');
  }
  if (!Array.isArray(cuerpo?.data)) {
    throw new ErrorProveedor('La respuesta del proveedor no trae la lista de modelos.');
  }

  return [
    ...new Set(
      cuerpo.data.map((modelo) => modelo?.id).filter((id) => typeof id === 'string' && id !== ''),
    ),
  ].sort((a, b) => a.localeCompare(b));
};

export const crearAdaptadorCompatibleOpenAI = ({
  urlBase,
  apiKey,
  modelo,
  tiempoEsperaMs,
  esperaReintentoMs = ESPERA_REINTENTO_MS,
  fetchFn = globalThis.fetch,
  esperar = esperarPorDefecto,
}) => {
  const consultarUnaVez = async (mensajes) => {
    let respuesta;
    try {
      respuesta = await fetchFn(`${urlBase}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ model: modelo, messages: mensajes, ...PARAMETROS_MODELO }),
        signal: AbortSignal.timeout(tiempoEsperaMs),
      });
    } catch (error) {
      const seAgotoElTiempo = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      throw new ErrorProveedor(
        seAgotoElTiempo
          ? `El proveedor no respondió en ${tiempoEsperaMs} ms.`
          : `No se pudo conectar con el proveedor: ${ocultarClave(error?.message, apiKey)}`,
        { reintentable: true },
      );
    }

    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new ErrorProveedor(
        `El proveedor rechazó la clave (HTTP ${respuesta.status}). Revisa IA_API_KEY en el .env.`,
      );
    }
    if (respuesta.status === 429 || respuesta.status >= 500) {
      throw new ErrorProveedor(`El proveedor respondió con error HTTP ${respuesta.status}.`, {
        reintentable: true,
      });
    }
    if (respuesta.status !== 200) {
      const detalle = ocultarClave(await respuesta.text().catch(() => ''), apiKey).slice(0, 200);
      throw new ErrorProveedor(
        `El proveedor respondió HTTP ${respuesta.status}. ${detalle}`.trim(),
      );
    }

    let cuerpo;
    try {
      cuerpo = await respuesta.json();
    } catch {
      throw new ErrorProveedor('El proveedor devolvió una respuesta que no es JSON.');
    }

    const contenido = cuerpo?.choices?.[0]?.message?.content;
    if (typeof contenido !== 'string') {
      throw new ErrorProveedor('La respuesta del proveedor no trae el texto del modelo.');
    }
    return contenido;
  };

  return {
    origen: ORIGEN_MODELO_REAL,
    modelo,
    completar: async (mensajes) => {
      try {
        return await consultarUnaVez(mensajes);
      } catch (error) {
        if (!(error instanceof ErrorProveedor) || !error.reintentable) {
          throw error;
        }
        // Un solo reintento, después de una pausa más larga.
        await esperar(esperaReintentoMs);
        return consultarUnaVez(mensajes);
      }
    },
  };
};
