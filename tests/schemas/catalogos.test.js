import {
  ALERTA_PERSONA_MAYOR,
  ALERTAS,
  ALERTAS_IA,
  LARGOS_MAXIMOS,
  MOTIVOS_POR_PRESTADOR,
  NIVELES_CONFIANZA,
  PRIORIDADES,
  TIPOS_PRESTADOR,
} from '../../src/schemas/catalogos.js';

describe('catalogos', () => {
  test('tiene los 10 tipos de prestador del formulario', () => {
    expect(TIPOS_PRESTADOR).toHaveLength(10);
    expect(TIPOS_PRESTADOR).toContain('Técnico en enfermería');
  });

  test('cada tipo de prestador tiene su lista de motivos, y no hay grupos de más', () => {
    expect(Object.keys(MOTIVOS_POR_PRESTADOR).sort()).toEqual([...TIPOS_PRESTADOR].sort());
    for (const motivos of Object.values(MOTIVOS_POR_PRESTADOR)) {
      expect(motivos.length).toBeGreaterThan(0);
    }
  });

  test('los textos se mantienen tal cual del formulario (sin corregir)', () => {
    expect(MOTIVOS_POR_PRESTADOR.Nutrición).toContain('Bajopeso');
    expect(MOTIVOS_POR_PRESTADOR.Kinesiología).toContain(
      'Entrega de ayudas técnicas (bastón, sillas de rueda, andador, etc)',
    );
  });

  test('prioridades y confianza tienen tres niveles', () => {
    expect(PRIORIDADES).toEqual(['alta', 'media', 'baja']);
    expect(NIVELES_CONFIANZA).toEqual(['alta', 'media', 'baja']);
  });

  test('las alertas incluyen la de persona mayor usando su constante', () => {
    expect(ALERTAS).toHaveLength(6);
    expect(ALERTAS).toContain(ALERTA_PERSONA_MAYOR);
  });

  test('los largos máximos son 300 caracteres', () => {
    expect(LARGOS_MAXIMOS).toEqual({
      texto_libre: 300,
      justificacion: 300,
      especificidad_consulta: 300,
      nota_referencia: 300,
    });
  });

  test('las alertas de la IA son todas menos la de persona mayor', () => {
    expect(ALERTAS_IA).toEqual([
      'urgencia',
      'violencia',
      'ideacion_suicida',
      'descompensacion',
      'ges',
    ]);
    expect(ALERTAS_IA).not.toContain(ALERTA_PERSONA_MAYOR);
  });

  test('las listas no se pueden modificar por accidente', () => {
    expect(Object.isFrozen(TIPOS_PRESTADOR)).toBe(true);
    expect(Object.isFrozen(MOTIVOS_POR_PRESTADOR.Medicina)).toBe(true);
  });
});
