import { readFileSync } from 'node:fs';

const contenido = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');

describe('Configuración base del proyecto', () => {
  test('Jest funciona con módulos ESM', () => {
    expect(typeof import.meta.url).toBe('string');
  });

  test('.env.example deja vacía la clave (regla R7)', () => {
    expect(contenido).toMatch(/^IA_API_KEY=$/m);
  });

  test('.env.example no trae ningún valor que parezca una clave', () => {
    const lineasConValor = contenido
      .split(/\r?\n/)
      .filter((linea) => /^[A-Z_]*(KEY|TOKEN|SECRET)[A-Z_]*=\S/.test(linea));
    expect(lineasConValor).toEqual([]);
  });

  test('.env.example no fuerza ningún modo: sin clave, se usa el simulado', () => {
    expect(contenido).toMatch(/^MODO_IA=$/m);
  });
});
