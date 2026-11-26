import { crearApp } from './app.js';
import { cargarArchivoEnv } from './config/ia.js';
import { leerConfiguracionApp } from './config/app.js';
import { leerDatosDemo } from './repositories/bandeja.repository.js';
import { codigoFijoDemo } from './services/exportacion-demo.service.js';
import { crearDemoBandeja } from './services/demo-bandeja.service.js';
import { describirDatosBandeja } from './services/bandeja.service.js';

/**
 * Enciende la aplicación: npm run iniciar (en Windows: npm.cmd run iniciar).
 * Lee la corrida indicada en BANDEJA_ARCHIVO_CORRIDA (por defecto, la de MiniMax).
 */
const iniciar = async () => {
  try {
    cargarArchivoEnv();
    const configuracion = leerConfiguracionApp();
    const { exportaciones, corrida } = await leerDatosDemo({
      archivoCorrida: configuracion.archivoCorrida,
    });
    const demo = crearDemoBandeja({ exportaciones, corrida, codigoFijo: codigoFijoDemo });
    const servidor = crearApp({ demo }).listen(configuracion.puerto, () => {
      process.stdout.write(`${describirDatosBandeja(corrida).etiqueta}\n`);
      process.stdout.write(
        `Pulso está encendido. Abre en el navegador: http://localhost:${configuracion.puerto}\n`,
      );
      process.stdout.write('Para apagarlo, presiona Ctrl + C.\n');
    });
    servidor.on('error', (error) => {
      const mensaje =
        error.code === 'EADDRINUSE'
          ? `El puerto ${configuracion.puerto} ya está en uso. ¿Pulso ya está encendido en otra terminal?`
          : error.message;
      process.stderr.write(`No se pudo encender Pulso: ${mensaje}\n`);
      process.exitCode = 1;
    });
  } catch (error) {
    process.stderr.write(`No se pudo encender Pulso: ${error.message}\n`);
    process.exitCode = 1;
  }
};

await iniciar();
