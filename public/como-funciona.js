import { $, el } from './dom.js';
import { modelosConsiderados, obtenerEvaluacion } from './evaluacion.js';

/**
 * Pestaña "Cómo funciona" (tarea 009): arquitectura, modelos considerados e IA responsable.
 * Los textos describen lo que el prototipo hace de verdad. La tabla de modelos sale de
 * /api/evaluacion (los mismos datos de la pestaña "Evaluación").
 */

const CENTRO = 'Centro de salud';
const FUERA = 'Proveedor de IA';

/** Pasos del recorrido de una solicitud. "lugar" dice dónde ocurre cada paso. */
const PASOS = [
  {
    titulo: 'Exportación de Telesalud',
    texto: 'Se lee el archivo exportado. Telesalud no se modifica.',
    lugar: CENTRO,
  },
  {
    titulo: 'Separación de datos personales',
    texto:
      'Con código y sin IA: se quitan nombre, RUT, contacto y dirección, y cada solicitud recibe un código.',
    lugar: CENTRO,
    clase: 'paso--privado',
  },
  {
    titulo: 'Clasificador con IA generativa',
    texto:
      'Sugiere prioridad, profesional y alertas. Proveedor intercambiable · prompt versionado.',
    lugar: FUERA,
    clase: 'paso--ia',
  },
  {
    titulo: 'Validación de la respuesta',
    texto: 'Revisa el formato. Si la respuesta no sirve, la solicitud queda para revisión manual.',
    lugar: CENTRO,
  },
  {
    titulo: 'Bandeja ordenada',
    texto: 'Lo urgente aparece primero. Nada se esconde.',
    lugar: CENTRO,
  },
  {
    titulo: 'Triajista confirma o corrige',
    texto: 'Supervisión humana: la IA sugiere, el equipo clínico decide.',
    lugar: CENTRO,
    clase: 'paso--humano',
  },
  {
    titulo: 'Evaluación',
    texto: 'Se compara cada sugerencia con una referencia y se miden los errores, sin veredicto.',
    lugar: CENTRO,
  },
];

const TARJETAS_IA_RESPONSABLE = [
  {
    titulo: 'Supervisión humana',
    texto: 'El triajista confirma o corrige cada sugerencia. La IA nunca decide sola.',
  },
  {
    titulo: 'Sin indicaciones clínicas',
    texto:
      'La IA no diagnostica, no indica tratamientos ni da consejos al paciente. Está escrito en el prompt y se revisa a mano (regla R3).',
  },
  {
    titulo: 'Privacidad',
    texto:
      'Los datos personales se separan antes de la IA y se quedan en el centro (Ley 20.584 y Ley 21.719).',
  },
  {
    titulo: 'Sin depender de un proveedor',
    texto:
      'El proveedor de IA se puede cambiar, y existe un modo de respaldo por reglas que funciona sin internet.',
  },
  {
    titulo: 'Evaluación transparente',
    texto:
      'Se mide sobre todo cuántas alertas críticas no se detectan. Los criterios se construyeron con el equipo del centro y su validación clínica formal es parte del piloto.',
  },
];

const diagrama = () =>
  el(
    'ol',
    { clase: 'arquitectura', 'aria-label': 'Recorrido de una solicitud en Pulso' },
    PASOS.map((paso, indice) =>
      el(
        'li',
        { clase: `paso ${paso.clase ?? ''}` },
        el('span', { clase: 'paso__numero' }, String(indice + 1).padStart(2, '0')),
        el(
          'span',
          { clase: `paso__lugar${paso.lugar === FUERA ? ' paso__lugar--fuera' : ''}` },
          paso.lugar,
        ),
        el('h3', { clase: 'paso__titulo' }, paso.titulo),
        el('p', { clase: 'paso__texto' }, paso.texto),
      ),
    ),
  );

const notaPrivacidad = () =>
  el(
    'p',
    { clase: 'arquitectura__nota' },
    el('strong', {}, 'Lo único que viaja a la IA: '),
    'profesional pedido, motivo, texto (con RUT, teléfonos y correos tapados) y edad, con un código en vez del ID. ',
    'Nombre, RUT, contacto, dirección y la tabla de códigos se quedan en el centro de salud.',
  );

const tarjetasIaResponsable = () =>
  el(
    'div',
    { clase: 'ia-responsable' },
    TARJETAS_IA_RESPONSABLE.map((t) =>
      el(
        'article',
        { clase: 'ia-responsable__tarjeta' },
        el('h4', { clase: 'ia-responsable__titulo' }, t.titulo),
        el('p', { clase: 'ia-responsable__texto' }, t.texto),
      ),
    ),
  );

const seccion = (titulo, ...contenido) =>
  el(
    'section',
    { clase: 'cf-seccion' },
    el('h3', { clase: 'cf-seccion__titulo' }, titulo),
    ...contenido,
  );

let dibujada = false;

/** Dibuja la pestaña. La tabla de modelos se completa cuando llega la evaluación. */
export const mostrarComoFunciona = async (llamar) => {
  if (dibujada) return;
  dibujada = true;
  const modelos = el('div', {}, el('p', { clase: 'eval-nota' }, 'Cargando…'));
  $('como-funciona-contenido').replaceChildren(
    diagrama(),
    notaPrivacidad(),
    seccion(
      'Modelos de IA considerados',
      modelos,
      el(
        'p',
        { clase: 'eval-nota' },
        'Mistral y MiniMax se probaron con 60 casos de prueba; el resto está por evaluar. El modelo final se elige con el equipo clínico.',
      ),
    ),
    seccion('IA responsable', tarjetasIaResponsable()),
  );
  try {
    const evaluacion = await obtenerEvaluacion(llamar);
    modelos.replaceChildren(modelosConsiderados(evaluacion.modelos_considerados));
  } catch (error) {
    modelos.replaceChildren(
      el('p', { clase: 'vacio' }, `No se pudo cargar la tabla de modelos: ${error.message}`),
    );
  }
};
