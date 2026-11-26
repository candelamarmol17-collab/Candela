import { ARCHIVO_CORRIDA_POR_DEFECTO, leerConfiguracionApp } from '../../src/config/app.js';

describe('leerConfiguracionApp', () => {
  test('sin valores usa el puerto 3000 y la corrida de MiniMax', () => {
    expect(leerConfiguracionApp({})).toEqual({
      puerto: 3000,
      archivoCorrida: ARCHIVO_CORRIDA_POR_DEFECTO,
    });
    expect(ARCHIVO_CORRIDA_POR_DEFECTO).toContain('minimax');
  });

  test('lee PUERTO y BANDEJA_ARCHIVO_CORRIDA', () => {
    expect(
      leerConfiguracionApp({ PUERTO: ' 4000 ', BANDEJA_ARCHIVO_CORRIDA: 'data/resultados/x.json' }),
    ).toEqual({ puerto: 4000, archivoCorrida: 'data/resultados/x.json' });
  });

  test.each([['abc'], ['0'], ['70000'], ['3000.5']])('rechaza el puerto %p', (puerto) => {
    expect(() => leerConfiguracionApp({ PUERTO: puerto })).toThrow('PUERTO debe ser');
  });
});
