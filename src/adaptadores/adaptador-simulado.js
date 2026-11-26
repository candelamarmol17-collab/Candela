/**
 * Adaptador SIMULADO por reglas fijas (regla R5). No usa internet, ni clave, ni un modelo de IA.
 *
 * Busca palabras clave en el texto libre. Es deliberadamente simple: sirve para que la demo
 * funcione sin conexión, NO para medir calidad. Nunca lee la clasificación de referencia.
 * Su justificación dice siempre que es una simulación, para que no parezca una respuesta real.
 */

export const ORIGEN_SIMULADO = 'simulado_reglas';

/** Quita tildes y pasa a minúsculas, para comparar palabras sin importar cómo se escribieron. */
const normalizar = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const REGLAS_ALERTAS = Object.freeze({
  urgencia: [
    'dolor en el pecho',
    'brazo izquierdo',
    'boca chueca',
    'habla raro',
    'sangra',
    'morado',
    'confundid',
    'fiebre de 39',
    'fiebre de 40',
    'cuesta tragar',
    'desmay',
    'convulsion',
    'se ahoga',
    'amenazo con matar',
    'para no despertar',
    'cortes',
  ],
  violencia: ['me pego', 'le pegan', 'le pega', 'me ha pegado', 'empuja', 'moretones', 'amenazo'],
  ideacion_suicida: [
    'no quiero seguir viviendo',
    'quiero morir',
    'quiere desaparecer',
    'hacerme dano',
    'mejor sin mi',
    'para que vivir',
    'para no despertar',
  ],
  descompensacion: ['glicemia', 'silbido', 'se ahoga', 'respira muy rapido', 'veo borroso'],
  ges: ['diabet', 'hipertens', 'depresion', 'epoc', 'asmatic', 'artrosis', 'nodulo', 'cancer'],
});

const ALERTAS_CRITICAS_SIMULADAS = ['urgencia', 'violencia', 'ideacion_suicida', 'descompensacion'];

const PALABRAS_PRIORIDAD_ALTA = ['insulina'];
const PALABRAS_PRIORIDAD_MEDIA = [
  'dolor',
  'duele',
  'dias',
  'semanas',
  'examenes',
  'embaraz',
  'receta',
  'tos',
  'ardor',
  'mareo',
  'herida',
  'olvidando',
  'caido',
  'ansiedad',
];

const contieneAlguna = (texto, palabras) => palabras.some((palabra) => texto.includes(palabra));

/** Clasificación simulada de una solicitud. Siempre la misma respuesta para el mismo texto. */
export const clasificarPorReglas = (solicitud) => {
  const texto = normalizar(solicitud.texto_libre);

  const alertas = Object.entries(REGLAS_ALERTAS)
    .filter(([, palabras]) => contieneAlguna(texto, palabras))
    .map(([alerta]) => alerta);

  let prioridad = 'baja';
  if (
    alertas.some((alerta) => ALERTAS_CRITICAS_SIMULADAS.includes(alerta)) ||
    contieneAlguna(texto, PALABRAS_PRIORIDAD_ALTA)
  ) {
    prioridad = 'alta';
  } else if (contieneAlguna(texto, PALABRAS_PRIORIDAD_MEDIA)) {
    prioridad = 'media';
  }

  const detalle =
    alertas.length > 0
      ? `se encontraron palabras asociadas a: ${alertas.join(', ')}.`
      : 'no se encontraron palabras de alerta.';

  return {
    id_solicitud: solicitud.id_solicitud,
    prioridad_sugerida: prioridad,
    profesional_sugerido: solicitud.tipo_profesional,
    alertas,
    justificacion: `SIMULADO por reglas fijas (no es un modelo de IA): ${detalle}`,
    confianza: 'baja',
  };
};

export const crearAdaptadorSimulado = () => ({
  origen: ORIGEN_SIMULADO,
  modelo: null,
  completar: async (_mensajes, solicitud) => JSON.stringify(clasificarPorReglas(solicitud)),
});
