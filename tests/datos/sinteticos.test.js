import { readFileSync } from 'node:fs';
import {
  ALERTA_PERSONA_MAYOR,
  ALERTAS_IA,
  MOTIVOS_POR_PRESTADOR,
  PRIORIDADES,
  TIPOS_PRESTADOR,
} from '../../src/schemas/catalogos.js';
import { validarReferencia } from '../../src/schemas/referencia.schema.js';
import { validarSolicitud } from '../../src/schemas/solicitud.schema.js';

const leerJson = (nombre) =>
  JSON.parse(readFileSync(new URL(`../../data/sinteticos/${nombre}`, import.meta.url), 'utf8'));

const solicitudes = leerJson('solicitudes.json');
const referencias = leerJson('referencia.json');
const referenciaPorId = new Map(
  referencias.map((referencia) => [referencia.id_solicitud, referencia]),
);

const contar = (lista, condicion) => lista.filter(condicion).length;
const tieneAlertaIa = (referencia) =>
  referencia.alertas.some((alerta) => ALERTAS_IA.includes(alerta));

describe('datos sintéticos: estructura', () => {
  test('hay 60 solicitudes con identificadores SINT-0001 a SINT-0060', () => {
    const esperados = Array.from(
      { length: 60 },
      (_, i) => `SINT-${String(i + 1).padStart(4, '0')}`,
    );
    expect(solicitudes.map((solicitud) => solicitud.id_solicitud)).toEqual(esperados);
  });

  test('cada solicitud cumple el esquema de entrada y no trae campos de más', () => {
    for (const solicitud of solicitudes) {
      const resultado = validarSolicitud(solicitud);
      expect({ id: solicitud.id_solicitud, ...resultado }).toEqual({
        id: solicitud.id_solicitud,
        exito: true,
        datos: solicitud,
      });
    }
  });

  test('ninguna solicitud trae especificidad_consulta (sus valores siguen pendientes)', () => {
    expect(contar(solicitudes, (solicitud) => 'especificidad_consulta' in solicitud)).toBe(0);
  });

  test('cada referencia cumple su esquema y no trae alertas repetidas', () => {
    for (const referencia of referencias) {
      const resultado = validarReferencia(referencia);
      expect({ id: referencia.id_solicitud, ...resultado }).toEqual({
        id: referencia.id_solicitud,
        exito: true,
        datos: referencia,
      });
    }
  });

  test('cada solicitud tiene exactamente una referencia, y al revés', () => {
    expect(referenciaPorId.size).toBe(referencias.length);
    expect([...referenciaPorId.keys()].sort()).toEqual(
      solicitudes.map((solicitud) => solicitud.id_solicitud).sort(),
    );
  });

  test('el tipo de profesional es uno de los 10 y el motivo es de su lista o "Otros"', () => {
    for (const solicitud of solicitudes) {
      expect(TIPOS_PRESTADOR).toContain(solicitud.tipo_profesional);
      const motivosPermitidos = [...MOTIVOS_POR_PRESTADOR[solicitud.tipo_profesional], 'Otros'];
      expect(motivosPermitidos).toContain(solicitud.motivo);
    }
  });

  test('las fechas están entre el 9 y el 22 de noviembre de 2026, de 8:00 a 22:00', () => {
    for (const { fecha_ingreso: fecha } of solicitudes) {
      expect(fecha >= '2026-11-09T08:00:00' && fecha <= '2026-11-22T22:00:00').toBe(true);
      const hora = Number(fecha.slice(11, 13));
      expect(hora >= 8 && hora < 22).toBe(true);
    }
  });
});

describe('datos sintéticos: mínimos acordados', () => {
  test.each(PRIORIDADES)('hay al menos 15 solicitudes con prioridad %s', (prioridad) => {
    expect(
      contar(referencias, (referencia) => referencia.prioridad === prioridad),
    ).toBeGreaterThanOrEqual(15);
  });

  test.each([...ALERTAS_IA, ALERTA_PERSONA_MAYOR])(
    'hay al menos 5 casos con la alerta %s',
    (alerta) => {
      expect(
        contar(referencias, (referencia) => referencia.alertas.includes(alerta)),
      ).toBeGreaterThanOrEqual(5);
    },
  );

  test('hay al menos 20 casos sin ninguna alerta que decida la IA', () => {
    expect(contar(referencias, (referencia) => !tieneAlertaIa(referencia))).toBeGreaterThanOrEqual(
      20,
    );
  });

  test('hay al menos 10 casos "Otros" con urgencia escondida (prioridad alta)', () => {
    const casos = solicitudes.filter((solicitud) => {
      const referencia = referenciaPorId.get(solicitud.id_solicitud);
      return (
        solicitud.motivo === 'Otros' &&
        referencia.alertas.includes('urgencia') &&
        referencia.prioridad === 'alta'
      );
    });
    expect(casos.length).toBeGreaterThanOrEqual(10);
  });

  test('cerca de un 30% de las solicitudes tiene motivo "Otros" (entre 25% y 35%)', () => {
    const proporcion =
      contar(solicitudes, (solicitud) => solicitud.motivo === 'Otros') / solicitudes.length;
    expect(proporcion).toBeGreaterThanOrEqual(0.25);
    expect(proporcion).toBeLessThanOrEqual(0.35);
  });

  test('hay al menos 8 casos donde la referencia sugiere otro profesional', () => {
    const casos = contar(
      solicitudes,
      (solicitud) =>
        referenciaPorId.get(solicitud.id_solicitud).profesional !== solicitud.tipo_profesional,
    );
    expect(casos).toBeGreaterThanOrEqual(8);
  });

  test('48 solicitudes traen edad y 12 no (80% y 20%)', () => {
    expect(contar(solicitudes, (solicitud) => 'edad' in solicitud)).toBe(48);
  });

  test('entre 15 y 20 solicitudes tienen 60 años o más', () => {
    const mayores = contar(solicitudes, (solicitud) => solicitud.edad >= 60);
    expect(mayores).toBeGreaterThanOrEqual(15);
    expect(mayores).toBeLessThanOrEqual(20);
  });

  test('la alerta de 60 años o más está exactamente en las solicitudes con edad 60 o más', () => {
    for (const solicitud of solicitudes) {
      const tieneAlerta = referenciaPorId
        .get(solicitud.id_solicitud)
        .alertas.includes(ALERTA_PERSONA_MAYOR);
      expect({ id: solicitud.id_solicitud, tieneAlerta }).toEqual({
        id: solicitud.id_solicitud,
        tieneAlerta: solicitud.edad >= 60,
      });
    }
  });
});

describe('datos sintéticos: sin datos personales (regla R1)', () => {
  const textos = [
    ...solicitudes.flatMap((solicitud) => Object.values(solicitud).map(String)),
    ...referencias.map((referencia) => referencia.nota),
  ];

  test.each([
    ['RUT', /\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]\b/],
    ['teléfono', /(\+?56[\s-]?)?\b9[\s-]?\d{4}[\s-]?\d{4}\b/],
    ['correo electrónico', /[^\s@]+@[^\s@]+\.[^\s@]+/],
  ])('ningún texto tiene algo parecido a un %s', (_tipo, patron) => {
    expect(textos.filter((texto) => patron.test(texto))).toEqual([]);
  });

  test.each(['Melipilla', 'Boris Soler', 'Rayén', 'El Gueta'])(
    'ningún texto menciona "%s" (sin distinguir mayúsculas)',
    (palabra) => {
      const buscada = palabra.toLocaleLowerCase('es');
      expect(textos.filter((texto) => texto.toLocaleLowerCase('es').includes(buscada))).toEqual([]);
    },
  );
});
