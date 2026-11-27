# 014 — El diagrama de arquitectura se hace con Archify

**Fecha**: 2026-11-26 · **Tarea**: 016 · **Decidió**: Candela (usar Archify, contenido y colores) y yo (cómo se arma)

## Qué se decidió

- **Archify** (https://github.com/tt-a1i/archify, licencia Apache-2.0, versión 3.3.2) arma el diagrama de arquitectura tecnológica como una página HTML que funciona sin internet, y revisa que se lea bien.
- **Se instaló de forma global** en la carpeta de usuario de Claude (`~/.claude/skills/archify` y `archify-pr`), siguiendo su documentación oficial (`llms.txt`), con `ARCHIFY_UPDATE_CHECK_DISABLED=1`. **No está en el repositorio** y no se sube a GitHub. Su carpeta de trabajo (`.archify/`) está en el `.gitignore`.
- **Basado en el código real**: cada caja apunta a los archivos y líneas que la respaldan, fijados en un commit (`5f4dddc`). Lo que no está construido (la propuesta para el piloto) no tiene referencias y dice "por definir · no construido".
- **Colores de Pulso y tema claro**: Archify no permite elegir colores propios ni fijar el tema claro (elige según el computador). Por eso `scripts/colores-arquitectura.js` agrega, después de las revisiones de Archify, una hoja de estilos con la paleta de Pulso y hace que abra en claro. No cambia cajas, flechas ni textos.
- **El PNG** sale del SVG que exporta Archify (tema claro), pasado a imagen con Chrome al triple de tamaño (5310 × 3156).
- **Se guarda la descripción del diagrama** (`docs/arquitectura/arquitectura-pulso.archify.json`) para poder regenerarlo.

## Por qué

- Un diagrama comprobado contra el código evita mostrar piezas que no existen.
- Instalar Archify fuera del repositorio evita subir archivos de terceros a GitHub.

## Alternativas descartadas

- **Seguir solo con Mermaid** (`docs/arquitectura.md`): sirve para leerlo en GitHub, pero no da una imagen con la calidad que se necesita para el video y la UAI. Se mantiene como versión en texto.
- **Cambiar los colores dentro de Archify**: habría que modificar una herramienta de terceros; una hoja de estilos encima es más simple y se puede quitar.
