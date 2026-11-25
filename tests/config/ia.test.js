import { describirConfiguracion, leerConfiguracionIa, MODOS } from '../../src/config/ia.js';

const CLAVE = 'clave-falsa-de-prueba-123';
const entornoReal = (cambios = {}) => ({
  IA_URL_BASE: 'https://integrate.api.nvidia.com/v1/',
  IA_MODELO: 'meta/llama-3.3-70b-instruct',
  IA_API_KEY: CLAVE,
  ...cambios,
});

describe('leerConfiguracionIa: elección del modo', () => {
  test('sin clave, usa el modo simulado', () => {
    expect(leerConfiguracionIa({}).modo).toBe(MODOS.simulado);
    expect(leerConfiguracionIa(entornoReal({ IA_API_KEY: '   ' })).modo).toBe(MODOS.simulado);
  });

  test('con clave y MODO_IA vacío, usa el modelo real', () => {
    expect(leerConfiguracionIa(entornoReal({ MODO_IA: '' })).modo).toBe(MODOS.real);
  });

  test('MODO_IA=simulado fuerza el simulado aunque haya clave', () => {
    expect(leerConfiguracionIa(entornoReal({ MODO_IA: 'simulado' })).modo).toBe(MODOS.simulado);
  });

  test('MODO_IA=repeticion usa la repetición si hay archivo', () => {
    const configuracion = leerConfiguracionIa({
      MODO_IA: 'repeticion',
      IA_ARCHIVO_REPETICION: 'data/resultados/x.json',
    });
    expect(configuracion.modo).toBe(MODOS.repeticion);
  });

  test('rechaza un MODO_IA desconocido', () => {
    expect(() => leerConfiguracionIa({ MODO_IA: 'magico' })).toThrow('MODO_IA');
  });

  test('en modo real exige URL y modelo', () => {
    expect(() => leerConfiguracionIa(entornoReal({ IA_MODELO: '' }))).toThrow('IA_MODELO');
    expect(() => leerConfiguracionIa(entornoReal({ IA_URL_BASE: '' }))).toThrow('IA_URL_BASE');
  });

  test('en modo repetición exige el archivo', () => {
    expect(() => leerConfiguracionIa({ MODO_IA: 'repeticion' })).toThrow('IA_ARCHIVO_REPETICION');
  });
});

describe('leerConfiguracionIa: valores', () => {
  test('quita la barra final de la URL', () => {
    expect(leerConfiguracionIa(entornoReal()).urlBase).toBe('https://integrate.api.nvidia.com/v1');
  });

  test('usa 2000 ms de pausa, 120000 ms de espera y 4000 tokens por defecto', () => {
    const { pausaMs, tiempoEsperaMs, maxTokens } = leerConfiguracionIa({});
    expect({ pausaMs, tiempoEsperaMs, maxTokens }).toEqual({
      pausaMs: 2000,
      tiempoEsperaMs: 120000,
      maxTokens: 4000,
    });
  });

  test('lee el límite de tokens del entorno', () => {
    expect(leerConfiguracionIa({ IA_MAX_TOKENS: '800' }).maxTokens).toBe(800);
  });

  test.each(['0', 'mucho', '-5'])('rechaza un límite de tokens no válido: %p', (valor) => {
    expect(() => leerConfiguracionIa({ IA_MAX_TOKENS: valor })).toThrow('IA_MAX_TOKENS');
  });

  test('rechaza un tiempo de espera de 0', () => {
    expect(() => leerConfiguracionIa({ IA_TIEMPO_ESPERA_MS: '0' })).toThrow('IA_TIEMPO_ESPERA_MS');
  });

  test('lee la pausa y la espera del entorno', () => {
    const configuracion = leerConfiguracionIa({ IA_PAUSA_MS: '500', IA_TIEMPO_ESPERA_MS: '1000' });
    expect(configuracion.pausaMs).toBe(500);
    expect(configuracion.tiempoEsperaMs).toBe(1000);
  });

  test.each(['abc', '-1', '1.5'])('rechaza una pausa no válida: %p', (valor) => {
    expect(() => leerConfiguracionIa({ IA_PAUSA_MS: valor })).toThrow('IA_PAUSA_MS');
  });
});

describe('describirConfiguracion', () => {
  test('nunca muestra la clave', () => {
    const texto = describirConfiguracion(leerConfiguracionIa(entornoReal()));
    expect(texto).not.toContain(CLAVE);
    expect(texto).toContain('oculta');
  });

  test('deja claro cuándo es simulado', () => {
    expect(describirConfiguracion(leerConfiguracionIa({}))).toContain('SIMULADO');
  });

  test('deja claro cuándo es una repetición', () => {
    const configuracion = leerConfiguracionIa({
      MODO_IA: 'repeticion',
      IA_ARCHIVO_REPETICION: 'x.json',
    });
    expect(describirConfiguracion(configuracion)).toContain('repetición');
  });
});
