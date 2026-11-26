import { filtrarModelos } from '../../scripts/listar-modelos.js';

describe('filtrarModelos', () => {
  const modelos = ['meta/llama-x', 'qwen/qwen-y', 'Mistralai/Mistral-z'];

  test('sin filtro devuelve todos', () => {
    expect(filtrarModelos(modelos)).toEqual(modelos);
  });

  test('filtra sin distinguir mayúsculas', () => {
    expect(filtrarModelos(modelos, 'MISTRAL')).toEqual(['Mistralai/Mistral-z']);
  });
});
