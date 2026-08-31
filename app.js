'use strict';

/* =========================================================================
   MODELO DE DATOS
   Un "grafo" es: { nodes: {NAME:{h}}, edges: [{from,to,cost}], goals: [..], root: 'A' }
   Las posiciones (x,y) se calculan siempre con layout() a partir de la
   estructura, así funciona igual para los escenarios predefinidos y para
   los árboles armados a mano en el diseñador.
   ========================================================================= */

function cloneGraph(g) {
  return JSON.parse(JSON.stringify(g));
}

const PRESETS = {
  classic: {
    name: 'Clásico de la cátedra (A–M)',
    description: 'El árbol usado en las diapositivas de la materia. Sirve para repasar los 9 métodos con los mismos valores heurísticos y costos que en los ejemplos de clase.',
    graph: {
      root: 'A',
      nodes: {
        A: { h: 0 }, B: { h: 9 }, C: { h: 11 }, D: { h: 10 },
        E: { h: 15 }, F: { h: 3 }, G: { h: 12 }, H: { h: 5 },
        I: { h: 8 }, J: { h: 999 }, K: { h: 5 }, L: { h: 10 }, M: { h: 99 },
      },
      edges: [
        { from: 'A', to: 'B', cost: 9 }, { from: 'A', to: 'C', cost: 6 }, { from: 'A', to: 'D', cost: 3 },
        { from: 'B', to: 'E', cost: 3 }, { from: 'B', to: 'F', cost: 1 },
        { from: 'C', to: 'G', cost: 9 },
        { from: 'D', to: 'L', cost: 1 }, { from: 'D', to: 'H', cost: 4 },
        { from: 'E', to: 'I', cost: 2 }, { from: 'E', to: 'J', cost: 11 },
        { from: 'G', to: 'K', cost: 6 }, { from: 'G', to: 'L', cost: 8 },
        { from: 'L', to: 'M', cost: 5 },
      ],
      goals: ['J', 'M'],
    },
  },

  depthTrap: {
    name: 'Trampa de profundidad',
    description: 'Una rama izquierda muy profunda sin solución, y una solución cercana a la raíz por la derecha. Compará Primero en Amplitud (la encuentra rápido) contra Primero en Profundidad (se pierde explorando la rama larga).',
    graph: {
      root: 'A',
      nodes: {
        A: { h: 0 }, B: { h: 0 }, C: { h: 0 }, D: { h: 0 }, E: { h: 0 }, F: { h: 0 }, G: { h: 0 }, H: { h: 0 },
      },
      edges: [
        { from: 'A', to: 'B', cost: 1 }, { from: 'A', to: 'C', cost: 1 },
        { from: 'B', to: 'D', cost: 1 },
        { from: 'D', to: 'E', cost: 1 },
        { from: 'E', to: 'F', cost: 1 },
        { from: 'F', to: 'G', cost: 1 },
        { from: 'C', to: 'H', cost: 1 },
      ],
      goals: ['H'],
    },
  },

  localOptimum: {
    name: 'Óptimo local (trampa de escalada)',
    description: 'B parece la mejor opción desde la raíz (h=12, la más alta), pero sus dos hijos son peores: es un óptimo local. Escalada por Máxima Pendiente se queda atascada ahí. Escalada Simple, en cambio, prueba primero la rama C (menor h, pero primera en el orden) y por suerte esa rama sí llega a la solución. Primero el Mejor y A* encuentran la solución sin depender de la suerte, porque pueden retroceder.',
    graph: {
      root: 'A',
      nodes: {
        A: { h: 0 }, C: { h: 8 }, B: { h: 12 }, H: { h: 5 },
        D: { h: 9 }, E: { h: 7 }, F: { h: 14 }, G: { h: 6 }, I: { h: 3 }, J: { h: 100 },
      },
      edges: [
        { from: 'A', to: 'C', cost: 1 }, { from: 'A', to: 'B', cost: 1 }, { from: 'A', to: 'H', cost: 1 },
        { from: 'C', to: 'F', cost: 1 }, { from: 'C', to: 'G', cost: 1 },
        { from: 'B', to: 'D', cost: 1 }, { from: 'B', to: 'E', cost: 1 },
        { from: 'H', to: 'I', cost: 1 },
        { from: 'F', to: 'J', cost: 1 },
      ],
      goals: ['J'],
    },
  },

  astarVsGreedy: {
    name: 'A* vs. Primero el Mejor (el costo importa)',
    description: "C (h=8) parece más prometedor que B (h=6), y lleva a F (h=25), un valor altísimo que Primero el Mejor persigue de inmediato sin mirar el costo: termina en M2 por un camino carísimo. A* recalcula f'=h-g en cada paso y, apenas ve que llegar a M2 cuesta demasiado, abandona esa rama y encuentra M1 por un camino mucho más barato.",
    graph: {
      root: 'A',
      nodes: {
        A: { h: 0 }, B: { h: 6 }, C: { h: 8 }, G: { h: 3 },
        D: { h: 9 }, E: { h: 4 }, F: { h: 25 },
        M1: { h: 30 }, M2: { h: 30 },
      },
      edges: [
        { from: 'A', to: 'B', cost: 2 }, { from: 'A', to: 'C', cost: 2 }, { from: 'A', to: 'G', cost: 1 },
        { from: 'B', to: 'D', cost: 1 }, { from: 'B', to: 'E', cost: 3 },
        { from: 'D', to: 'M1', cost: 1 },
        { from: 'C', to: 'F', cost: 1 },
        { from: 'F', to: 'M2', cost: 25 },
      ],
      goals: ['M1', 'M2'],
    },
  },

  beamPrune: {
    name: 'Beam Search: la poda puede fallar',
    description: 'B y C parecen las mejores ramas dos niveles seguidos (h alto que baja apenas un poco) y terminan en callejones sin salida. La única rama que lleva a la solución, E, tiene la heurística más baja de la raíz y queda podada con N=2 o N=3. Recién con N=4 (el ancho del árbol completo) el haz la conserva y aparece la solución.',
    graph: {
      root: 'A',
      nodes: {
        A: { h: 0 }, B: { h: 20 }, C: { h: 18 }, D: { h: 15 }, E: { h: 9 },
        B1: { h: 19 }, C1: { h: 17 }, D1: { h: 1 }, E1: { h: 8 }, Z: { h: 100 },
      },
      edges: [
        { from: 'A', to: 'B', cost: 1 }, { from: 'A', to: 'C', cost: 1 }, { from: 'A', to: 'D', cost: 1 }, { from: 'A', to: 'E', cost: 1 },
        { from: 'B', to: 'B1', cost: 1 },
        { from: 'C', to: 'C1', cost: 1 },
        { from: 'D', to: 'D1', cost: 1 },
        { from: 'E', to: 'E1', cost: 1 },
        { from: 'E1', to: 'Z', cost: 1 },
      ],
      goals: ['Z'],
    },
  },

  classicAL: {
    name: 'Ejercicio 5',
    description: 'Árbol clásico de la bibliografía con dos nodos meta (J y L, ambos h=0) alcanzables por caminos distintos: J cuelga de E y de G, y L cuelga de I y de K. Sin costos diferenciados (todas las aristas cuestan 1), sirve para comparar cómo cada método de búsqueda ciega y heurística elige entre las dos metas y en qué orden explora las ramas B/C. El enunciado de este ejercicio considera más deseable el valor heurístico más bajo (h=0 en las metas), al revés de la convención general de la cátedra.',
    heurMode: 'min',
    graph: {
      root: 'A',
      nodes: {
        A: { h: 12 }, B: { h: 7 }, C: { h: 6 }, D: { h: 3 }, E: { h: 4 },
        F: { h: 9 }, G: { h: 10 }, H: { h: 8 }, I: { h: 1 }, J: { h: 0 },
        K: { h: 2 }, L: { h: 0 },
      },
      edges: [
        { from: 'A', to: 'B', cost: 1 }, { from: 'A', to: 'C', cost: 1 },
        { from: 'B', to: 'D', cost: 1 }, { from: 'B', to: 'E', cost: 1 },
        { from: 'C', to: 'F', cost: 1 }, { from: 'C', to: 'G', cost: 1 }, { from: 'C', to: 'H', cost: 1 },
        { from: 'E', to: 'I', cost: 1 }, { from: 'E', to: 'J', cost: 1 },
        { from: 'G', to: 'J', cost: 1 },
        { from: 'H', to: 'K', cost: 1 },
        { from: 'I', to: 'L', cost: 1 },
        { from: 'K', to: 'L', cost: 1 },
      ],
      goals: ['J', 'L'],
    },
  },
};

/* =========================================================================
   ESTADO GLOBAL
   ========================================================================= */

const state = {
  graph: cloneGraph(PRESETS.classic.graph),
  presetId: 'classic',
  layout: null,
  algo: null,
  steps: [],
  index: -1,
  playing: false,
  timer: null,
  direction: 'rl',
  goal: null,
  beamWidth: 2,
  costMode: 'real',
  heurMode: 'max',
  builder: { nodes: {}, edges: [], goals: [], root: null },
};

function currentGraph() {
  return state.graph;
}

/* =========================================================================
   HELPERS DE GRAFO
   ========================================================================= */

function edgesFrom(graph, node) {
  return graph.edges.filter(e => e.from === node);
}
function edgeCost(graph, from, to, useUnitCost) {
  if (useUnitCost) return 1;
  const e = graph.edges.find(e => e.from === from && e.to === to);
  return e ? e.cost : 1;
}
function children(graph, node, direction) {
  const list = edgesFrom(graph, node).map(e => e.to);
  return direction === 'rl' ? list.slice().reverse() : list;
}
function parentOf(graph, node) {
  const e = graph.edges.find(e => e.to === node);
  return e ? e.from : null;
}
function predecessors(graph, node) {
  return graph.edges.filter(e => e.to === node).map(e => e.from);
}

/* Layout automático: profundidad por BFS (mínima distancia a la raíz),
   posición horizontal recursiva promediando la de los hijos (estilo
   "reingold-tilford" simplificado). Sirve para cualquier grafo, predefinido
   o armado en el diseñador. */
function layout(graph) {
  const width = 720, topMargin = 60, levelGap = 130, leftMargin = 45;
  const depthOf = {};
  if (graph.root && graph.nodes[graph.root]) {
    const queue = [graph.root];
    depthOf[graph.root] = 0;
    while (queue.length) {
      const n = queue.shift();
      edgesFrom(graph, n).forEach(e => {
        if (!(e.to in depthOf)) { depthOf[e.to] = depthOf[n] + 1; queue.push(e.to); }
      });
    }
  }
  Object.keys(graph.nodes).forEach(n => { if (!(n in depthOf)) depthOf[n] = 0; });

  const xrank = {};
  let leafCounter = 0;
  const seen = new Set();
  function recurse(n) {
    if (xrank[n] !== undefined) return xrank[n];
    if (seen.has(n)) return leafCounter;
    seen.add(n);
    const kids = edgesFrom(graph, n).map(e => e.to);
    let x;
    if (!kids.length) {
      x = leafCounter++;
    } else {
      // Un hijo "no fresco" ya fue posicionado por otra rama (convergencia
      // en un DAG, p.ej. dos padres que apuntan al mismo nodo meta). Si este
      // nodo promediara esa posición ajena, quedaría arrastrado lejos de sus
      // hermanos reales y cruzaría ramas que no deberían cruzarse.
      const freshKids = kids.filter(k => xrank[k] === undefined);
      x = freshKids.length
        ? freshKids.reduce((s, k) => s + recurse(k), 0) / freshKids.length
        : leafCounter++;
    }
    xrank[n] = x;
    return x;
  }
  if (graph.root) recurse(graph.root);
  Object.keys(graph.nodes).forEach(n => { if (xrank[n] === undefined) xrank[n] = leafCounter++; });

  const maxLeaf = Math.max(1, leafCounter - 1);
  const maxDepth = Math.max(0, ...Object.values(depthOf));
  const pos = {};
  Object.keys(graph.nodes).forEach(n => {
    pos[n] = {
      x: leftMargin + (maxLeaf === 0 ? width / 2 : (xrank[n] / maxLeaf) * width),
      y: topMargin + depthOf[n] * levelGap,
    };
  });

  // Dos nodos distintos pueden heredar el mismo xrank cuando ambos son "hijo
  // único" de un mismo nodo compartido más abajo (convergencia en un DAG).
  // Sin este ajuste quedarían dibujados exactamente superpuestos.
  const byDepth = {};
  Object.keys(graph.nodes).forEach(n => (byDepth[depthOf[n]] = byDepth[depthOf[n]] || []).push(n));
  Object.values(byDepth).forEach(list => {
    list.sort((a, b) => pos[a].x - pos[b].x || a.localeCompare(b));
    for (let i = 1; i < list.length; i++) {
      if (pos[list[i]].x - pos[list[i - 1]].x < 90) pos[list[i]].x = pos[list[i - 1]].x + 90;
    }
  });

  return { pos, depthOf, maxDepth, height: topMargin + maxDepth * levelGap + 70 };
}

/* =========================================================================
   EXPLICACIONES POR ALGORITMO
   ========================================================================= */

const EXPLANATIONS = {
  bfs: {
    title: 'Primero en Amplitud (BFS)',
    text: 'Recorre el árbol nivel por nivel usando una cola FIFO.',
    bullets: [
      { text: 'Si existe solución y el espacio es finito, la encuentra.', good: true },
      { text: 'Útil cuando las soluciones están cerca de la raíz.', good: true },
      { text: 'Consume mucha memoria.', good: false },
    ],
  },
  dfs: {
    title: 'Primero en Profundidad (DFS)',
    text: 'Recorre el árbol rama por rama usando una pila LIFO, hasta encontrar la primera solución.',
    bullets: [
      { text: 'No requiere mucha memoria: expande una rama por vez.', good: true },
      { text: 'Muy útil cuando hay muchas soluciones alejadas de la raíz.', good: true },
      { text: 'No garantiza encontrar la solución más óptima.', good: false },
    ],
  },
  genprueba: {
    title: 'Generación y Prueba',
    text: 'Recorre todo el árbol (rama por rama) generando y probando cada estado, sin detenerse en la primera solución.',
    bullets: [
      { text: 'Adecuado para problemas sencillos.', good: true },
      { text: 'Permite encontrar todos los estados solución.', good: true },
      { text: 'En problemas complejos puede consumir mucho tiempo.', good: false },
    ],
  },
  bidireccional: {
    title: 'Bidireccional',
    text: 'Ejecuta dos búsquedas simultáneas: una hacia adelante (por profundidad) desde el estado inicial y otra hacia atrás (por amplitud) desde el estado solución elegido. Al menos una de las dos debe ser en amplitud.',
    bullets: [
      { text: 'Complejidad equivalente a dos búsquedas unidireccionales sobre la mitad de los nodos.', good: true },
      { text: 'Requiere poder generar predecesores del estado solución.', good: false },
    ],
  },
  escaladaSimple: {
    title: 'Escalada Simple',
    text: 'Desde el nodo actual se mueve al primer hijo generado que tenga un valor heurístico mejor que el del padre.',
    bullets: [
      { text: 'No tiene retroceso (no hay backtracking).', good: false },
      { text: 'No garantiza encontrar el estado final (puede quedar en óptimo local).', good: false },
      { text: 'Solo evalúa hijos con heurística estrictamente mejor que el padre.', good: true },
    ],
  },
  escaladaMaxima: {
    title: 'Escalada por Máxima Pendiente',
    text: 'Genera todos los hijos del nodo actual y se mueve al mejor de ellos, siempre que sea mejor que el padre.',
    bullets: [
      { text: 'No tiene retroceso.', good: false },
      { text: 'No garantiza encontrar el estado final.', good: false },
      { text: 'Compara todos los hijos antes de decidir (a diferencia de la escalada simple).', good: true },
    ],
  },
  bestFirst: {
    title: 'Primero el Mejor',
    text: 'Mantiene una lista de nodos abiertos ordenada por heurística y siempre expande el mejor nodo abierto, sin importar de qué rama provenga.',
    bullets: [
      { text: 'Tiene retroceso: puede abandonar una rama y saltar a otra mejor.', good: true },
      { text: 'Garantiza encontrar el estado final si existe.', good: true },
      { text: 'El nodo elegido puede no ser mejor que el nodo actual.', good: false },
    ],
  },
  beam: {
    title: 'Beam Search',
    text: 'Igual que Primero el Mejor, pero la lista de nodos abiertos se poda y conserva únicamente los N mejores nodos en cada paso.',
    bullets: [
      { text: 'Reduce el consumo de memoria frente a Primero el Mejor.', good: true },
      { text: 'No garantiza encontrar el estado final: puede podar el camino correcto.', good: false },
    ],
  },
  astar: {
    title: 'A*',
    text: "Evalúa los nodos con f' = h - g, donde h es el valor heurístico del nodo y g es el costo acumulado del camino recorrido desde la raíz.",
    bullets: [
      { text: 'Tiene retroceso y garantiza encontrar el estado final.', good: true },
      { text: 'Combina la heurística del estado con el costo real de los caminos recorridos.', good: true },
    ],
  },
};

/* =========================================================================
   MOTOR DE BÚSQUEDA — cada función devuelve un arreglo de "steps"
   ========================================================================= */

function fmtScore(node, score) {
  return score === undefined || score === null ? node : `${node}(${score})`;
}

function runBlindTraversal(graph, direction, mode) {
  const isFifo = mode === 'bfs';
  const stopAtFirst = mode === 'dfs';
  let open = [{ node: graph.root, parent: null }];
  const closed = [];
  const steps = [];
  const solutionsFound = [];

  while (open.length) {
    const cur = isFifo ? open.shift() : open.pop();
    closed.push(cur.node);
    const isSolution = graph.goals.includes(cur.node);
    if (isSolution) solutionsFound.push(cur.node);

    const kids = children(graph, cur.node, direction);
    const newEntries = kids.map(k => ({ node: k, parent: cur.node }));
    open = open.concat(newEntries);

    steps.push({
      current: cur.node,
      isSolution,
      open: open.map(o => ({ node: o.node })),
      closed: closed.slice(),
      message: isSolution ? `${cur.node} es un estado solución.` : `Se expande ${cur.node}.`,
    });

    if (isSolution && stopAtFirst) break;
  }

  if (!stopAtFirst) {
    const last = steps[steps.length - 1];
    if (last) last.message += solutionsFound.length
      ? ` Recorrido completo. Soluciones encontradas: ${solutionsFound.join(', ')}.`
      : ' Recorrido completo (sin solución).';
  }
  return steps;
}

function runBidireccional(graph, direction, goal) {
  const steps = [];
  const fwdClosed = [];
  const bwdClosed = [];
  let fwdOpen = [graph.root];
  let bwdOpen = [goal];
  let meet = null;

  function pushStep(message) {
    const customStatus = {};
    fwdClosed.forEach(n => (customStatus[n] = 'forward'));
    bwdClosed.forEach(n => (customStatus[n] = customStatus[n] === 'forward' ? 'meet' : 'backward'));
    if (meet) customStatus[meet] = 'meet';
    steps.push({
      current: null,
      isSolution: !!meet,
      open: fwdOpen.map(n => ({ node: `→${n}` })).concat(bwdOpen.map(n => ({ node: `←${n}` }))),
      closed: fwdClosed.map(n => `→${n}`).concat(bwdClosed.map(n => `←${n}`)),
      message,
      customStatus,
    });
  }

  pushStep('Inicio: búsqueda hacia adelante (profundidad) desde el estado inicial y hacia atrás (amplitud) desde el estado solución elegido.');

  let guard = 0;
  while ((fwdOpen.length || bwdOpen.length) && !meet && guard < 300) {
    guard++;
    if (fwdOpen.length) {
      const n = fwdOpen.pop();
      if (!fwdClosed.includes(n)) {
        fwdClosed.push(n);
        const metNow = bwdClosed.includes(n);
        if (!metNow) {
          const kids = children(graph, n, direction);
          fwdOpen = fwdOpen.concat(kids.filter(k => !fwdClosed.includes(k)));
        }
        pushStep(`Adelante (profundidad) visita ${n}.`);
        if (metNow) { meet = n; pushStep(`¡Encuentro en ${n}! Las dos búsquedas se tocan.`); break; }
      }
    }
    if (bwdOpen.length) {
      const n = bwdOpen.shift();
      if (!bwdClosed.includes(n)) {
        bwdClosed.push(n);
        const metNow = fwdClosed.includes(n);
        if (!metNow) {
          const preds = predecessors(graph, n);
          bwdOpen = bwdOpen.concat(preds.filter(p => !bwdClosed.includes(p)));
        }
        pushStep(`Atrás (amplitud) visita ${n}.`);
        if (metNow) { meet = n; pushStep(`¡Encuentro en ${n}! Las dos búsquedas se tocan.`); break; }
      }
    }
  }
  if (!meet) pushStep('Las búsquedas no llegaron a encontrarse.');
  return steps;
}

function runEscalada(graph, direction, variant, heurMode) {
  const steps = [];
  let current = graph.root;
  const path = [graph.root];
  const isBetter = heurMode === 'min' ? (a, b) => a < b : (a, b) => a > b;

  while (true) {
    const isSolution = graph.goals.includes(current);
    steps.push({
      current,
      isSolution,
      open: [],
      closed: path.slice(),
      message: isSolution ? `${current} es un estado solución.` : `Nodo actual: ${current} (h=${graph.nodes[current].h}).`,
    });
    if (isSolution) break;

    const kids = children(graph, current, direction);
    if (!kids.length) {
      steps.push({ current, isSolution: false, open: [], closed: path.slice(), message: `${current} no tiene hijos. Búsqueda fallida (óptimo local).`, failed: true });
      break;
    }

    let next = null;
    if (variant === 'simple') {
      next = kids.find(k => isBetter(graph.nodes[k].h, graph.nodes[current].h)) || null;
    } else {
      const best = kids.reduce((a, b) => (isBetter(graph.nodes[b].h, graph.nodes[a].h) ? b : a));
      if (isBetter(graph.nodes[best].h, graph.nodes[current].h)) next = best;
    }

    if (!next) {
      steps.push({ current, isSolution: false, open: [], closed: path.slice(), message: `Ningún hijo de ${current} mejora la heurística. Búsqueda fallida (óptimo local).`, failed: true });
      break;
    }
    current = next;
    path.push(current);
  }
  return steps;
}

function runPriorityFirst(graph, direction, opts) {
  const steps = [];
  let open = [{ node: graph.root, g: 0 }];
  const closed = [];
  const minIsBetter = opts.heurMode === 'min';

  function score(entry) {
    const h = graph.nodes[entry.node].h;
    if (opts.useAstar) return minIsBetter ? h + entry.g : h - entry.g;
    return h;
  }
  function sortOpen(list) {
    return list.sort((a, b) => (minIsBetter ? score(a) - score(b) : score(b) - score(a)));
  }

  let guard = 0;
  while (open.length && guard < 500) {
    guard++;
    sortOpen(open);

    const cur = open.shift();
    closed.push(cur.node);
    const isSolution = graph.goals.includes(cur.node);

    if (!isSolution) {
      const kids = children(graph, cur.node, direction).filter(k => !closed.includes(k));
      for (const k of kids) {
        const g = cur.g + edgeCost(graph, cur.node, k, opts.useUnitCost);
        const already = open.find(o => o.node === k);
        if (!already || g < already.g) {
          if (already) already.g = g;
          else open.push({ node: k, g });
        }
      }
    }

    sortOpen(open);
    // El ancho del haz se aplica recién acá, sobre la lista ya completa con
    // los hijos nuevos: podarla antes de expandir (como se hacía antes)
    // dejaba entrar más candidatos de los debidos al mostrar el paso.
    let pruned = [];
    if (opts.beamWidth && open.length > opts.beamWidth) {
      pruned = open.slice(opts.beamWidth);
      open = open.slice(0, opts.beamWidth);
    }

    steps.push({
      current: cur.node,
      isSolution,
      open: open.map(o => ({ node: o.node, score: score(o) })),
      pruned: pruned.map(o => ({ node: o.node, score: score(o) })),
      closed: closed.slice(),
      message: isSolution ? `${cur.node} es un estado solución.` : `Se expande ${cur.node} (valor ${score(cur)}).`,
    });

    if (isSolution) break;
  }
  if (!open.length && !(steps[steps.length - 1] && steps[steps.length - 1].isSolution)) {
    steps.push({ current: closed[closed.length - 1] || null, isSolution: false, open: [], closed: closed.slice(), message: 'La lista de abiertos se vació sin encontrar el estado final.', failed: true });
  }
  return steps;
}

/* =========================================================================
   SVG
   ========================================================================= */

const svg = document.getElementById('treeSvg');

function buildSvgSkeleton() {
  const graph = currentGraph();
  const { pos, height } = layout(graph);
  state.layout = pos;
  svg.setAttribute('viewBox', `0 0 760 ${Math.max(360, height)}`);
  svg.innerHTML = '';
  const ns = 'http://www.w3.org/2000/svg';

  graph.edges.forEach(e => {
    const a = pos[e.from], b = pos[e.to];
    if (!a || !b) return;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', a.x); line.setAttribute('y1', a.y + 22);
    line.setAttribute('x2', b.x); line.setAttribute('y2', b.y - 22);
    line.setAttribute('class', 'edge-line');
    line.setAttribute('id', `edge-${e.from}-${e.to}`);
    svg.appendChild(line);

    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', (a.x + b.x) / 2 + 10);
    label.setAttribute('y', (a.y + b.y) / 2);
    label.setAttribute('class', 'edge-cost');
    label.setAttribute('id', `edgecost-${e.from}-${e.to}`);
    label.textContent = e.cost;
    svg.appendChild(label);
  });

  Object.entries(graph.nodes).forEach(([name, n]) => {
    if (!pos[name]) return;
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('id', `node-${name}`);

    const isGoal = graph.goals.includes(name);
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', pos[name].x);
    circle.setAttribute('cy', pos[name].y);
    circle.setAttribute('r', 22);
    circle.setAttribute('class', 'node-circle');
    circle.setAttribute('fill', isGoal ? GOAL_FILL : STATUS_COLORS.default);
    circle.setAttribute('stroke', isGoal ? GOAL_STROKE_BY_STATUS.default : '#4a5d6b');
    circle.setAttribute('stroke-width', isGoal ? '3' : '2');
    g.appendChild(circle);

    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', pos[name].x);
    label.setAttribute('y', pos[name].y - 2);
    label.setAttribute('class', 'node-label');
    label.textContent = name;
    g.appendChild(label);

    const hLabel = document.createElementNS(ns, 'text');
    hLabel.setAttribute('x', pos[name].x);
    hLabel.setAttribute('y', pos[name].y + 38);
    hLabel.setAttribute('class', 'node-h');
    hLabel.setAttribute('id', `h-${name}`);
    hLabel.textContent = `h=${n.h}`;
    g.appendChild(hLabel);

    svg.appendChild(g);
  });
}

const STATUS_COLORS = {
  default: '#12161c',
  open: '#e08a2c',
  closed: '#c9432e',
  current: '#2f8fd6',
  solution: '#3fb56d',
  forward: '#2f8fd6',
  backward: '#a15fe0',
  meet: '#3fb56d',
};

// Los nodos solución siempre se rellenan de verde para que el objetivo se vea
// de un vistazo; el borde es el que comunica en qué estado están dentro
// de la búsqueda (actual, abierto, cerrado...).
const GOAL_FILL = '#2f9e5c';
const GOAL_STROKE_BY_STATUS = {
  default: '#173a28',
  open: '#e08a2c',
  closed: '#c9432e',
  current: '#2f8fd6',
  solution: '#eafff0',
  forward: '#2f8fd6',
  backward: '#a15fe0',
  meet: '#eafff0',
};

function showHeuristics(show) {
  Object.keys(currentGraph().nodes).forEach(name => {
    const el = document.getElementById(`h-${name}`);
    if (el) el.style.display = show ? 'block' : 'none';
  });
}
function showCosts(show) {
  currentGraph().edges.forEach(e => {
    const el = document.getElementById(`edgecost-${e.from}-${e.to}`);
    if (el) el.style.display = show ? 'block' : 'none';
  });
}

function renderTree(step) {
  const graph = currentGraph();
  graph.edges.forEach(e => {
    const el = document.getElementById(`edge-${e.from}-${e.to}`);
    if (el) el.classList.remove('highlight');
  });

  const statusMap = {};
  Object.keys(graph.nodes).forEach(n => (statusMap[n] = 'default'));

  if (step) {
    if (step.customStatus) {
      Object.assign(statusMap, step.customStatus);
    } else {
      (step.closed || []).forEach(n => (statusMap[n] = 'closed'));
      (step.open || []).forEach(o => (statusMap[o.node] = 'open'));
      if (step.current) statusMap[step.current] = step.isSolution ? 'solution' : 'current';
    }
    if (step.current) {
      const p = parentOf(graph, step.current);
      if (p) {
        const el = document.getElementById(`edge-${p}-${step.current}`);
        if (el) el.classList.add('highlight');
      }
    }
  }

  Object.entries(statusMap).forEach(([name, status]) => {
    const circle = document.querySelector(`#node-${name} circle`);
    if (!circle) return;
    const isGoal = graph.goals.includes(name);
    if (isGoal) {
      circle.setAttribute('fill', GOAL_FILL);
      circle.setAttribute('stroke', GOAL_STROKE_BY_STATUS[status] || GOAL_STROKE_BY_STATUS.default);
      circle.setAttribute('stroke-width', status === 'default' ? '3' : '4');
    } else {
      circle.setAttribute('fill', STATUS_COLORS[status] || STATUS_COLORS.default);
      circle.setAttribute('stroke', '#4a5d6b');
      circle.setAttribute('stroke-width', '2');
    }
  });

  renderResultMarker(step);
}

/* Marca con un tilde verde el nodo donde se encontró la solución, o con una
   cruz roja el nodo donde la búsqueda quedó trabada (óptimo local, lista de
   abiertos vacía, etc.), para que el resultado se lea de un vistazo. */
function renderResultMarker(step) {
  document.getElementById('resultMarker')?.remove();
  if (!step || !step.current || !(step.isSolution || step.failed)) return;
  const p = state.layout && state.layout[step.current];
  if (!p) return;

  const ns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(ns, 'g');
  g.setAttribute('id', 'resultMarker');

  const cx = p.x + 20, cy = p.y - 20;
  const circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('cx', cx);
  circle.setAttribute('cy', cy);
  circle.setAttribute('r', 13);
  circle.setAttribute('fill', step.isSolution ? '#1f7a44' : '#7a1f1f');
  circle.setAttribute('stroke', step.isSolution ? '#eafff0' : '#ffe0da');
  circle.setAttribute('stroke-width', '2');
  g.appendChild(circle);

  const mark = document.createElementNS(ns, 'text');
  mark.setAttribute('x', cx);
  mark.setAttribute('y', cy + 1);
  mark.setAttribute('class', 'result-mark');
  mark.textContent = step.isSolution ? '✓' : '✕';
  g.appendChild(mark);

  svg.appendChild(g);
}

/* =========================================================================
   RENDER DE UI: escenarios, explicación, parámetros, tabla
   ========================================================================= */

function renderScenarioSelect() {
  const sel = document.getElementById('scenarioSelect');
  const isCustom = !state.presetId;
  sel.innerHTML = Object.entries(PRESETS)
    .map(([id, p]) => `<option value="${id}" ${state.presetId === id ? 'selected' : ''}>${p.name}</option>`)
    .join('') + (isCustom ? `<option value="custom" selected>Mi árbol personalizado</option>` : '');
  document.getElementById('scenarioDesc').textContent = isCustom
    ? 'Árbol armado en el Diseñador de árbol.'
    : PRESETS[state.presetId].description;
}

function loadPreset(id) {
  const preset = PRESETS[id];
  if (!preset) return;
  state.presetId = id;
  state.graph = cloneGraph(preset.graph);
  state.goal = state.graph.goals[0] || null;
  state.heurMode = preset.heurMode || 'max';
  buildSvgSkeleton();
  renderScenarioSelect();
  if (state.algo) runAlgo(); else { showHeuristics(false); showCosts(false); renderTree(null); }
}

function renderExplanation() {
  const info = EXPLANATIONS[state.algo];
  const titleEl = document.getElementById('explainTitle');
  const textEl = document.getElementById('explainText');
  const bulletsEl = document.getElementById('explainBullets');
  if (!info) { titleEl.textContent = 'Elegí un método'; textEl.textContent = ''; bulletsEl.innerHTML = ''; return; }
  titleEl.textContent = info.title;
  textEl.textContent = info.text;
  bulletsEl.innerHTML = info.bullets.map(b => `<li class="${b.good ? 'good' : 'warn'}">${b.text}</li>`).join('');
}

function renderParams() {
  const el = document.getElementById('params');
  const algo = state.algo;
  const graph = currentGraph();
  let html = '';

  const directionSelect = `
    <label>Sentido de recorrido
      <select id="paramDirection">
        <option value="lr" ${state.direction === 'lr' ? 'selected' : ''}>Izquierda a derecha</option>
        <option value="rl" ${state.direction === 'rl' ? 'selected' : ''}>Derecha a izquierda</option>
      </select>
    </label>`;

  const goalSelect = `
    <label>Estado solución
      <select id="paramGoal">
        ${graph.goals.map(g => `<option value="${g}" ${state.goal === g ? 'selected' : ''}>${g}</option>`).join('')}
      </select>
    </label>`;

  const heurSelect = `
    <label>Heurística más deseable
      <select id="paramHeur">
        <option value="max" ${state.heurMode === 'max' ? 'selected' : ''}>Valor más alto</option>
        <option value="min" ${state.heurMode === 'min' ? 'selected' : ''}>Valor más bajo</option>
      </select>
    </label>`;

  if (['bfs', 'dfs', 'genprueba', 'bidireccional', 'escaladaSimple', 'escaladaMaxima', 'bestFirst', 'beam', 'astar'].includes(algo)) html += directionSelect;
  if (algo === 'bidireccional') html += goalSelect;
  if (['escaladaSimple', 'escaladaMaxima', 'bestFirst', 'beam', 'astar'].includes(algo)) html += heurSelect;

  if (algo === 'beam') {
    html += `<label>Ancho del haz (N)
      <input type="number" id="paramBeam" min="1" max="8" value="${state.beamWidth}" />
    </label>`;
  }
  if (algo === 'astar') {
    html += `<label>Costos de las aristas
      <select id="paramCost">
        <option value="real" ${state.costMode === 'real' ? 'selected' : ''}>Costos del escenario</option>
        <option value="unit" ${state.costMode === 'unit' ? 'selected' : ''}>Todos costo = 1</option>
      </select>
    </label>`;
  }

  el.innerHTML = html;

  const pd = document.getElementById('paramDirection'); if (pd) pd.addEventListener('change', e => { state.direction = e.target.value; runAlgo(); });
  const pg = document.getElementById('paramGoal'); if (pg) pg.addEventListener('change', e => { state.goal = e.target.value; runAlgo(); });
  const pb = document.getElementById('paramBeam'); if (pb) pb.addEventListener('change', e => { state.beamWidth = Math.max(1, parseInt(e.target.value) || 1); runAlgo(); });
  const pc = document.getElementById('paramCost'); if (pc) pc.addEventListener('change', e => { state.costMode = e.target.value; runAlgo(); });
  const ph = document.getElementById('paramHeur'); if (ph) ph.addEventListener('change', e => { state.heurMode = e.target.value; runAlgo(); });
}

function renderStepIndicator() {
  document.getElementById('stepIndicator').textContent = `Paso ${state.steps.length ? state.index + 1 : 0} / ${state.steps.length}`;
}

function renderTable() {
  const body = document.getElementById('stepsBody');
  body.innerHTML = state.steps.slice(0, state.index + 1).map((s, i) => {
    const openParts = s.open.map(o => fmtScore(o.node, o.score))
      .concat((s.pruned || []).map(o => `<s title="podado por el ancho del haz">${fmtScore(o.node, o.score)}</s>`));
    const openStr = openParts.length ? openParts.join(', ') : '-';
    const closedStr = s.closed.length ? s.closed.join(', ') : '-';
    const rowClass = i === state.index ? 'current-row' : '';
    const solClass = s.isSolution ? 'solution-row' : '';
    return `<tr class="${rowClass} ${solClass}">
      <td>${i + 1}</td><td>${s.current || '-'}</td>
      <td>${s.isSolution ? '✔' : (s.failed ? '✕' : '—')}</td>
      <td>${openStr}</td><td>${closedStr}</td><td>${s.message}</td>
    </tr>`;
  }).join('');
  const wrap = document.querySelector('.table-wrap');
  wrap.scrollTop = wrap.scrollHeight;
}

function renderAll() {
  renderTree(state.steps[state.index]);
  renderStepIndicator();
  renderTable();
}

/* =========================================================================
   EJECUCIÓN DE ALGORITMOS
   ========================================================================= */

function runAlgo() {
  if (!state.algo) return;
  pause();
  const graph = currentGraph();
  showHeuristics(['escaladaSimple', 'escaladaMaxima', 'bestFirst', 'beam', 'astar'].includes(state.algo));
  showCosts(state.algo === 'astar');
  if (!state.goal || !graph.goals.includes(state.goal)) state.goal = graph.goals[0];

  switch (state.algo) {
    case 'bfs': state.steps = runBlindTraversal(graph, state.direction, 'bfs'); break;
    case 'dfs': state.steps = runBlindTraversal(graph, state.direction, 'dfs'); break;
    case 'genprueba': state.steps = runBlindTraversal(graph, state.direction, 'genprueba'); break;
    case 'bidireccional': state.steps = runBidireccional(graph, state.direction, state.goal); break;
    case 'escaladaSimple': state.steps = runEscalada(graph, state.direction, 'simple', state.heurMode); break;
    case 'escaladaMaxima': state.steps = runEscalada(graph, state.direction, 'maxima', state.heurMode); break;
    case 'bestFirst': state.steps = runPriorityFirst(graph, state.direction, { beamWidth: null, useAstar: false, heurMode: state.heurMode }); break;
    case 'beam': state.steps = runPriorityFirst(graph, state.direction, { beamWidth: state.beamWidth, useAstar: false, heurMode: state.heurMode }); break;
    case 'astar': state.steps = runPriorityFirst(graph, state.direction, { beamWidth: null, useAstar: true, useUnitCost: state.costMode === 'unit', heurMode: state.heurMode }); break;
    default: state.steps = [];
  }
  state.index = state.steps.length ? 0 : -1;
  renderAll();
}

/* =========================================================================
   CONTROLES DE REPRODUCCIÓN
   ========================================================================= */

function play() {
  if (state.playing || state.index >= state.steps.length - 1) return;
  state.playing = true;
  document.getElementById('btnPlay').textContent = '⏸';
  step();
}
function pause() {
  state.playing = false;
  clearTimeout(state.timer);
  document.getElementById('btnPlay').textContent = '▶';
}
function step() {
  if (!state.playing) return;
  if (state.index >= state.steps.length - 1) { pause(); return; }
  state.index++;
  renderAll();
  const speed = parseInt(document.getElementById('speed').value, 10);
  state.timer = setTimeout(step, speed);
}
function nextStep() { pause(); if (state.index < state.steps.length - 1) { state.index++; renderAll(); } }
function prevStep() { pause(); if (state.index > 0) { state.index--; renderAll(); } }
function resetSteps() { pause(); state.index = state.steps.length ? 0 : -1; renderAll(); }

/* =========================================================================
   DISEÑADOR DE ÁRBOL
   ========================================================================= */

function nextAutoName(builder) {
  const used = new Set(Object.keys(builder.nodes));
  for (let c = 65; c <= 90; c++) { const l = String.fromCharCode(c); if (!used.has(l)) return l; }
  let i = 1;
  while (used.has(`N${i}`)) i++;
  return `N${i}`;
}

function renderBuilderForm() {
  const b = state.builder;
  const hasRoot = !!b.root;
  const parentOptions = Object.keys(b.nodes).map(n => `<option value="${n}">${n}</option>`).join('');

  document.getElementById('builderForm').innerHTML = `
    <label>Nombre del nodo
      <input type="text" id="bName" value="${nextAutoName(b)}" maxlength="8" />
    </label>
    ${hasRoot ? `
    <label>Nodo padre
      <select id="bParent">${parentOptions}</select>
    </label>
    <label>Costo de la arista (padre → nuevo nodo)
      <input type="number" id="bCost" value="1" min="0" step="1" />
    </label>` : `<p class="hint">Este va a ser el nodo raíz del árbol.</p>`}
    <label>Valor heurístico (h)
      <input type="number" id="bH" value="0" step="1" />
    </label>
    <label class="checkbox-row">
      <input type="checkbox" id="bGoal" />
      ¿Es estado solución?
    </label>
    <button id="bAdd" class="primary-btn">Agregar nodo</button>
  `;

  document.getElementById('bAdd').addEventListener('click', () => {
    const name = document.getElementById('bName').value.trim();
    if (!name) return;
    if (b.nodes[name]) { alert('Ya existe un nodo con ese nombre.'); return; }
    const h = parseFloat(document.getElementById('bH').value) || 0;
    const isGoal = document.getElementById('bGoal').checked;

    if (!hasRoot) {
      b.root = name;
    } else {
      const parent = document.getElementById('bParent').value;
      const cost = parseFloat(document.getElementById('bCost').value) || 0;
      b.edges.push({ from: parent, to: name, cost });
    }
    b.nodes[name] = { h };
    if (isGoal) b.goals.push(name);
    renderBuilderAll();
  });
}

function renderBuilderList() {
  const b = state.builder;
  const el = document.getElementById('builderList');
  const names = Object.keys(b.nodes);
  if (!names.length) { el.innerHTML = '<p class="hint">Todavía no agregaste ningún nodo.</p>'; return; }

  el.innerHTML = `<table class="builder-table"><thead><tr>
      <th>Nodo</th><th>h</th><th>Padre</th><th>Costo</th><th>Solución</th><th></th>
    </tr></thead><tbody>
    ${names.map(n => {
      const edge = b.edges.find(e => e.to === n);
      return `<tr>
        <td>${n}${n === b.root ? ' (raíz)' : ''}</td>
        <td><input type="number" class="cell-input" data-hnode="${n}" value="${b.nodes[n].h}" /></td>
        <td>${edge ? edge.from : '-'}</td>
        <td>${edge ? `<input type="number" class="cell-input" data-costedge="${n}" value="${edge.cost}" />` : '-'}</td>
        <td><input type="checkbox" data-goalnode="${n}" ${b.goals.includes(n) ? 'checked' : ''} /></td>
        <td><button class="del-btn" data-del="${n}">✕</button></td>
      </tr>`;
    }).join('')}
  </tbody></table>`;

  el.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteBuilderNode(btn.dataset.del));
  });
  el.querySelectorAll('[data-hnode]').forEach(inp => {
    inp.addEventListener('change', e => {
      b.nodes[e.target.dataset.hnode].h = parseFloat(e.target.value) || 0;
      renderBuilderPreview();
    });
  });
  el.querySelectorAll('[data-costedge]').forEach(inp => {
    inp.addEventListener('change', e => {
      const edge = b.edges.find(x => x.to === e.target.dataset.costedge);
      if (edge) edge.cost = parseFloat(e.target.value) || 0;
      renderBuilderPreview();
    });
  });
  el.querySelectorAll('[data-goalnode]').forEach(inp => {
    inp.addEventListener('change', e => {
      const n = e.target.dataset.goalnode;
      if (e.target.checked) { if (!b.goals.includes(n)) b.goals.push(n); }
      else { b.goals = b.goals.filter(g => g !== n); }
      const useBtn = document.getElementById('bUse');
      useBtn.disabled = !b.root || !b.goals.length;
    });
  });
}

function deleteBuilderNode(name) {
  const b = state.builder;
  // Un nodo cae solo si TODOS sus padres también caen (soporta nodos con más de un padre, como L en el árbol clásico).
  const toDelete = new Set([name]);
  let changed = true;
  while (changed) {
    changed = false;
    Object.keys(b.nodes).forEach(n => {
      if (toDelete.has(n)) return;
      const parents = b.edges.filter(e => e.to === n).map(e => e.from);
      if (parents.length && parents.every(p => toDelete.has(p))) { toDelete.add(n); changed = true; }
    });
  }
  toDelete.forEach(n => delete b.nodes[n]);
  b.edges = b.edges.filter(e => !toDelete.has(e.from) && !toDelete.has(e.to));
  b.goals = b.goals.filter(g => !toDelete.has(g));
  if (toDelete.has(b.root)) b.root = null;
  renderBuilderAll();
}

function renderBuilderPresetSelect() {
  const sel = document.getElementById('builderPresetSelect');
  if (!sel || sel.dataset.filled) return;
  sel.dataset.filled = '1';
  sel.innerHTML = Object.entries(PRESETS).map(([id, p]) => `<option value="${id}">${p.name}</option>`).join('');
}

function loadPresetIntoBuilder(id) {
  const preset = PRESETS[id];
  if (!preset) return;
  state.builder = cloneGraph(preset.graph);
  renderBuilderAll();
}

function renderBuilderPreview() {
  const b = state.builder;
  const graph = { root: b.root, nodes: b.nodes, edges: b.edges, goals: b.goals };
  if (!b.root) { svg.innerHTML = ''; svg.setAttribute('viewBox', '0 0 760 360'); return; }
  const prevGraph = state.graph;
  state.graph = graph;
  buildSvgSkeleton();
  showHeuristics(true);
  showCosts(true);
  renderTree(null);
  state.graph = prevGraph;
}

function renderBuilderAll() {
  renderBuilderForm();
  renderBuilderList();
  renderBuilderPreview();
  const useBtn = document.getElementById('bUse');
  useBtn.disabled = !state.builder.root || !state.builder.goals.length;
  useBtn.title = useBtn.disabled ? 'Definí al menos un nodo raíz y un estado solución' : '';
}

function resetBuilder() {
  state.builder = { nodes: {}, edges: [], goals: [], root: null };
  renderBuilderAll();
}

function useBuilderGraph() {
  const b = state.builder;
  if (!b.root || !b.goals.length) return;
  state.presetId = null;
  state.graph = { root: b.root, nodes: JSON.parse(JSON.stringify(b.nodes)), edges: JSON.parse(JSON.stringify(b.edges)), goals: b.goals.slice() };
  state.goal = state.graph.goals[0];
  switchTab('sim');
  buildSvgSkeleton();
  renderScenarioSelect();
  if (state.algo) runAlgo(); else { showHeuristics(false); showCosts(false); renderTree(null); }
}

/* =========================================================================
   TABS
   ========================================================================= */

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('simPanel').style.display = tab === 'sim' ? 'block' : 'none';
  document.getElementById('builderPanel').style.display = tab === 'builder' ? 'block' : 'none';
  if (tab === 'builder') renderBuilderAll();
  else { buildSvgSkeleton(); if (state.algo) runAlgo(); else renderTree(null); }
}

/* =========================================================================
   WIRING INICIAL
   ========================================================================= */

document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

document.querySelectorAll('.algo-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.algo = btn.dataset.algo;
    renderExplanation();
    renderParams();
    runAlgo();
  });
});

document.getElementById('btnPlay').addEventListener('click', () => (state.playing ? pause() : play()));
document.getElementById('btnNext').addEventListener('click', nextStep);
document.getElementById('btnPrev').addEventListener('click', prevStep);
document.getElementById('btnReset').addEventListener('click', resetSteps);
document.getElementById('bReset').addEventListener('click', resetBuilder);
document.getElementById('bUse').addEventListener('click', useBuilderGraph);
document.getElementById('builderLoadPreset').addEventListener('click', () => {
  loadPresetIntoBuilder(document.getElementById('builderPresetSelect').value);
});
document.getElementById('scenarioSelect').addEventListener('change', e => {
  if (e.target.value === 'custom') return;
  loadPreset(e.target.value);
});

renderBuilderPresetSelect();
renderScenarioSelect();
buildSvgSkeleton();
showHeuristics(false);
showCosts(false);
renderTree(null);
renderStepIndicator();
