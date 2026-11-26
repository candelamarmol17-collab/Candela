import request from 'supertest';
import { crearApp } from '../../src/app.js';
import { leerDatosBandeja } from '../../src/repositories/bandeja.repository.js';
import { crearDemoBandeja } from '../../src/services/demo-bandeja.service.js';

// Usa las 60 solicitudes sintéticas y la corrida de MiniMax del proyecto.
let app;
let appVacia;
beforeEach(async () => {
  const datos = await leerDatosBandeja({
    archivoCorrida: 'data/resultados/clasificaciones-minimaxai-minimax-m3.1-flash.json',
  });
  appVacia = crearApp({ demo: crearDemoBandeja(datos) });
  // La mayoría de las pruebas parte con la primera exportación ya cargada.
  const demo = crearDemoBandeja(datos);
  demo.cargarExportacion();
  app = crearApp({ demo });
});

describe('GET /api/bandeja', () => {
  test('al comienzo la bandeja está vacía', async () => {
    const respuesta = await request(appVacia).get('/api/bandeja');
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.ordenadas).toEqual([]);
    expect(respuesta.body.datos.resumen.total).toBe(0);
    expect(respuesta.body.datos.exportaciones.siguiente).toEqual({
      numero: 1,
      nombre: 'Exportación de demostración 1',
      solicitudes_nuevas: 59,
    });
  });

  test('con la primera exportación trae 59 solicitudes (SINT-0009 llega en la segunda)', async () => {
    const respuesta = await request(app).get('/api/bandeja');
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.ok).toBe(true);
    const { datos } = respuesta.body;
    expect(datos.ordenadas).toHaveLength(59);
    expect(datos.resumen.total).toBe(59);
    expect(datos.datos.etiqueta).toBe(
      'Resultados reales de MiniMax M3.1 Flash (corrida del 26 nov. 2026), reproducidos desde archivo',
    );
    expect(datos.datos.texto_franja).toBe('Resultados de MiniMax reproducidos desde archivo');
    expect(datos.datos.nombre_corto).toBe('MiniMax');
    expect(datos.ordenadas.map((e) => e.solicitud.id_solicitud)).not.toContain('SINT-0009');
  });
});

describe('POST /api/bandeja/cargar-exportacion', () => {
  test('carga las dos exportaciones de demostración en orden; la tercera vez responde 400', async () => {
    const primera = await request(appVacia).post('/api/bandeja/cargar-exportacion');
    expect(primera.status).toBe(200);
    expect(primera.body.datos.ordenadas).toHaveLength(59);

    const segunda = await request(appVacia).post('/api/bandeja/cargar-exportacion');
    expect(segunda.status).toBe(200);
    const sint9 = segunda.body.datos.ordenadas.find(
      (e) => e.solicitud.id_solicitud === 'SINT-0009',
    );
    expect(sint9.grupo).toBe('urgencia');
    expect(segunda.body.datos.ultima_cambiada).toBe('SINT-0009');

    const tercera = await request(appVacia).post('/api/bandeja/cargar-exportacion');
    expect(tercera.status).toBe(400);
    expect(tercera.body).toEqual({
      ok: false,
      error: { mensaje: 'No hay más exportaciones de demostración. Usa "Reiniciar demo".' },
    });
  });

  // Regla R1: no se recibe ningún archivo ni dato de afuera.
  test.each([
    ['un JSON', (p) => p.send({ archivo: 'solicitudes.csv' })],
    ['un archivo', (p) => p.attach('archivo', Buffer.from('id;texto\nX;hola'), 'externo.csv')],
    ['texto', (p) => p.set('Content-Type', 'text/plain').send('SINT-0001;hola')],
  ])('rechaza %s y no carga nada', async (_caso, agregar) => {
    const respuesta = await agregar(request(appVacia).post('/api/bandeja/cargar-exportacion'));
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.mensaje).toMatch(/regla R1/);
    const estado = await request(appVacia).get('/api/bandeja');
    expect(estado.body.datos.exportaciones.cargadas).toBe(0);
  });

  test('la dirección antigua de "simular ingreso" ya no existe', async () => {
    expect((await request(app).post('/api/bandeja/simular-ingreso')).status).toBe(404);
  });
});

describe('POST /api/bandeja/:id/confirmar', () => {
  test('confirma una solicitud', async () => {
    const respuesta = await request(app).post('/api/bandeja/SINT-0001/confirmar');
    expect(respuesta.status).toBe(200);
    const sint1 = respuesta.body.datos.ordenadas.find(
      (e) => e.solicitud.id_solicitud === 'SINT-0001',
    );
    expect(sint1.revision.estado).toBe('confirmada');
  });

  test.each([
    ['un número con formato malo', 'abc', 400],
    ['un número que no existe', 'SINT-9999', 404],
  ])('responde error con %s', async (_caso, id, codigo) => {
    const respuesta = await request(app).post(`/api/bandeja/${id}/confirmar`);
    expect(respuesta.status).toBe(codigo);
    expect(respuesta.body.ok).toBe(false);
  });
});

describe('POST /api/bandeja/:id/corregir', () => {
  const valida = {
    prioridad: 'alta',
    profesional: 'Psicología',
    alertas: ['violencia'],
    motivo: 'x',
  };

  test('guarda la corrección y la solicitud sube', async () => {
    const respuesta = await request(app).post('/api/bandeja/SINT-0060/corregir').send(valida);
    expect(respuesta.status).toBe(200);
    const sint60 = respuesta.body.datos.ordenadas.find(
      (e) => e.solicitud.id_solicitud === 'SINT-0060',
    );
    expect(sint60).toMatchObject({ fuente: 'triajista', grupo: 'otra_alerta_critica' });
  });

  test.each([
    ['cuerpo vacío', {}],
    ['prioridad no permitida', { ...valida, prioridad: 'urgente' }],
    ['alertas que no son lista', { ...valida, alertas: 'violencia' }],
    ['persona mayor marcada a mano', { ...valida, alertas: ['persona_mayor_60'] }],
    ['motivo muy largo', { ...valida, motivo: 'a'.repeat(301) }],
    ['un campo de más', { ...valida, rut: '1-9' }],
    ['tipos incorrectos', { ...valida, prioridad: 3, motivo: 5 }],
  ])('responde 400 con %s', async (_caso, cuerpo) => {
    const respuesta = await request(app).post('/api/bandeja/SINT-0001/corregir').send(cuerpo);
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.ok).toBe(false);
    expect(respuesta.body.error.mensaje).toBe('La corrección no es válida.');
    expect(respuesta.body.error.detalles.length).toBeGreaterThan(0);
  });

  test('responde 400 si el JSON está mal escrito', async () => {
    const respuesta = await request(app)
      .post('/api/bandeja/SINT-0001/corregir')
      .set('Content-Type', 'application/json')
      .send('{ esto no es json');
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.mensaje).toBe('El cuerpo de la petición no es JSON válido.');
  });
});

describe('deshacer, reiniciar y direcciones que no existen', () => {
  test('deshacer sin acciones responde 400; después de confirmar, deshace', async () => {
    expect((await request(app).post('/api/bandeja/deshacer')).status).toBe(400);
    await request(app).post('/api/bandeja/SINT-0001/confirmar');
    const respuesta = await request(app).post('/api/bandeja/deshacer');
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.se_puede_deshacer).toBe(false);
  });

  test('reiniciar vuelve a la bandeja vacía', async () => {
    await request(app).post('/api/bandeja/cargar-exportacion');
    const respuesta = await request(app).post('/api/bandeja/reiniciar');
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.ordenadas).toEqual([]);
    expect(respuesta.body.datos.exportaciones.cargadas).toBe(0);
  });

  test('una dirección de la API que no existe responde 404 en JSON', async () => {
    const respuesta = await request(app).get('/api/otra-cosa');
    expect(respuesta.status).toBe(404);
    expect(respuesta.body.ok).toBe(false);
  });
});
