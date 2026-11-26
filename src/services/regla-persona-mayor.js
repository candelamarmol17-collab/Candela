import { ALERTA_PERSONA_MAYOR } from '../schemas/catalogos.js';

/**
 * Regla fija (no la decide la IA): la alerta de persona mayor depende solo de la edad.
 * Está en su propio archivo porque también la usa la copia de la pantalla para diseño,
 * que corre en el navegador y no puede incluir código del servidor.
 */

const EDAD_PERSONA_MAYOR = 60;

export const aplicarReglaPersonaMayor = (clasificacion, edad) => {
  const alertas = clasificacion.alertas.filter((alerta) => alerta !== ALERTA_PERSONA_MAYOR);
  if (typeof edad === 'number' && edad >= EDAD_PERSONA_MAYOR) {
    alertas.push(ALERTA_PERSONA_MAYOR);
  }
  return { ...clasificacion, alertas };
};
