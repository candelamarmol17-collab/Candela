import {
  ALERTA_PERSONA_MAYOR,
  ALERTAS,
  ALERTAS_CRITICAS,
  ALERTAS_IA,
  LARGOS_MAXIMOS,
  PRIORIDADES,
  TIPOS_PRESTADOR,
} from '../schemas/catalogos.js';
import { validarClasificacion } from '../schemas/clasificacion.schema.js';
import { aplicarReglaPersonaMayor } from './regla-persona-mayor.js';
import {
  crearTablaDeCodigos,
  ErrorExportacion,
  seudonimizarExportacion,
} from './seudonimizacion.service.js';
import { armarBandejaDesdeCorrida, describirDatosBandeja, GRUPOS } from './bandeja.service.js';

/**
 * Estado de la demo de la bandeja (tarea 006).
 *
 * Guarda en memoria las confirmaciones y correcciones del triajista. Se pierden al apagar el
 * programa o con "Reiniciar demo".
 *
 * Registro (tarea 007): cada acción deja un evento en memoria, solo de esta sesión. Un evento
 * guarda códigos y catálogos (prioridad, profesional, alertas), el motivo de la corrección que
 * escribió el triajista y la hora. Nunca guarda el texto de la solicitud ni datos personales.
 *
 * La bandeja parte VACÍA y se llena al "cargar" las exportaciones de demostración (tareas 011 y
 * 012), que tienen el formato real de Telesalud (48 columnas):
 *   1. la primera trae 59 solicitudes;
 *   2. la segunda trae SINT-0009.
 * Al cargar, PRIMERO se separan los datos personales (seudonimizacion.service.js). Las filas
 * originales y la tabla de códigos se quedan aquí, en el programa del centro de salud: nunca
 * salen hacia la pantalla ni hacia la IA.
 * Cargar no llama a la IA: usa la clasificación que ya está guardada en la corrida (decisión 007).
 * Por la regla R1, no se recibe ningún archivo de afuera: solo existen estas exportaciones.
 */

export const TRIAJISTA_DEMO = 'Triajista de turno';

/** Respuesta cuando alguien intenta mandar un archivo o datos al cargar (regla R1). */
export const MENSAJE_SOLO_DEMOSTRACION =
  'Solo se puede cargar la exportación de Telesalud: Pulso no recibe archivos (regla R1).';

const nombreExportacion = (numero) => `Exportación de Telesalud ${numero}`;

export const ESTADOS_REVISION = Object.freeze({
  pendiente: 'pendiente',
  confirmada: 'confirmada',
  corregida: 'corregida',
});

/** Error de una acción de la demo, con el código HTTP que corresponde. */
export class ErrorDemo extends Error {
  constructor(mensaje, codigo) {
    super(mensaje);
    this.name = 'ErrorDemo';
    this.codigo = codigo;
  }
}

/** Listas que la pantalla necesita para mostrar y corregir. */
const CATALOGOS = Object.freeze({
  prioridades: PRIORIDADES,
  profesionales: TIPOS_PRESTADOR,
  alertas: ALERTAS,
  alertas_criticas: ALERTAS_CRITICAS,
  alertas_editables: ALERTAS_IA,
  largo_maximo_motivo: LARGOS_MAXIMOS.justificacion,
});

/**
 * Lo que recibió la IA (prompt v1) y lo que no. Debe coincidir con CAMPOS del prompt: una prueba
 * lo revisa. Especificidad no está porque el prompt v1 no la envía (tarea 012, [PENDIENTE] v2).
 */
export const NOTA_DATOS_IA =
  'La IA recibió: profesional pedido, motivo, texto y edad. No recibió: nombre, RUT, contacto ni dirección.';

const JUSTIFICACION_TRIAJISTA = 'Clasificación decidida por el triajista.';

/** Aviso fijo de la pestaña Registro. No promete guardar nada: el registro vive en memoria. */
export const AVISO_REGISTRO = 'Registro de esta sesión de trabajo.';

export const ACCIONES_REGISTRO = Object.freeze({
  confirmada: 'confirmada',
  corregida: 'corregida',
  deshecha: 'deshecha',
  exportacionCargada: 'exportacion_cargada',
});

/** Solo prioridad, profesional y alertas: lo que el registro necesita de una clasificación. */
const resumirClasificacion = (clasificacion) =>
  clasificacion
    ? {
        prioridad: clasificacion.prioridad_sugerida,
        profesional: clasificacion.profesional_sugerido,
        alertas: [...clasificacion.alertas],
      }
    : null;

/** Nombre del modelo para la ficha (o que fueron reglas simuladas, que no son IA). */
const modeloDeLaCorrida = (corrida) => {
  try {
    const datos = describirDatosBandeja(corrida);
    return datos.origen === 'simulado_reglas' ? 'Reglas de respaldo (sin IA)' : datos.nombre_modelo;
  } catch {
    return corrida?.modelo ?? 'desconocido';
  }
};

/**
 * Crea la demo.
 * @param opciones.exportaciones las exportaciones de demostración, en orden: cada una es la lista
 *   de filas del CSV (la primera fila es el encabezado de 48 columnas).
 * @param opciones.corrida la corrida guardada que se muestra.
 * @param opciones.codigoFijo códigos internos ya conocidos (la demo hace que DEMO-ID-0001 sea
 *   SINT-0001, para que coincidan con la corrida). Sin él, los códigos son PUL-0001, …
 * @param opciones.ahora reloj (se cambia en las pruebas).
 */
export const crearDemoBandeja = ({
  exportaciones,
  corrida,
  codigoFijo = () => null,
  ahora = () => new Date(),
}) => {
  const resultadoPorId = new Map(corrida.resultados.map((r) => [r.id_solicitud, r]));
  const describirExportacion = (numero) => ({
    numero,
    nombre: nombreExportacion(numero),
    solicitudes_nuevas: Math.max(exportaciones[numero - 1].length - 1, 0),
  });

  // Estado que cambia durante la demo.
  let exportacionesCargadas = 0;
  let tablaDeCodigos = crearTablaDeCodigos({ codigoFijo }); // se queda en el centro de salud
  let solicitudPorId = new Map(); // solo solicitudes YA separadas de sus datos personales
  let separacion = null; // resumen de la última separación (cuántas columnas, cuántos datos)
  let decisiones = new Map(); // id -> { estado, motivo, clasificacion, en }
  let historial = []; // para "Deshacer": [{ id, anterior }]
  let ultimaCambiada = null; // id de la última solicitud que cambió (para el resaltado)
  let registro = []; // eventos de esta sesión, del más antiguo al más nuevo (tarea 007)

  const modelo = modeloDeLaCorrida(corrida);
  const versionPrompt = corrida.version_prompt ?? null;

  const anotar = (evento) => {
    registro.push({
      numero: registro.length + 1,
      hora: ahora().toISOString(),
      quien: TRIAJISTA_DEMO,
      id_solicitud: null,
      ficha: null,
      ...evento,
    });
  };

  /** Ficha de decisión: qué sugirió la IA, qué decidió el triajista y con qué modelo. */
  const fichaDecision = (id, decision) => ({
    sugerencia_ia: resumirClasificacion(sugerenciaIa(id)),
    decision:
      decision.estado === ESTADOS_REVISION.corregida
        ? resumirClasificacion(decision.clasificacion)
        : resumirClasificacion(sugerenciaIa(id)),
    motivo: decision.motivo ?? null,
    modelo,
    version_prompt: versionPrompt,
  });

  const resumenRegistro = () => {
    const estados = [...decisiones.values()].map((d) => d.estado);
    const confirmadas = estados.filter((e) => e === ESTADOS_REVISION.confirmada).length;
    const corregidas = estados.filter((e) => e === ESTADOS_REVISION.corregida).length;
    const revisadas = confirmadas + corregidas;
    return {
      confirmadas,
      corregidas,
      porcentaje_correccion: revisadas === 0 ? null : Math.round((corregidas / revisadas) * 100),
    };
  };

  const visible = (id) => solicitudPorId.has(id);

  const sugerenciaIa = (id) => {
    const resultado = resultadoPorId.get(id);
    if (resultado?.estado !== 'clasificada') {
      return null;
    }
    const validada = validarClasificacion(resultado.clasificacion);
    return validada.exito ? validada.datos : null;
  };

  const exigirVisible = (id) => {
    if (!solicitudPorId.has(id) || !visible(id)) {
      throw new ErrorDemo(`No existe la solicitud "${id}" en la bandeja.`, 404);
    }
  };

  const guardarDecision = (id, nueva) => {
    historial.push({ id, anterior: decisiones.get(id) ?? null });
    decisiones.set(id, nueva);
    ultimaCambiada = id;
  };

  const armar = () => {
    const correcciones = [...decisiones.entries()]
      .filter(([, decision]) => decision.estado === ESTADOS_REVISION.corregida)
      .map(([id, decision]) => ({ id_solicitud: id, clasificacion: decision.clasificacion }));
    const bandeja = armarBandejaDesdeCorrida(
      [...solicitudPorId.values()],
      {
        ...corrida,
        resultados: corrida.resultados.filter((r) => visible(r.id_solicitud)),
      },
      { correcciones },
    );

    const conRevision = (elemento) => {
      const id = elemento.solicitud.id_solicitud;
      const decision = decisiones.get(id);
      return {
        ...elemento,
        sugerencia_ia: sugerenciaIa(id),
        revision: {
          estado: decision?.estado ?? ESTADOS_REVISION.pendiente,
          motivo: decision?.motivo ?? null,
          en: decision?.en ?? null,
        },
      };
    };

    const ordenadas = bandeja.ordenadas.map(conRevision);
    const noClasificadas = bandeja.no_clasificadas.map(conRevision);
    return {
      datos: {
        ...bandeja.datos,
        version_prompt: corrida.version_prompt ?? null,
      },
      triajista: TRIAJISTA_DEMO,
      resumen: {
        total: ordenadas.length + noClasificadas.length,
        con_alerta_critica: ordenadas.filter((e) => e.grupo !== GRUPOS.sinAlertaCritica).length,
        prioridad_alta: ordenadas.filter((e) => e.clasificacion.prioridad_sugerida === 'alta')
          .length,
        pendientes:
          ordenadas.filter((e) => e.revision.estado === ESTADOS_REVISION.pendiente).length +
          noClasificadas.length,
        no_clasificadas: noClasificadas.length,
      },
      ordenadas,
      no_clasificadas: noClasificadas,
      exportaciones: {
        cargadas: exportacionesCargadas,
        ultima:
          exportacionesCargadas > 0
            ? { ...describirExportacion(exportacionesCargadas), ...separacion }
            : null,
        siguiente:
          exportacionesCargadas < exportaciones.length
            ? describirExportacion(exportacionesCargadas + 1)
            : null,
      },
      se_puede_deshacer: historial.length > 0,
      catalogos: CATALOGOS,
      nota_datos_ia: NOTA_DATOS_IA,
      ultima_cambiada: ultimaCambiada,
      registro: {
        aviso: AVISO_REGISTRO,
        resumen: resumenRegistro(),
        eventos: [...registro].reverse(), // el más nuevo primero
      },
    };
  };

  return {
    estado: armar,

    confirmar: (id) => {
      exigirVisible(id);
      if (decisiones.has(id)) {
        throw new ErrorDemo(`La solicitud "${id}" ya fue revisada.`, 400);
      }
      if (!sugerenciaIa(id)) {
        throw new ErrorDemo(
          `La solicitud "${id}" no tiene una sugerencia que confirmar: hay que clasificarla.`,
          400,
        );
      }
      const decision = { estado: ESTADOS_REVISION.confirmada, motivo: null, en: ahora() };
      guardarDecision(id, decision);
      anotar({
        accion: ACCIONES_REGISTRO.confirmada,
        id_solicitud: id,
        resultado: 'Sugerencia aceptada',
        ficha: fichaDecision(id, decision),
      });
      return armar();
    },

    /** @param cambios { prioridad, profesional, alertas, motivo } ya validados por el controlador. */
    corregir: (id, { prioridad, profesional, alertas, motivo = null }) => {
      exigirVisible(id);
      const solicitud = solicitudPorId.get(id);
      // La alerta de persona mayor no la decide nadie: sale de la edad.
      const clasificacion = aplicarReglaPersonaMayor(
        {
          id_solicitud: id,
          prioridad_sugerida: prioridad,
          profesional_sugerido: profesional,
          alertas: alertas.filter((alerta) => alerta !== ALERTA_PERSONA_MAYOR),
          justificacion: JUSTIFICACION_TRIAJISTA,
          confianza: 'alta',
        },
        solicitud.edad,
      );
      const decision = {
        estado: ESTADOS_REVISION.corregida,
        motivo: motivo?.trim() ? motivo.trim() : null,
        clasificacion,
        en: ahora(),
      };
      guardarDecision(id, decision);
      anotar({
        accion: ACCIONES_REGISTRO.corregida,
        id_solicitud: id,
        resultado: sugerenciaIa(id) ? 'Sugerencia corregida' : 'Clasificada a mano',
        ficha: fichaDecision(id, decision),
      });
      return armar();
    },

    deshacer: () => {
      const ultima = historial.pop();
      if (!ultima) {
        throw new ErrorDemo('No hay nada que deshacer.', 400);
      }
      const anulada = decisiones.get(ultima.id);
      anotar({
        accion: ACCIONES_REGISTRO.deshecha,
        id_solicitud: ultima.id,
        resultado: 'Decisión anulada',
        ficha: {
          ...fichaDecision(ultima.id, anulada),
          accion_anulada: anulada.estado,
          vuelve_a: ultima.anterior?.estado ?? ESTADOS_REVISION.pendiente,
        },
      });
      if (ultima.anterior) {
        decisiones.set(ultima.id, ultima.anterior);
      } else {
        decisiones.delete(ultima.id);
      }
      ultimaCambiada = ultima.id;
      return armar();
    },

    /** Carga la siguiente exportación de demostración. No recibe nada de afuera. */
    cargarExportacion: () => {
      if (exportacionesCargadas >= exportaciones.length) {
        throw new ErrorDemo('No hay exportaciones nuevas por cargar.', 400);
      }
      let separadas;
      try {
        // Primero se separan los datos personales; solo el resultado entra a la bandeja.
        separadas = seudonimizarExportacion(exportaciones[exportacionesCargadas], tablaDeCodigos);
      } catch (error) {
        if (error instanceof ErrorExportacion) {
          throw new ErrorDemo(`No se pudo cargar la exportación. ${error.message}`, 500);
        }
        throw error;
      }
      exportacionesCargadas += 1;
      const nuevas = separadas.solicitudes.filter((s) => !solicitudPorId.has(s.id_solicitud));
      for (const solicitud of separadas.solicitudes) {
        solicitudPorId.set(solicitud.id_solicitud, solicitud);
      }
      separacion = {
        columnas_personales_separadas: separadas.resumen.columnas_personales_separadas,
        datos_tapados_en_texto: separadas.resumen.datos_tapados_en_texto,
      };
      anotar({
        accion: ACCIONES_REGISTRO.exportacionCargada,
        resultado:
          nuevas.length === 1 ? '1 solicitud nueva' : `${nuevas.length} solicitudes nuevas`,
        ficha: {
          exportacion: nombreExportacion(exportacionesCargadas),
          solicitudes_nuevas: nuevas.length,
          ...separacion,
          modelo,
          version_prompt: versionPrompt,
        },
      });
      // La primera carga llena la bandeja; en las siguientes se resalta la que llegó.
      ultimaCambiada = exportacionesCargadas > 1 ? (nuevas[0]?.id_solicitud ?? null) : null;
      return armar();
    },

    reiniciar: () => {
      exportacionesCargadas = 0;
      tablaDeCodigos = crearTablaDeCodigos({ codigoFijo });
      solicitudPorId = new Map();
      separacion = null;
      decisiones = new Map();
      historial = [];
      ultimaCambiada = null;
      registro = [];
      return armar();
    },
  };
};
