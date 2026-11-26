/**
 * Utilidades del DOM compartidas por la bandeja (app.js) y la evaluación (evaluacion.js).
 *
 * Todos los datos se muestran como texto (textContent), nunca como HTML, para que un texto
 * de una solicitud no pueda cambiar la página.
 */

/** Crea un elemento. Los hijos de texto se agregan como texto, nunca como HTML. */
export const el = (etiqueta, atributos = {}, ...hijos) => {
  const nodo = document.createElement(etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (nombre === 'clase') nodo.className = valor;
    else if (nombre.startsWith('al')) nodo.addEventListener(nombre.slice(2).toLowerCase(), valor);
    else nodo.setAttribute(nombre, valor === true ? '' : valor);
  }
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return nodo;
};

export const $ = (id) => document.getElementById(id);

export const NOMBRES_ALERTAS = Object.freeze({
  urgencia: 'Urgencia',
  violencia: 'Violencia',
  ideacion_suicida: 'Riesgo suicida',
  descompensacion: 'Descompensación',
  persona_mayor_60: 'Persona mayor (60+)',
  ges: 'GES',
});

export const NOMBRES_PRIORIDAD = Object.freeze({ alta: 'Alta', media: 'Media', baja: 'Baja' });
