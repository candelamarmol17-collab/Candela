import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validarSolicitud } from '../../src/schemas/solicitud.schema.js';
import { validarReferencia } from '../../src/schemas/referencia.schema.js';
import { validarClasificacion } from '../../src/schemas/clasificacion.schema.js';
import {
  nombreArchivoAdicional,
  sumarCasosAdicionales,
} from '../../src/repositories/bandeja.repository.js';
import { leerDatosEvaluacion } from '../../src/repositories/evaluacion.repository.js';

// Caso adicional para el video: SINT-0061 "Rosa" (tarea 015). Datos sintéticos (inventados).
const leer = async (archivo) => JSON.parse(await readFile(archivo, 'utf8'));
const ARCHIVO_ADICIONAL = `data/resultados/${nombreArchivoAdicional('minimaxai/minimax-m3.1-flash')}`;

describe('caso adicional SINT-0061 (Rosa)', () => {
  test('cumple el esquema de las solicitudes, con los datos acordados', async () => {
    const [rosa, ...otros] = await leer('data/sinteticos/casos-adicionales.json');
    expect(otros).toEqual([]);
    expect(validarSolicitud(rosa).exito).toBe(true);
    expect(rosa).toMatchObject({
      id_solicitud: 'SINT-0061',
      fecha_ingreso: '2026-11-22T11:58:00',
      tipo_profesional: 'Medicina',
      motivo: 'Otros',
      edad: 81,
    });
    expect(rosa.texto_libre.length).toBeLessThan(300);
  });

  test('no está entre las 60 sintéticas, y esas siguen siendo 60', async () => {
    const sinteticas = await leer('data/sinteticos/solicitudes.json');
    expect(sinteticas).toHaveLength(60);
    expect(sinteticas.map((s) => s.id_solicitud)).not.toContain('SINT-0061');
  });

  test('su referencia cumple el esquema y deja la urgencia como [PENDIENTE]', async () => {
    const [referencia] = await leer('data/sinteticos/referencia-casos-adicionales.json');
    expect(validarReferencia(referencia).exito).toBe(true);
    expect(referencia).toMatchObject({
      id_solicitud: 'SINT-0061',
      prioridad: 'alta',
      profesional: 'Medicina',
      alertas: ['descompensacion', 'persona_mayor_60'],
    });
    expect(referencia.nota).toMatch(/Urgencia \[PENDIENTE\]/);
    const principal = await leer('data/sinteticos/referencia.json');
    expect(principal).toHaveLength(60);
    expect(principal.map((r) => r.id_solicitud)).not.toContain('SINT-0061');
  });

  test('MiniMax la clasificó y la respuesta guardada cumple el esquema', async () => {
    const corrida = await leer(ARCHIVO_ADICIONAL);
    expect(corrida).toMatchObject({
      origen: 'modelo_real',
      modelo: 'minimaxai/minimax-m3.1-flash',
      version_prompt: '1',
      total: 1,
      clasificadas: 1,
    });
    const [resultado] = corrida.resultados;
    expect(resultado.id_solicitud).toBe('SINT-0061');
    expect(validarClasificacion(resultado.clasificacion).exito).toBe(true);
  });

  test('no entra en la evaluación: la referencia y las corridas evaluadas no la tienen', async () => {
    const datos = await leerDatosEvaluacion();
    expect(datos.referencia.map((r) => r.id_solicitud)).not.toContain('SINT-0061');
    for (const entrada of datos.corridas) {
      expect(entrada.corrida.resultados).toHaveLength(60);
      expect(entrada.corrida.resultados.map((r) => r.id_solicitud)).not.toContain('SINT-0061');
    }
  });
});

describe('sumarCasosAdicionales', () => {
  let carpeta;
  beforeEach(async () => {
    carpeta = await mkdtemp(join(tmpdir(), 'adicionales-'));
  });
  afterEach(async () => {
    await rm(carpeta, { recursive: true, force: true });
  });

  const corrida = (modelo, ids, origen = 'modelo_real') => ({
    origen,
    modelo,
    resultados: ids.map((id) => ({ id_solicitud: id, estado: 'clasificada' })),
  });

  test('suma los casos del mismo modelo, sin repetir y sin cambiar el resto', async () => {
    await writeFile(
      join(carpeta, nombreArchivoAdicional('a/uno')),
      JSON.stringify(corrida('a/uno', ['SINT-0001', 'SINT-0061'])),
    );
    const base = { ...corrida('a/uno', ['SINT-0001']), version_prompt: '1' };
    const suma = await sumarCasosAdicionales(base, carpeta);
    expect(suma.resultados.map((r) => r.id_solicitud)).toEqual(['SINT-0001', 'SINT-0061']);
    expect(suma.version_prompt).toBe('1');
    expect(base.resultados).toHaveLength(1); // la corrida original no se modifica
  });

  test('sin archivo de casos adicionales, la corrida queda igual', async () => {
    const base = corrida('b/dos', ['SINT-0001']);
    expect(await sumarCasosAdicionales(base, carpeta)).toBe(base);
  });

  test('la corrida simulada no suma nada', async () => {
    const base = corrida(null, ['SINT-0001'], 'simulado_reglas');
    expect(await sumarCasosAdicionales(base, carpeta)).toBe(base);
  });

  test('si el archivo es de otro modelo, lo dice', async () => {
    await writeFile(
      join(carpeta, nombreArchivoAdicional('a/uno')),
      JSON.stringify(corrida('otro/modelo', ['SINT-0061'])),
    );
    await expect(sumarCasosAdicionales(corrida('a/uno', []), carpeta)).rejects.toThrow(
      'no son del modelo a/uno',
    );
  });
});
