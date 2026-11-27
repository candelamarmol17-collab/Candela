import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  armarHtml,
  generarCopiaDeDiseno,
  jsonParaHtml,
  leerArgumentos,
  revisarQueNoTengaClave,
  SALIDA_POR_DEFECTO,
  validarSalida,
} from '../../scripts/exportar-diseno.js';

const RAIZ = resolve('.');

const HTML_MINIMO = `<!doctype html>
<html lang="es">
  <head>
    <link rel="icon" type="image/svg+xml" href="/logo-pulso.svg" />
    <link rel="stylesheet" href="/estilos.css" />
    <script type="module" src="/app.js"></script>
  </head>
  <body>
    <img src="/logo-pulso.svg" alt="" />
    <a href="/">Bandeja</a>
  </body>
</html>`;

const CODIGO_CON_DOLARES = 'const precio = `$${1}`; const x = "$& $\' $`";';

const piezas = (cambios = {}) => ({
  html: HTML_MINIMO,
  css: "@font-face { src: url('/fuentes/inter-latin-variable.woff2'); }",
  js: CODIGO_CON_DOLARES,
  logoSvg: '<svg></svg>',
  fuenteWoff2: Buffer.from([1, 2, 3]),
  datos: { texto: '</script><b>hola</b>' },
  ...cambios,
});

const leerDatosDeLaPagina = (pagina) =>
  JSON.parse(
    /<script type="application\/json" id="datos-bandeja">(.*?)<\/script>/s.exec(pagina)[1],
  );

describe('leerArgumentos', () => {
  test('sin argumentos usa la carpeta Pulso-para-diseno, al lado del repositorio', () => {
    expect(leerArgumentos([]).salida).toBe(SALIDA_POR_DEFECTO);
    expect(SALIDA_POR_DEFECTO).toBe(resolve(RAIZ, '..', 'Pulso-para-diseno', 'pulso-diseno.html'));
  });

  test('acepta --salida', () => {
    expect(leerArgumentos(['--salida', 'x/copia.html']).salida).toBe(resolve('x/copia.html'));
  });

  test.each([[['--otra', 'a']], [['--salida']], [['--salida', '  ']]])('rechaza %p', (args) => {
    expect(() => leerArgumentos(args)).toThrow('Uso');
  });
});

describe('validarSalida', () => {
  test('acepta un .html fuera del repositorio', () => {
    const ruta = resolve(RAIZ, '..', 'otra', 'copia.html');
    expect(validarSalida(ruta, RAIZ)).toBe(ruta);
  });

  test.each([
    ['dentro del repositorio', resolve(RAIZ, 'public', 'copia.html'), 'fuera del repositorio'],
    ['en la raíz del repositorio', resolve(RAIZ, 'copia.html'), 'fuera del repositorio'],
    ['sin .html', resolve(RAIZ, '..', 'copia.txt'), '.html'],
  ])('rechaza un archivo %s', (_caso, ruta, mensaje) => {
    expect(() => validarSalida(ruta, RAIZ)).toThrow(mensaje);
  });
});

describe('jsonParaHtml', () => {
  test('no deja cerrar la etiqueta <script> y se puede volver a leer', () => {
    const original = { a: '</script><!-- x', b: 'línea otra' };
    const texto = jsonParaHtml(original);
    expect(texto).not.toMatch(/<\/script/i);
    expect(texto).not.toContain('<!--');
    expect(JSON.parse(texto)).toEqual(original);
  });
});

describe('armarHtml', () => {
  test('mete dentro el CSS, la fuente, el logo, los datos y el código', () => {
    const pagina = armarHtml(piezas());
    expect(pagina).toContain('<style>');
    expect(pagina).toContain("url('data:font/woff2;base64,AQID')");
    expect(pagina).toContain('src="data:image/svg+xml;base64,');
    expect(pagina).toContain('href="#"');
    expect(pagina).not.toMatch(/(?:src|href)="\/[^/]/);
    expect(pagina).not.toContain('type="module"');
  });

  test('copia el código tal cual, aunque tenga signos "$" (no repite partes de la página)', () => {
    const pagina = armarHtml(piezas());
    expect(pagina).toContain(CODIGO_CON_DOLARES);
    expect(pagina.match(/<\/body>/g)).toHaveLength(1);
  });

  test('los datos no pueden cerrar la etiqueta <script>', () => {
    expect(leerDatosDeLaPagina(armarHtml(piezas()))).toEqual({ texto: '</script><b>hola</b>' });
  });

  test('falla con un mensaje claro si la pantalla cambió y falta algo', () => {
    expect(() => armarHtml(piezas({ css: 'body {}' }))).toThrow('la fuente Inter');
  });
});

describe('revisarQueNoTengaClave', () => {
  test('falla si la clave del .env quedó dentro, sin mostrarla', () => {
    const clave = 'clave-de-prueba-123';
    expect(() => revisarQueNoTengaClave(`<p>${clave}</p>`, `IA_API_KEY=${clave}\n`)).toThrow(
      /^La copia incluiría la clave de la IA\. No se guardó nada\.$/,
    );
  });

  test('falla si aparece el nombre IA_API_KEY', () => {
    expect(() => revisarQueNoTengaClave('IA_API_KEY', '')).toThrow('clave');
  });

  test('pasa si no hay .env o la clave está vacía', () => {
    expect(() => revisarQueNoTengaClave('<p>hola</p>', '')).not.toThrow();
    expect(() => revisarQueNoTengaClave('<p>hola</p>', 'IA_API_KEY=\n')).not.toThrow();
  });
});

describe('generarCopiaDeDiseno (con la pantalla y los datos reales del proyecto)', () => {
  test('genera un solo archivo autónomo, con las exportaciones de demostración y la corrida de MiniMax', async () => {
    // Carpeta temporal del sistema: el sistema la limpia solo.
    const carpeta = await mkdtemp(join(tmpdir(), 'pulso-diseno-'));
    const salida = join(carpeta, 'sub', 'pulso-diseno.html');
    const { ruta, bytes } = await generarCopiaDeDiseno({ salida });
    expect(ruta).toBe(salida);
    expect(bytes).toBeGreaterThan(100_000);

    const pagina = await readFile(salida, 'utf8');
    expect(pagina).not.toMatch(/(?:src|href)="\/[^/]/);
    expect(pagina).not.toContain('IA_API_KEY');
    // Nada del servidor: el empaquetado anota cada archivo que incluye, así que se puede revisar.
    expect(pagina).not.toContain('process.env');
    expect(pagina).not.toContain('node_modules/express');
    expect(pagina).not.toMatch(/\/\/ src\/(app|server|config|routes|controllers|middlewares)/);
    expect(pagina).toContain('// src/services/demo-bandeja.service.js');

    const datos = leerDatosDeLaPagina(pagina);
    expect(datos).not.toHaveProperty('solicitudes');
    expect(datos.exportaciones.map((filas) => filas.length - 1)).toEqual([59, 1]);
    expect(datos.exportaciones[0][0]).toHaveLength(48);
    // Los únicos datos "personales" que lleva son los de demostración, claramente inventados.
    expect(pagina).toContain('Vecina Demo 01');
    expect(pagina).toContain('DEMO-ID-0001');
    expect(datos.corrida.modelo).toBe('minimaxai/minimax-m3.1-flash');
    // La pestaña "Evaluación" también funciona en la copia: lleva las métricas calculadas.
    expect(datos.evaluacion.modelos.map((m) => m.nombre)).toEqual([
      'Mistral Large 4',
      'MiniMax M3.1 Flash',
    ]);
    expect(pagina).toContain('Resultados de MiniMax reproducidos desde archivo');
    // La bienvenida (tarea 014) también va en la copia.
    expect(pagina).toContain('Hola, equipo.');
    // La pestaña "Cómo funciona" (tarea 009) también.
    expect(pagina).toContain('Cómo funciona Pulso');
    expect(pagina).toContain('CESFAM Boris Soler · Bandeja de Telesalud');
  }, 30_000);
});
