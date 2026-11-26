import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';
import { build } from 'esbuild';
import { leerDatosBandeja } from '../src/repositories/bandeja.repository.js';

/**
 * Genera una copia de la pantalla de la bandeja en UN SOLO archivo HTML, para revisar el diseño
 * con doble clic: sin servidor y sin internet.
 *
 * Uso: npm run exportar:diseno                      (en Windows: npm.cmd run exportar:diseno)
 *      npm run exportar:diseno -- --salida <ruta.html>
 *
 * Lleva dentro el CSS, el JavaScript, la fuente Inter, el logo y los datos de la bandeja
 * (las solicitudes sintéticas y la corrida de MiniMax). No lleva la clave, el .env ni el servidor.
 * El archivo se guarda FUERA del repositorio, para que no se suba a GitHub.
 */

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const PUBLICO = resolve(RAIZ, 'public');
const ENTRADA_NAVEGADOR = resolve(RAIZ, 'scripts/diseno/entrada-navegador.js');
const ARCHIVO_CORRIDA = resolve(
  RAIZ,
  'data/resultados/clasificaciones-minimaxai-minimax-m3.1-flash.json',
);
export const SALIDA_POR_DEFECTO = resolve(RAIZ, '..', 'Pulso-para-diseno', 'pulso-diseno.html');

const URL_FUENTE = "url('/fuentes/inter-latin-variable.woff2')";

/** Lee "--salida <ruta>". No acepta otras opciones. */
export const leerArgumentos = (argumentos) => {
  const opciones = { salida: SALIDA_POR_DEFECTO };
  for (let i = 0; i < argumentos.length; i += 2) {
    const [nombre, valor] = [argumentos[i], argumentos[i + 1]];
    if (nombre !== '--salida' || typeof valor !== 'string' || valor.trim() === '') {
      throw new Error('Uso: npm run exportar:diseno [-- --salida <ruta.html>]');
    }
    opciones.salida = resolve(valor.trim());
  }
  return opciones;
};

/** La copia debe ser un .html y quedar fuera del repositorio. */
export const validarSalida = (ruta, raiz = RAIZ) => {
  if (extname(ruta).toLowerCase() !== '.html') {
    throw new Error('El archivo de salida debe terminar en .html.');
  }
  const dentro = relative(resolve(raiz), resolve(ruta));
  if (!dentro.startsWith('..') && !isAbsolute(dentro)) {
    throw new Error(
      'La copia de diseño debe guardarse fuera del repositorio, para que no se suba a GitHub.',
    );
  }
  return resolve(ruta);
};

/** JSON que se puede poner dentro de una etiqueta <script> sin cerrarla por accidente. */
export const jsonParaHtml = (valor) =>
  JSON.stringify(valor)
    .replaceAll('<', '\\u003c')
    .replaceAll(' ', '\\u2028')
    .replaceAll(' ', '\\u2029');

const reemplazarUnaVez = (texto, buscado, nuevo, nombre) => {
  if (!texto.includes(buscado)) {
    throw new Error(`No encontré ${nombre} en la pantalla. ¿Cambió public/index.html o estilos?`);
  }
  // Con una función, los "$" del código no se interpretan como patrones de reemplazo.
  return texto.replaceAll(buscado, () => nuevo);
};

/**
 * Arma el HTML autónomo. Función pura: recibe los textos de la pantalla y devuelve el archivo.
 * Falla si queda alguna dirección que necesite el servidor.
 */
export const armarHtml = ({ html, css, js, logoSvg, fuenteWoff2, datos }) => {
  const logo = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;
  const fuente = `url('data:font/woff2;base64,${Buffer.from(fuenteWoff2).toString('base64')}')`;
  const estilos = reemplazarUnaVez(css, URL_FUENTE, fuente, 'la fuente Inter');
  const codigo = js.replace(/<\/script/gi, '<\\/script');

  let pagina = html;
  pagina = reemplazarUnaVez(
    pagina,
    '<link rel="stylesheet" href="/estilos.css" />',
    `<style>\n${estilos}\n</style>`,
    'el enlace a los estilos',
  );
  pagina = reemplazarUnaVez(
    pagina,
    '<script type="module" src="/app.js"></script>',
    '',
    'el enlace al código de la pantalla',
  );
  pagina = reemplazarUnaVez(pagina, '/logo-pulso.svg', logo, 'el logo');
  pagina = pagina.replaceAll('href="/"', 'href="#"');
  pagina = reemplazarUnaVez(
    pagina,
    '<html lang="es">',
    '<html lang="es">\n  <!-- Copia de la pantalla para diseño, generada con "npm run exportar:diseno". ' +
      'Funciona sin servidor: los datos son sintéticos y van dentro de este archivo. -->',
    'la etiqueta html',
  );
  pagina = reemplazarUnaVez(
    pagina,
    '</body>',
    `    <script type="application/json" id="datos-bandeja">${jsonParaHtml(datos)}</script>\n` +
      `    <script>\n${codigo}\n    </script>\n  </body>`,
    'el cierre del body',
  );

  const pendiente = /(?:src|href)="\/[^/]/.exec(pagina);
  if (pendiente) {
    throw new Error(`Quedó una dirección que necesita el servidor: ${pendiente[0]}…`);
  }
  return pagina;
};

/** Revisa que la clave del .env (si existe) no haya quedado dentro del archivo. No la muestra. */
export const revisarQueNoTengaClave = (pagina, textoEnv) => {
  const clave = textoEnv ? (parseEnv(textoEnv).IA_API_KEY ?? '').trim() : '';
  if (pagina.includes('IA_API_KEY') || (clave !== '' && pagina.includes(clave))) {
    throw new Error('La copia incluiría la clave de la IA. No se guardó nada.');
  }
};

/** Empaqueta la pantalla y la demo (con Zod) en un solo código para el navegador. */
const empaquetar = async () => {
  const resultado = await build({
    entryPoints: [ENTRADA_NAVEGADOR],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    write: false,
    logLevel: 'silent',
  });
  return resultado.outputFiles[0].text;
};

const leerEnvSiExiste = async () => {
  try {
    return await readFile(resolve(RAIZ, '.env'), 'utf8');
  } catch {
    return '';
  }
};

/** Genera la copia y devuelve su ruta y tamaño. */
export const generarCopiaDeDiseno = async ({ salida = SALIDA_POR_DEFECTO } = {}) => {
  const destino = validarSalida(salida);
  const [html, css, logoSvg, fuenteWoff2, js, datos, textoEnv] = await Promise.all([
    readFile(resolve(PUBLICO, 'index.html'), 'utf8'),
    readFile(resolve(PUBLICO, 'estilos.css'), 'utf8'),
    readFile(resolve(PUBLICO, 'logo-pulso.svg'), 'utf8'),
    readFile(resolve(PUBLICO, 'fuentes/inter-latin-variable.woff2')),
    empaquetar(),
    leerDatosBandeja({ archivoCorrida: ARCHIVO_CORRIDA }),
    leerEnvSiExiste(),
  ]);
  const pagina = armarHtml({ html, css, js, logoSvg, fuenteWoff2, datos });
  revisarQueNoTengaClave(pagina, textoEnv);
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, pagina, 'utf8');
  const { size } = await stat(destino);
  return { ruta: destino, bytes: size };
};

const principal = async () => {
  try {
    const { salida } = leerArgumentos(process.argv.slice(2));
    const { ruta, bytes } = await generarCopiaDeDiseno({ salida });
    process.stdout.write(
      `Copia de diseño lista (${Math.round(bytes / 1024)} KB): ${ruta}\n` +
        'Ábrela con doble clic. Funciona sin servidor y sin internet.\n',
    );
  } catch (error) {
    process.stderr.write(`No se pudo generar la copia de diseño: ${error.message}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await principal();
}
