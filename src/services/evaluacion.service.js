import {
  ALERTA_PERSONA_MAYOR,
  ALERTAS_CRITICAS,
  ALERTAS_IA,
  PRIORIDADES,
} from '../schemas/catalogos.js';

/**
 * Evaluación de los modelos (tarea 008): compara cada sugerencia de una corrida guardada con la
 * clasificación de referencia de las 60 solicitudes sintéticas.
 *
 * Solo funciones puras (no lee archivos): así la usan el comando "npm run evaluar", la dirección
 * GET /api/evaluacion y la copia de diseño en el navegador.
 *
 * Importante: la referencia la definió el equipo del proyecto, no triajistas. Estos números
 * muestran el MÉTODO de evaluación, no la calidad clínica real. No hay veredicto: los umbrales
 * para uso real están [PENDIENTE].
 */

/** Aviso fijo de la pantalla (tarea 008; texto acortado en la tarea 018). */
export const AVISO_EVALUACION =
  'Casos de prueba revisados por el equipo. Los criterios se construyeron con el equipo del centro y su validación clínica formal es parte del piloto.';

export const SIN_RESPUESTA = 'sin_respuesta';

/** Por qué una solicitud quedó sin clasificar, agrupado como lo pide la tarea. */
export const CAUSAS_NO_CLASIFICADA = Object.freeze({
  errorProveedor: 'error_proveedor', // el servicio no respondió a tiempo o dio error
  respuestaInvalida: 'respuesta_invalida', // respondió, pero mal (JSON o esquema inválido, otro id)
  otra: 'otra',
});

const MOTIVOS_RESPUESTA_INVALIDA = new Set(['json_invalido', 'esquema_invalido', 'id_distinto']);

const causaDe = (resultado) => {
  if (resultado.motivo === 'error_proveedor') return CAUSAS_NO_CLASIFICADA.errorProveedor;
  if (MOTIVOS_RESPUESTA_INVALIDA.has(resultado.motivo)) {
    return CAUSAS_NO_CLASIFICADA.respuestaInvalida;
  }
  return CAUSAS_NO_CLASIFICADA.otra;
};

/** Error con un mensaje pensado para quien usa el programa. */
export class ErrorEvaluacion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorEvaluacion';
  }
}

const porcentaje = (parte, total) => (total === 0 ? null : Math.round((parte / total) * 1000) / 10);

/** Alertas que mide la evaluación: sin "persona mayor" (la calcula el programa, no la IA). */
const alertasMedidas = (alertas) =>
  [...new Set(alertas ?? [])].filter(
    (alerta) => alerta !== ALERTA_PERSONA_MAYOR && ALERTAS_IA.includes(alerta),
  );

const criticasDe = (alertas) => alertas.filter((alerta) => ALERTAS_CRITICAS.includes(alerta));

/**
 * Junta cada caso de la referencia con su resultado en la corrida.
 * Un caso sin resultado (o no clasificado) queda con `sugerencia: null`.
 */
const emparejar = (referencia, corrida) => {
  if (!Array.isArray(referencia) || referencia.length === 0) {
    throw new ErrorEvaluacion('La clasificación de referencia está vacía.');
  }
  if (!Array.isArray(corrida?.resultados)) {
    throw new ErrorEvaluacion('La corrida no trae la lista "resultados".');
  }
  const porId = new Map(corrida.resultados.map((r) => [r.id_solicitud, r]));
  return referencia.map((ref) => {
    const resultado = porId.get(ref.id_solicitud) ?? null;
    const clasificada = resultado?.estado === 'clasificada' && resultado.clasificacion;
    return {
      id: ref.id_solicitud,
      referencia: { ...ref, alertas: alertasMedidas(ref.alertas) },
      resultado,
      sugerencia: clasificada
        ? { ...resultado.clasificacion, alertas: alertasMedidas(resultado.clasificacion.alertas) }
        : null,
    };
  });
};

/**
 * Métrica principal: solicitudes con alerta crítica en la referencia que el modelo NO detectó.
 * Cuenta como detectada si el modelo marcó al menos una alerta crítica (así sube a los grupos de
 * arriba de la bandeja). Una solicitud crítica sin clasificar cuenta como NO detectada.
 */
const medirCriticas = (casos) => {
  const criticos = casos.filter((c) => criticasDe(c.referencia.alertas).length > 0);
  const noDetectadas = criticos
    .filter((c) => !c.sugerencia || criticasDe(c.sugerencia.alertas).length === 0)
    .map((c) => ({
      id: c.id,
      alertas_referencia: criticasDe(c.referencia.alertas),
      alertas_modelo: c.sugerencia ? c.sugerencia.alertas : null,
      sin_clasificar: !c.sugerencia,
    }));
  const detectadas = criticos.length - noDetectadas.length;
  return {
    total: criticos.length,
    detectadas,
    no_detectadas: noDetectadas.length,
    porcentaje_detectadas: porcentaje(detectadas, criticos.length),
    casos_no_detectados: noDetectadas,
  };
};

/** Detalle por alerta: cuántas tenía la referencia, cuántas marcó el modelo y cuántas de más. */
const medirPorAlerta = (casos) =>
  ALERTAS_IA.map((alerta) => {
    const enReferencia = casos.filter((c) => c.referencia.alertas.includes(alerta));
    const faltaron = enReferencia.filter((c) => !c.sugerencia?.alertas.includes(alerta));
    const deMas = casos.filter(
      (c) => c.sugerencia?.alertas.includes(alerta) && !c.referencia.alertas.includes(alerta),
    );
    return {
      alerta,
      critica: ALERTAS_CRITICAS.includes(alerta),
      referencia: enReferencia.length,
      detectadas: enReferencia.length - faltaron.length,
      no_detectadas: faltaron.map((c) => c.id),
      de_mas: deMas.map((c) => c.id),
    };
  });

/** Concordancia de prioridad y tabla de aciertos (filas: referencia; columnas: modelo). */
const medirPrioridad = (casos) => {
  const columnas = [...PRIORIDADES, SIN_RESPUESTA];
  const matriz = Object.fromEntries(
    PRIORIDADES.map((fila) => [fila, Object.fromEntries(columnas.map((col) => [col, 0]))]),
  );
  let coincidencias = 0;
  const diferencias = [];
  for (const caso of casos) {
    const columna = caso.sugerencia?.prioridad_sugerida ?? SIN_RESPUESTA;
    const fila = caso.referencia.prioridad;
    if (!matriz[fila] || !(columna in matriz[fila])) {
      throw new ErrorEvaluacion(`La prioridad de ${caso.id} no es alta, media ni baja.`);
    }
    matriz[fila][columna] += 1;
    if (columna === fila) coincidencias += 1;
    else
      diferencias.push({ id: caso.id, referencia: fila, modelo: caso.sugerencia ? columna : null });
  }
  // Concordancia por nivel: de los casos con esa prioridad en la referencia, cuántos coinciden.
  const porNivel = PRIORIDADES.map((nivel) => {
    const total = Object.values(matriz[nivel]).reduce((suma, n) => suma + n, 0);
    return {
      prioridad: nivel,
      coincidencias: matriz[nivel][nivel],
      total,
      porcentaje: porcentaje(matriz[nivel][nivel], total),
    };
  });
  return {
    coincidencias,
    total: casos.length,
    porcentaje: porcentaje(coincidencias, casos.length),
    columnas,
    matriz,
    por_nivel: porNivel,
    diferencias,
  };
};

const medirProfesional = (casos) => {
  const coincidencias = casos.filter(
    (c) => c.sugerencia && c.sugerencia.profesional_sugerido === c.referencia.profesional,
  ).length;
  return {
    coincidencias,
    total: casos.length,
    porcentaje: porcentaje(coincidencias, casos.length),
  };
};

/** Alertas marcadas que la referencia no tiene, separadas en críticas y otras. */
const medirFalsasAlertas = (casos) => {
  const casosFalsos = casos.flatMap((c) =>
    (c.sugerencia?.alertas ?? [])
      .filter((alerta) => !c.referencia.alertas.includes(alerta))
      .map((alerta) => ({ id: c.id, alerta, critica: ALERTAS_CRITICAS.includes(alerta) })),
  );
  return {
    criticas: casosFalsos.filter((f) => f.critica).length,
    otras: casosFalsos.filter((f) => !f.critica).length,
    casos: casosFalsos,
  };
};

const medirNoClasificadas = (casos) => {
  const sinClasificar = casos.filter((c) => !c.sugerencia);
  const porCausa = (causa) =>
    sinClasificar
      .filter((c) => (c.resultado ? causaDe(c.resultado) : CAUSAS_NO_CLASIFICADA.otra) === causa)
      .map((c) => ({ id: c.id, detalle: c.resultado?.detalle ?? 'No aparece en la corrida.' }));
  return {
    total: sinClasificar.length,
    porcentaje: porcentaje(sinClasificar.length, casos.length),
    error_proveedor: porCausa(CAUSAS_NO_CLASIFICADA.errorProveedor),
    respuesta_invalida: porCausa(CAUSAS_NO_CLASIFICADA.respuestaInvalida),
    otra: porCausa(CAUSAS_NO_CLASIFICADA.otra),
  };
};

/** Casos que fallaron en la primera pasada y necesitaron reintento, y por qué fallaron. */
const medirReintentos = (casos) => {
  const reintentados = casos.filter((c) => c.resultado?.intento_anterior);
  const motivos = {};
  for (const caso of reintentados) {
    const detalle =
      caso.resultado.intento_anterior.detalle ?? caso.resultado.intento_anterior.motivo;
    motivos[detalle] = (motivos[detalle] ?? 0) + 1;
  }
  return {
    necesitaron_reintento: reintentados.length,
    recuperados: reintentados.filter((c) => c.sugerencia).length,
    ids: reintentados.map((c) => c.id),
    motivos_primera_pasada: Object.entries(motivos).map(([motivo, cantidad]) => ({
      motivo,
      cantidad,
    })),
  };
};

/** Tiempo promedio por solicitud, con la duración guardada del último intento de cada caso. */
const medirTiempo = (casos) => {
  const duraciones = casos
    .map((c) => c.resultado?.duracion_ms)
    .filter((ms) => typeof ms === 'number' && Number.isFinite(ms) && ms >= 0);
  if (duraciones.length === 0) return { promedio_ms: null, casos: 0 };
  const suma = duraciones.reduce((total, ms) => total + ms, 0);
  return { promedio_ms: Math.round(suma / duraciones.length), casos: duraciones.length };
};

/**
 * Calcula todas las métricas de una corrida.
 * @param opciones.hallazgosR3 lista { id, comentario } de la revisión R3 de Candela.
 */
export const evaluarCorrida = ({ referencia, corrida, hallazgosR3 = [] }) => {
  const casos = emparejar(referencia, corrida);
  return {
    modelo: corrida.modelo ?? 'desconocido',
    version_prompt: corrida.version_prompt ?? null,
    generado_en: corrida.generado_en ?? null,
    total: casos.length,
    clasificadas: casos.filter((c) => c.sugerencia).length,
    alertas_criticas: medirCriticas(casos),
    por_alerta: medirPorAlerta(casos),
    prioridad: medirPrioridad(casos),
    profesional: medirProfesional(casos),
    falsas_alertas: medirFalsasAlertas(casos),
    no_clasificadas: medirNoClasificadas(casos),
    reintentos: medirReintentos(casos),
    tiempo: medirTiempo(casos),
    hallazgos_r3: hallazgosR3,
  };
};

const NOMBRES_ALERTAS = Object.freeze({
  urgencia: 'Urgencia',
  violencia: 'Violencia',
  ideacion_suicida: 'Riesgo suicida',
  descompensacion: 'Descompensación',
  ges: 'GES',
});
const nombreAlerta = (alerta) => NOMBRES_ALERTAS[alerta] ?? alerta;

/**
 * Tabla de diferencias entre la IA y la referencia, con tres niveles (aprobados por Candela,
 * según el orden de importancia de la sección 6 de los requerimientos):
 *   - crítico: solicitud con alerta crítica que el modelo no detectó;
 *   - moderado: prioridad distinta a la de la referencia (o sin respuesta);
 *   - menor: falsa alerta.
 */
const criticasNoDetectadas = (metricas) =>
  new Set(metricas.alertas_criticas.casos_no_detectados.map((caso) => caso.id));

export const armarDiferencias = (metricas) => [
  ...metricas.alertas_criticas.casos_no_detectados.map((caso) => ({
    nivel: 'critico',
    id: caso.id,
    descripcion: `${caso.alertas_referencia.map(nombreAlerta).join(' + ')} no detectada (${
      caso.sin_clasificar ? 'quedó sin clasificar' : 'no marcó alerta crítica'
    })`,
  })),
  // Una solicitud crítica no detectada ya aparece como "crítico": no se repite como "moderado".
  ...metricas.prioridad.diferencias
    .filter((d) => !criticasNoDetectadas(metricas).has(d.id))
    .map((d) => ({
      nivel: 'moderado',
      id: d.id,
      descripcion: d.modelo
        ? `Prioridad ${d.modelo} en vez de ${d.referencia}`
        : `Sin respuesta en vez de prioridad ${d.referencia}`,
    })),
  ...metricas.falsas_alertas.casos.map((f) => ({
    nivel: 'menor',
    id: f.id,
    descripcion: `${f.critica ? 'Falsa alerta crítica' : 'Falsa alerta'}: ${nombreAlerta(f.alerta)}`,
  })),
];

const POR_EVALUAR = 'Por evaluar';

/** Proveedores considerados que no se probaron: todo "Por evaluar" (respuesta de Candela). */
const NO_PROBADOS = ['OpenAI', 'Claude', 'Gemini', 'Grok'];

/** Nombre corto del modelo para la pantalla. */
export const nombreCorto = (modelo) => {
  const texto = String(modelo ?? '').toLowerCase();
  if (texto.includes('mistral')) return 'Mistral';
  if (texto.includes('minimax')) return 'MiniMax';
  return String(modelo ?? 'desconocido');
};

/** Nombre del modelo para la pantalla ("Mistral Large 4", "MiniMax M3.1 Flash"). */
export const nombreModelo = (modelo) => {
  const texto = String(modelo ?? '').toLowerCase();
  if (texto.startsWith('mistralai/mistral-large-4')) return 'Mistral Large 4';
  if (texto.startsWith('minimaxai/minimax-m3.1-flash')) return 'MiniMax M3.1 Flash';
  return String(modelo ?? 'desconocido');
};

const segundos = (ms) => (ms === null ? '—' : `${Math.round(ms / 1000)} s`);

/** Tabla "Modelos considerados". Lo medido sale de las métricas; nada se escribe a mano. */
export const armarModelosConsiderados = (evaluados) => [
  ...evaluados.map((e) => ({
    modelo: nombreModelo(e.modelo),
    id_modelo: e.modelo,
    medido:
      `${e.clasificadas} de ${e.total} clasificadas · ` +
      `${e.alertas_criticas.no_detectadas} alertas críticas no detectadas · ` +
      `${e.reintentos.necesitaron_reintento} necesitaron reintento · ` +
      `${segundos(e.tiempo.promedio_ms)} en promedio`,
    privacidad: POR_EVALUAR,
    costo: 'Catálogo de prueba gratuito; el piloto necesita un servicio pagado',
    alojamiento: 'Servidores de NVIDIA, vía API',
  })),
  ...NO_PROBADOS.map((modelo) => ({
    modelo,
    id_modelo: null,
    medido: POR_EVALUAR,
    privacidad: POR_EVALUAR,
    costo: POR_EVALUAR,
    alojamiento: POR_EVALUAR,
  })),
];

/**
 * Evalúa varias corridas con la misma referencia.
 * @param opciones.corridas lista { corrida, hallazgosR3 } o { error } si no se pudo leer.
 */
export const evaluarModelos = ({ referencia, corridas, ahora = () => new Date() }) => {
  const modelos = corridas.map((entrada) =>
    entrada.error
      ? { modelo: entrada.modelo ?? 'desconocido', error: entrada.error }
      : evaluarCorrida({ referencia, ...entrada }),
  );
  for (const modelo of modelos) {
    if (!modelo.error) {
      modelo.nombre = nombreModelo(modelo.modelo);
      modelo.diferencias = armarDiferencias(modelo);
    }
  }
  return {
    aviso: AVISO_EVALUACION,
    generado_en: ahora().toISOString(),
    casos: referencia.length,
    modelos,
    modelos_considerados: armarModelosConsiderados(modelos.filter((m) => !m.error)),
  };
};
