import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { leerDatosEvaluacion } from '../src/repositories/evaluacion.repository.js';
import { evaluarModelos, nombreCorto } from '../src/services/evaluacion.service.js';

/**
 * Evalúa las corridas de Mistral y MiniMax contra la clasificación de referencia y guarda
 * data/resultados/evaluacion.json.
 *
 * Uso: npm run evaluar   (en Windows: npm.cmd run evaluar)
 * Solo datos sintéticos. La referencia la definió el equipo, no triajistas.
 */

export const ARCHIVO_SALIDA = fileURLToPath(
  new URL('../data/resultados/evaluacion.json', import.meta.url),
);

const principal = async () => {
  try {
    const evaluacion = evaluarModelos(await leerDatosEvaluacion());
    await writeFile(ARCHIVO_SALIDA, `${JSON.stringify(evaluacion, null, 2)}\n`, 'utf8');
    for (const modelo of evaluacion.modelos) {
      const linea = modelo.error
        ? `${nombreCorto(modelo.modelo)}: ${modelo.error}`
        : `${nombreCorto(modelo.modelo)}: ${modelo.alertas_criticas.no_detectadas} de ${modelo.alertas_criticas.total} solicitudes críticas no detectadas · prioridad ${modelo.prioridad.porcentaje} % · profesional ${modelo.profesional.porcentaje} % · ${modelo.clasificadas} de ${modelo.total} clasificadas`;
      process.stdout.write(`${linea}\n`);
    }
    process.stdout.write(`Guardado en ${ARCHIVO_SALIDA}\n${evaluacion.aviso}\n`);
  } catch (error) {
    process.stderr.write(`No se pudo evaluar: ${error.message}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await principal();
}
