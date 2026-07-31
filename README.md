# Métodos de Búsqueda — Simulador Interactivo

Simulador web para estudiar los métodos de búsqueda ciega y heurística de la
materia **Inteligencia Artificial** (UTN.BA / UTN FRLP). Corré cada algoritmo
paso a paso sobre un árbol, mirá cómo se llenan las listas de nodos abiertos
y cerrados, y probá tus propios ejercicios.

👉 **[Abrir el simulador](https://fedemaleh.github.io/metodos-de-busqueda/)**

## ¿Qué podés hacer acá?

- **Correr 9 métodos de búsqueda** con controles de play/pausa, paso a paso y
  velocidad: Primero en Amplitud, Primero en Profundidad, Generación y
  Prueba, Bidireccional, Escalada Simple, Escalada por Máxima Pendiente,
  Primero el Mejor, Beam Search y A*.
- **Ver la tabla de traza** (paso, nodo actual, ¿es solución?, lista de
  abiertos, lista de cerrados, mensaje) igual que en las diapositivas de la
  cátedra.
- **Elegir entre 6 escenarios** pensados para mostrar comportamientos
  distintos: desde el árbol clásico de la materia hasta casos donde la
  escalada queda en un óptimo local, donde Primero el Mejor se equivoca por
  ignorar el costo (y A* lo corrige), o donde el Beam Search poda por error
  el único camino a la solución.
- **Armar tu propio árbol** en el Diseñador: desde cero o partiendo de
  cualquiera de los escenarios conocidos, editando heurísticas, costos y
  estados solución al vuelo. Ideal para responder en el momento una pregunta
  de clase ("¿y si este nodo valiera más?").

En el árbol, los nodos **solución** siempre se ven en verde (para que el
objetivo sea obvio desde el arranque), los **sin visitar** en negro, y a
medida que corre el algoritmo se van marcando en naranja (abierto), rojo
(cerrado) o azul (nodo actual). Cuando la búsqueda termina, aparece un
**✓ verde** si encontró la solución o una **✕ roja** si quedó trabada (por
ejemplo, un óptimo local en la escalada).

## Cómo usarlo

No hace falta instalar nada ni correr un servidor: es HTML/CSS/JS puro.

1. Cloná el repo o descargalo como ZIP.
2. Abrí `index.html` con cualquier navegador moderno (Chrome, Firefox,
   Safari, Edge).

También podés simplemente entrar al link de GitHub Pages de arriba.

## Estructura del proyecto

```
index.html   → estructura de la página (sidebar, árbol, tabla, diseñador)
app.js       → toda la lógica: modelo de grafo, algoritmos de búsqueda,
               layout automático del árbol y manejo de la interfaz
style.css    → estilos (tema oscuro/claro automático según el sistema)
logo.png     → logo de Grupo Gemis
```

No hay dependencias externas ni paso de build: se puede editar cualquiera
de estos tres archivos y refrescar el navegador para ver el cambio.

## Créditos

Desarrollado para la cátedra de Inteligencia Artificial — UTN.BA / UTN FRLP,
2026, con la colaboración de [Grupo Gemis](https://grupogemis.com.ar/gemiswp/).
