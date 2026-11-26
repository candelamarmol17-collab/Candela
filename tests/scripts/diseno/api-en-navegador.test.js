import request from 'supertest';
import { crearApp } from '../../../src/app.js';
import { leerDatosDemo } from '../../../src/repositories/bandeja.repository.js';
import { codigoFijoDemo } from '../../../src/services/exportacion-demo.service.js';
import { crearDemoBandeja } from '../../../src/services/demo-bandeja.service.js';
import { crearFetchDeDemo } from '../../../scripts/diseno/api-en-navegador.js';

// La copia de diseño debe responder igual que el servidor real: se comparan las dos.
let fetchDeDemo;
let app;
beforeEach(async () => {
  const datos = {
    ...(await leerDatosDemo({ archivoCorrida: 'data/resultados/clasificaciones-minimaxai-minimax-m3.1-flash.json' })),
    codigoFijo: codigoFijoDemo,
  };
  fetchDeDemo = crearFetchDeDemo(crearDemoBandeja(datos));
  app = crearApp({ demo: crearDemoBandeja(datos) });
  // Las dos parten igual: con la primera exportación cargada.
  await fetchDeDemo('/api/bandeja/cargar-exportacion', { method: 'POST' });
  await request(app).post('/api/bandeja/cargar-exportacion');
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
    ['POST', '/api/bandeja/cargar-exportacion', undefined],
    ['POST', '/api/bandeja/cargar-exportacion', { archivo: 'externo.csv' }],
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

  test('carga la segunda exportación una vez; la siguiente responde 400', async () => {
    expect((await pedir('POST', '/api/bandeja/cargar-exportacion')).status).toBe(200);
    expect((await pedir('POST', '/api/bandeja/cargar-exportacion')).status).toBe(400);
  });

  test('no recibe archivos ni datos al cargar (regla R1)', async () => {
    const respuesta = await pedir('POST', '/api/bandeja/reiniciar');
    expect(respuesta.body.datos.exportaciones.cargadas).toBe(0);
    const conArchivo = await pedir('POST', '/api/bandeja/cargar-exportacion', 'id;texto');
    expect(conArchivo.status).toBe(400);
    expect((await pedir('GET', '/api/bandeja')).body.datos.exportaciones.cargadas).toBe(0);
  });
});
