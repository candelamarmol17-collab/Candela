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
import { armarBandejaDesdeCorrida, GRUPOS } from './bandeja.service.js';

/**
 * Estado de la demo de la bandeja (tarea 006).
 *
 * Guarda en memoria las confirmaciones y correcciones del triajista. Se pierden al apagar el
 * programa o con "Reiniciar demo". El registro permanente es de la tarea 007.
 *
 * La bandeja parte VACÍA y se llena al "cargar" las exportaciones de demostración (tarea 011):
 *   1. la primera trae todas las solicitudes menos una (59);
 *   2. la segunda trae la que faltaba (SINT-0009).
 * Cargar no llama a la IA: usa la clasificación que ya está guardada en la corrida (decisión 007).
 * Por la regla R1, no se recibe ningún archivo de afuera: solo existen estas dos exportaciones.
 */

export const TRIAJISTA_DEMO = 'Triajista de demostración';

/** Solicitud que llega en la segunda exportación (decisión de la tarea 006, que antes la "simulaba"). */
export const ID_SEGUNDA_EXPORTACION = 'SINT-0009';

/** Respuesta cuando alguien intenta mandar un archivo o datos al cargar (regla R1). */
export const MENSAJE_SOLO_DEMOSTRACION =
  'Solo se puede cargar la exportación de demostración: Pulso no recibe archivos (regla R1).';

const nombreExportacion = (numero) => `Exportación de demostración ${numero}`;

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

const JUSTIFICACION_TRIAJISTA = 'Clasificación decidida por el triajista.';

/**
 * Crea la demo.
 * @param opciones.solicitudes las solicitudes sintéticas.
 * @param opciones.corrida la corrida guardada que se muestra.
 * @param opciones.idSegundaExportacion la solicitud que llega en la segunda exportación
 *   (null: hay una sola exportación).
 * @param opciones.ahora reloj (se cambia en las pruebas).
 */
export const crearDemoBandeja = ({
  solicitudes,
  corrida,
  idSegundaExportacion = ID_SEGUNDA_EXPORTACION,
  ahora = () => new Date(),
}) => {
  const solicitudPorId = new Map(solicitudes.map((s) => [s.id_solicitud, s]));
  const resultadoPorId = new Map(corrida.resultados.map((r) => [r.id_solicitud, r]));
  const idSegunda = solicitudPorId.has(idSegundaExportacion) ? idSegundaExportacion : null;
  const totalExportaciones = idSegunda === null ? 1 : 2;
  const nuevasEn = (numero) => (numero === 1 ? solicitudes.length - (idSegunda ? 1 : 0) : 1);
  const describirExportacion = (numero) => ({
    numero,
    nombre: nombreExportacion(numero),
    solicitudes_nuevas: nuevasEn(numero),
  });

  // Estado que cambia durante la demo.
  let exportacionesCargadas = 0;
  let decisiones = new Map(); // id -> { estado, motivo, clasificacion, en }
  let historial = []; // para "Deshacer": [{ id, anterior }]
  let ultimaCambiada = null; // id de la última solicitud que cambió (para el resaltado)

  const visible = (id) =>
    exportacionesCargadas >= 1 && (id !== idSegunda || exportacionesCargadas >= 2);

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
      solicitudes.filter((s) => visible(s.id_solicitud)),
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
        ultima: exportacionesCargadas > 0 ? describirExportacion(exportacionesCargadas) : null,
        siguiente:
          exportacionesCargadas < totalExportaciones
            ? describirExportacion(exportacionesCargadas + 1)
            : null,
      },
      se_puede_deshacer: historial.length > 0,
      catalogos: CATALOGOS,
      ultima_cambiada: ultimaCambiada,
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
      guardarDecision(id, { estado: ESTADOS_REVISION.confirmada, motivo: null, en: ahora() });
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
      guardarDecision(id, {
        estado: ESTADOS_REVISION.corregida,
        motivo: motivo?.trim() ? motivo.trim() : null,
        clasificacion,
        en: ahora(),
      });
      return armar();
    },

    deshacer: () => {
      const ultima = historial.pop();
      if (!ultima) {
        throw new ErrorDemo('No hay nada que deshacer.', 400);
      }
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
      if (exportacionesCargadas >= totalExportaciones) {
        throw new ErrorDemo('No hay más exportaciones de demostración. Usa "Reiniciar demo".', 400);
      }
      exportacionesCargadas += 1;
      // La primera carga llena la bandeja; en la segunda se resalta la solicitud que llegó.
      ultimaCambiada = exportacionesCargadas === 2 ? idSegunda : null;
      return armar();
    },

    reiniciar: () => {
      exportacionesCargadas = 0;
      decisiones = new Map();
      historial = [];
      ultimaCambiada = null;
      return armar();
    },
  };
};
