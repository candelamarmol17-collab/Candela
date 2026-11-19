import { validarClasificacion } from '../../src/schemas/clasificacion.schema.js';
import { TIPOS_PRESTADOR } from '../../src/schemas/catalogos.js';

// Datos sintéticos (inventados). Nunca usar datos reales.
const respuestaValida = () => ({
  id_solicitud: 'SINT-0001',
  prioridad_sugerida: 'media',
  profesional_sugerido: 'Medicina',
  alertas: ['persona_mayor_60'],
  justificacion: 'Pide renovar una receta de uso habitual, sin señales de urgencia.',
  confianza: 'alta',
});

const camposConError = (resultado) => resultado.errores.map((error) => error.campo);

describe('validarClasificacion: casos válidos', () => {
  test('acepta una respuesta correcta', () => {
    expect(validarClasificacion(respuestaValida())).toEqual({
      exito: true,
      datos: respuestaValida(),
    });
  });

  test('acepta una lista de alertas vacía', () => {
    expect(validarClasificacion({ ...respuestaValida(), alertas: [] }).exito).toBe(true);
  });

  test('elimina las alertas repetidas sin rechazar la respuesta', () => {
    const resultado = validarClasificacion({
      ...respuestaValida(),
      alertas: ['urgencia', 'ges', 'urgencia', 'ges'],
    });
    expect(resultado.exito).toBe(true);
    expect(resultado.datos.alertas).toEqual(['urgencia', 'ges']);
  });

  test.each(TIPOS_PRESTADOR)('acepta el profesional "%s"', (profesional) => {
    const resultado = validarClasificacion({
      ...respuestaValida(),
      profesional_sugerido: profesional,
    });
    expect(resultado.exito).toBe(true);
  });

  test('acepta una justificación de 300 caracteres', () => {
    const datos = { ...respuestaValida(), justificacion: 'a'.repeat(300) };
    expect(validarClasificacion(datos).exito).toBe(true);
  });
});

describe('validarClasificacion: casos rechazados', () => {
  test.each([undefined, null, 'texto', 42, []])(
    'rechaza una respuesta que no es objeto: %p',
    (dato) => {
      const resultado = validarClasificacion(dato);
      expect(resultado.exito).toBe(false);
      expect(resultado.errores[0].campo).toBe('(general)');
    },
  );

  test.each([
    'id_solicitud',
    'prioridad_sugerida',
    'profesional_sugerido',
    'alertas',
    'justificacion',
    'confianza',
  ])('rechaza si falta el campo %s', (campo) => {
    const datos = respuestaValida();
    delete datos[campo];
    const resultado = validarClasificacion(datos);
    expect(resultado.exito).toBe(false);
    expect(camposConError(resultado)).toEqual([campo]);
  });

  test('rechaza un campo de más', () => {
    const resultado = validarClasificacion({ ...respuestaValida(), diagnostico: 'algo' });
    expect(resultado).toEqual({
      exito: false,
      errores: [{ campo: 'diagnostico', mensaje: 'El campo "diagnostico" no está permitido.' }],
    });
  });

  test('rechaza una alerta que no está en la lista', () => {
    const resultado = validarClasificacion({
      ...respuestaValida(),
      alertas: ['urgencia', 'alerta_inventada'],
    });
    expect(resultado.exito).toBe(false);
    expect(camposConError(resultado)).toEqual(['alertas.1']);
  });

  test.each([
    ['no es lista', 'urgencia'],
    ['es null', null],
  ])('rechaza alertas que %s', (_descripcion, alertas) => {
    const resultado = validarClasificacion({ ...respuestaValida(), alertas });
    expect(camposConError(resultado)).toEqual(['alertas']);
  });

  test.each([
    ['escrito distinto', 'medicina'],
    ['que no existe', 'Cardiología'],
    ['con tipo incorrecto', 7],
  ])('rechaza un profesional %s', (_descripcion, profesional) => {
    const resultado = validarClasificacion({
      ...respuestaValida(),
      profesional_sugerido: profesional,
    });
    expect(camposConError(resultado)).toEqual(['profesional_sugerido']);
  });

  test.each([
    ['prioridad_sugerida', 'urgente'],
    ['prioridad_sugerida', 'Alta'],
    ['prioridad_sugerida', 1],
    ['confianza', 'muy alta'],
    ['confianza', null],
  ])('rechaza %s con valor %p', (campo, valor) => {
    const resultado = validarClasificacion({ ...respuestaValida(), [campo]: valor });
    expect(camposConError(resultado)).toEqual([campo]);
  });

  test.each([
    ['vacía', ''],
    ['solo con espacios', '   '],
    ['de más de 300 caracteres', 'a'.repeat(301)],
    ['null', null],
  ])('rechaza una justificación %s', (_descripcion, justificacion) => {
    const resultado = validarClasificacion({ ...respuestaValida(), justificacion });
    expect(camposConError(resultado)).toEqual(['justificacion']);
  });

  test('los mensajes están en español e indican los valores permitidos', () => {
    const resultado = validarClasificacion({ ...respuestaValida(), prioridad_sugerida: 'urgente' });
    expect(resultado.errores[0].mensaje).toBe(
      'El campo "prioridad_sugerida" tiene un valor no permitido. Valores permitidos: alta, media, baja.',
    );
  });
});
