import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

/**
 * Aplica los colores de Pulso y el tema claro al diagrama de arquitectura hecho con Archify
 * (tarea 016).
 *
 * Uso: node scripts/colores-arquitectura.js <entrada.html> <salida.html>
 *
 * Archify no permite elegir colores propios ni fijar el tema claro: elige según el sistema.
 * Este script solo agrega una hoja de estilos al final del <head> y hace que, sin preferencia
 * guardada, el diagrama abra en tema claro. No cambia cajas, flechas ni textos.
 */

/** Paleta de Pulso (public/estilos.css): azul petróleo, lavanda para la IA y fondo claro. */
export const ESTILO_PULSO = `<style id="colores-pulso">
  [data-theme="light"] {
    --bg: #f6f7f5;
    --text: #23303a;
    --text-muted: #5f6b74;
    --panel-border: #e1e5e3;
    --arrow: #5f6b74;
    --arrow-emphasis: #1f6f78;
    --arrow-security: #8a5a0b;
    --arrow-dashed: #5b5b9a;
    --frontend-fill: #e6f1f2;
    --frontend-stroke: #1f6f78;
    --reader-accent: #1f6f78;
    --backend-fill: rgba(31, 111, 120, 0.08);
    --backend-stroke: #2a8a95;
    --database-fill: #e7f3ec;
    --database-stroke: #2f6b4f;
    --cloud-fill: #eeeef8;
    --cloud-stroke: #5b5b9a;
    --security-fill: #fcf1dc;
    --security-stroke: #8a5a0b;
    --external-fill: #eef1f4;
    --external-stroke: #5f6b74;
  }
  /* Marcos en azul petróleo (Archify los pinta con el color de "cloud", que aquí es la lavanda de la IA). */
  [data-theme="light"] .c-region {
    fill: rgba(31, 111, 120, 0.03) !important;
    stroke: #1f6f78 !important;
  }
  [data-theme="light"] text[data-boundary-label].t-cloud { fill: #1f6f78 !important; }
  [data-theme="light"] [data-graph-role="structural-frame-label-mask"] { stroke: none !important; }
  [data-theme="light"] .c-security-group { stroke: #5f6b74 !important; }
</style>`;

const PREFERENCIA_DEL_SISTEMA =
  "window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'";

/** Devuelve el HTML con la paleta de Pulso y el tema claro por defecto. */
export const aplicarColoresPulso = (html) => {
  if (!html.includes('</head>')) {
    throw new Error('El archivo no parece un HTML de Archify: no tiene </head>.');
  }
  if (!html.includes(PREFERENCIA_DEL_SISTEMA)) {
    throw new Error('No se encontró cómo Archify elige el tema: revisa la versión de Archify.');
  }
  return html
    .replaceAll(PREFERENCIA_DEL_SISTEMA, "'light'")
    .replace('</head>', `${ESTILO_PULSO}\n</head>`);
};

const ejecutar = async () => {
  const [entrada, salida] = process.argv.slice(2);
  try {
    if (!entrada || !salida) {
      throw new Error('Uso: node scripts/colores-arquitectura.js <entrada.html> <salida.html>');
    }
    await writeFile(salida, aplicarColoresPulso(await readFile(entrada, 'utf8')), 'utf8');
    process.stdout.write(`Listo: ${salida}\n`);
  } catch (error) {
    process.stderr.write(`No se pudieron aplicar los colores: ${error.message}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await ejecutar();
}
