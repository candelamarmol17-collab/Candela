import { jest } from '@jest/globals';
import {
  aplicarReglaPersonaMayor,
  clasificarEnSerie,
  clasificarSolicitud,
  extraerJson,
  reintentarNoClasificadas,
} from '../../src/services/clasificacion.service.js';
import { VERSION_PROMPT } from '../../src/prompts/clasificacion.js';

// Datos sintéticos (inventados). Nunca usar datos reales.
const solicitud = (cambios = {}) => ({
  id_solicitud: 'SINT-0001',
  fecha_ingreso: '2026-11-19T10:30:00',
  tipo_profesional: 'Medicina',
  motivo: 'Otros',
  texto_libre: 'me duele la cabeza hace 3 dias',
  edad: 40,
  ...cambios,
});

const respuestaModelo = (cambios = {}) => ({
  id_solicitud: 'SINT-0001',
  prioridad_sugerida: 'media',
  profesional_sugerido: 'Medicina',
  alertas: [],
  justificacion: 'Dolor de cabeza de varios días, sin señales de alarma.',
  confianza: 'alta',
  ...cambios,
});

const adaptadorQueResponde = (texto) => ({
  origen: 'modelo_real',
  modelo: 'modelo/prueba',
  completar: jest.fn(async () => texto),
});

describe('clasificarSolicitud', () => {
  test('clasifica una respuesta válida e indica su origen', async () => {
    const resultado = await clasificarSolicitud(
      solicitud(),
      adaptadorQueResponde(JSON.stringify(respuestaModelo())),
    );
    expect(resultado).toEqual({
      id_solicitud: 'SINT-0001',
      estado: 'clasificada',
      origen: 'modelo_real',
      clasificacion: respuestaModelo(),
    });
  });

  test('envía al adaptador el prompt y la solicitud validada', async () => {
    const adaptador = adaptadorQueResponde(JSON.stringify(respuestaModelo()));
    await clasificarSolicitud(solicitud({ columna_extra: 'x' }), adaptador);
    const [mensajes, datos] = adaptador.completar.mock.calls[0];
    expect(mensajes[0].role).toBe('system');
    expect(datos).not.toHaveProperty('columna_extra');
  });

  test('acepta el JSON dentro de un bloque ```json', async () => {
    const texto = `\`\`\`json\n${JSON.stringify(respuestaModelo())}\n\`\`\``;
    const resultado = await clasificarSolicitud(solicitud(), adaptadorQueResponde(texto));
    expect(resultado.estado).toBe('clasificada');
  });

  test.each([
    ['texto antes del JSON', `Aquí va: ${JSON.stringify(respuestaModelo())}`],
    ['JSON roto', '{"id_solicitud": "SINT-0001",'],
    ['respuesta vacía', ''],
  ])(
    'deja no clasificada una respuesta con %s, guardando la respuesta cruda',
    async (_caso, texto) => {
      const resultado = await clasificarSolicitud(solicitud(), adaptadorQueResponde(texto));
      expect(resultado).toMatchObject({
        estado: 'no_clasificada',
        motivo: 'json_invalido',
        respuesta_cruda: texto,
      });
    },
  );

  test.each([
    ['un campo de más', { diagnostico: 'x' }],
    ['una prioridad no permitida', { prioridad_sugerida: 'urgente' }],
    ['un profesional fuera de la lista', { profesional_sugerido: 'Cardiología' }],
    ['una alerta desconocida', { alertas: ['inventada'] }],
  ])('deja no clasificada una respuesta con %s', async (_caso, cambios) => {
    const resultado = await clasificarSolicitud(
      solicitud(),
      adaptadorQueResponde(JSON.stringify(respuestaModelo(cambios))),
    );
    expect(resultado).toMatchObject({ estado: 'no_clasificada', motivo: 'esquema_invalido' });
    expect(resultado).not.toHaveProperty('clasificacion');
  });

  test('deja no clasificada una respuesta para otro id_solicitud', async () => {
    const resultado = await clasificarSolicitud(
      solicitud(),
      adaptadorQueResponde(JSON.stringify(respuestaModelo({ id_solicitud: 'SINT-0002' }))),
    );
    expect(resultado).toMatchObject({ estado: 'no_clasificada', motivo: 'id_distinto' });
  });

  test('deja no clasificada la solicitud si el proveedor falla', async () => {
    const adaptador = {
      origen: 'modelo_real',
      completar: jest.fn(async () => {
        throw new Error('sin conexión');
      }),
    };
    const resultado = await clasificarSolicitud(solicitud(), adaptador);
    expect(resultado).toMatchObject({
      estado: 'no_clasificada',
      motivo: 'error_proveedor',
      detalle: 'sin conexión',
    });
  });

  test('no llama al proveedor si la solicitud es inválida', async () => {
    const adaptador = adaptadorQueResponde('{}');
    const resultado = await clasificarSolicitud(solicitud({ texto_libre: '' }), adaptador);
    expect(resultado).toMatchObject({ estado: 'no_clasificada', motivo: 'solicitud_invalida' });
    expect(adaptador.completar).not.toHaveBeenCalled();
  });

  test('agrega la alerta de persona mayor según la edad, aunque el modelo no la ponga', async () => {
    const resultado = await clasificarSolicitud(
      solicitud({ edad: 72 }),
      adaptadorQueResponde(JSON.stringify(respuestaModelo())),
    );
    expect(resultado.clasificacion.alertas).toEqual(['persona_mayor_60']);
  });

  test('quita la alerta de persona mayor si el modelo la pone sin corresponder', async () => {
    const resultado = await clasificarSolicitud(
      solicitud({ edad: 30 }),
      adaptadorQueResponde(
        JSON.stringify(respuestaModelo({ alertas: ['persona_mayor_60', 'ges'] })),
      ),
    );
    expect(resultado.clasificacion.alertas).toEqual(['ges']);
  });
});

describe('extraerJson y aplicarReglaPersonaMayor', () => {
  test('extraerJson acepta ``` sin la palabra json', () => {
    expect(extraerJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  test.each([
    [59, []],
    [60, ['persona_mayor_60']],
    [undefined, []],
  ])('con edad %p las alertas quedan %p', (edad, esperadas) => {
    expect(aplicarReglaPersonaMayor({ alertas: [] }, edad).alertas).toEqual(esperadas);
  });
});

describe('clasificarEnSerie', () => {
  test('procesa de a una, con pausa entre cada una (no antes de la primera)', async () => {
    const orden = [];
    const adaptador = {
      origen: 'modelo_real',
      modelo: 'modelo/prueba',
      completar: jest.fn(async (_mensajes, datos) => {
        orden.push(`consulta ${datos.id_solicitud}`);
        return JSON.stringify(respuestaModelo({ id_solicitud: datos.id_solicitud }));
      }),
    };
    const esperar = jest.fn(async (ms) => {
      orden.push(`pausa ${ms}`);
    });

    const corrida = await clasificarEnSerie(
      [solicitud(), solicitud({ id_solicitud: 'SINT-0002' })],
      adaptador,
      { pausaMs: 2000, esperar, ahora: () => new Date('2026-11-25T12:00:00Z') },
    );

    expect(orden).toEqual(['consulta SINT-0001', 'pausa 2000', 'consulta SINT-0002']);
    expect(corrida).toMatchObject({
      origen: 'modelo_real',
      modelo: 'modelo/prueba',
      version_prompt: VERSION_PROMPT,
      generado_en: '2026-11-25T12:00:00.000Z',
      total: 2,
      clasificadas: 2,
      no_clasificadas: 0,
    });
    expect(corrida.aviso).toContain('sintéticos');
  });

  test('guarda cuánto tardó cada solicitud y el promedio, sin contar la pausa', async () => {
    const marcas = [0, 1000, 1000, 4000];
    const corrida = await clasificarEnSerie(
      [solicitud(), solicitud({ id_solicitud: 'SINT-0002' })],
      {
        origen: 'modelo_real',
        modelo: 'modelo/prueba',
        completar: async (_mensajes, datos) =>
          JSON.stringify(respuestaModelo({ id_solicitud: datos.id_solicitud })),
      },
      { pausaMs: 2000, esperar: async () => {}, reloj: () => marcas.shift() },
    );
    expect(corrida.resultados.map((r) => r.duracion_ms)).toEqual([1000, 3000]);
    expect(corrida.tiempo_promedio_ms).toBe(2000);
  });

  test('cuenta las no clasificadas', async () => {
    const corrida = await clasificarEnSerie([solicitud()], adaptadorQueResponde('roto'));
    expect(corrida).toMatchObject({ clasificadas: 0, no_clasificadas: 1 });
  });
});

describe('reintentarNoClasificadas', () => {
  const malo = (id, detalle = 'El proveedor no respondió en 120000 ms.') => ({
    id_solicitud: id,
    estado: 'no_clasificada',
    origen: 'modelo_real',
    motivo: 'error_proveedor',
    detalle,
    duracion_ms: 250000,
  });
  const bueno = (id) => ({
    id_solicitud: id,
    estado: 'clasificada',
    origen: 'modelo_real',
    clasificacion: respuestaModelo({ id_solicitud: id }),
    duracion_ms: 40000,
  });
  const corrida = (resultados, cambios = {}) => ({
    aviso: 'aviso',
    origen: 'modelo_real',
    modelo: 'modelo/prueba',
    version_prompt: VERSION_PROMPT,
    generado_en: '2026-11-25T10:00:00.000Z',
    total: resultados.length,
    clasificadas: resultados.filter((r) => r.estado === 'clasificada').length,
    no_clasificadas: resultados.filter((r) => r.estado !== 'clasificada').length,
    tiempo_promedio_ms: 0,
    resultados,
    ...cambios,
  });
  const solicitudes = ['SINT-0001', 'SINT-0002', 'SINT-0003'].map((id) =>
    solicitud({ id_solicitud: id }),
  );
  const adaptadorQueResponde = (fallan = []) => ({
    origen: 'modelo_real',
    modelo: 'modelo/prueba',
    completar: jest.fn(async (_mensajes, datos) => {
      if (fallan.includes(datos.id_solicitud)) {
        throw new Error('El proveedor no respondió en 240000 ms.');
      }
      return JSON.stringify(respuestaModelo({ id_solicitud: datos.id_solicitud }));
    }),
  });
  const opciones = {
    pausaMs: 10000,
    tiempoEsperaMs: 240000,
    esperar: async () => {},
    ahora: () => new Date('2026-11-26T08:00:00Z'),
  };

  test('reintenta solo las no clasificadas, en su lugar, y anota el reintento', async () => {
    const adaptador = adaptadorQueResponde(['SINT-0003']);
    const nueva = await reintentarNoClasificadas(
      corrida([malo('SINT-0001'), bueno('SINT-0002'), malo('SINT-0003')]),
      solicitudes,
      adaptador,
      opciones,
    );

    expect(adaptador.completar).toHaveBeenCalledTimes(2);
    expect(nueva.resultados.map((r) => [r.id_solicitud, r.estado, r.intento])).toEqual([
      ['SINT-0001', 'clasificada', 2],
      ['SINT-0002', 'clasificada', undefined],
      ['SINT-0003', 'no_clasificada', 2],
    ]);
    expect(nueva.resultados[0].intento_anterior).toEqual({
      motivo: 'error_proveedor',
      detalle: 'El proveedor no respondió en 120000 ms.',
      duracion_ms: 250000,
    });
    expect(nueva.resultados[1]).toEqual(bueno('SINT-0002'));
    expect(nueva).toMatchObject({
      generado_en: '2026-11-25T10:00:00.000Z',
      total: 3,
      clasificadas: 2,
      no_clasificadas: 1,
      reintentos: [
        {
          fecha: '2026-11-26T08:00:00.000Z',
          tiempo_espera_ms: 240000,
          pausa_ms: 10000,
          solicitudes: ['SINT-0001', 'SINT-0003'],
          clasificadas: 1,
        },
      ],
    });
  });

  test('un segundo reintento se suma a la lista y cuenta los intentos', async () => {
    const primera = await reintentarNoClasificadas(
      corrida([malo('SINT-0001')]),
      solicitudes,
      adaptadorQueResponde(['SINT-0001']),
      opciones,
    );
    const segunda = await reintentarNoClasificadas(
      primera,
      solicitudes,
      adaptadorQueResponde(),
      opciones,
    );
    expect(segunda.reintentos).toHaveLength(2);
    expect(segunda.resultados[0]).toMatchObject({ estado: 'clasificada', intento: 3 });
  });

  test('no cambia la corrida que recibe', async () => {
    const original = corrida([malo('SINT-0001')]);
    const copia = structuredClone(original);
    await reintentarNoClasificadas(original, solicitudes, adaptadorQueResponde(), opciones);
    expect(original).toEqual(copia);
  });

  test.each([
    ['otro origen', { origen: 'simulado_reglas' }, 'modelo real'],
    ['otro modelo', { modelo: 'otro/modelo' }, 'reintento usaría'],
    ['otra versión del prompt', { version_prompt: 'viejo' }, 'versión viejo del prompt'],
  ])('rechaza una corrida con %s', async (_nombre, cambios, mensaje) => {
    await expect(
      reintentarNoClasificadas(
        corrida([malo('SINT-0001')], cambios),
        solicitudes,
        adaptadorQueResponde(),
        opciones,
      ),
    ).rejects.toThrow(mensaje);
  });

  test('rechaza si falta la solicitud a reintentar', async () => {
    await expect(
      reintentarNoClasificadas(
        corrida([malo('SINT-0099')]),
        solicitudes,
        adaptadorQueResponde(),
        opciones,
      ),
    ).rejects.toThrow('SINT-0099');
  });
});
