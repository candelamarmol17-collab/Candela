import {
  armarBandeja,
  armarBandejaDesdeCorrida,
  describirDatosBandeja,
  fechaCorta,
  FUENTES,
  GRUPOS,
  grupoSegunAlertas,
  MOTIVOS_BANDEJA,
} from '../../src/services/bandeja.service.js';

// Datos sintéticos (inventados). Nunca usar datos reales.
const solicitud = (id, fecha = '2026-11-10T09:00:00', cambios = {}) => ({
  id_solicitud: id,
  fecha_ingreso: fecha,
  tipo_profesional: 'Medicina',
  motivo: 'Otros',
  texto_libre: 'texto inventado',
  ...cambios,
});

const clasificacion = (id, prioridad = 'media', alertas = []) => ({
  id_solicitud: id,
  prioridad_sugerida: prioridad,
  profesional_sugerido: 'Medicina',
  alertas,
  justificacion: 'Justificación inventada.',
  confianza: 'alta',
});

const resultado = (id, prioridad, alertas, origen = 'modelo_real') => ({
  id_solicitud: id,
  estado: 'clasificada',
  origen,
  clasificacion: clasificacion(id, prioridad, alertas),
});

const ids = (lista) => lista.map((elemento) => elemento.solicitud.id_solicitud);

describe('grupoSegunAlertas', () => {
  test.each([
    [['urgencia', 'violencia'], GRUPOS.urgencia],
    [['violencia'], GRUPOS.otraAlertaCritica],
    [['ideacion_suicida'], GRUPOS.otraAlertaCritica],
    [['descompensacion', 'ges'], GRUPOS.otraAlertaCritica],
    [['ges', 'persona_mayor_60'], GRUPOS.sinAlertaCritica],
    [[], GRUPOS.sinAlertaCritica],
  ])('las alertas %p van al grupo %s', (alertas, grupo) => {
    expect(grupoSegunAlertas(alertas)).toBe(grupo);
  });
});

describe('armarBandeja: orden de las clasificadas', () => {
  test('primero urgencia, después otra alerta crítica, después el resto, aunque la prioridad sea menor', () => {
    const bandeja = armarBandeja(
      [solicitud('SINT-A'), solicitud('SINT-B'), solicitud('SINT-C')],
      [
        resultado('SINT-A', 'alta', ['ges']),
        resultado('SINT-B', 'media', ['violencia']),
        resultado('SINT-C', 'baja', ['urgencia']),
      ],
    );
    expect(ids(bandeja.ordenadas)).toEqual(['SINT-C', 'SINT-B', 'SINT-A']);
  });

  test('todas las alertas críticas que no son urgencia pesan igual: decide la prioridad', () => {
    const bandeja = armarBandeja(
      [solicitud('SINT-A'), solicitud('SINT-B'), solicitud('SINT-C')],
      [
        resultado('SINT-A', 'baja', ['violencia']),
        resultado('SINT-B', 'alta', ['descompensacion']),
        resultado('SINT-C', 'media', ['ideacion_suicida']),
      ],
    );
    expect(ids(bandeja.ordenadas)).toEqual(['SINT-B', 'SINT-C', 'SINT-A']);
  });

  test('dentro del grupo: prioridad alta, media, baja', () => {
    const bandeja = armarBandeja(
      [solicitud('SINT-A'), solicitud('SINT-B'), solicitud('SINT-C')],
      [
        resultado('SINT-A', 'baja', []),
        resultado('SINT-B', 'alta', []),
        resultado('SINT-C', 'media', []),
      ],
    );
    expect(ids(bandeja.ordenadas)).toEqual(['SINT-B', 'SINT-C', 'SINT-A']);
  });

  test('con la misma prioridad, la más antigua primero', () => {
    const bandeja = armarBandeja(
      [
        solicitud('SINT-A', '2026-11-12T08:00:00'),
        solicitud('SINT-B', '2026-11-10T21:30:00'),
        solicitud('SINT-C', '2026-11-10T08:15:00'),
      ],
      [
        resultado('SINT-A', 'media', []),
        resultado('SINT-B', 'media', []),
        resultado('SINT-C', 'media', []),
      ],
    );
    expect(ids(bandeja.ordenadas)).toEqual(['SINT-C', 'SINT-B', 'SINT-A']);
  });

  test('empate total: por número de solicitud', () => {
    const bandeja = armarBandeja(
      [solicitud('SINT-0002'), solicitud('SINT-0001')],
      [resultado('SINT-0002', 'alta', []), resultado('SINT-0001', 'alta', [])],
    );
    expect(ids(bandeja.ordenadas)).toEqual(['SINT-0001', 'SINT-0002']);
  });

  test('las alertas no críticas no cambian el orden', () => {
    const bandeja = armarBandeja(
      [solicitud('SINT-A', '2026-11-11T08:00:00'), solicitud('SINT-B', '2026-11-10T08:00:00')],
      [resultado('SINT-A', 'media', ['ges', 'persona_mayor_60']), resultado('SINT-B', 'media', [])],
    );
    expect(ids(bandeja.ordenadas)).toEqual(['SINT-B', 'SINT-A']);
  });

  test('cada elemento trae la clasificación, su fuente, su origen y su grupo', () => {
    const bandeja = armarBandeja(
      [solicitud('SINT-A')],
      [resultado('SINT-A', 'alta', ['urgencia'], 'repeticion')],
    );
    expect(bandeja.ordenadas[0]).toEqual({
      solicitud: solicitud('SINT-A'),
      estado: 'clasificada',
      clasificacion: clasificacion('SINT-A', 'alta', ['urgencia']),
      fuente: FUENTES.ia,
      origen: 'repeticion',
      grupo: GRUPOS.urgencia,
    });
  });

  test('no cambia el orden de las listas que recibe', () => {
    const solicitudes = [solicitud('SINT-B'), solicitud('SINT-A')];
    armarBandeja(solicitudes, [resultado('SINT-A', 'alta', []), resultado('SINT-B', 'baja', [])]);
    expect(solicitudes.map((s) => s.id_solicitud)).toEqual(['SINT-B', 'SINT-A']);
  });
});

describe('armarBandeja: no clasificadas', () => {
  test('van aparte, la más antigua primero, con su motivo y origen', () => {
    const bandeja = armarBandeja(
      [
        solicitud('SINT-A', '2026-11-12T08:00:00'),
        solicitud('SINT-B', '2026-11-10T08:00:00'),
        solicitud('SINT-C', '2026-11-11T08:00:00'),
      ],
      [
        {
          id_solicitud: 'SINT-A',
          estado: 'no_clasificada',
          origen: 'modelo_real',
          motivo: 'json_invalido',
        },
        resultado('SINT-C', 'alta', []),
      ],
    );
    expect(ids(bandeja.ordenadas)).toEqual(['SINT-C']);
    expect(bandeja.no_clasificadas).toEqual([
      {
        solicitud: solicitud('SINT-B', '2026-11-10T08:00:00'),
        estado: 'no_clasificada',
        motivo: MOTIVOS_BANDEJA.sinResultado,
        origen: null,
      },
      {
        solicitud: solicitud('SINT-A', '2026-11-12T08:00:00'),
        estado: 'no_clasificada',
        motivo: 'json_invalido',
        origen: 'modelo_real',
      },
    ]);
  });

  test('un resultado "clasificada" que no cumple el esquema no se usa para ordenar', () => {
    const malo = resultado('SINT-A', 'urgente', []);
    const bandeja = armarBandeja([solicitud('SINT-A')], [malo]);
    expect(bandeja.ordenadas).toEqual([]);
    expect(bandeja.no_clasificadas[0].motivo).toBe(MOTIVOS_BANDEJA.resultadoInvalido);
  });

  test('una solicitud que no cumple el esquema de entrada queda no clasificada', () => {
    const bandeja = armarBandeja(
      [solicitud('SINT-A', '2026-11-10T08:00:00', { texto_libre: '' })],
      [resultado('SINT-A', 'alta', ['urgencia'])],
    );
    expect(bandeja.ordenadas).toEqual([]);
    expect(bandeja.no_clasificadas[0].motivo).toBe(MOTIVOS_BANDEJA.solicitudInvalida);
  });
});

describe('armarBandeja: correcciones del triajista', () => {
  test('la corrección cambia el orden y queda marcada como del triajista', () => {
    const bandeja = armarBandeja(
      [solicitud('SINT-A'), solicitud('SINT-B')],
      [resultado('SINT-A', 'alta', []), resultado('SINT-B', 'baja', [])],
      {
        correcciones: [
          { id_solicitud: 'SINT-B', clasificacion: clasificacion('SINT-B', 'baja', ['urgencia']) },
        ],
      },
    );
    expect(ids(bandeja.ordenadas)).toEqual(['SINT-B', 'SINT-A']);
    expect(bandeja.ordenadas[0].fuente).toBe(FUENTES.triajista);
    expect(bandeja.ordenadas[1].fuente).toBe(FUENTES.ia);
  });

  test('una solicitud no clasificada por la IA entra a la bandeja si el triajista la clasifica', () => {
    const bandeja = armarBandeja([solicitud('SINT-A')], [], {
      correcciones: [{ id_solicitud: 'SINT-A', clasificacion: clasificacion('SINT-A', 'media') }],
    });
    expect(ids(bandeja.ordenadas)).toEqual(['SINT-A']);
    expect(bandeja.no_clasificadas).toEqual([]);
  });

  test('una corrección que no cumple el esquema se ignora y vale la de la IA', () => {
    const bandeja = armarBandeja([solicitud('SINT-A')], [resultado('SINT-A', 'alta', [])], {
      correcciones: [{ id_solicitud: 'SINT-A', clasificacion: { prioridad_sugerida: 'x' } }],
    });
    expect(bandeja.ordenadas[0].fuente).toBe(FUENTES.ia);
  });
});

describe('armarBandeja: casos borde', () => {
  test('listas vacías dan una bandeja vacía', () => {
    expect(armarBandeja([], [])).toEqual({
      ordenadas: [],
      no_clasificadas: [],
      resultados_sin_solicitud: [],
    });
  });

  test('informa los resultados de solicitudes que no existen, sin perderlos', () => {
    const bandeja = armarBandeja(
      [solicitud('SINT-A')],
      [resultado('SINT-A', 'alta', []), resultado('SINT-Z', 'alta', [])],
    );
    expect(bandeja.resultados_sin_solicitud).toEqual(['SINT-Z']);
  });

  test.each([
    ['solicitudes', [solicitud('SINT-A'), solicitud('SINT-A')], []],
    [
      'resultados',
      [solicitud('SINT-A')],
      [resultado('SINT-A', 'alta', []), resultado('SINT-A', 'baja', [])],
    ],
  ])('rechaza %s con id repetido', (nombre, solicitudes, resultados) => {
    expect(() => armarBandeja(solicitudes, resultados)).toThrow(`Hay dos ${nombre}`);
  });
});

describe('fechaCorta', () => {
  test('muestra la fecha en español y en hora de Chile', () => {
    // 01:42 del 26 en Chile = 04:42 del 26 en UTC.
    expect(fechaCorta('2026-11-26T04:42:50.445Z')).toBe('26 nov. 2026');
    // 23:30 del 25 en Chile = 02:30 del 26 en UTC: se muestra el 25.
    expect(fechaCorta('2026-11-26T02:30:00Z')).toBe('25 nov. 2026');
  });

  test.each([[undefined], [null], [''], ['no es fecha'], [42]])(
    'devuelve null si la fecha no sirve: %p',
    (valor) => {
      expect(fechaCorta(valor)).toBeNull();
    },
  );
});

describe('describirDatosBandeja', () => {
  test('una corrida real dice el modelo, la fecha y que se reproduce desde archivo', () => {
    expect(
      describirDatosBandeja({
        origen: 'modelo_real',
        modelo: 'minimaxai/minimax-m3.1-flash',
        generado_en: '2026-11-26T04:42:50.445Z',
      }),
    ).toEqual({
      origen: 'modelo_real',
      modelo: 'minimaxai/minimax-m3.1-flash',
      nombre_modelo: 'MiniMax M3.1 Flash',
      fecha_corrida: '2026-11-26T04:42:50.445Z',
      reproducido_desde_archivo: true,
      etiqueta:
        'Resultados reales de MiniMax M3.1 Flash (corrida del 26 nov. 2026), reproducidos desde archivo',
    });
  });

  test('un modelo sin nombre para mostrar usa su id, y una fecha mala no inventa una', () => {
    expect(
      describirDatosBandeja({ origen: 'modelo_real', modelo: 'otro/modelo', generado_en: 'x' })
        .etiqueta,
    ).toBe(
      'Resultados reales de otro/modelo (fecha de la corrida desconocida), reproducidos desde archivo',
    );
  });

  test('una corrida simulada dice claramente que es simulada', () => {
    expect(describirDatosBandeja({ origen: 'simulado_reglas' }).etiqueta).toMatch(
      /^Resultados SIMULADOS por reglas fijas/,
    );
  });

  test.each([[{ origen: 'repeticion' }], [{}], [null]])('rechaza %p', (corrida) => {
    expect(() => describirDatosBandeja(corrida)).toThrow('corrida original');
  });
});

describe('armarBandejaDesdeCorrida', () => {
  test('junta la descripción de los datos con la bandeja ordenada', () => {
    const bandeja = armarBandejaDesdeCorrida([solicitud('SINT-A')], {
      origen: 'modelo_real',
      modelo: 'minimaxai/minimax-m3.1-flash',
      generado_en: '2026-11-26T04:42:50.445Z',
      resultados: [resultado('SINT-A', 'alta', [])],
    });
    expect(bandeja.datos.reproducido_desde_archivo).toBe(true);
    expect(ids(bandeja.ordenadas)).toEqual(['SINT-A']);
  });
});
