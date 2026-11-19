import { readFileSync } from 'node:fs';

describe('Configuración base del proyecto', () => {
  test('Jest funciona con módulos ESM', () => {
    expect(typeof import.meta.url).toBe('string');
  });

  test('.env.example usa el modo simulado y no trae secretos', () => {
    const contenido = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
    expect(contenido).toMatch(/^MODO_IA=simulado$/m);
    expect(contenido).not.toMatch(/KEY|TOKEN|SECRET/i);
  });
});
