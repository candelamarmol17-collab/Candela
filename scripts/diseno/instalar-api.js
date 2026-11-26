import { crearDemoBandeja } from '../../src/services/demo-bandeja.service.js';
import { codigoFijoDemo } from '../../src/services/exportacion-demo.service.js';
import { crearFetchDeDemo } from './api-en-navegador.js';

/**
 * Corre en el navegador antes que la pantalla (public/app.js): lee los datos que van dentro
 * del archivo HTML y reemplaza fetch por la demo, para que funcione sin servidor.
 */
const datos = JSON.parse(document.getElementById('datos-bandeja').textContent);
window.fetch = crearFetchDeDemo(crearDemoBandeja({ ...datos, codigoFijo: codigoFijoDemo }));
