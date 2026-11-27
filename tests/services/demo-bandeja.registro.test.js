import {
  ACCIONES_REGISTRO,
  AVISO_REGISTRO,
  crearDemoBandeja,
  TRIAJISTA_DEMO,
} from '../../src/services/demo-bandeja.service.js';
import {
  armarExportacionesDemo,
  codigoFijoDemo,
} from '../../src/services/exportacion-demo.service.js';

// Datos sintéticos (inventados). Nunca usar datos reales.
const TEXTO_SOLICITUD = 'texto inventado de la solicitud';
const solicitud = (id, fecha, edad = 40) => ({
  id_solicitud: id,
  fecha_ingreso: fecha,
  tipo_profesional: 'Medicina',
  motivo: 'Otros',
  texto_libre: TEXTO_SOLICITUD,
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

const SOLICITUDES = [
  solicitud('SINT-0001', '2026-11-10T08:00:00'),
  solicitud('SINT-0002', '2026-11-11T08:00:00', 70),
  solicitud('SINT-0003', '2026-11-12T08:00:00'),
  solicitud('SINT-0004', '2026-11-13T08:00:00'),
];

const crear = ({ origen = 'modelo_real' } = {}) => {
  let minuto = 0;
  const demo = crearDemoBandeja({
    exportaciones: armarExportacionesDemo(SOLICITUDES, 'SINT-0004'),
    codigoFijo: codigoFijoDemo,
    corrida: {
      origen,
      modelo: origen === 'modelo_real' ? 'minimaxai/minimax-m3.1-flash' : null,
      version_prompt: '1',
      generado_en: '2026-11-26T04:42:50.445Z',
      resultados: [
        clasificada('SINT-0001', 'baja'),
        clasificada('SINT-0002', 'media', ['persona_mayor_60']),
        {
          id_solicitud: 'SINT-0003',
          estado: 'no_clasificada',
          origen: 'modelo_real',
          motivo: 'error_proveedor',
        },
        clasificada('SINT-0004', 'alta', ['urgencia']),
      ],
    },
    // Cada llamada al reloj avanza un minuto, para ver el orden de los eventos.
    ahora: () => new Date(Date.UTC(2026, 10, 26, 12, minuto++)),
  });
  return demo;
};

const eventos = (estado) => estado.registro.eventos;

describe('registro de la sesión (tarea 007)', () => {
  test('parte vacío, con el aviso y sin porcentaje', () => {
    const { registro } = crear().estado();
    expect(registro).toEqual({
      aviso: AVISO_REGISTRO,
      resumen: { confirmadas: 0, corregidas: 0, porcentaje_correccion: null },
      eventos: [],
    });
    expect(AVISO_REGISTRO).toBe('Registro de esta sesión de trabajo.');
  });

  test('cargar una exportación deja un evento sin solicitud, con lo que se separó', () => {
    const [evento] = eventos(crear().cargarExportacion());
    expect(evento).toEqual({
      numero: 1,
      hora: '2026-11-26T12:00:00.000Z',
      quien: TRIAJISTA_DEMO,
      accion: ACCIONES_REGISTRO.exportacionCargada,
      id_solicitud: null,
      resultado: '3 solicitudes nuevas',
      ficha: {
        exportacion: 'Exportación de Telesalud 1',
        solicitudes_nuevas: 3,
        columnas_personales_separadas: 12,
        datos_tapados_en_texto: 0,
        modelo: 'MiniMax M3.1 Flash',
        version_prompt: '1',
      },
    });
  });

  test('la segunda exportación dice "1 solicitud nueva"', () => {
    const demo = crear();
    demo.cargarExportacion();
    expect(eventos(demo.cargarExportacion())[0].resultado).toBe('1 solicitud nueva');
  });

  test('confirmar anota la sugerencia aceptada con su ficha', () => {
    const demo = crear();
    demo.cargarExportacion();
    const [evento] = eventos(demo.confirmar('SINT-0002'));
    expect(evento).toMatchObject({
      numero: 2,
      accion: ACCIONES_REGISTRO.confirmada,
      id_solicitud: 'SINT-0002',
      quien: TRIAJISTA_DEMO,
      resultado: 'Sugerencia aceptada',
    });
    const ia = { prioridad: 'media', profesional: 'Medicina', alertas: ['persona_mayor_60'] };
    expect(evento.ficha).toEqual({
      sugerencia_ia: ia,
      decision: ia,
      motivo: null,
      modelo: 'MiniMax M3.1 Flash',
      version_prompt: '1',
    });
  });

  test('corregir anota lo que sugirió la IA, lo que decidió el triajista y el motivo', () => {
    const demo = crear();
    demo.cargarExportacion();
    const [evento] = eventos(
      demo.corregir('SINT-0001', {
        prioridad: 'alta',
        profesional: 'Enfermería',
        alertas: ['urgencia'],
        motivo: '  Motivo de prueba  ',
      }),
    );
    expect(evento).toMatchObject({
      accion: ACCIONES_REGISTRO.corregida,
      id_solicitud: 'SINT-0001',
      resultado: 'Sugerencia corregida',
    });
    expect(evento.ficha).toMatchObject({
      sugerencia_ia: { prioridad: 'baja', profesional: 'Medicina', alertas: [] },
      decision: { prioridad: 'alta', profesional: 'Enfermería', alertas: ['urgencia'] },
      motivo: 'Motivo de prueba',
    });
  });

  test('una no clasificada que se corrige queda como "Clasificada a mano", sin sugerencia', () => {
    const demo = crear();
    demo.cargarExportacion();
    const [evento] = eventos(
      demo.corregir('SINT-0003', { prioridad: 'media', profesional: 'Medicina', alertas: [] }),
    );
    expect(evento.resultado).toBe('Clasificada a mano');
    expect(evento.ficha.sugerencia_ia).toBeNull();
    expect(evento.ficha.motivo).toBeNull();
  });

  test('deshacer agrega un evento (no borra el anterior) y dice qué se anuló', () => {
    const demo = crear();
    demo.cargarExportacion();
    demo.corregir('SINT-0001', { prioridad: 'alta', profesional: 'Medicina', alertas: [] });
    const estado = demo.deshacer();
    expect(eventos(estado).map((e) => e.accion)).toEqual([
      ACCIONES_REGISTRO.deshecha,
      ACCIONES_REGISTRO.corregida,
      ACCIONES_REGISTRO.exportacionCargada,
    ]);
    expect(eventos(estado)[0]).toMatchObject({
      id_solicitud: 'SINT-0001',
      resultado: 'Decisión anulada',
      ficha: { accion_anulada: 'corregida', vuelve_a: 'pendiente' },
    });
  });

  test('los contadores salen del estado actual: deshacer descuenta', () => {
    const demo = crear();
    demo.cargarExportacion();
    demo.confirmar('SINT-0002');
    demo.corregir('SINT-0001', { prioridad: 'alta', profesional: 'Medicina', alertas: [] });
    demo.corregir('SINT-0003', { prioridad: 'baja', profesional: 'Medicina', alertas: [] });
    expect(demo.estado().registro.resumen).toEqual({
      confirmadas: 1,
      corregidas: 2,
      porcentaje_correccion: 67,
    });
    expect(demo.deshacer().registro.resumen).toEqual({
      confirmadas: 1,
      corregidas: 1,
      porcentaje_correccion: 50,
    });
  });

  test('los eventos van del más nuevo al más antiguo y la hora viene del reloj', () => {
    const demo = crear();
    demo.cargarExportacion();
    demo.confirmar('SINT-0002');
    const lista = eventos(demo.estado());
    expect(lista.map((e) => e.numero)).toEqual([2, 1]);
    expect(new Date(lista[0].hora) > new Date(lista[1].hora)).toBe(true);
  });

  test('"Reiniciar bandeja" limpia el registro', () => {
    const demo = crear();
    demo.cargarExportacion();
    demo.confirmar('SINT-0002');
    const { registro } = demo.reiniciar();
    expect(registro.eventos).toEqual([]);
    expect(registro.resumen).toEqual({
      confirmadas: 0,
      corregidas: 0,
      porcentaje_correccion: null,
    });
    // Después de reiniciar, la numeración vuelve a partir.
    expect(eventos(demo.cargarExportacion())[0].numero).toBe(1);
  });

  test('el registro nunca guarda el texto de la solicitud ni datos personales', () => {
    const demo = crear();
    demo.cargarExportacion();
    demo.confirmar('SINT-0002');
    demo.corregir('SINT-0001', { prioridad: 'alta', profesional: 'Medicina', alertas: [] });
    demo.deshacer();
    const texto = JSON.stringify(demo.estado().registro);
    expect(texto).not.toContain(TEXTO_SOLICITUD);
    expect(texto).not.toMatch(
      /texto_libre|justificacion|edad|nombre|rut|telefono|correo|direccion/i,
    );
  });

  test('con la corrida simulada, la ficha dice que no es IA', () => {
    const demo = crear({ origen: 'simulado_reglas' });
    demo.cargarExportacion();
    expect(eventos(demo.confirmar('SINT-0002'))[0].ficha.modelo).toBe(
      'Reglas de respaldo (sin IA)',
    );
  });

  test('una acción que falla no deja evento', () => {
    const demo = crear();
    demo.cargarExportacion();
    expect(() => demo.confirmar('SINT-0003')).toThrow();
    expect(() => demo.confirmar('SINT-0099')).toThrow();
    expect(eventos(demo.estado())).toHaveLength(1);
  });
});
