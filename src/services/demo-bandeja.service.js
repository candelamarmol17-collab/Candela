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
import { aplicarReglaPersonaMayor } from './clasificacion.service.js';
import { armarBandejaDesdeCorrida, GRUPOS } from './bandeja.service.js';

/**
 * Estado de la demo de la bandeja (tarea 006).
 *
 * Guarda en memoria las confirmaciones y correcciones del triajista. Se pierden al apagar el
 * programa o con "Reiniciar demo". El registro permanente es de la tarea 007.
 *
 * "Simular ingreso" no llama a la IA: hace entrar una solicitud que se dejó fuera al comienzo,
 * con la clasificación que ya está guardada en la corrida (decisión 007: nada parece en vivo).
 */

export const TRIAJISTA_DEMO = 'Triajista de demostración';

/** Solicitud que se deja fuera al comienzo y entra con "Simular ingreso" (decisión de la tarea 006). */
export const ID_INGRESO_SIMULADO = 'SINT-0009';

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
 * @param opciones.idIngresoSimulado la solicitud que entra con "Simular ingreso" (null: ninguna).
 * @param opciones.ahora reloj (se cambia en las pruebas).
 */
export const crearDemoBandeja = ({
  solicitudes,
  corrida,
  idIngresoSimulado = ID_INGRESO_SIMULADO,
  ahora = () => new Date(),
}) => {
  const solicitudPorId = new Map(solicitudes.map((s) => [s.id_solicitud, s]));
  const resultadoPorId = new Map(corrida.resultados.map((r) => [r.id_solicitud, r]));
  const idSimulado = solicitudPorId.has(idIngresoSimulado) ? idIngresoSimulado : null;

  // Estado que cambia durante la demo.
  let ingresoHecho = false;
  let decisiones = new Map(); // id -> { estado, motivo, clasificacion, en }
  let historial = []; // para "Deshacer": [{ id, anterior }]
  let ultimaCambiada = null; // id de la última solicitud que cambió (para el resaltado)

  const visible = (id) => id !== idSimulado || ingresoHecho;

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
      ingreso_simulado: { disponible: idSimulado !== null && !ingresoHecho, id: idSimulado },
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

    simularIngreso: () => {
      if (idSimulado === null || ingresoHecho) {
        throw new ErrorDemo('No hay más solicitudes por ingresar. Usa "Reiniciar demo".', 400);
      }
      ingresoHecho = true;
      ultimaCambiada = idSimulado;
      return armar();
    },

    reiniciar: () => {
      ingresoHecho = false;
      decisiones = new Map();
      historial = [];
      ultimaCambiada = null;
      return armar();
    },
  };
};
