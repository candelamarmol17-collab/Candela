import { readFile } from 'node:fs/promises';
import { leerDatosBandeja } from '../../src/repositories/bandeja.repository.js';
import {
  armarBandeja,
  armarBandejaDesdeCorrida,
  GRUPOS,
} from '../../src/services/bandeja.service.js';

/**
 * Pruebas con los datos sintéticos del proyecto (no con datos inventados para la prueba).
 * Si alguien cambia la referencia o la corrida del video sin querer, estas pruebas fallan.
 */

const contarGrupos = (ordenadas) =>
  ordenadas.reduce((conteo, elemento) => {
    conteo[elemento.grupo] = (conteo[elemento.grupo] ?? 0) + 1;
    return conteo;
  }, {});

const leerJson = async (ruta) => JSON.parse(await readFile(ruta, 'utf8'));

describe('bandeja con la clasificación de referencia (revisión pedida por Candela)', () => {
  test('quedan 16 con urgencia, 5 con otra alerta crítica y 39 sin alerta crítica', async () => {
    const solicitudes = await leerJson('data/sinteticos/solicitudes.json');
    const referencia = await leerJson('data/sinteticos/referencia.json');
    // La referencia se usa como si fuera la respuesta de la IA, solo para esta prueba.
    const resultados = referencia.map((caso) => ({
      id_solicitud: caso.id_solicitud,
      estado: 'clasificada',
      origen: 'referencia',
      clasificacion: {
        id_solicitud: caso.id_solicitud,
        prioridad_sugerida: caso.prioridad,
        profesional_sugerido: caso.profesional,
        alertas: caso.alertas,
        justificacion: 'Clasificación de referencia (prueba).',
        confianza: 'alta',
      },
    }));

    const bandeja = armarBandeja(solicitudes, resultados);

    expect(bandeja.no_clasificadas).toEqual([]);
    expect(contarGrupos(bandeja.ordenadas)).toEqual({
      [GRUPOS.urgencia]: 16,
      [GRUPOS.otraAlertaCritica]: 5,
      [GRUPOS.sinAlertaCritica]: 39,
    });
    // SINT-0008 (cambiada en la tarea 004) tiene ideación suicida, pero no urgencia.
    const sint0008 = bandeja.ordenadas.find((e) => e.solicitud.id_solicitud === 'SINT-0008');
    expect(sint0008.grupo).toBe(GRUPOS.otraAlertaCritica);
  });
});

describe('bandeja del video: corrida de MiniMax reproducida desde archivo', () => {
  test('las 60 quedan clasificadas, con la etiqueta de sus datos', async () => {
    const { solicitudes, corrida } = await leerDatosBandeja({
      archivoCorrida: 'data/resultados/clasificaciones-minimaxai-minimax-m3.1-flash.json',
    });
    const bandeja = armarBandejaDesdeCorrida(solicitudes, corrida);

    expect(bandeja.datos.etiqueta).toBe(
      'Clasificación de MiniMax M3.1 Flash (corrida del 26 nov. 2026)',
    );
    expect(bandeja.ordenadas).toHaveLength(60);
    expect(bandeja.no_clasificadas).toEqual([]);
    expect(bandeja.resultados_sin_solicitud).toEqual([]);
    expect(contarGrupos(bandeja.ordenadas)).toEqual({
      [GRUPOS.urgencia]: 14,
      [GRUPOS.otraAlertaCritica]: 7,
      [GRUPOS.sinAlertaCritica]: 39,
    });
    expect(new Set(bandeja.ordenadas.map((e) => e.origen))).toEqual(new Set(['modelo_real']));
  });
});
