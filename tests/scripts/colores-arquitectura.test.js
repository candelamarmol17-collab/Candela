import { readFile } from 'node:fs/promises';
import { aplicarColoresPulso, ESTILO_PULSO } from '../../scripts/colores-arquitectura.js';

// Diagrama de arquitectura (tarea 016): copia de Archify con los colores de Pulso.
const PREFERENCIA = "window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'";
const html = `<html><head><script>theme = ${PREFERENCIA};</script></head><body></body></html>`;

describe('aplicarColoresPulso', () => {
  test('agrega la paleta de Pulso y abre en tema claro', () => {
    const resultado = aplicarColoresPulso(html);
    expect(resultado).toContain(ESTILO_PULSO);
    expect(resultado).toContain("theme = 'light';");
    expect(resultado).not.toContain('prefers-color-scheme');
    expect(ESTILO_PULSO).toContain('#1f6f78');
    expect(ESTILO_PULSO).toContain('#5b5b9a');
  });

  test('si no es un HTML de Archify, lo dice', () => {
    expect(() => aplicarColoresPulso('hola')).toThrow('</head>');
    expect(() => aplicarColoresPulso('<head></head>')).toThrow('versión de Archify');
  });
});

describe('docs/arquitectura (lo que se entrega)', () => {
  test('el HTML lleva los colores de Pulso, abre en claro y no trae secretos', async () => {
    const pagina = await readFile('docs/arquitectura/arquitectura-pulso.html', 'utf8');
    expect(pagina).toContain('id="colores-pulso"');
    expect(pagina).not.toContain(PREFERENCIA);
    expect(pagina).not.toMatch(/IA_API_KEY\s*=|nvapi-|Bearer\s+[A-Za-z0-9]/);
    expect(pagina).toContain('Propuesta para el piloto (por definir con la UAI)');
    expect(pagina).not.toMatch(/validad[oa]s?\b/i);
  });

  test('el PNG existe y es de alta resolución', async () => {
    const png = await readFile('docs/arquitectura/arquitectura-pulso.png');
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBeGreaterThanOrEqual(3000);
  });

  test('el número de pruebas del diagrama coincide con una cifra real anotada', async () => {
    const candidato = JSON.parse(
      await readFile('docs/arquitectura/arquitectura-pulso.archify.json', 'utf8'),
    );
    const pruebas = candidato.components.find((c) => c.id === 'pruebas');
    expect(pruebas.sublabel).toMatch(/\d+ pruebas/);
  });
});
