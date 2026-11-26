import { readFile } from 'node:fs/promises';
import { ENCABEZADO_EXPORTACION } from '../../src/schemas/exportacion-telesalud.js';
import {
  crearTablaDeCodigos,
  ErrorExportacion,
  MARCAS,
  normalizarFecha,
  seudonimizarExportacion,
  taparDatosPersonales,
} from '../../src/services/seudonimizacion.service.js';

// Todos los datos son inventados. Los RUT, teléfonos y correos de estas pruebas no son de nadie.

describe('taparDatosPersonales', () => {
  test.each([
    ['mi rut es 12.345.678-5 por si acaso', `mi rut es ${MARCAS.rut} por si acaso`],
    ['rut 12345678-5', `rut ${MARCAS.rut}`],
    ['RUT 9.876.543-K.', `RUT ${MARCAS.rut}.`],
    ['llamar al +56 9 1234 5678', `llamar al ${MARCAS.telefono}`],
    ['fono 912345678 o 22 123 4567', `fono ${MARCAS.telefono} o ${MARCAS.telefono}`],
    ['cel: 9-1234-5678', `cel: ${MARCAS.telefono}`],
    ['escribir a nombre.apellido@correo.cl gracias', `escribir a ${MARCAS.correo} gracias`],
  ])('tapa "%s"', (texto, esperado) => {
    expect(taparDatosPersonales(texto).texto).toBe(esperado);
  });

  test('cuenta lo que tapó', () => {
    const { tapados } = taparDatosPersonales(
      'rut 12.345.678-5, fono +56912345678, mail demo@example.com',
    );
    expect(tapados).toEqual({ rut: 1, telefono: 1, correo: 1 });
  });

  test.each([
    'fiebre de 39,5 desde ayer',
    'presión 190/115 y dolor de cabeza',
    'tengo 30 semanas de embarazo',
    'glicemia de 450 en la mañana',
    'la hora era a las 10:30 del 12-11-2026',
    'mi guagua de 8 meses',
    'glicemias de 250 300 280 esta semana',
  ])('no toca números que no son datos personales: "%s"', (texto) => {
    expect(taparDatosPersonales(texto)).toEqual({
      texto,
      tapados: { rut: 0, telefono: 0, correo: 0 },
    });
  });

  test('no cambia ninguno de los 60 textos sintéticos (así coinciden con la corrida guardada)', async () => {
    const solicitudes = JSON.parse(await readFile('data/sinteticos/solicitudes.json', 'utf8'));
    for (const { texto_libre: texto } of solicitudes) {
      expect(taparDatosPersonales(texto).texto).toBe(texto);
    }
  });

  test('acepta texto vacío o nulo', () => {
    expect(taparDatosPersonales(null).texto).toBe('');
  });
});

describe('crearTablaDeCodigos', () => {
  test('la misma llave recibe siempre el mismo código; las nuevas, el siguiente número', () => {
    const tabla = crearTablaDeCodigos({ prefijo: 'PUL' });
    expect(tabla.codigoPara('A-1')).toBe('PUL-0001');
    expect(tabla.codigoPara('B-2')).toBe('PUL-0002');
    expect(tabla.codigoPara('A-1')).toBe('PUL-0001');
    expect(tabla.cantidad()).toBe(2);
  });

  test('usa los códigos ya conocidos cuando los hay', () => {
    const tabla = crearTablaDeCodigos({
      codigoFijo: (llave) => (llave === 'X' ? 'SINT-0009' : null),
    });
    expect(tabla.codigoPara('X')).toBe('SINT-0009');
    expect(tabla.codigoPara('Y')).toBe('PUL-0001');
  });
});

describe('normalizarFecha', () => {
  test.each([
    ['2026-11-17 12:15', '2026-11-17T12:15:00'],
    ['2026-11-17 12:15:30', '2026-11-17T12:15:30'],
    ['2026-11-17T12:15:00', '2026-11-17T12:15:00'],
    ['17-11-2026 12:15', null],
    ['', null],
  ])('%p → %p', (texto, esperado) => {
    expect(normalizarFecha(texto)).toBe(esperado);
  });
});

/** Fila de 48 columnas con los valores indicados por nombre de columna (la primera aparición). */
const fila = (valores) =>
  ENCABEZADO_EXPORTACION.map((nombre, indice) =>
    indice === 47 ? (valores.AV ?? '') : (valores[nombre] ?? ''),
  );

const filaCompleta = (cambios = {}) =>
  fila({
    ID: 'DEMO-ID-0001',
    Cesfam: 'CESFAM Demo',
    'Código seguimiento': 'DEMO-SEG-0001',
    'Información adicional': 'me duele la muela, mi fono es +56 9 1234 5678',
    'Fecha solicitud': '2026-11-17 12:15',
    Nombre: 'Vecina Demo 01',
    'Apellido paterno': 'Demo',
    'Nº identificador': 'DEMO-0001',
    Edad: '67',
    Email: 'demo01@example.com',
    Telefono: '+56 9 0000 0001',
    Dirección: 'Calle Ficticia 101',
    'Tipo prestador': 'Dental',
    'Motivo consulta': 'Otros',
    'Nota cierre': 'nota de un funcionario',
    AV: 'contenido pendiente',
    ...cambios,
  });

describe('seudonimizarExportacion', () => {
  test('deja solo lo que Pulso usa, con código interno y el texto tapado', () => {
    const { solicitudes, resumen } = seudonimizarExportacion(
      [ENCABEZADO_EXPORTACION, filaCompleta()],
      crearTablaDeCodigos(),
    );
    expect(solicitudes).toEqual([
      {
        id_solicitud: 'PUL-0001',
        fecha_ingreso: '2026-11-17T12:15:00',
        tipo_profesional: 'Dental',
        motivo: 'Otros',
        texto_libre: `me duele la muela, mi fono es ${MARCAS.telefono}`,
        edad: 67,
      },
    ]);
    expect(resumen).toEqual({
      filas: 1,
      columnas_personales_separadas: 12,
      datos_tapados_en_texto: 1,
    });
  });

  test('ningún dato personal, de funcionarios ni la segunda "Información adicional" pasa', () => {
    const { solicitudes } = seudonimizarExportacion(
      [ENCABEZADO_EXPORTACION, filaCompleta()],
      crearTablaDeCodigos(),
    );
    const texto = JSON.stringify(solicitudes);
    for (const prohibido of [
      'DEMO-ID',
      'DEMO-SEG',
      'Vecina',
      'DEMO-0001',
      'example.com',
      '0000 0001',
      'Ficticia',
      'CESFAM',
      'nota de un funcionario',
      'contenido pendiente',
    ]) {
      expect(texto).not.toContain(prohibido);
    }
  });

  test('sin edad, la solicitud no la trae; con especificidad, la conserva', () => {
    const { solicitudes } = seudonimizarExportacion(
      [ENCABEZADO_EXPORTACION, filaCompleta({ Edad: '', Especificidad: 'Control' })],
      crearTablaDeCodigos(),
    );
    expect(solicitudes[0]).not.toHaveProperty('edad');
    expect(solicitudes[0].especificidad_consulta).toBe('Control');
  });

  test.each([
    ['vacía', [], /vacía/],
    ['con otro encabezado', [['ID', 'Nombre']], /formato de Telesalud/],
    ['con una fila corta', [ENCABEZADO_EXPORTACION, ['DEMO-ID-0001']], /fila 2 tiene 1 columnas/],
    ['sin ID', [ENCABEZADO_EXPORTACION, filaCompleta({ ID: ' ' })], /fila 2 no tiene ID/],
    [
      'con una edad que no es número',
      [ENCABEZADO_EXPORTACION, filaCompleta({ Edad: 'sesenta' })],
      /fila 2 no es válida/,
    ],
    [
      'con una fecha mala',
      [ENCABEZADO_EXPORTACION, filaCompleta({ 'Fecha solicitud': 'ayer' })],
      /fila 2 no es válida/,
    ],
    [
      'sin texto',
      [ENCABEZADO_EXPORTACION, filaCompleta({ 'Información adicional': '' })],
      /fila 2 no es válida/,
    ],
  ])('rechaza una exportación %s', (_caso, filas, mensaje) => {
    expect(() => seudonimizarExportacion(filas, crearTablaDeCodigos())).toThrow(ErrorExportacion);
    expect(() => seudonimizarExportacion(filas, crearTablaDeCodigos())).toThrow(mensaje);
  });

  test('los mensajes de error no repiten datos personales', () => {
    try {
      seudonimizarExportacion(
        [ENCABEZADO_EXPORTACION, filaCompleta({ Edad: 'Vecina Demo 01' })],
        crearTablaDeCodigos(),
      );
    } catch (error) {
      expect(error.message).not.toContain('Vecina');
    }
    expect.assertions(1);
  });
});
