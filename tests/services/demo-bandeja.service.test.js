import {
  crearDemoBandeja,
  ESTADOS_REVISION,
  TRIAJISTA_DEMO,
} from '../../src/services/demo-bandeja.service.js';

// Datos sintéticos (inventados). Nunca usar datos reales.
const solicitud = (id, fecha, edad = 40) => ({
  id_solicitud: id,
  fecha_ingreso: fecha,
  tipo_profesional: 'Medicina',
  motivo: 'Otros',
  texto_libre: 'texto inventado',
  edad,
});
const clasificada = (id, prioridad, alertas = []) => ({
  id_solicitud: id,
  estado: 'clasificada',
  origen: 'modelo_real',
  clasificacion: {
    id_solicitud: id,
    prioridad_sugerida: prioridad,
    profesional_sugerido: 'Medicina',
    alertas,
    justificacion: 'Justificación inventada.',
    confianza: 'alta',
  },
});

const crearVacia = () =>
  crearDemoBandeja({
    solicitudes: [
      solicitud('SINT-0001', '2026-11-10T08:00:00'),
      solicitud('SINT-0002', '2026-11-11T08:00:00', 70),
      solicitud('SINT-0003', '2026-11-12T08:00:00'),
      solicitud('SINT-0004', '2026-11-13T08:00:00'),
    ],
    corrida: {
      origen: 'modelo_real',
      modelo: 'minimaxai/minimax-m3.1-flash',
      version_prompt: '1',
      generado_en: '2026-11-26T04:42:50.445Z',
      resultados: [
        clasificada('SINT-0001', 'baja'),
        clasificada('SINT-0002', 'media'),
        {
          id_solicitud: 'SINT-0003',
          estado: 'no_clasificada',
          origen: 'modelo_real',
          motivo: 'error_proveedor',
        },
        clasificada('SINT-0004', 'alta', ['urgencia']),
      ],
    },
    idSegundaExportacion: 'SINT-0004',
    ahora: () => new Date('2026-11-26T12:00:00Z'),
  });

/** Demo con la primera exportación ya cargada (así parte la mayoría de las pruebas). */
const crear = () => {
  const demo = crearVacia();
  demo.cargarExportacion();
  return demo;
};

const exportacion = (numero, nuevas) => ({
  numero,
  nombre: `Exportación de demostración ${numero}`,
  solicitudes_nuevas: nuevas,
});

const ids = (lista) => lista.map((e) => e.solicitud.id_solicitud);

describe('crearDemoBandeja', () => {
  test('parte con la bandeja vacía, lista para cargar la primera exportación', () => {
    const estado = crearVacia().estado();
    expect(estado.ordenadas).toEqual([]);
    expect(estado.no_clasificadas).toEqual([]);
    expect(estado.resumen).toEqual({
      total: 0,
      con_alerta_critica: 0,
      prioridad_alta: 0,
      pendientes: 0,
      no_clasificadas: 0,
    });
    expect(estado.exportaciones).toEqual({
      cargadas: 0,
      ultima: null,
      siguiente: exportacion(1, 3),
    });
    expect(estado.ultima_cambiada).toBeNull();
  });

  test('con la bandeja vacía no se puede confirmar ni corregir', () => {
    const demo = crearVacia();
    expect(() => demo.confirmar('SINT-0001')).toThrow('No existe');
    expect(() =>
      demo.corregir('SINT-0001', { prioridad: 'alta', profesional: 'Medicina', alertas: [] }),
    ).toThrow('No existe');
  });

  test('la primera exportación trae todas menos la de la segunda', () => {
    const estado = crear().estado();
    expect(ids(estado.ordenadas)).toEqual(['SINT-0002', 'SINT-0001']);
    expect(ids(estado.no_clasificadas)).toEqual(['SINT-0003']);
    expect(estado.exportaciones).toEqual({
      cargadas: 1,
      ultima: exportacion(1, 3),
      siguiente: exportacion(2, 1),
    });
    expect(estado.ultima_cambiada).toBeNull();
    expect(estado.triajista).toBe(TRIAJISTA_DEMO);
    expect(estado.datos).toMatchObject({ reproducido_desde_archivo: true, version_prompt: '1' });
    expect(estado.resumen).toEqual({
      total: 3,
      con_alerta_critica: 0,
      prioridad_alta: 0,
      pendientes: 3,
      no_clasificadas: 1,
    });
  });

  test('la segunda exportación trae la que faltaba, con su clasificación guardada, y se resalta', () => {
    const demo = crear();
    demo.confirmar('SINT-0001');
    const estado = demo.cargarExportacion();
    expect(ids(estado.ordenadas)[0]).toBe('SINT-0004');
    expect(estado.ultima_cambiada).toBe('SINT-0004');
    expect(estado.exportaciones).toEqual({
      cargadas: 2,
      ultima: exportacion(2, 1),
      siguiente: null,
    });
    expect(estado.resumen.con_alerta_critica).toBe(1);
    // Lo revisado antes se mantiene.
    expect(
      estado.ordenadas.find((e) => e.solicitud.id_solicitud === 'SINT-0001').revision.estado,
    ).toBe('confirmada');
    expect(() => demo.cargarExportacion()).toThrow('No hay más exportaciones');
  });

  test('sin solicitud para la segunda exportación, hay una sola exportación con todas', () => {
    const demo = crearDemoBandeja({
      solicitudes: [solicitud('SINT-0001', '2026-11-10T08:00:00')],
      corrida: { origen: 'modelo_real', modelo: 'x/y', version_prompt: '1', resultados: [] },
      idSegundaExportacion: null,
    });
    expect(demo.estado().exportaciones.siguiente).toEqual(exportacion(1, 1));
    expect(demo.cargarExportacion().exportaciones.siguiente).toBeNull();
    expect(() => demo.cargarExportacion()).toThrow('No hay más exportaciones');
  });

  test('confirmar marca la solicitud y no cambia el orden', () => {
    const estado = crear().confirmar('SINT-0001');
    expect(ids(estado.ordenadas)).toEqual(['SINT-0002', 'SINT-0001']);
    expect(estado.ordenadas[1].revision).toEqual({
      estado: ESTADOS_REVISION.confirmada,
      motivo: null,
      en: new Date('2026-11-26T12:00:00Z'),
    });
    expect(estado.resumen.pendientes).toBe(2);
  });

  test('no se confirma dos veces, ni una no clasificada, ni una que no está', () => {
    const demo = crear();
    demo.confirmar('SINT-0001');
    expect(() => demo.confirmar('SINT-0001')).toThrow('ya fue revisada');
    expect(() => demo.confirmar('SINT-0003')).toThrow('hay que clasificarla');
    expect(() => demo.confirmar('SINT-0004')).toThrow('No existe');
    expect(() => demo.confirmar('SINT-9999')).toThrow('No existe');
  });

  test('corregir cambia el orden, guarda el motivo y mantiene la sugerencia de la IA', () => {
    const estado = crear().corregir('SINT-0001', {
      prioridad: 'alta',
      profesional: 'Psicología',
      alertas: ['violencia'],
      motivo: '  Relata violencia.  ',
    });
    const primera = estado.ordenadas[0];
    expect(primera.solicitud.id_solicitud).toBe('SINT-0001');
    expect(primera.fuente).toBe('triajista');
    expect(primera.clasificacion).toMatchObject({
      prioridad_sugerida: 'alta',
      profesional_sugerido: 'Psicología',
      alertas: ['violencia'],
    });
    expect(primera.sugerencia_ia.prioridad_sugerida).toBe('baja');
    expect(primera.revision).toMatchObject({ estado: 'corregida', motivo: 'Relata violencia.' });
    expect(estado.ultima_cambiada).toBe('SINT-0001');
  });

  test('la alerta de persona mayor sale de la edad, no de la corrección', () => {
    const demo = crear();
    const quitada = demo.corregir('SINT-0002', {
      prioridad: 'media',
      profesional: 'Medicina',
      alertas: [],
    });
    expect(
      quitada.ordenadas.find((e) => e.solicitud.id_solicitud === 'SINT-0002').clasificacion.alertas,
    ).toEqual(['persona_mayor_60']);
    const agregada = demo.corregir('SINT-0001', {
      prioridad: 'media',
      profesional: 'Medicina',
      alertas: ['persona_mayor_60'],
    });
    expect(
      agregada.ordenadas.find((e) => e.solicitud.id_solicitud === 'SINT-0001').clasificacion
        .alertas,
    ).toEqual([]);
  });

  test('el triajista clasifica una no clasificada y pasa a la bandeja', () => {
    const estado = crear().corregir('SINT-0003', {
      prioridad: 'media',
      profesional: 'Medicina',
      alertas: [],
      motivo: null,
    });
    expect(estado.no_clasificadas).toEqual([]);
    expect(ids(estado.ordenadas)).toContain('SINT-0003');
    expect(estado.resumen.no_clasificadas).toBe(0);
  });

  test('deshacer anula la última acción, una por una', () => {
    const demo = crear();
    demo.confirmar('SINT-0001');
    demo.corregir('SINT-0001', { prioridad: 'alta', profesional: 'Medicina', alertas: [] });
    let estado = demo.deshacer();
    const sint1 = () => estado.ordenadas.find((e) => e.solicitud.id_solicitud === 'SINT-0001');
    expect(sint1().revision.estado).toBe('confirmada');
    estado = demo.deshacer();
    expect(sint1().revision.estado).toBe('pendiente');
    expect(estado.se_puede_deshacer).toBe(false);
    expect(() => demo.deshacer()).toThrow('No hay nada que deshacer');
  });

  test('reiniciar vuelve a la bandeja vacía', () => {
    const demo = crear();
    demo.cargarExportacion();
    demo.confirmar('SINT-0001');
    const estado = demo.reiniciar();
    expect(estado).toEqual(crearVacia().estado());
    expect(demo.cargarExportacion().exportaciones.cargadas).toBe(1);
  });
});
