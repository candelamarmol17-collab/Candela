import request from 'supertest';
import { crearApp } from '../../src/app.js';
import { crearDemoBandeja } from '../../src/services/demo-bandeja.service.js';

const demo = crearDemoBandeja({
  exportaciones: [],
  corrida: { origen: 'modelo_real', modelo: 'x/y', version_prompt: '1', resultados: [] },
});

describe('GET /api/evaluacion', () => {
  test('devuelve las métricas calculadas', async () => {
    const evaluacion = { aviso: 'aviso', modelos: [], modelos_considerados: [] };
    const respuesta = await request(crearApp({ demo, evaluacion })).get('/api/evaluacion');
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ ok: true, datos: evaluacion });
  });

  test('si no se pudo calcular, responde 500 con el motivo', async () => {
    const respuesta = await request(
      crearApp({ demo, evaluacion: { error: 'No se encontró la clasificación de referencia.' } }),
    ).get('/api/evaluacion');
    expect(respuesta.status).toBe(500);
    expect(respuesta.body).toEqual({
      ok: false,
      error: { mensaje: 'No se encontró la clasificación de referencia.' },
    });
  });

  test('sin evaluación, responde 500', async () => {
    const respuesta = await request(crearApp({ demo })).get('/api/evaluacion');
    expect(respuesta.status).toBe(500);
    expect(respuesta.body.error.mensaje).toBe('La evaluación no está disponible.');
  });

  test('solo acepta GET', async () => {
    const respuesta = await request(crearApp({ demo })).post('/api/evaluacion');
    expect(respuesta.status).toBe(404);
  });
});
