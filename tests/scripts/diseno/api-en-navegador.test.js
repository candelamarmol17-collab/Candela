import request from 'supertest';
import { crearApp } from '../../../src/app.js';
import { leerDatosBandeja } from '../../../src/repositories/bandeja.repository.js';
import { crearDemoBandeja } from '../../../src/services/demo-bandeja.service.js';
import { crearFetchDeDemo } from '../../../scripts/diseno/api-en-navegador.js';

// La copia de diseño debe responder igual que el servidor real: se comparan las dos.
let fetchDeDemo;
let app;
beforeEach(async () => {
  const datos = await leerDatosBandeja({
    archivoCorrida: 'data/resultados/clasificaciones-minimaxai-minimax-m3.1-flash.json',
  });
  fetchDeDemo = crearFetchDeDemo(crearDemoBandeja(datos));
  app = crearApp({ demo: crearDemoBandeja(datos) });
});

const comoTexto = (cuerpo) =>
  cuerpo === undefined || typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo);

const pedir = async (metodo, ruta, cuerpo) => {
  const respuesta = await fetchDeDemo(ruta, { method: metodo, body: comoTexto(cuerpo) });
  return { status: respuesta.status, body: await respuesta.json() };
};

const pedirAlServidor = async (metodo, ruta, cuerpo) => {
  const peticion = metodo === 'GET' ? request(app).get(ruta) : request(app).post(ruta);
  if (cuerpo === undefined) return peticion;
  return peticion.set('Content-Type', 'application/json').send(comoTexto(cuerpo));
};

// Las fechas de la revisión dependen del reloj: se comparan sin ellas.
const sinFechas = (cuerpo) =>
  JSON.parse(JSON.stringify(cuerpo, (clave, valor) => (clave === 'en' ? null : valor)));

const correccion = { prioridad: 'baja', profesional: 'Medicina', alertas: [], motivo: 'prueba' };

describe('crearFetchDeDemo responde igual que el servidor', () => {
  test.each([
    ['GET', '/api/bandeja', undefined],
    ['POST', '/api/bandeja/SINT-0001/confirmar', undefined],
    ['POST', '/api/bandeja/SINT-0001/corregir', correccion],
    ['POST', '/api/bandeja/deshacer', undefined],
    ['POST', '/api/bandeja/simular-ingreso', undefined],
    ['POST', '/api/bandeja/reiniciar', undefined],
    ['POST', '/api/bandeja/SINT-9999/confirmar', undefined],
    ['POST', '/api/bandeja/ABC/confirmar', undefined],
    ['POST', '/api/bandeja/SINT-0001/corregir', { prioridad: 'urgente' }],
    ['POST', '/api/bandeja/SINT-0001/corregir', '{mal json'],
    ['GET', '/api/otra-cosa', undefined],
  ])('%s %s', async (metodo, ruta, cuerpo) => {
    const enNavegador = await pedir(metodo, ruta, cuerpo);
    const enServidor = await pedirAlServidor(metodo, ruta, cuerpo);
    expect(enNavegador.status).toBe(enServidor.status);
    expect(sinFechas(enNavegador.body)).toEqual(sinFechas(enServidor.body));
  });

  test('el ingreso simulado responde 201 la primera vez y 400 la segunda', async () => {
    expect((await pedir('POST', '/api/bandeja/simular-ingreso')).status).toBe(201);
    expect((await pedir('POST', '/api/bandeja/simular-ingreso')).status).toBe(400);
  });
});
