import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Criterio de Candela para el video (2026-11-26): ninguna pantalla dice que algo está
// "validado" ni "validado clínicamente". La validación clínica formal es parte del piloto.
describe('textos de la pantalla', () => {
  test('ninguna pantalla dice "validado" o "validada"', async () => {
    const archivos = (await readdir('public')).filter((n) => /\.(html|js)$/.test(n));
    expect(archivos.length).toBeGreaterThan(0);
    for (const archivo of archivos) {
      const texto = await readFile(join('public', archivo), 'utf8');
      expect({ archivo, encontrado: /validad[oa]s?\b/i.test(texto) }).toEqual({
        archivo,
        encontrado: false,
      });
    }
  });
});
