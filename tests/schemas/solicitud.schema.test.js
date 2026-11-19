import { validarSolicitud } from '../../src/schemas/solicitud.schema.js';

// Datos sintéticos (inventados). Nunca usar datos reales.
const solicitudValida = () => ({
  id_solicitud: 'SINT-0001',
  fecha_ingreso: '2026-11-19T10:30:00',
  tipo_profesional: 'Medicina',
  motivo: 'Renovación de receta',
  texto_libre: 'Necesito renovar mi receta de los remedios de la presión.',
});

const camposConError = (resultado) => resultado.errores.map((error) => error.campo);

describe('validarSolicitud: casos válidos', () => {
  test('acepta una solicitud con los campos obligatorios', () => {
    const resultado = validarSolicitud(solicitudValida());
    expect(resultado).toEqual({ exito: true, datos: solicitudValida() });
  });

  test('acepta los campos opcionales cuando vienen', () => {
    const datos = { ...solicitudValida(), edad: 67, especificidad_consulta: 'Hipertensión' };
    expect(validarSolicitud(datos)).toEqual({ exito: true, datos });
  });

  test('acepta un motivo y un tipo de profesional que no están en la lista', () => {
    const datos = { ...solicitudValida(), tipo_profesional: 'Otro prestador', motivo: 'Otros' };
    expect(validarSolicitud(datos).exito).toBe(true);
  });

  test('descarta los campos de más sin error', () => {
    const resultado = validarSolicitud({ ...solicitudValida(), columna_extra: 'x' });
    expect(resultado.exito).toBe(true);
    expect(resultado.datos).not.toHaveProperty('columna_extra');
  });

  test('trata los opcionales vacíos (null) como si no vinieran', () => {
    const resultado = validarSolicitud({
      ...solicitudValida(),
      edad: null,
      especificidad_consulta: null,
    });
    expect(resultado.exito).toBe(true);
    expect(resultado.datos).not.toHaveProperty('edad');
    expect(resultado.datos).not.toHaveProperty('especificidad_consulta');
  });

  test('acepta la fecha sin segundos', () => {
    const datos = { ...solicitudValida(), fecha_ingreso: '2026-11-19T10:30' };
    expect(validarSolicitud(datos).exito).toBe(true);
  });

  test('acepta los bordes: texto de 300 caracteres y edades 0 y 120', () => {
    expect(validarSolicitud({ ...solicitudValida(), texto_libre: 'a'.repeat(300) }).exito).toBe(
      true,
    );
    expect(validarSolicitud({ ...solicitudValida(), edad: 0 }).exito).toBe(true);
    expect(validarSolicitud({ ...solicitudValida(), edad: 120 }).exito).toBe(true);
  });

  test('no modifica los textos (no quita espacios)', () => {
    const datos = { ...solicitudValida(), texto_libre: '  con espacios  ' };
    expect(validarSolicitud(datos).datos.texto_libre).toBe('  con espacios  ');
  });
});

describe('validarSolicitud: casos rechazados', () => {
  test.each([undefined, null, 'texto', 42, []])(
    'rechaza una entrada que no es objeto: %p',
    (dato) => {
      const resultado = validarSolicitud(dato);
      expect(resultado.exito).toBe(false);
      expect(resultado.errores[0].campo).toBe('(general)');
    },
  );

  test.each(['id_solicitud', 'fecha_ingreso', 'tipo_profesional', 'motivo', 'texto_libre'])(
    'rechaza si falta el campo obligatorio %s',
    (campo) => {
      const datos = solicitudValida();
      delete datos[campo];
      const resultado = validarSolicitud(datos);
      expect(resultado.exito).toBe(false);
      expect(resultado.errores).toContainEqual({
        campo,
        mensaje: `El campo "${campo}" es obligatorio.`,
      });
    },
  );

  test.each(['id_solicitud', 'fecha_ingreso', 'tipo_profesional', 'motivo', 'texto_libre'])(
    'rechaza null en el campo obligatorio %s',
    (campo) => {
      const resultado = validarSolicitud({ ...solicitudValida(), [campo]: null });
      expect(camposConError(resultado)).toContain(campo);
    },
  );

  test.each(['', '   ', '\n\t'])(
    'rechaza un texto libre vacío o solo con espacios: %p',
    (texto) => {
      const resultado = validarSolicitud({ ...solicitudValida(), texto_libre: texto });
      expect(resultado.errores).toContainEqual({
        campo: 'texto_libre',
        mensaje: 'El campo "texto_libre" no puede estar vacío.',
      });
    },
  );

  test('rechaza un texto libre de más de 300 caracteres', () => {
    const resultado = validarSolicitud({ ...solicitudValida(), texto_libre: 'a'.repeat(301) });
    expect(resultado.errores).toContainEqual({
      campo: 'texto_libre',
      mensaje: 'El campo "texto_libre" no puede superar los 300 caracteres.',
    });
  });

  test('rechaza un tipo incorrecto en un campo de texto', () => {
    const resultado = validarSolicitud({ ...solicitudValida(), motivo: 123 });
    expect(resultado.errores).toContainEqual({
      campo: 'motivo',
      mensaje: 'El campo "motivo" debe ser texto.',
    });
  });

  test.each([
    ['texto', '67'],
    ['decimal', 67.5],
    ['negativa', -1],
    ['mayor a 120', 121],
    ['infinita', Infinity],
    ['no es número', Number.NaN],
  ])('rechaza una edad %s', (_descripcion, edad) => {
    const resultado = validarSolicitud({ ...solicitudValida(), edad });
    expect(camposConError(resultado)).toEqual(['edad']);
  });

  test.each([
    ['vacía', ''],
    ['solo con espacios', '   '],
    ['de más de 300 caracteres', 'a'.repeat(301)],
    ['con tipo incorrecto', 5],
  ])('rechaza una especificidad_consulta %s', (_descripcion, valor) => {
    const resultado = validarSolicitud({ ...solicitudValida(), especificidad_consulta: valor });
    expect(camposConError(resultado)).toEqual(['especificidad_consulta']);
  });

  test.each([
    ['sin hora', '2026-11-19'],
    ['con zona horaria Z', '2026-11-19T10:30:00Z'],
    ['con zona horaria -03:00', '2026-11-19T10:30:00-03:00'],
    ['con otro formato', '19/11/2026 10:30'],
    ['con un día que no existe', '2026-02-30T10:30:00'],
    ['con una hora que no existe', '2026-11-19T25:00:00'],
    ['con milisegundos', '2026-11-19T10:30:00.000'],
  ])('rechaza una fecha %s', (_descripcion, fecha) => {
    const resultado = validarSolicitud({ ...solicitudValida(), fecha_ingreso: fecha });
    expect(camposConError(resultado)).toEqual(['fecha_ingreso']);
  });

  test('informa todos los errores a la vez', () => {
    const resultado = validarSolicitud({ id_solicitud: '', texto_libre: 'a'.repeat(301) });
    expect(camposConError(resultado).sort()).toEqual(
      ['fecha_ingreso', 'id_solicitud', 'motivo', 'texto_libre', 'tipo_profesional'].sort(),
    );
  });
});
