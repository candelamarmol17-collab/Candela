/** Espera la cantidad de milisegundos indicada. */
export const esperar = (milisegundos) =>
  new Promise((resolver) => {
    setTimeout(resolver, milisegundos);
  });
