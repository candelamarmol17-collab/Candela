import { pathToFileURL } from 'node:url';
import {
  cargarArchivoEnv,
  describirConfiguracion,
  leerConfiguracionIa,
  MODOS,
} from '../src/config/ia.js';
import {
  clasificarSolicitud,
  crearAdaptadorSegunConfiguracion,
} from '../src/services/clasificacion.service.js';

/**
 * Prueba rápida de la conexión con el modelo real: manda UNA solicitud sintética.
 *
 * Uso: npm run ia:probar
 */

// Solicitud inventada solo para esta prueba (regla R1: nunca datos reales).
export const SOLICITUD_DE_PRUEBA = Object.freeze({
  id_solicitud: 'SINT-PRUEBA',
  fecha_ingreso: '2026-11-25T10:00:00',
  tipo_profesional: 'Medicina',
  motivo: 'Renovación de receta',
  texto_libre: 'necesito renovar la receta de las pastillas de la presion, me quedan para 5 dias',
  edad: 64,
});

const escribir = (texto) => process.stdout.write(`${texto}\n`);

const ejecutar = async () => {
  try {
    cargarArchivoEnv();
    const configuracion = leerConfiguracionIa();
    escribir(describirConfiguracion(configuracion));

    if (configuracion.modo !== MODOS.real) {
      escribir(
        'No se probó el modelo real: falta IA_API_KEY en el .env o MODO_IA fuerza otro modo.',
      );
      process.exitCode = 1;
      return;
    }

    const adaptador = await crearAdaptadorSegunConfiguracion(configuracion);
    const resultado = await clasificarSolicitud(SOLICITUD_DE_PRUEBA, adaptador);

    if (resultado.estado === 'clasificada') {
      const { prioridad_sugerida, profesional_sugerido, alertas, justificacion, confianza } =
        resultado.clasificacion;
      escribir('Conexión correcta. Respuesta del modelo:');
      escribir(`  Prioridad: ${prioridad_sugerida} · Profesional: ${profesional_sugerido}`);
      escribir(`  Alertas: ${alertas.join(', ') || '(ninguna)'} · Confianza: ${confianza}`);
      escribir(`  Justificación: ${justificacion}`);
    } else {
      escribir(
        `El modelo respondió, pero la solicitud quedó NO CLASIFICADA (${resultado.motivo}).`,
      );
      escribir(`  Detalle: ${resultado.detalle}`);
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`La prueba falló: ${error.message}\n`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await ejecutar();
}
