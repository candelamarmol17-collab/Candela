import request from 'supertest';
import { crearApp } from '../../src/app.js';
import { leerDatosBandeja } from '../../src/repositories/bandeja.repository.js';
import { crearDemoBandeja } from '../../src/services/demo-bandeja.service.js';

// Usa las 60 solicitudes sintéticas y la corrida de MiniMax del proyecto.
let app;
beforeEach(async () => {
  const { solicitudes, corrida } = await leerDatosBandeja({
    archivoCorrida: 'data/resultados/clasificaciones-minimaxai-minimax-m3.1-flash.json',
  });
  app = crearApp({ demo: crearDemoBandeja({ solicitudes, corrida }) });
});

describe('GET /api/bandeja', () => {
  test('devuelve la bandeja con 59 solicitudes (SINT-0009 entra con el ingreso simulado)', async () => {
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

describe('POST /api/bandeja/simular-ingreso', () => {
  test('responde 201 y SINT-0009 entra al grupo de urgencia; la segunda vez responde 400', async () => {
    const primera = await request(app).post('/api/bandeja/simular-ingreso');
    expect(primera.status).toBe(201);
    const sint9 = primera.body.datos.ordenadas.find(
      (e) => e.solicitud.id_solicitud === 'SINT-0009',
    );
    expect(sint9.grupo).toBe('urgencia');
    const segunda = await request(app).post('/api/bandeja/simular-ingreso');
    expect(segunda.status).toBe(400);
    expect(segunda.body).toEqual({
      ok: false,
      error: { mensaje: 'No hay más solicitudes por ingresar. Usa "Reiniciar demo".' },
    });
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

  test('reiniciar vuelve al comienzo', async () => {
    await request(app).post('/api/bandeja/simular-ingreso');
    const respuesta = await request(app).post('/api/bandeja/reiniciar');
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.ordenadas).toHaveLength(59);
  });

  test('una dirección de la API que no existe responde 404 en JSON', async () => {
    const respuesta = await request(app).get('/api/otra-cosa');
    expect(respuesta.status).toBe(404);
    expect(respuesta.body.ok).toBe(false);
  });
});
