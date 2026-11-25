/**
 * Listas de valores permitidos del MVP.
 *
 * Fuente de las listas de prestadores y motivos: formulario de Telesalud (19-11-2026).
 * Los textos están copiados tal cual del formulario, incluidas las mayúsculas y minúsculas
 * inconsistentes y las abreviaturas. No se corrigen.
 *
 * Equivalencia con el formulario de Telesalud:
 *   - tipo_profesional = "Tipo Prestador"
 *   - motivo           = "Motivo Consulta"
 */

/** Tipos de prestador ("Tipo Prestador"). Valores permitidos de profesional_sugerido. */
export const TIPOS_PRESTADOR = Object.freeze([
  'Asistente Social',
  'Dental',
  'Enfermería',
  'Kinesiología',
  'Matrona',
  'Medicina',
  'Nutrición',
  'Psicología',
  'Terapia Ocupacional',
  'Técnico en enfermería',
]);

/**
 * Motivos ("Motivo Consulta") agrupados por tipo de prestador.
 * Solo de referencia y para los datos sintéticos: el esquema de entrada NO valida contra esta lista.
 */
export const MOTIVOS_POR_PRESTADOR = Object.freeze({
  'Asistente Social': Object.freeze(['Certificado', 'Consulta Social']),
  Dental: Object.freeze([
    'Consulta de Atención Odontológica',
    'Consulta de Tratamiento Odontológico',
    'Control Dental Diabetes',
    'Control embarazadas',
    'Control Preventivo Odontológico',
  ]),
  Enfermería: Object.freeze([
    'Consulta de Enfermería',
    'Control adulto mayor (mayor a 65 años)',
    'Control Crónico',
    'Control de Salud del Adolescente (10-19 años)',
    'Control de Salud Infantil',
    'Reevaluación del Desarrollo Psicomotor',
  ]),
  Kinesiología: Object.freeze([
    'Atención rehabilitación física',
    'Control crónico adulto',
    'Control crónico infanto juvenil',
    'Entrega de ayudas técnicas (bastón, sillas de rueda, andador, etc)',
    'Problema respiratorio descompensado',
  ]),
  Matrona: Object.freeze([
    'Consulta de lactancia',
    'Consulta Ginecológica',
    'Control de la Díada',
    'Control de Salud del Adolescente (10-19 años)',
    'Control ginecológico (incluye PAP o VPH)',
    'Control preconcepcional',
    'Control prenatal',
    'Exámenes',
    'Ingreso de Embarazo',
    'Método anticonceptivo',
    'Revisión de exámenes con matrona',
    'Solicitud de preservativos (condones)',
    'Sospecha de Embarazo',
  ]),
  Medicina: Object.freeze([
    'Atención Medicina General',
    'Certificado o Informe médico',
    'Control Crónico',
    'Control de salud infantil',
    'Estado de Interconsulta',
    'Renovación de receta',
    'Resultado de exámenes',
  ]),
  Nutrición: Object.freeze([
    'Bajopeso',
    'Clínica de Lactancia',
    'Control Crónico',
    'Control de salud infantil (rango 5 meses y 3 años)',
    'Control embarazadas',
    'Sobrepeso y obesidad',
  ]),
  Psicología: Object.freeze(['Certificado o Informe médico', 'Consulta', 'Control salud mental']),
  'Terapia Ocupacional': Object.freeze([
    'Atención rehabilitación física',
    'Consumo de drogas y alcohol',
    'Entrega de ayudas técnicas (bastón, sillas de rueda, andador, etc)',
    'Evaluación de discapacidad',
    'Problemas de memoria',
  ]),
  'Técnico en enfermería': Object.freeze([
    'Curaciones y/o extracciones de puntos',
    'Examen de medicina preventiva del adulto',
  ]),
});

/** Niveles de prioridad sugerida. */
export const PRIORIDADES = Object.freeze(['alta', 'media', 'baja']);

/** Niveles de confianza de la IA en su sugerencia. */
export const NIVELES_CONFIANZA = Object.freeze(['alta', 'media', 'baja']);

/**
 * Nombre de la alerta de persona de 60 años o más (Ley 21.168).
 * Separado para poder renombrarlo: falta confirmar si la ley también cubre discapacidad y cuidadores.
 */
export const ALERTA_PERSONA_MAYOR = 'persona_mayor_60';

/** Alertas permitidas en la respuesta de la IA. */
export const ALERTAS = Object.freeze([
  'urgencia',
  'violencia',
  'ideacion_suicida',
  'descompensacion',
  ALERTA_PERSONA_MAYOR,
  'ges',
]);

/** Largos máximos de los textos, en caracteres. */
export const LARGOS_MAXIMOS = Object.freeze({
  texto_libre: 300,
  justificacion: 300,
  /** PROVISIONAL: se revisa cuando se conozcan los valores reales de especificidad_consulta. */
  especificidad_consulta: 300,
  /** Nota que explica la clasificación de referencia de los datos sintéticos. */
  nota_referencia: 300,
});

/**
 * Alertas que decide la IA. Se excluye la de persona mayor, porque esa la calcula el código
 * a partir de la edad (acordado en la tarea 002). Sirve para medir falsas alertas de la IA.
 */
export const ALERTAS_IA = Object.freeze(
  ALERTAS.filter((alerta) => alerta !== ALERTA_PERSONA_MAYOR),
);

/** Edad permitida, en años. */
export const EDAD = Object.freeze({ minima: 0, maxima: 120 });
