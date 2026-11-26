import {
  armarDiferencias,
  armarModelosConsiderados,
  AVISO_EVALUACION,
  ErrorEvaluacion,
  evaluarCorrida,
  evaluarModelos,
  nombreCorto,
  nombreModelo,
} from '../../src/services/evaluacion.service.js';

// Casos pequeños hechos a mano. Todo es inventado.
const ref = (id, prioridad, profesional, alertas = []) => ({
  id_solicitud: id,
  prioridad,
  profesional,
  alertas,
});

const clasificada = (id, prioridad, profesional, alertas = [], extra = {}) => ({
  id_solicitud: id,
  estado: 'clasificada',
  clasificacion: {
    id_solicitud: id,
    prioridad_sugerida: prioridad,
    profesional_sugerido: profesional,
    alertas,
    justificacion: 'texto inventado',
    confianza: 'alta',
  },
  duracion_ms: 1000,
  ...extra,
});

const noClasificada = (id, motivo, extra = {}) => ({
  id_solicitud: id,
  estado: 'no_clasificada',
  motivo,
  detalle: `detalle de ${motivo}`,
  duracion_ms: 3000,
  ...extra,
});

const REFERENCIA = [
  ref('SINT-0001', 'alta', 'Medicina', ['urgencia', 'violencia']),
  ref('SINT-0002', 'alta', 'Psicología', ['ideacion_suicida']),
  ref('SINT-0003', 'alta', 'Medicina', ['descompensacion']),
  ref('SINT-0004', 'media', 'Dental', ['ges']),
  ref('SINT-0005', 'baja', 'Nutrición', ['persona_mayor_60']),
  ref('SINT-0006', 'media', 'Medicina'),
];

const CORRIDA = {
  modelo: 'mistralai/mistral-large-4-1t-a52b',
  version_prompt: '1',
  resultados: [
    // Marca solo violencia (y la repite): cuenta como detectada, pero faltó la urgencia.
    clasificada('SINT-0001', 'alta', 'Medicina', ['violencia', 'violencia']),
    // Sin clasificar por el proveedor: crítica NO detectada.
    noClasificada('SINT-0002', 'error_proveedor', {
      intento_anterior: { motivo: 'error_proveedor', detalle: 'El proveedor no respondió.' },
    }),
    // Clasificada, pero sin alerta crítica: NO detectada.
    clasificada('SINT-0003', 'media', 'Medicina', ['ges']),
    // Respuesta inválida del modelo.
    noClasificada('SINT-0004', 'esquema_invalido'),
    // "Persona mayor" no se mide, aunque el modelo no la marque.
    clasificada('SINT-0005', 'baja', 'Nutrición', [], {
      intento_anterior: { motivo: 'error_proveedor', detalle: 'HTTP 503' },
      duracion_ms: 5000,
    }),
    // Falsa alerta crítica (urgencia) y otra falsa (GES).
    clasificada('SINT-0006', 'alta', 'Enfermería', ['urgencia', 'ges', 'persona_mayor_60']),
  ],
};

const evaluar = () => evaluarCorrida({ referencia: REFERENCIA, corrida: CORRIDA });

describe('evaluarCorrida', () => {
  test('alertas críticas: detectada si marcó al menos una; sin clasificar cuenta como no detectada', () => {
    const { alertas_criticas: c } = evaluar();
    expect(c.total).toBe(3);
    expect(c.detectadas).toBe(1);
    expect(c.no_detectadas).toBe(2);
    expect(c.porcentaje_detectadas).toBe(33.3);
    expect(c.casos_no_detectados).toEqual([
      {
        id: 'SINT-0002',
        alertas_referencia: ['ideacion_suicida'],
        alertas_modelo: null,
        sin_clasificar: true,
      },
      {
        id: 'SINT-0003',
        alertas_referencia: ['descompensacion'],
        alertas_modelo: ['ges'],
        sin_clasificar: false,
      },
    ]);
  });

  test('el detalle por alerta muestra la urgencia que faltó y no mide "persona mayor"', () => {
    const porAlerta = Object.fromEntries(evaluar().por_alerta.map((a) => [a.alerta, a]));
    expect(Object.keys(porAlerta)).not.toContain('persona_mayor_60');
    expect(porAlerta.urgencia).toMatchObject({
      critica: true,
      referencia: 1,
      detectadas: 0,
      no_detectadas: ['SINT-0001'],
      de_mas: ['SINT-0006'],
    });
    expect(porAlerta.violencia).toMatchObject({ referencia: 1, detectadas: 1, de_mas: [] });
    expect(porAlerta.ges).toMatchObject({
      critica: false,
      referencia: 1,
      detectadas: 0,
      de_mas: ['SINT-0003', 'SINT-0006'],
    });
  });

  test('matriz de prioridad con columna "Sin respuesta" y concordancia sobre el total', () => {
    const { prioridad } = evaluar();
    expect(prioridad.columnas).toEqual(['alta', 'media', 'baja', 'sin_respuesta']);
    expect(prioridad.matriz).toEqual({
      alta: { alta: 1, media: 1, baja: 0, sin_respuesta: 1 },
      media: { alta: 1, media: 0, baja: 0, sin_respuesta: 1 },
      baja: { alta: 0, media: 0, baja: 1, sin_respuesta: 0 },
    });
    expect(prioridad).toMatchObject({ coincidencias: 2, total: 6, porcentaje: 33.3 });
    expect(prioridad.por_nivel).toEqual([
      { prioridad: 'alta', coincidencias: 1, total: 3, porcentaje: 33.3 },
      { prioridad: 'media', coincidencias: 0, total: 2, porcentaje: 0 },
      { prioridad: 'baja', coincidencias: 1, total: 1, porcentaje: 100 },
    ]);
  });

  test('profesional: las no clasificadas cuentan como no coincidentes', () => {
    expect(evaluar().profesional).toEqual({ coincidencias: 3, total: 6, porcentaje: 50 });
  });

  test('falsas alertas separadas en críticas y otras, sin "persona mayor"', () => {
    const { falsas_alertas: f } = evaluar();
    expect(f.criticas).toBe(1);
    expect(f.otras).toBe(2);
    expect(f.casos).toEqual([
      { id: 'SINT-0003', alerta: 'ges', critica: false },
      { id: 'SINT-0006', alerta: 'urgencia', critica: true },
      { id: 'SINT-0006', alerta: 'ges', critica: false },
    ]);
  });

  test('no clasificadas separadas en error del proveedor y respuesta inválida', () => {
    const { no_clasificadas: n } = evaluar();
    expect(n.total).toBe(2);
    expect(n.error_proveedor.map((x) => x.id)).toEqual(['SINT-0002']);
    expect(n.respuesta_invalida.map((x) => x.id)).toEqual(['SINT-0004']);
    expect(n.otra).toEqual([]);
  });

  test('reintentos y tiempo promedio', () => {
    const m = evaluar();
    expect(m.reintentos).toEqual({
      necesitaron_reintento: 2,
      recuperados: 1,
      ids: ['SINT-0002', 'SINT-0005'],
      motivos_primera_pasada: [
        { motivo: 'El proveedor no respondió.', cantidad: 1 },
        { motivo: 'HTTP 503', cantidad: 1 },
      ],
    });
    // (1000 + 3000 + 1000 + 3000 + 5000 + 1000) / 6
    expect(m.tiempo).toEqual({ promedio_ms: 2333, casos: 6 });
    expect(m.clasificadas).toBe(4);
  });

  test('un caso que no aparece en la corrida cuenta como sin respuesta', () => {
    const m = evaluarCorrida({
      referencia: [ref('SINT-0001', 'alta', 'Medicina', ['urgencia'])],
      corrida: { modelo: 'x', resultados: [] },
    });
    expect(m.alertas_criticas.no_detectadas).toBe(1);
    expect(m.no_clasificadas.otra).toEqual([
      { id: 'SINT-0001', detalle: 'No aparece en la corrida.' },
    ]);
    expect(m.tiempo).toEqual({ promedio_ms: null, casos: 0 });
  });

  test.each([
    ['referencia vacía', { referencia: [], corrida: CORRIDA }, /referencia está vacía/],
    ['corrida sin resultados', { referencia: REFERENCIA, corrida: {} }, /"resultados"/],
    [
      'prioridad desconocida',
      { referencia: [ref('SINT-0001', 'urgente', 'Medicina')], corrida: { resultados: [] } },
      /no es alta, media ni baja/,
    ],
  ])('rechaza %s', (_caso, entrada, mensaje) => {
    expect(() => evaluarCorrida(entrada)).toThrow(ErrorEvaluacion);
    expect(() => evaluarCorrida(entrada)).toThrow(mensaje);
  });
});

describe('armarDiferencias', () => {
  test('Crítico: alerta crítica no detectada; Moderado: prioridad distinta; Menor: falsa alerta', () => {
    const diferencias = armarDiferencias(evaluar());
    expect(diferencias.map((d) => [d.nivel, d.id])).toEqual([
      ['critico', 'SINT-0002'],
      ['critico', 'SINT-0003'],
      ['moderado', 'SINT-0004'],
      ['moderado', 'SINT-0006'],
      ['menor', 'SINT-0003'],
      ['menor', 'SINT-0006'],
      ['menor', 'SINT-0006'],
    ]);
    expect(diferencias[0].descripcion).toBe('Riesgo suicida no detectada (quedó sin clasificar)');
    // SINT-0002 y SINT-0003 también tienen otra prioridad, pero ya están como "crítico".
    expect(diferencias[1].descripcion).toBe(
      'Descompensación no detectada (no marcó alerta crítica)',
    );
    expect(diferencias[2].descripcion).toBe('Sin respuesta en vez de prioridad media');
    expect(diferencias[3].descripcion).toBe('Prioridad alta en vez de media');
    expect(diferencias[5].descripcion).toBe('Falsa alerta crítica: Urgencia');
    expect(diferencias[6].descripcion).toBe('Falsa alerta: GES');
  });
});

describe('evaluarModelos', () => {
  test('evalúa varias corridas, dice cuál falta y arma la tabla sin veredicto', () => {
    const resultado = evaluarModelos({
      referencia: REFERENCIA,
      corridas: [
        { corrida: CORRIDA, hallazgosR3: [{ id: 'SINT-0001', comentario: 'nota' }] },
        { modelo: 'minimaxai/minimax-m3.1-flash', error: 'No se encontró la corrida.' },
      ],
      ahora: () => new Date('2026-11-26T12:00:00Z'),
    });
    expect(resultado.aviso).toBe(AVISO_EVALUACION);
    expect(resultado.generado_en).toBe('2026-11-26T12:00:00.000Z');
    expect(resultado.modelos[0].hallazgos_r3).toEqual([{ id: 'SINT-0001', comentario: 'nota' }]);
    expect(resultado.modelos[0].diferencias.length).toBeGreaterThan(0);
    expect(resultado.modelos[1]).toEqual({
      modelo: 'minimaxai/minimax-m3.1-flash',
      error: 'No se encontró la corrida.',
    });
    expect(resultado.modelos_considerados.map((m) => m.modelo)).toEqual([
      'Mistral Large 4',
      'OpenAI',
      'Claude',
      'Gemini',
      'Grok',
    ]);
    const texto = JSON.stringify(resultado).toLowerCase();
    for (const palabra of ['ganador', 'winner', 'aprobado', 'validado', 'mejor modelo']) {
      expect(texto).not.toContain(palabra);
    }
  });

  test('la tabla "Modelos considerados" usa lo medido y deja el resto "Por evaluar"', () => {
    const [medido, ...otros] = armarModelosConsiderados([evaluar()]);
    expect(medido.medido).toBe(
      '4 de 6 clasificadas · 2 alertas críticas no detectadas · 2 necesitaron reintento · 2 s en promedio',
    );
    expect(medido.privacidad).toBe('Por evaluar');
    expect(medido.costo).toBe('Catálogo de prueba gratuito; el piloto necesita un servicio pagado');
    for (const fila of otros) {
      expect([fila.medido, fila.privacidad, fila.costo, fila.alojamiento]).toEqual([
        'Por evaluar',
        'Por evaluar',
        'Por evaluar',
        'Por evaluar',
      ]);
    }
  });

  test('nombres de los modelos', () => {
    expect(nombreCorto('mistralai/mistral-large-4-1t-a52b')).toBe('Mistral');
    expect(nombreCorto('minimaxai/minimax-m3.1-flash')).toBe('MiniMax');
    expect(nombreModelo('mistralai/mistral-large-4-1t-a52b')).toBe('Mistral Large 4');
    expect(nombreModelo('minimaxai/minimax-m3.1-flash')).toBe('MiniMax M3.1 Flash');
    expect(nombreModelo('otro/modelo')).toBe('otro/modelo');
  });
});
