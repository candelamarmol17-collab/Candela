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

const crear = () =>
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
    idIngresoSimulado: 'SINT-0004',
    ahora: () => new Date('2026-11-26T12:00:00Z'),
  });

const ids = (lista) => lista.map((e) => e.solicitud.id_solicitud);

describe('crearDemoBandeja', () => {
  test('al comienzo deja fuera la solicitud del ingreso simulado', () => {
    const estado = crear().estado();
    expect(ids(estado.ordenadas)).toEqual(['SINT-0002', 'SINT-0001']);
    expect(ids(estado.no_clasificadas)).toEqual(['SINT-0003']);
    expect(estado.ingreso_simulado).toEqual({ disponible: true, id: 'SINT-0004' });
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

  test('simular ingreso hace entrar la solicitud con su clasificación guardada, solo una vez', () => {
    const demo = crear();
    const estado = demo.simularIngreso();
    expect(ids(estado.ordenadas)[0]).toBe('SINT-0004');
    expect(estado.ultima_cambiada).toBe('SINT-0004');
    expect(estado.ingreso_simulado.disponible).toBe(false);
    expect(estado.resumen.con_alerta_critica).toBe(1);
    expect(() => demo.simularIngreso()).toThrow('No hay más solicitudes');
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

  test('reiniciar vuelve al comienzo', () => {
    const demo = crear();
    demo.simularIngreso();
    demo.confirmar('SINT-0001');
    const estado = demo.reiniciar();
    expect(estado).toEqual(crear().estado());
  });
});
