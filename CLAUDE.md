# CLAUDE.md

Contexto de proyecto para trabajar con Claude Code en este repo.

## Qué es esto

Simulador web de métodos de búsqueda (ciega y heurística) para la cátedra de
IA de UTN.BA / UTN FRLP. Es un sitio estático de una sola página: HTML + CSS
+ JS vanilla, sin build step, sin dependencias, sin backend. Ver `README.md`
para la descripción de cara al usuario/estudiante.

## Archivos

- `index.html` — estructura de la página: header, sidebar (tabs Simulación /
  Diseñador), stage (selector de escenario, árbol SVG, controles, tabla de
  pasos).
- `app.js` — toda la lógica. Ver secciones internas (separadas con comentarios
  `====`): modelo de datos, helpers de grafo, layout automático, motor de
  búsqueda, render SVG, render de UI, diseñador de árbol, wiring.
- `style.css` — estilos, tema oscuro por defecto con variante clara vía
  `prefers-color-scheme`.
- `logo.png` — logo de Grupo Gemis (header/footer, con link a
  grupogemis.com.ar).

No hay `package.json`, tests automatizados ni linter configurado. Verificar
cambios con `node --check app.js` (sintaxis) y abriendo `index.html` en el
navegador.

## Modelo de datos

Un **grafo** es la unidad central: `{ root, nodes: {NOMBRE:{h}}, edges:
[{from,to,cost}], goals: [...] }`. Es un árbol/DAG dirigido desde `root`
(algunos nodos pueden tener más de un padre, como `L` en el escenario
clásico).

- `PRESETS` (en `app.js`) es el diccionario de escenarios predefinidos, cada
  uno con `name`, `description` y `graph`. Están diseñados a propósito para
  mostrar comportamientos distintos (trampa de profundidad, óptimo local de
  escalada, A* vs. Primero el Mejor por costo, poda fallida de Beam Search).
  Si agregás un escenario nuevo, sumalo también con una descripción que
  explique **qué se supone que se vea** al correrlo — es la parte pedagógica
  más importante del repo.
- `state.graph` es el grafo activo (un preset clonado, o el que arma el
  usuario en el Diseñador). Todas las funciones de render/algoritmos reciben
  `graph` como parámetro o leen `currentGraph()`, nunca los `PRESETS`
  directamente.
- `layout(graph)` calcula posiciones (x,y) automáticamente a partir de la
  estructura (profundidad por BFS + posición horizontal recursiva tipo
  Reingold-Tilford simplificado). No hay coordenadas hardcodeadas en ningún
  lado — así el mismo código dibuja los presets y cualquier árbol armado a
  mano en el Diseñador.

## Motor de búsqueda

Cada algoritmo (`runBlindTraversal`, `runBidireccional`, `runEscalada`,
`runPriorityFirst`) devuelve un arreglo de **steps**, no anima nada
directamente. Un step tiene la forma:

```js
{ current, isSolution, open: [{node, score?}], closed: [...], message, failed? }
```

En las búsquedas ciegas la lista de abiertos tiene **al frente el próximo
nodo a expandir** (siempre `shift()`): BFS agrega los hijos al final, DFS /
Generación y Prueba / la mitad "adelante" de Bidireccional los anteponen en
el sentido elegido. No volver a `pop()` sobre hijos apilados en orden: eso
invierte el sentido (izq→der terminaba recorriendo A,D,H,L,M en vez de
A,B,E,I,J como en la PPT).

El stepper (`play/pause/next/prev`) sólo avanza un índice sobre ese arreglo
y llama a `renderAll()`. Si agregás un algoritmo nuevo, seguí este mismo
contrato para que la tabla de pasos y el árbol se rendericen solos.

`runPriorityFirst` sirve tanto para Primero el Mejor como para Beam Search
(con `beamWidth`) y A* (con `useAstar`, fórmula `f' = h - g`). A diferencia
del resto de la bibliografía clásica, en esta cátedra **mayor heurística =
más deseable**, así que A* usa `h - g` (no `h + g`) para que "más alto sigue
siendo mejor".

## Diseñador e import/export

- Un nodo puede tener varios padres: si en el formulario se escribe un
  nombre existente, `addExtraParent()` agrega la arista. `extraEdgeError()`
  valida duplicados, ciclos y que la raíz no tenga padre.
- `state.builder` lleva además `name` y `heurMode` (se exportan).
- Formato compartible: `{ format: 'metodos-de-busqueda', version: 1, name,
  heurMode, graph }`, como `.json` o en el hash `#arbol=<base64url>`.
  Todo lo importado pasa por `parseSharedTree()`, que valida estructura y
  restringe los nombres de nodo (se interpolan en HTML).

## Convenciones visuales (no cambiar sin que te lo pidan)

- Los nodos **solución** (`graph.goals`) siempre se rellenan de verde
  (`GOAL_FILL`), sin importar el estado de la búsqueda — el objetivo tiene
  que verse a simple vista desde el arranque. El *borde* del círculo es el
  que comunica el estado (actual/abierto/cerrado) vía `GOAL_STROKE_BY_STATUS`.
- Nodos no-meta: `STATUS_COLORS` — sin visitar = negro, abierto = naranja,
  cerrado = rojo, actual = azul.
- Al terminar una corrida se dibuja un marcador (`renderResultMarker`): ✓
  verde sobre el nodo si `step.isSolution`, ✕ roja si `step.failed`. Si
  agregás un modo de falla nuevo, asegurate de que el step final tenga
  `current` seteado a un nodo real (no `null`) para que el marcador tenga
  dónde dibujarse.

## Gotcha ya resuelto (no reintroducir)

`renderBuilderAll()` sólo debe llamarse cuando la pestaña "Diseñador de
árbol" está activa. Si se llama sin condición al cargar la página, y el
diseñador está vacío (`builder.root === null`), `renderBuilderPreview()`
hace `svg.innerHTML = ''` y borra el árbol principal. El flujo correcto es
dejar que `switchTab('builder')` sea el único que dispare
`renderBuilderAll()`.

## Deploy

Sitio estático puro → sirve tal cual con GitHub Pages (Settings → Pages →
branch `main`, carpeta `/ (root)`). No requiere ningún paso de build.
