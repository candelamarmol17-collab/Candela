import {
  crearAdaptadorRepeticion,
  ORIGEN_REPETICION,
} from '../../src/adaptadores/adaptador-repeticion.js';
import {
  clasificarPorReglas,
  crearAdaptadorSimulado,
  ORIGEN_SIMULADO,
} from '../../src/adaptadores/adaptador-simulado.js';
import { validarClasificacion } from '../../src/schemas/clasificacion.schema.js';

// Datos sintéticos (inventados). Nunca usar datos reales.
const solicitud = (texto_libre) => ({
  id_solicitud: 'SINT-9999',
  tipo_profesional: 'Medicina',
  motivo: 'Otros',
  texto_libre,
});

describe('adaptador simulado', () => {
  test('declara su origen y no tiene modelo', () => {
    const adaptador = crearAdaptadorSimulado();
    expect(adaptador.origen).toBe(ORIGEN_SIMULADO);
    expect(adaptador.modelo).toBeNull();
  });

  test('devuelve un JSON que cumple el esquema de salida', async () => {
    const texto = await crearAdaptadorSimulado().completar([], solicitud('me duele la espalda'));
    expect(validarClasificacion(JSON.parse(texto)).exito).toBe(true);
  });

  test('la justificación dice que es una simulación', () => {
    expect(clasificarPorReglas(solicitud('hola')).justificacion).toContain('SIMULADO');
  });

  test('detecta palabras de alerta sin importar tildes ni mayúsculas', () => {
    const resultado = clasificarPorReglas(
      solicitud('Me DUELE el pecho y se me va al BRAZO IZQUIERDO'),
    );
    expect(resultado.alertas).toContain('urgencia');
    expect(resultado.prioridad_sugerida).toBe('alta');
  });

  test('sin palabras de alerta ni de síntomas, sugiere baja', () => {
    const resultado = clasificarPorReglas(solicitud('necesito un certificado'));
    expect(resultado).toMatchObject({ alertas: [], prioridad_sugerida: 'baja' });
  });

  test('"la pega" (el trabajo) no se confunde con violencia', () => {
    expect(clasificarPorReglas(solicitud('me duele la espalda en la pega')).alertas).not.toContain(
      'violencia',
    );
  });

  test('siempre responde lo mismo para el mismo texto', () => {
    expect(clasificarPorReglas(solicitud('tengo tos'))).toEqual(
      clasificarPorReglas(solicitud('tengo tos')),
    );
  });
});

describe('adaptador de repetición', () => {
  const corrida = {
    origen: 'modelo_real',
    modelo: 'modelo/prueba',
    generado_en: '2026-11-25T12:00:00.000Z',
    resultados: [
      {
        id_solicitud: 'SINT-0001',
        estado: 'clasificada',
        clasificacion: { id_solicitud: 'SINT-0001', alertas: [] },
      },
      {
        id_solicitud: 'SINT-0002',
        estado: 'no_clasificada',
        detalle: 'JSON roto',
        respuesta_cruda: 'no es json',
      },
      { id_solicitud: 'SINT-0003', estado: 'no_clasificada', detalle: 'sin conexión' },
    ],
  };

  test('declara su origen, el modelo y la corrida original', () => {
    const adaptador = crearAdaptadorRepeticion(corrida);
    expect(adaptador.origen).toBe(ORIGEN_REPETICION);
    expect(adaptador.corridaOriginal).toEqual({
      generado_en: '2026-11-25T12:00:00.000Z',
      modelo: 'modelo/prueba',
    });
  });

  test('repite la clasificación guardada', async () => {
    const texto = await crearAdaptadorRepeticion(corrida).completar([], {
      id_solicitud: 'SINT-0001',
    });
    expect(JSON.parse(texto)).toEqual({ id_solicitud: 'SINT-0001', alertas: [] });
  });

  test('repite la respuesta cruda de una no clasificada', async () => {
    await expect(
      crearAdaptadorRepeticion(corrida).completar([], { id_solicitud: 'SINT-0002' }),
    ).resolves.toBe('no es json');
  });

  test('falla si la solicitud quedó no clasificada sin respuesta guardada', async () => {
    await expect(
      crearAdaptadorRepeticion(corrida).completar([], { id_solicitud: 'SINT-0003' }),
    ).rejects.toThrow('sin conexión');
  });

  test('falla si la solicitud no está en la corrida', async () => {
    await expect(
      crearAdaptadorRepeticion(corrida).completar([], { id_solicitud: 'SINT-0099' }),
    ).rejects.toThrow('no tiene la solicitud');
  });

  test('solo acepta corridas del modelo real (no repite una simulación)', () => {
    expect(() => crearAdaptadorRepeticion({ ...corrida, origen: 'simulado_reglas' })).toThrow(
      'modelo real',
    );
  });
});
