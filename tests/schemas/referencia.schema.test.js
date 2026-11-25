import { validarReferencia } from '../../src/schemas/referencia.schema.js';

// Datos sintéticos (inventados). Nunca usar datos reales.
const referenciaValida = () => ({
  id_solicitud: 'SINT-0001',
  prioridad: 'alta',
  profesional: 'Medicina',
  alertas: ['urgencia'],
  nota: 'Dolor de pecho que se extiende al brazo: señal de urgencia.',
});

const camposConError = (resultado) => resultado.errores.map((error) => error.campo);

describe('validarReferencia: casos válidos', () => {
  test('acepta una referencia correcta', () => {
    expect(validarReferencia(referenciaValida())).toEqual({
      exito: true,
      datos: referenciaValida(),
    });
  });

  test('acepta una lista de alertas vacía', () => {
    expect(validarReferencia({ ...referenciaValida(), alertas: [] }).exito).toBe(true);
  });

  test('elimina las alertas repetidas, igual que la salida de la IA', () => {
    const resultado = validarReferencia({ ...referenciaValida(), alertas: ['ges', 'ges'] });
    expect(resultado.datos.alertas).toEqual(['ges']);
  });
});

describe('validarReferencia: casos rechazados', () => {
  test.each(['id_solicitud', 'prioridad', 'profesional', 'alertas', 'nota'])(
    'rechaza si falta el campo %s',
    (campo) => {
      const datos = referenciaValida();
      delete datos[campo];
      expect(camposConError(validarReferencia(datos))).toEqual([campo]);
    },
  );

  test('rechaza un campo de más (por ejemplo, confianza)', () => {
    const resultado = validarReferencia({ ...referenciaValida(), confianza: 'alta' });
    expect(camposConError(resultado)).toEqual(['confianza']);
  });

  test.each([
    ['prioridad', 'urgente'],
    ['profesional', 'Cardiología'],
    ['alertas', ['alerta_inventada']],
    ['nota', ''],
    ['nota', 'a'.repeat(301)],
  ])('rechaza %s con valor no permitido', (campo, valor) => {
    const resultado = validarReferencia({ ...referenciaValida(), [campo]: valor });
    expect(resultado.exito).toBe(false);
  });

  test.each([undefined, null, 'texto', []])(
    'rechaza una referencia que no es objeto: %p',
    (dato) => {
      expect(validarReferencia(dato).errores[0].campo).toBe('(general)');
    },
  );
});
