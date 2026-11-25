import { jest } from '@jest/globals';
import {
  crearAdaptadorCompatibleOpenAI,
  listarModelos,
  ORIGEN_MODELO_REAL,
} from '../../src/adaptadores/adaptador-compatible-openai.js';

// Las pruebas nunca llaman a internet: usan un fetch falso.
const CLAVE = 'clave-falsa-de-prueba-123';
const MENSAJES = [{ role: 'user', content: 'hola' }];

const respuestaJson = (status, cuerpo) => ({
  status,
  json: async () => cuerpo,
  text: async () => JSON.stringify(cuerpo),
});

const respuestaOk = (contenido) =>
  respuestaJson(200, { choices: [{ message: { content: contenido } }] });

const crear = (fetchFn, esperar = jest.fn(async () => {})) =>
  crearAdaptadorCompatibleOpenAI({
    urlBase: 'https://proveedor.test/v1',
    apiKey: CLAVE,
    modelo: 'modelo/prueba',
    tiempoEsperaMs: 1000,
    maxTokens: 4000,
    fetchFn,
    esperar,
  });

describe('adaptador compatible con OpenAI', () => {
  test('declara su origen y modelo', () => {
    const adaptador = crear(jest.fn());
    expect(adaptador.origen).toBe(ORIGEN_MODELO_REAL);
    expect(adaptador.modelo).toBe('modelo/prueba');
  });

  test('llama a /chat/completions con la clave, el modelo y temperatura 0', async () => {
    const fetchFn = jest.fn(async () => respuestaOk('{"a":1}'));
    await crear(fetchFn).completar(MENSAJES);

    const [url, opciones] = fetchFn.mock.calls[0];
    expect(url).toBe('https://proveedor.test/v1/chat/completions');
    expect(opciones.method).toBe('POST');
    expect(opciones.headers.Authorization).toBe(`Bearer ${CLAVE}`);
    expect(JSON.parse(opciones.body)).toEqual({
      model: 'modelo/prueba',
      messages: MENSAJES,
      temperature: 0,
      max_tokens: 4000,
    });
  });

  test('explica cuando el modelo agota el límite de tokens pensando', async () => {
    const fetchFn = jest.fn(async () =>
      respuestaJson(200, {
        choices: [{ finish_reason: 'length', message: { content: null, reasoning_content: 'x' } }],
      }),
    );
    await expect(crear(fetchFn).completar(MENSAJES)).rejects.toThrow('IA_MAX_TOKENS');
  });

  test('devuelve el texto del modelo', async () => {
    const fetchFn = jest.fn(async () => respuestaOk('{"a":1}'));
    await expect(crear(fetchFn).completar(MENSAJES)).resolves.toBe('{"a":1}');
  });

  test.each([429, 500, 503])(
    'reintenta una vez tras un error %i, esperando 10 segundos',
    async (status) => {
      const esperar = jest.fn(async () => {});
      const fetchFn = jest
        .fn()
        .mockResolvedValueOnce(respuestaJson(status, {}))
        .mockResolvedValueOnce(respuestaOk('ok'));
      await expect(crear(fetchFn, esperar).completar(MENSAJES)).resolves.toBe('ok');
      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(esperar).toHaveBeenCalledWith(10000);
    },
  );

  test('falla si el reintento también falla (solo un reintento)', async () => {
    const fetchFn = jest.fn(async () => respuestaJson(429, {}));
    await expect(crear(fetchFn).completar(MENSAJES)).rejects.toThrow('HTTP 429');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  test('reintenta si se agota el tiempo de espera', async () => {
    const errorTiempo = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    const fetchFn = jest
      .fn()
      .mockRejectedValueOnce(errorTiempo)
      .mockResolvedValueOnce(respuestaOk('ok'));
    await expect(crear(fetchFn).completar(MENSAJES)).resolves.toBe('ok');
  });

  test('no reintenta si la clave es rechazada', async () => {
    const fetchFn = jest.fn(async () => respuestaJson(401, {}));
    await expect(crear(fetchFn).completar(MENSAJES)).rejects.toThrow('rechazó la clave');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test('falla si la respuesta no trae el texto del modelo', async () => {
    const fetchFn = jest.fn(async () => respuestaJson(200, { choices: [] }));
    await expect(crear(fetchFn).completar(MENSAJES)).rejects.toThrow('no trae el texto');
  });

  test('falla con un HTTP inesperado (por ejemplo 202) sin reintentar', async () => {
    const fetchFn = jest.fn(async () => respuestaJson(202, {}));
    await expect(crear(fetchFn).completar(MENSAJES)).rejects.toThrow('HTTP 202');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test('nunca incluye la clave en los mensajes de error', async () => {
    const fetchFn = jest.fn(async () => {
      throw new Error(`fallo de red usando ${CLAVE}`);
    });
    const error = await crear(fetchFn)
      .completar(MENSAJES)
      .catch((e) => e);
    expect(error.message).not.toContain(CLAVE);
    expect(error.message).toContain('[clave oculta]');
  });
});

describe('listarModelos', () => {
  const listar = (fetchFn) =>
    listarModelos({
      urlBase: 'https://proveedor.test/v1',
      apiKey: CLAVE,
      tiempoEsperaMs: 1000,
      fetchFn,
    });

  test('consulta GET /models con la clave y devuelve los id ordenados y sin repetir', async () => {
    const fetchFn = jest.fn(async () =>
      respuestaJson(200, {
        data: [{ id: 'b/modelo' }, { id: 'a/modelo' }, { id: 'b/modelo' }, {}],
      }),
    );
    expect(await listar(fetchFn)).toEqual(['a/modelo', 'b/modelo']);
    const [url, opciones] = fetchFn.mock.calls[0];
    expect(url).toBe('https://proveedor.test/v1/models');
    expect(opciones.method).toBe('GET');
    expect(opciones.headers.Authorization).toBe(`Bearer ${CLAVE}`);
  });

  test('avisa si la clave es rechazada', async () => {
    await expect(listar(jest.fn(async () => respuestaJson(401, {})))).rejects.toThrow(
      'rechazó la clave',
    );
  });

  test('falla con un mensaje claro si no viene la lista', async () => {
    await expect(listar(jest.fn(async () => respuestaJson(200, { otra: 1 })))).rejects.toThrow(
      'lista de modelos',
    );
  });

  test('no muestra la clave en los errores de conexión', async () => {
    const fetchFn = jest.fn(async () => {
      throw new Error(`fallo con ${CLAVE}`);
    });
    const error = await listar(fetchFn).catch((e) => e);
    expect(error.message).not.toContain(CLAVE);
    expect(error.message).toContain('[clave oculta]');
  });
});
