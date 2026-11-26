/**
 * Mapeo de las 48 columnas de la exportación de Telesalud (tarea 012). ÚNICO lugar donde se define.
 *
 * El encabezado es real (docs/formato-exportacion-telesalud.csv); los datos siempre son sintéticos.
 * Las columnas se leen por POSICIÓN, porque E y AV se llaman igual ("Información adicional").
 *
 * Usos:
 *   - ia:           lo que recibe la IA (con el prompt v1).
 *   - ia_pendiente: debería recibirla la IA, pero el prompt v1 (congelado) no la envía [PENDIENTE].
 *   - personal:     datos personales del vecino. Nunca llegan a la IA ni a la pantalla.
 *   - funcionario:  datos de funcionarios y notas. No llegan a la IA.
 *   - evaluacion:   para la evaluación del piloto. No llegan a la IA.
 *   - pendiente:    no se usa hasta confirmar qué contiene [PENDIENTE].
 */

export const USOS = Object.freeze({
  ia: 'ia',
  iaPendiente: 'ia_pendiente',
  personal: 'personal',
  funcionario: 'funcionario',
  evaluacion: 'evaluacion',
  pendiente: 'pendiente',
});

const derivacion = (numero) => [
  [`Derivado a ${numero}`, USOS.funcionario],
  [`Derivado por ${numero}`, USOS.funcionario],
  [`Cargo ${numero}`, USOS.funcionario],
  [`Profesión ${numero}`, USOS.funcionario],
  [`Fecha derivación ${numero}`, USOS.funcionario],
  [`Nota derivación ${numero}`, USOS.funcionario],
];

/**
 * [nombre en el encabezado, uso, campo que usa Pulso (si lo usa)], en el orden real.
 * "campo" es el nombre interno: solo las columnas con campo se leen.
 */
const DEFINICION = [
  ['ID', USOS.personal, 'id_exportacion'],
  ['Cesfam', USOS.evaluacion],
  ['Prioridad', USOS.evaluacion],
  ['Código seguimiento', USOS.personal],
  ['Información adicional', USOS.ia, 'texto_libre'],
  ['Fecha solicitud', USOS.evaluacion, 'fecha_solicitud'],
  ['Género', USOS.personal],
  ['Nombre', USOS.personal],
  ['Apellido paterno', USOS.personal],
  ['Apellido materno', USOS.personal],
  ['Nombre social', USOS.personal],
  ['Tipo identificador', USOS.personal],
  ['Nº identificador', USOS.personal],
  ['Edad', USOS.ia, 'edad'],
  ['Email', USOS.personal],
  ['Telefono', USOS.personal],
  ['Dirección', USOS.personal],
  ['Tipo prestador', USOS.ia, 'tipo_profesional'],
  ['Motivo consulta', USOS.ia, 'motivo'],
  ['Especificidad', USOS.iaPendiente, 'especificidad_consulta'],
  ['Estado', USOS.evaluacion],
  ['Fecha cierre', USOS.evaluacion],
  ['Tipo cierre', USOS.evaluacion],
  ['Cerrado por', USOS.funcionario],
  ['Cargo', USOS.funcionario],
  ['Profesión', USOS.funcionario],
  ['Fecha agenda', USOS.funcionario],
  ['Nota cierre', USOS.funcionario],
  ...derivacion(1),
  ...derivacion(2),
  ...derivacion(3),
  ['Contactado', USOS.evaluacion],
  ['Información adicional', USOS.pendiente],
];

/** "A", "B", …, "Z", "AA", … */
export const letraDeColumna = (indice) => {
  let numero = indice + 1;
  let letra = '';
  while (numero > 0) {
    const resto = (numero - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    numero = Math.floor((numero - 1) / 26);
  }
  return letra;
};

export const COLUMNAS_EXPORTACION = Object.freeze(
  DEFINICION.map(([nombre, uso, campo], indice) =>
    Object.freeze({ indice, letra: letraDeColumna(indice), nombre, uso, campo: campo ?? null }),
  ),
);

export const ENCABEZADO_EXPORTACION = Object.freeze(COLUMNAS_EXPORTACION.map((c) => c.nombre));

export const columnasConUso = (uso) => COLUMNAS_EXPORTACION.filter((c) => c.uso === uso);

/** Columnas que se separan por ser datos personales del vecino. */
export const COLUMNAS_PERSONALES = Object.freeze(columnasConUso(USOS.personal));

/** Revisa que el encabezado sea exactamente el de Telesalud, columna por columna. */
export const validarEncabezado = (encabezado) => {
  const errores = [];
  if (!Array.isArray(encabezado) || encabezado.length !== ENCABEZADO_EXPORTACION.length) {
    errores.push(
      `El archivo debe tener ${ENCABEZADO_EXPORTACION.length} columnas y tiene ${
        Array.isArray(encabezado) ? encabezado.length : 0
      }.`,
    );
    return { exito: false, errores };
  }
  encabezado.forEach((nombre, indice) => {
    if (String(nombre).trim() !== ENCABEZADO_EXPORTACION[indice]) {
      errores.push(
        `La columna ${letraDeColumna(indice)} debería ser "${ENCABEZADO_EXPORTACION[indice]}" y es "${nombre}".`,
      );
    }
  });
  return errores.length === 0 ? { exito: true } : { exito: false, errores };
};

/** Lee una fila (lista de textos) y devuelve solo los campos que Pulso usa, por posición. */
export const leerCampos = (fila) =>
  Object.fromEntries(
    COLUMNAS_EXPORTACION.filter((c) => c.campo).map((c) => [c.campo, fila[c.indice] ?? '']),
  );
