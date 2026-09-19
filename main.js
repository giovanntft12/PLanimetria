(function () {
  'use strict';

  /* ==========================================================================
     1. CONFIGURACIÓN Y PALETAS DE COLOR (para dibujar en el canvas)
     ========================================================================== */
  const CONFIG = {
    COLORS_LIGHT: {
      primary: '#1f3a5f',
      primaryFill: 'rgba(31,58,95,0.06)',
      error: '#b3261e',
      errorFill: 'rgba(179,38,30,0.08)',
      ringStroke: '#ffffff',
      plate: 'rgba(255,255,255,0.92)',
      text: '#1c2430',
      highlight: '#b8842a',
      gray: '#c9ccd1',
      canvasBg: '#ffffff'
    },
    COLORS_DARK: {
      primary: '#7ea6d8',
      primaryFill: 'rgba(126,166,216,0.14)',
      error: '#e2837c',
      errorFill: 'rgba(226,131,124,0.16)',
      ringStroke: '#0d1117',
      plate: 'rgba(13,17,23,0.88)',
      text: '#e7ebf1',
      highlight: '#e8b768',
      gray: '#3a4048',
      canvasBg: '#10151c'
    },
    CANVAS: {
      padding: 80,
      vertexRadius: 8,
      lineWidth: 2.2
    },
    FONTS: {
      ui: '13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      angles: '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      scale: '11px ui-monospace, Menlo, Consolas, monospace',
      system: '-apple-system, sans-serif'
    }
  };

  // Paleta activa para el dibujo en pantalla (cambia con el modo oscuro)
  let ACTIVE = CONFIG.COLORS_LIGHT;

  // Paleta fija (modo claro) que se usa siempre para los archivos exportados,
  // para que el PDF/PNG conserve el mismo estilo "de papel" sin importar el tema.
  const EXPORT_PALETTE = {
    bg: '#f4f4f2', panel: '#ffffff', panel2: '#f7f7f5', line: '#e2e2de',
    ink: '#1c2430', muted: '#6b7280', navy: '#1f3a5f', red: '#b3261e'
  };
  const FONT_SYS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif';
  const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

  /* ==========================================================================
     2. ELEMENTOS DEL DOM
     ========================================================================== */
  const DOM = {
    canvas: document.getElementById('lote'),
    ctx: document.getElementById('lote').getContext('2d'),
    ui: {
      areaValue: document.getElementById('areaValue'),
      sidesReadout: document.getElementById('sidesReadout'),
      statsRow: document.getElementById('statsRow'),
      coordsTable: document.getElementById('coordsTable'),
      warnBox: document.getElementById('warnBox'),
      hintBox: document.getElementById('hintBox'),
      sideInputsContainer: document.getElementById('sideInputsContainer'),
      angleInputsContainer: document.getElementById('angleInputsContainer'),
      zoomReadout: document.getElementById('zoomReadout')
    },
    controls: {
      numSides: document.getElementById('numSides'),
      btnUpdateSides: document.getElementById('btnUpdateSides'),
      fontSize: document.getElementById('fontSize'),
      textRotation: document.getElementById('textRotation'),
      toggleAngles: document.getElementById('toggleAngles'),
      btnDeleteSelected: document.getElementById('btnDeleteSelected'),
      btnClearAnnotations: document.getElementById('btnClearAnnotations'),
      btnApply: document.getElementById('btnApply'),
      btnReset: document.getElementById('btnReset'),
      btnSave: document.getElementById('btnSave'),
      btnSavePDF: document.getElementById('btnSavePDF'),
      imageFileInput: document.getElementById('imageFileInput'),
      bgFileInput: document.getElementById('bgFileInput'),
      btnAddBackground: document.getElementById('btnAddBackground'),
      bgScale: document.getElementById('bgScale'),
      btnRemoveBackground: document.getElementById('btnRemoveBackground'),
      darkModeToggle: document.getElementById('darkModeToggle'),
      labelFontSize: document.getElementById('labelFontSize'),
      sideStyle: document.getElementById('sideStyle'),
      lineStyle: document.getElementById('lineStyle'),
      btnZoomIn: document.getElementById('btnZoomIn'),
      btnZoomOut: document.getElementById('btnZoomOut'),
      btnZoomFit: document.getElementById('btnZoomFit'),
      btnOpenMaps: document.getElementById('btnOpenMaps'),
      lotDireccion: document.getElementById('lotDireccion'),
      lotMunicipio: document.getElementById('lotMunicipio'),
      lotMatricula: document.getElementById('lotMatricula'),
      lotPropietario: document.getElementById('lotPropietario'),
      lotObservaciones: document.getElementById('lotObservaciones'),
      lotLat: document.getElementById('lotLat'),
      lotLng: document.getElementById('lotLng'),
      lotMapsLink: document.getElementById('lotMapsLink')
    },
    modes: {
      mover: document.getElementById('modeMover'),
      texto: document.getElementById('modeTexto'),
      linea: document.getElementById('modeLinea'),
      imagen: document.getElementById('modeImagen')
    }
  };

  /* ==========================================================================
     3. ESTADO DE LA APLICACIÓN (STATE)
     ========================================================================== */
  const State = {
    lengths: [20, 20, 20, 20],   // array indexado 0..n-1, un valor por lado
    names: ['Lado 1', 'Lado 2', 'Lado 3', 'Lado 4'],
    points: [],

    // Medidas y cotas
    labelFontSize: 13,        // tamaño de letra de las medidas (lados y líneas/cotas)
    sideStyle: 'cota-flechas', // 'texto' | 'cota-flechas' | 'cota-marcas' — medidas del lote
    lineStyle: 'cota-flechas', // 'simple' | 'medida' | 'cota-flechas' | 'cota-marcas' — líneas dibujadas

    view: { scale: 1, offX: 0, offY: 0, baseScale: 1, minScale: 0.1, maxScale: 10 },

    // Interacción
    mode: 'mover', // 'mover' | 'texto' | 'linea' | 'imagen'
    showAngles: false,
    darkMode: false,

    // Arrastre y selección
    dragIndex: -1,
    dragTarget: null,
    selected: null,   // {type: 'text'|'line'|'image', index}
    pinch: null,      // pellizco de dos dedos {startDist, startScale, anchorModel}
    snapPoint: null,  // punto (modelo) donde un extremo de línea se "pegó" a otro (imán)

    // Herramientas
    lineStart: null,
    previewPoint: null,
    annotations: { texts: [], lines: [], images: [] },

    // Imagen pendiente de colocar (modo 'imagen')
    pendingImage: null,
    // Input de texto flotante activo
    pendingTextInput: null,

    // Imagen de fondo
    background: null, // {img, cx, cy, baseWidth, baseHeight, scale}

    // Últimas estadísticas calculadas (para exportar)
    lastStats: { area: 0, perimetro: 0, isInvalid: false }
  };

  /* ==========================================================================
     4. UTILIDADES MATEMÁTICAS Y GEOMÉTRICAS
     ========================================================================== */
  const MathUtils = {
    formatEs: (n, decimals) => n.toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),

    shoelaceArea: (pts) => {
      let area = 0;
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
        area += p1.x * p2.y - p2.x * p1.y;
      }
      return Math.abs(area) / 2;
    },

    ccw: (a, b, c) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x),

    segmentsIntersect: (p1, p2, p3, p4) => {
      return (MathUtils.ccw(p1, p3, p4) !== MathUtils.ccw(p2, p3, p4)) &&
             (MathUtils.ccw(p1, p2, p3) !== MathUtils.ccw(p1, p2, p4));
    },

    // Comprueba autointersección para un polígono de N lados (N >= 4),
    // ignorando pares de lados adyacentes (comparten un vértice).
    isSelfIntersecting: (pts) => {
      const n = pts.length;
      if (n < 4) return false;
      for (let i = 0; i < n; i++) {
        const a1 = pts[i], a2 = pts[(i + 1) % n];
        for (let j = i + 1; j < n; j++) {
          const isAdjacent = (j === (i + 1) % n) || ((j + 1) % n === i) || (j === i);
          if (isAdjacent) continue;
          const b1 = pts[j], b2 = pts[(j + 1) % n];
          if (MathUtils.segmentsIntersect(a1, a2, b1, b2)) return true;
        }
      }
      return false;
    },

    distToSegment: (p, a, b) => {
      const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
      let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
      return Math.hypot(p.x - proj.x, p.y - proj.y);
    },

    // Ángulo interior (0-180°) en el vértice i, dado un arreglo de puntos (modelo o canvas)
    cornerAngleDeg: (pts, i) => {
      const n = pts.length;
      const prev = pts[(i - 1 + n) % n], vertex = pts[i], next = pts[(i + 1) % n];
      const u = { x: prev.x - vertex.x, y: prev.y - vertex.y };
      const w = { x: next.x - vertex.x, y: next.y - vertex.y };
      const lu = Math.hypot(u.x, u.y), lw = Math.hypot(w.x, w.y);
      if (!lu || !lw) return 0;
      const cosine = (u.x * w.x + u.y * w.y) / (lu * lw);
      return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
    }
  };

  /* ==========================================================================
     5. LÓGICA DE LA FORMA Y VISTA (zoom / desplazamiento)
     ========================================================================== */
  const Geometry = {
    namesFor: (n) => (n === 4 ? ['Lado 1', 'Lado 2', 'Lado 3', 'Lado 4'] : Array.from({ length: n }, (_, i) => `Lado ${i + 1}`)),

    edgesFromLengths: (lengths) => lengths.map((L, i) => [i, (i + 1) % lengths.length, L]),

    relax: (pts, edges, pinned, iterations) => {
      // 'pinned' puede ser un solo índice (como al arrastrar un vértice) o un
      // arreglo de índices (como al fijar una esquina y sus dos vecinos al editar un ángulo).
      const pinSet = Array.isArray(pinned) ? new Set(pinned) : new Set([pinned]);

      for (let it = 0; it < iterations; it++) {
        for (const [a, b, L] of edges) {
          const pa = pts[a], pb = pts[b];
          let dx = pb.x - pa.x, dy = pb.y - pa.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1e-9) dist = 1e-9;

          const diff = (dist - L) / dist;
          const aPinned = pinSet.has(a), bPinned = pinSet.has(b);

          if (aPinned && bPinned) continue;

          if (aPinned) {
            pb.x = pa.x + dx * (L / dist); pb.y = pa.y + dy * (L / dist);
          } else if (bPinned) {
            pa.x = pb.x - dx * (L / dist); pa.y = pb.y - dy * (L / dist);
          } else {
            pa.x += dx * diff * 0.5; pa.y += dy * diff * 0.5;
            pb.x -= dx * diff * 0.5; pb.y -= dy * diff * 0.5;
          }
        }
      }
    },

    // Forma inicial: un polígono regular aproximado (a partir del perímetro)
    // que luego se relaja para cumplir exactamente las longitudes pedidas.
    // El desfase de medio paso (Math.PI/n) coloca los VÉRTICES en las esquinas
    // (NE, SE, SO, NO) en vez de sobre los puntos cardinales, para que cada
    // LADO (Este, Norte, Oeste, Sur) quede alineado con la brújula del plano.
    defaultShape: (lengths) => {
      const n = lengths.length;
      const perimeter = lengths.reduce((s, l) => s + l, 0) || n;
      const radius = Math.max(perimeter / (2 * Math.PI), 0.5);
      const pts = [];
      for (let i = 0; i < n; i++) {
        const angle = -Math.PI / 2 + Math.PI / n + i * (2 * Math.PI / n);
        pts.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) + radius });
      }
      Geometry.relax(pts, Geometry.edgesFromLengths(lengths), -1, 600);
      return pts;
    },

    // Ajusta la vista para que toda la forma sea visible; define además
    // la escala "base" (100% de zoom) y los límites de acercamiento.
    fitView: () => {
      const xs = State.points.map(p => p.x);
      const ys = State.points.map(p => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);

      const w = Math.max(maxX - minX, 1);
      const h = Math.max(maxY - minY, 1);
      const availW = DOM.canvas.width - (CONFIG.CANVAS.padding * 2);
      const availH = DOM.canvas.height - (CONFIG.CANVAS.padding * 2);

      const scale = Math.min(availW / w, availH / h);
      State.view.scale = scale;
      State.view.baseScale = scale;
      State.view.minScale = scale * 0.15;
      State.view.maxScale = scale * 10;
      State.view.offX = (DOM.canvas.width - (w * scale)) / 2 - minX * scale;
      State.view.offY = (DOM.canvas.height - (h * scale)) / 2 + maxY * scale;
    },

    toCanvas: (p) => ({
      x: State.view.offX + p.x * State.view.scale,
      y: State.view.offY - p.y * State.view.scale
    }),

    toModel: (cx, cy) => ({
      x: (cx - State.view.offX) / State.view.scale,
      y: (State.view.offY - cy) / State.view.scale
    })
  };

  /* ==========================================================================
     6. ZOOM
     ========================================================================== */
  const Zoom = {
    clamp: (s) => Math.max(State.view.minScale, Math.min(State.view.maxScale, s)),

    // Cambia la escala manteniendo fijo el punto del modelo bajo (cx, cy)
    zoomAt: (cx, cy, factor) => {
      const before = Geometry.toModel(cx, cy);
      const newScale = Zoom.clamp(State.view.scale * factor);
      State.view.scale = newScale;
      State.view.offX = cx - before.x * newScale;
      State.view.offY = cy + before.y * newScale;
      App.updateAndRender();
    },

    // Fija la escala absoluta ancorada a un punto del modelo en una posición de canvas dada
    setScaleAt: (newScale, cx, cy, modelAnchor) => {
      const clamped = Zoom.clamp(newScale);
      State.view.scale = clamped;
      State.view.offX = cx - modelAnchor.x * clamped;
      State.view.offY = cy + modelAnchor.y * clamped;
      App.updateAndRender();
    }
  };

  /* ==========================================================================
     7. DETECCIÓN DE ELEMENTOS BAJO EL CURSOR (HIT-TESTING)
     ========================================================================== */
  const Hit = {
    vertexAt: (cx, cy) => State.points.findIndex((p) => {
      const c = Geometry.toCanvas(p);
      return Math.hypot(c.x - cx, c.y - cy) < 20;
    }),

    imageHandleAt: (cx, cy) => {
      for (let i = State.annotations.images.length - 1; i >= 0; i--) {
        const im = State.annotations.images[i];
        const c = Geometry.toCanvas({ x: im.x, y: im.y });
        const w = im.w * State.view.scale, h = im.h * State.view.scale;
        const angle = (im.rotation || 0) * Math.PI / 180;
        const hx = c.x + (w / 2) * Math.cos(angle) - (h / 2) * Math.sin(angle);
        const hy = c.y + (w / 2) * Math.sin(angle) + (h / 2) * Math.cos(angle);
        if (Math.hypot(hx - cx, hy - cy) < 12) return i;
      }
      return -1;
    },

    imageAt: (cx, cy) => {
      for (let i = State.annotations.images.length - 1; i >= 0; i--) {
        const im = State.annotations.images[i];
        const c = Geometry.toCanvas({ x: im.x, y: im.y });
        const w = im.w * State.view.scale, h = im.h * State.view.scale;
        const angle = -(im.rotation || 0) * Math.PI / 180;
        const dx = cx - c.x, dy = cy - c.y;
        const lx = dx * Math.cos(angle) - dy * Math.sin(angle);
        const ly = dx * Math.sin(angle) + dy * Math.cos(angle);
        if (Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2) return i;
      }
      return -1;
    },

    textAt: (cx, cy) => {
      const { ctx } = DOM;
      for (let i = State.annotations.texts.length - 1; i >= 0; i--) {
        const t = State.annotations.texts[i];
        const c = Geometry.toCanvas({ x: t.x, y: t.y });
        const size = t.size || 16;
        ctx.font = `${size}px ${CONFIG.FONTS.system}`;
        const w = ctx.measureText(t.text).width;
        const angle = -(t.rotation || 0) * Math.PI / 180;
        const dx = cx - c.x, dy = cy - c.y;
        const lx = dx * Math.cos(angle) - dy * Math.sin(angle);
        const ly = dx * Math.sin(angle) + dy * Math.cos(angle);
        if (lx >= -6 && lx <= w + 6 && ly >= -size * 0.85 - 6 && ly <= size * 0.3 + 6) return i;
      }
      return -1;
    },

    lineEndpointAt: (cx, cy) => {
      for (let i = State.annotations.lines.length - 1; i >= 0; i--) {
        const l = State.annotations.lines[i];
        const a = Geometry.toCanvas({ x: l.x1, y: l.y1 });
        const b = Geometry.toCanvas({ x: l.x2, y: l.y2 });
        if (Math.hypot(a.x - cx, a.y - cy) < 10) return { index: i, which: 'a' };
        if (Math.hypot(b.x - cx, b.y - cy) < 10) return { index: i, which: 'b' };
      }
      return null;
    },

    lineBodyAt: (cx, cy) => {
      for (let i = State.annotations.lines.length - 1; i >= 0; i--) {
        const l = State.annotations.lines[i];
        const a = Geometry.toCanvas({ x: l.x1, y: l.y1 });
        const b = Geometry.toCanvas({ x: l.x2, y: l.y2 });
        if (MathUtils.distToSegment({ x: cx, y: cy }, a, b) < 7) return i;
      }
      return -1;
    },

    backgroundAt: (cx, cy) => {
      const bg = State.background;
      if (!bg || !bg.img) return false;
      const w = bg.baseWidth * bg.scale * State.view.scale;
      const h = bg.baseHeight * bg.scale * State.view.scale;
      const c = Geometry.toCanvas({ x: bg.cx, y: bg.cy });
      return Math.abs(cx - c.x) <= w / 2 && Math.abs(cy - c.y) <= h / 2;
    },

    // Manija de rotación de la imagen SELECCIONADA (arriba de su caja)
    imageRotateHandleAt: (cx, cy) => {
      const sel = State.selected;
      if (!sel || sel.type !== 'image') return -1;
      const im = State.annotations.images[sel.index];
      if (!im) return -1;
      const c = Geometry.toCanvas({ x: im.x, y: im.y });
      const h = im.h * State.view.scale;
      const rad = (im.rotation || 0) * Math.PI / 180;
      const localY = -h / 2 - 18;
      const hx = c.x - localY * Math.sin(rad);
      const hy = c.y + localY * Math.cos(rad);
      return Math.hypot(hx - cx, hy - cy) < 12 ? sel.index : -1;
    },

    // Manija de rotación del texto SELECCIONADO (arriba de su caja)
    textRotateHandleAt: (cx, cy) => {
      const sel = State.selected;
      if (!sel || sel.type !== 'text') return -1;
      const t = State.annotations.texts[sel.index];
      if (!t) return -1;
      const { ctx } = DOM;
      const size = t.size || 16;
      ctx.font = `${size}px ${CONFIG.FONTS.system}`;
      const w = ctx.measureText(t.text).width;
      const c = Geometry.toCanvas({ x: t.x, y: t.y });
      const rad = (t.rotation || 0) * Math.PI / 180;
      const localX = w / 2, localY = -size * 0.85 - 4 - 18;
      const hx = c.x + localX * Math.cos(rad) - localY * Math.sin(rad);
      const hy = c.y + localX * Math.sin(rad) + localY * Math.cos(rad);
      return Math.hypot(hx - cx, hy - cy) < 12 ? sel.index : -1;
    }
  };

  /* ==========================================================================
     7b. IMÁN ENTRE EXTREMOS DE LÍNEAS
     ========================================================================== */
  const Snap = {
    THRESHOLD_PX: 14,

    // Busca el extremo de otra línea más cercano a modelPoint (en px de pantalla).
    // excludeLineIndex/excludeWhich evitan que un extremo se "pegue" a sí mismo.
    findNearbyEndpoint: (modelPoint, excludeLineIndex, excludeWhich) => {
      const target = Geometry.toCanvas(modelPoint);
      let best = null, bestDist = Snap.THRESHOLD_PX;
      State.annotations.lines.forEach((l, li) => {
        [['a', l.x1, l.y1], ['b', l.x2, l.y2]].forEach(([which, x, y]) => {
          if (li === excludeLineIndex && which === excludeWhich) return;
          const c = Geometry.toCanvas({ x, y });
          const d = Math.hypot(c.x - target.x, c.y - target.y);
          if (d < bestDist) { bestDist = d; best = { x, y }; }
        });
      });
      return best;
    }
  };

  /* ==========================================================================
     8. MOTOR DE RENDERIZADO (CANVAS)
     Cada función recibe el contexto (ctx) y la paleta de colores (colors) para
     poder reutilizarse tanto en el canvas de pantalla como en la exportación.
     ========================================================================== */
  const Render = {
    clear: (ctx) => ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height),

    paperBackground: (ctx, colors) => {
      ctx.save();
      ctx.fillStyle = colors.canvasBg;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    },

    background: (ctx) => {
      const bg = State.background;
      if (!bg || !bg.img) return;
      const w = bg.baseWidth * bg.scale * State.view.scale;
      const h = bg.baseHeight * bg.scale * State.view.scale;
      const c = Geometry.toCanvas({ x: bg.cx, y: bg.cy });
      ctx.save();
      ctx.drawImage(bg.img, c.x - w / 2, c.y - h / 2, w, h);
      ctx.restore();
    },

    shape: (ctx, canvasPoints, isInvalid, colors) => {
      ctx.beginPath();
      canvasPoints.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();

      ctx.fillStyle = isInvalid ? colors.errorFill : colors.primaryFill;
      ctx.fill();

      ctx.lineWidth = CONFIG.CANVAS.lineWidth;
      ctx.strokeStyle = isInvalid ? colors.error : colors.primary;
      ctx.stroke();
    },

    labels: (ctx, canvasPoints, colors) => {
      const size = State.labelFontSize || 13;
      const style = State.sideStyle || 'cota-flechas';
      const n = canvasPoints.length;
      const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

      for (let i = 0; i < n; i++) {
        const a = canvasPoints[i], b = canvasPoints[(i + 1) % n];

        if (style === 'cota-flechas' || style === 'cota-marcas') {
          Render.drawDimensionDecorations(ctx, a, b, style, colors.primary);
        }

        const label = `${State.names[i]}  ${MathUtils.formatEs(State.lengths[i], 2)} m`;
        Render.drawDimensionLabel(ctx, a, b, label, colors.plate, colors.primary, size, monoFont);
      }
    },

    cornerAngles: (ctx, canvasPoints, colors) => {
      ctx.save();
      ctx.font = CONFIG.FONTS.angles;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < canvasPoints.length; i++) {
        const previous = canvasPoints[(i + canvasPoints.length - 1) % canvasPoints.length];
        const vertex = canvasPoints[i];
        const next = canvasPoints[(i + 1) % canvasPoints.length];
        const firstSide = { x: previous.x - vertex.x, y: previous.y - vertex.y };
        const secondSide = { x: next.x - vertex.x, y: next.y - vertex.y };
        const firstLength = Math.hypot(firstSide.x, firstSide.y);
        const secondLength = Math.hypot(secondSide.x, secondSide.y);
        if (!firstLength || !secondLength) continue;

        const cosine = (firstSide.x * secondSide.x + firstSide.y * secondSide.y) / (firstLength * secondLength);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;

        let bisectorX = firstSide.x / firstLength + secondSide.x / secondLength;
        let bisectorY = firstSide.y / firstLength + secondSide.y / secondLength;
        const bisectorLength = Math.hypot(bisectorX, bisectorY) || 1;
        bisectorX /= bisectorLength;
        bisectorY /= bisectorLength;

        const labelX = vertex.x + bisectorX * 34;
        const labelY = vertex.y + bisectorY * 34;
        const label = `${MathUtils.formatEs(angle, 1)}°`;
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = colors.plate;
        ctx.fillRect(labelX - textWidth / 2 - 4, labelY - 9, textWidth + 8, 18);
        ctx.fillStyle = colors.error;
        ctx.fillText(label, labelX, labelY);
      }
      ctx.restore();
    },

    vertices: (ctx, canvasPoints, colors, dragIndex) => {
      canvasPoints.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, CONFIG.CANVAS.vertexRadius, 0, Math.PI * 2);
        ctx.fillStyle = (i === dragIndex) ? colors.highlight : colors.primary;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = colors.ringStroke;
        ctx.stroke();
      });
    },

    images: (ctx, colors, interactive) => {
      State.annotations.images.forEach((im, i) => {
        const c = Geometry.toCanvas({ x: im.x, y: im.y });
        const w = im.w * State.view.scale, h = im.h * State.view.scale;
        const isSelected = interactive && State.selected && State.selected.type === 'image' && State.selected.index === i;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate((im.rotation || 0) * Math.PI / 180);
        ctx.drawImage(im.img, -w / 2, -h / 2, w, h);

        if (isSelected) {
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = colors.primary;
          ctx.strokeRect(-w / 2, -h / 2, w, h);

          ctx.setLineDash([]);
          ctx.fillStyle = colors.primary;
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, 6, 0, Math.PI * 2);
          ctx.fill();

          // Manija de rotación (círculo arriba de la imagen)
          ctx.beginPath();
          ctx.moveTo(0, -h / 2);
          ctx.lineTo(0, -h / 2 - 18);
          ctx.strokeStyle = colors.primary;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, -h / 2 - 18, 6, 0, Math.PI * 2);
          ctx.fillStyle = colors.primary;
          ctx.fill();
        }
        ctx.restore();
      });
    },

    // Punta de flecha: dibuja un triángulo con la punta en (tipX,tipY) apuntando en dirAngle
    drawArrowHead: (ctx, tipX, tipY, dirAngle, size, color) => {
      const backAngle = dirAngle + Math.PI;
      const spread = 0.35;
      const x1 = tipX + size * Math.cos(backAngle - spread);
      const y1 = tipY + size * Math.sin(backAngle - spread);
      const x2 = tipX + size * Math.cos(backAngle + spread);
      const y2 = tipY + size * Math.sin(backAngle + spread);
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    },

    // Marca oblicua (45°) típica de cotas arquitectónicas, centrada en (x,y)
    drawTick: (ctx, x, y, lineAngle, size, color) => {
      const tickAngle = lineAngle + Math.PI / 4;
      const hx = Math.cos(tickAngle) * size / 2, hy = Math.sin(tickAngle) * size / 2;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x - hx, y - hy);
      ctx.lineTo(x + hx, y + hy);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    },

    // Decoraciones de cota (flechas o marcas) en los extremos de un tramo a-b
    drawDimensionDecorations: (ctx, a, b, style, color) => {
      const angleAtoB = Math.atan2(b.y - a.y, b.x - a.x);
      if (style === 'cota-flechas') {
        Render.drawArrowHead(ctx, a.x, a.y, angleAtoB + Math.PI, 9, color);
        Render.drawArrowHead(ctx, b.x, b.y, angleAtoB, 9, color);
      } else if (style === 'cota-marcas') {
        Render.drawTick(ctx, a.x, a.y, angleAtoB, 12, color);
        Render.drawTick(ctx, b.x, b.y, angleAtoB, 12, color);
      }
    },

    // Texto de una medida, alineado con el tramo a-b (como en un plano técnico)
    drawDimensionLabel: (ctx, a, b, label, plateColor, textColor, size, fontFamily) => {
      const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
      let textAngle = Math.atan2(b.y - a.y, b.x - a.x);
      if (Math.cos(textAngle) < 0) textAngle += Math.PI;

      ctx.save();
      ctx.translate(midX, midY);
      ctx.rotate(textAngle);
      ctx.font = `${size}px ${fontFamily}`;
      ctx.textAlign = 'center';
      const w = ctx.measureText(label).width;
      const offsetY = -8;
      ctx.fillStyle = plateColor;
      ctx.fillRect(-w / 2 - 5, offsetY - size, w + 10, size + 4);
      ctx.fillStyle = textColor;
      ctx.fillText(label, 0, offsetY);
      ctx.restore();
    },

    // Dibuja una línea/cota completa: trazo, remates (flechas o marcas) y texto de medida
    drawDimensionLine: (ctx, a, b, realLength, colors, isSelected) => {
      const style = State.lineStyle || 'cota-flechas';

      ctx.lineWidth = isSelected ? 3 : 1.8;
      ctx.strokeStyle = colors.error;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      if (style === 'cota-flechas' || style === 'cota-marcas') {
        Render.drawDimensionDecorations(ctx, a, b, style, colors.error);
      }

      if (style !== 'simple') {
        const size = State.labelFontSize || 13;
        const label = `${MathUtils.formatEs(realLength, 2)} m`;
        Render.drawDimensionLabel(ctx, a, b, label, colors.plate, colors.error, size, CONFIG.FONTS.system);
      }

      if (isSelected) {
        ctx.save();
        ctx.fillStyle = colors.error;
        [a, b].forEach(pt => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
    },

    annotations: (ctx, colors, interactive) => {
      // Líneas / cotas
      State.annotations.lines.forEach((l, i) => {
        const a = Geometry.toCanvas({ x: l.x1, y: l.y1 });
        const b = Geometry.toCanvas({ x: l.x2, y: l.y2 });
        const isSelected = interactive && State.selected && State.selected.type === 'line' && State.selected.index === i;
        const realLength = Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
        Render.drawDimensionLine(ctx, a, b, realLength, colors, isSelected);
      });

      // Textos
      ctx.textAlign = 'left';
      State.annotations.texts.forEach((t, i) => {
        ctx.font = `${t.size || 16}px ${CONFIG.FONTS.system}`;
        const c = Geometry.toCanvas({ x: t.x, y: t.y });
        const isSelected = interactive && State.selected && State.selected.type === 'text' && State.selected.index === i;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate((t.rotation || 0) * Math.PI / 180);

        if (isSelected) {
          ctx.setLineDash([4, 3]);
          ctx.strokeStyle = colors.primary;
          const w = ctx.measureText(t.text).width, h = t.size || 16;
          const topY = -h * 0.85 - 4;
          ctx.strokeRect(-4, topY, w + 8, h * 1.15 + 8);

          // Manija de rotación (círculo arriba del texto)
          ctx.setLineDash([]);
          const handleX = w / 2, handleY = topY - 18;
          ctx.beginPath();
          ctx.moveTo(handleX, topY);
          ctx.lineTo(handleX, handleY);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(handleX, handleY, 6, 0, Math.PI * 2);
          ctx.fillStyle = colors.primary;
          ctx.fill();
        }

        ctx.fillStyle = colors.error;
        ctx.fillText(t.text, 0, 0);
        ctx.restore();
      });
    },

    linePreview: (ctx, colors) => {
      if (!State.lineStart || !State.previewPoint) return;
      const a = Geometry.toCanvas(State.lineStart);
      const b = Geometry.toCanvas(State.previewPoint);
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = colors.error;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.restore();
    },

    // Resalta el punto donde un extremo de línea se "pegó" (imán) a otro
    snapIndicator: (ctx, colors) => {
      if (!State.snapPoint) return;
      const c = Geometry.toCanvas(State.snapPoint);
      ctx.save();
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = colors.highlight;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },

    compass: (ctx, colors) => {
      const cx = ctx.canvas.width - 74, cy = 74, r = 42;
      ctx.save();
      ctx.lineWidth = 1.5; ctx.strokeStyle = colors.primary; ctx.fillStyle = colors.plate;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, cy - r + 6); ctx.lineTo(cx, cy + r - 6);
      ctx.moveTo(cx - r + 6, cy); ctx.lineTo(cx + r - 6, cy);
      ctx.strokeStyle = colors.gray; ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, cy - r + 8); ctx.lineTo(cx - 7, cy); ctx.lineTo(cx + 7, cy); ctx.closePath();
      ctx.fillStyle = colors.error; ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx, cy + r - 8); ctx.lineTo(cx - 7, cy); ctx.lineTo(cx + 7, cy); ctx.closePath();
      ctx.fillStyle = colors.primary; ctx.fill();

      ctx.font = `600 12px ${CONFIG.FONTS.system}`;
      ctx.fillStyle = colors.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('N', cx, cy - r - 10); ctx.fillText('S', cx, cy + r + 12);
      ctx.fillText('E', cx + r + 12, cy); ctx.fillText('O', cx - r - 12, cy);
      ctx.restore();
    },

    scaleBar: (ctx, colors) => {
      const targetPx = 160, targetM = targetPx / State.view.scale;
      const niceSteps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
      let barM = niceSteps.find(s => s >= targetM) || niceSteps[0];

      const barPx = barM * State.view.scale, x0 = 24, y0 = ctx.canvas.height - 30;
      ctx.save();
      ctx.strokeStyle = colors.text; ctx.fillStyle = colors.text; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0); ctx.lineTo(x0 + barPx, y0);
      ctx.moveTo(x0, y0 - 5); ctx.lineTo(x0, y0 + 5);
      ctx.moveTo(x0 + barPx, y0 - 5); ctx.lineTo(x0 + barPx, y0 + 5);
      ctx.moveTo(x0 + barPx / 2, y0 - 3); ctx.lineTo(x0 + barPx / 2, y0 + 3);
      ctx.stroke();

      ctx.font = CONFIG.FONTS.scale; ctx.textAlign = 'center';
      ctx.fillText('0', x0, y0 - 10); ctx.fillText(`${barM} m`, x0 + barPx, y0 - 10);
      ctx.restore();
    }
  };

  /* ==========================================================================
     9. ACTUALIZACIÓN DEL DOM (UI)
     ========================================================================== */
  const UI = {
    updateAll: (area, perimetro, isInvalid) => {
      DOM.ui.warnBox.style.display = isInvalid ? 'block' : 'none';
      DOM.ui.areaValue.textContent = MathUtils.formatEs(area, 2);

      UI.updateSidesReadout();
      UI.updateStats(area, perimetro, isInvalid);
      UI.updateTable();
      UI.updateControls();
      UI.updateZoomReadout();
      UI.updateAngleInputs();
    },

    updateSidesReadout: () => {
      DOM.ui.sidesReadout.innerHTML = '';
      const n = State.points.length;
      State.points.forEach((a, i) => {
        const b = State.points[(i + 1) % n];
        const realLength = Math.hypot(b.x - a.x, b.y - a.y);
        const targetLength = State.lengths[i];
        const isOk = Math.abs(realLength - targetLength) < 0.02;

        const div = document.createElement('div');
        div.className = 'side-card';
        div.innerHTML = `<div class="name">${State.names[i]}</div><div class="val ${isOk ? 'ok' : 'bad'}">${MathUtils.formatEs(realLength, 2)} m</div>`;
        DOM.ui.sidesReadout.appendChild(div);
      });
    },

    updateStats: (area, perimetro, isInvalid) => {
      DOM.ui.statsRow.innerHTML = `
        <div class="stat-card"><div class="name">Perímetro total</div><div class="val">${MathUtils.formatEs(perimetro, 2)} m</div></div>
        <div class="stat-card"><div class="name">Área</div><div class="val">${MathUtils.formatEs(area, 2)} m²</div></div>
        <div class="stat-card"><div class="name">Forma cerrada</div><div class="val">${isInvalid ? 'No válida' : 'Sí'}</div></div>
      `;
    },

    updateTable: () => {
      let rows = '<tr><th>Vértice</th><th>X (m)</th><th>Y (m)</th></tr>';
      State.points.forEach((p, i) => {
        rows += `<tr><td>${i + 1}</td><td>${MathUtils.formatEs(p.x, 2)}</td><td>${MathUtils.formatEs(p.y, 2)}</td></tr>`;
      });
      DOM.ui.coordsTable.innerHTML = rows;
    },

    updateControls: () => {
      const sel = State.selected;
      DOM.controls.btnDeleteSelected.disabled = !sel;

      const rotatable = !!(sel && (sel.type === 'text' || sel.type === 'image'));
      DOM.controls.textRotation.disabled = !rotatable;
      if (rotatable) {
        const obj = sel.type === 'text' ? State.annotations.texts[sel.index] : State.annotations.images[sel.index];
        if (obj) DOM.controls.textRotation.value = obj.rotation || 0;
      }
    },

    updateZoomReadout: () => {
      const base = State.view.baseScale || State.view.scale;
      const zoomPct = Math.round((State.view.scale / base) * 100);
      const metersPerPixel = 1 / State.view.scale;
      DOM.ui.zoomReadout.textContent = `Zoom: ${zoomPct}% · 1 px ≈ ${MathUtils.formatEs(metersPerPixel, 3)} m`;
    },

    // Genera los campos de longitud según el número de lados
    buildSideInputs: (n, existingValues) => {
      const names = Geometry.namesFor(n);
      let html = '';
      for (let i = 0; i < n; i++) {
        const fallback = 10;
        const val = (existingValues && existingValues[i] != null && !isNaN(existingValues[i])) ? existingValues[i] : fallback;
        html += `
          <div class="field">
            <label for="side-${i}">${names[i]} (m)</label>
            <input type="number" step="0.01" min="0.01" id="side-${i}" value="${val}">
          </div>`;
      }
      DOM.ui.sideInputsContainer.innerHTML = html;
    },

    // Genera un campo editable por vértice para escribir su ángulo interior
    buildAngleInputs: (n) => {
      let html = '';
      for (let i = 0; i < n; i++) {
        html += `
          <div class="field">
            <label for="angle-${i}">Ángulo en V${i + 1}${n === 4 ? ` (${State.names[i]})` : ''}</label>
            <div class="field-row">
              <input type="number" step="0.1" min="1" max="179" id="angle-${i}">
              <span>°</span>
            </div>
          </div>`;
      }
      DOM.ui.angleInputsContainer.innerHTML = html;

      for (let i = 0; i < n; i++) {
        const el = document.getElementById(`angle-${i}`);
        el.addEventListener('change', () => App.setCornerAngle(i, parseFloat(el.value)));
      }
      UI.updateAngleInputs();
    },

    // Refresca los valores mostrados en los campos de ángulo (sin pisar el que se está editando)
    updateAngleInputs: () => {
      const n = State.points.length;
      for (let i = 0; i < n; i++) {
        const el = document.getElementById(`angle-${i}`);
        if (!el || document.activeElement === el) continue;
        el.value = MathUtils.cornerAngleDeg(State.points, i).toFixed(1);
      }
    }
  };

  /* ==========================================================================
     10. CREACIÓN Y EDICIÓN DE TEXTO EN EL PLANO
     ========================================================================== */
  const Interactions = {
    createTextInput: (canvasX, canvasY, modelPoint, editIndex = null) => {
      if (State.pendingTextInput) return;
      const rect = DOM.canvas.getBoundingClientRect();
      const scaleX = rect.width / DOM.canvas.width;
      const scaleY = rect.height / DOM.canvas.height;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'canvas-text-input';
      const size = editIndex != null ? (State.annotations.texts[editIndex].size || 16) : (parseInt(DOM.controls.fontSize.value, 10) || 16);
      input.style.left = (rect.left + canvasX * scaleX) + 'px';
      input.style.top = (rect.top + canvasY * scaleY - 12) + 'px';
      input.style.fontSize = size + 'px';
      if (editIndex != null) input.value = State.annotations.texts[editIndex].text;

      document.body.appendChild(input);
      input.focus();
      if (editIndex != null) input.select();
      State.pendingTextInput = input;

      let done = false;
      const finish = (apply) => {
        if (done) return;
        done = true;
        if (apply) {
          const text = input.value.trim();
          if (editIndex != null) {
            if (text) State.annotations.texts[editIndex].text = text;
            else { State.annotations.texts.splice(editIndex, 1); State.selected = null; }
          } else if (text) {
            State.annotations.texts.push({ x: modelPoint.x, y: modelPoint.y, text, size, rotation: 0 });
          }
        }
        input.remove();
        State.pendingTextInput = null;
        if (State.mode === 'texto') App.setMode('mover');
        else App.updateAndRender();
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); finish(true); }
        if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      });
      input.addEventListener('blur', () => finish(true));
    },

    editText: (idx) => {
      const t = State.annotations.texts[idx];
      const c = Geometry.toCanvas({ x: t.x, y: t.y });
      State.selected = { type: 'text', index: idx };
      Interactions.createTextInput(c.x, c.y, { x: t.x, y: t.y }, idx);
    }
  };

  /* ==========================================================================
     11. TEMA (modo claro / oscuro)
     ========================================================================== */
  const Theme = {
    apply: (dark) => {
      State.darkMode = dark;
      ACTIVE = dark ? CONFIG.COLORS_DARK : CONFIG.COLORS_LIGHT;
      document.body.classList.toggle('dark', dark);
      App.updateAndRender();
    }
  };

  /* ==========================================================================
     12. EXPORTACIÓN (PNG / PDF) CON TABLAS AL ESTILO DE LA PÁGINA
     ========================================================================== */
  const Export = {
    roundRectPath: (ctx, x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    },

    drawBox: (ctx, x, y, w, h, fill, stroke) => {
      Export.roundRectPath(ctx, x, y, w, h, 6);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.lineWidth = 1; ctx.strokeStyle = stroke; ctx.stroke(); }
    },

    sectionTitle: (ctx, x, y, text) => {
      ctx.font = `700 11px ${FONT_SYS}`;
      ctx.fillStyle = EXPORT_PALETTE.muted;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(text.toUpperCase(), x, y);
      return 20;
    },

    statCard: (ctx, x, y, w, h, label, value) => {
      Export.drawBox(ctx, x, y, w, h, EXPORT_PALETTE.panel2, EXPORT_PALETTE.line);
      ctx.font = `11px ${FONT_SYS}`; ctx.fillStyle = EXPORT_PALETTE.muted; ctx.textAlign = 'left';
      ctx.fillText(label, x + 10, y + 18);
      ctx.font = `600 15px ${FONT_MONO}`; ctx.fillStyle = EXPORT_PALETTE.navy;
      ctx.fillText(value, x + 10, y + 38);
    },

    keyValueRow: (ctx, x, y, label, value) => {
      ctx.font = `11px ${FONT_SYS}`; ctx.fillStyle = EXPORT_PALETTE.muted; ctx.textAlign = 'left';
      ctx.fillText(label, x, y);
      ctx.font = `13px ${FONT_SYS}`; ctx.fillStyle = EXPORT_PALETTE.ink;
      ctx.fillText(String(value), x, y + 16);
      return 34;
    },

    table: (ctx, x, y, w, headers, rows, colRatios) => {
      const headerH = 26, rowH = 22;
      const colWidths = colRatios.map(r => r * w);

      ctx.fillStyle = EXPORT_PALETTE.navy;
      ctx.fillRect(x, y, w, headerH);
      ctx.font = `700 11px ${FONT_SYS}`; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left';
      let cx = x;
      headers.forEach((h, i) => { ctx.fillText(h.toUpperCase(), cx + 8, y + 17); cx += colWidths[i]; });

      rows.forEach((row, ri) => {
        const ry = y + headerH + ri * rowH;
        ctx.fillStyle = ri % 2 === 0 ? EXPORT_PALETTE.panel : EXPORT_PALETTE.panel2;
        ctx.fillRect(x, ry, w, rowH);
        ctx.strokeStyle = EXPORT_PALETTE.line; ctx.lineWidth = 1;
        ctx.strokeRect(x, ry, w, rowH);
        let ccx = x;
        row.forEach((cell, ci) => {
          ctx.font = ci === 0 ? `12px ${FONT_SYS}` : `12px ${FONT_MONO}`;
          ctx.fillStyle = EXPORT_PALETTE.ink;
          ctx.fillText(String(cell), ccx + 8, ry + 15);
          ccx += colWidths[ci];
        });
      });

      ctx.strokeStyle = EXPORT_PALETTE.line;
      ctx.strokeRect(x, y, w, headerH + rows.length * rowH);
      return headerH + rows.length * rowH;
    },

    // Dibuja el plano completo (ajustado para verse entero) en un canvas aparte,
    // siempre con la paleta clara, sin tocar la vista que el usuario tiene en pantalla.
    renderPlanSnapshot: () => {
      const savedView = Object.assign({}, State.view);
      Geometry.fitView();

      const off = document.createElement('canvas');
      off.width = DOM.canvas.width;
      off.height = DOM.canvas.height;
      const octx = off.getContext('2d');
      const colors = CONFIG.COLORS_LIGHT;

      Render.paperBackground(octx, colors);
      Render.background(octx);
      const canvasPoints = State.points.map(Geometry.toCanvas);
      const isInvalid = MathUtils.isSelfIntersecting(State.points);
      Render.shape(octx, canvasPoints, isInvalid, colors);
      Render.labels(octx, canvasPoints, colors);
      if (State.showAngles) Render.cornerAngles(octx, canvasPoints, colors);
      Render.images(octx, colors, false);
      Render.annotations(octx, colors, false);
      Render.vertices(octx, canvasPoints, colors, -1);
      Render.compass(octx, colors);
      Render.scaleBar(octx, colors);

      State.view = savedView;
      return off;
    },

    // Construye el reporte completo: plano + tablas de información, con el
    // mismo estilo y paleta de colores que la página.
    build: () => {
      const lot = App.getLotInfo();
      const planSnap = Export.renderPlanSnapshot();

      const width = 1120;
      const padding = 32;
      const contentW = width - padding * 2;
      const planDispW = contentW;
      const planDispH = planDispW * (planSnap.height / planSnap.width);
      const headerH = 70;
      const planY = headerH;
      const dividerY = planY + planDispH + 20;
      const colGap = 20;
      const leftW = 330;
      const rightW = contentW - leftW - colGap;
      const rightX = padding + leftW + colGap;

      // Lienzo de trabajo amplio; se recorta al final a la altura real usada.
      const scratchHeight = 3200;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = scratchHeight;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = EXPORT_PALETTE.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Encabezado
      ctx.font = `700 22px ${FONT_SYS}`; ctx.fillStyle = EXPORT_PALETTE.navy; ctx.textAlign = 'left';
      ctx.fillText('Planimetría del lote', padding, 34);
      ctx.font = `12px ${FONT_SYS}`; ctx.fillStyle = EXPORT_PALETTE.muted;
      const dateStr = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
      ctx.fillText(`Generado el ${dateStr}`, padding, 54);

      ctx.textAlign = 'right';
      ctx.font = `700 26px ${FONT_MONO}`; ctx.fillStyle = EXPORT_PALETTE.navy;
      ctx.fillText(`${MathUtils.formatEs(State.lastStats.area, 2)} m²`, width - padding, 40);
      ctx.font = `11px ${FONT_SYS}`; ctx.fillStyle = EXPORT_PALETTE.muted;
      ctx.fillText('ÁREA TOTAL', width - padding, 56);

      ctx.strokeStyle = EXPORT_PALETTE.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padding, headerH - 8); ctx.lineTo(width - padding, headerH - 8); ctx.stroke();

      // Plano
      ctx.drawImage(planSnap, padding, planY, planDispW, planDispH);
      Export.drawBox(ctx, padding - 1, planY - 1, planDispW + 2, planDispH + 2, null, EXPORT_PALETTE.line);

      ctx.beginPath(); ctx.moveTo(padding, dividerY); ctx.lineTo(width - padding, dividerY); ctx.stroke();

      const n = State.points.length;

      // --- Columna izquierda ---
      let ly = dividerY + 20;
      ly += Export.sectionTitle(ctx, padding, ly + 10, 'Resumen');
      const cardW = (leftW - 8) / 2, cardH = 54;
      const stats = State.lastStats;
      const cardsData = [
        ['Perímetro', `${MathUtils.formatEs(stats.perimetro, 2)} m`],
        ['Área', `${MathUtils.formatEs(stats.area, 2)} m²`],
        ['N° de lados', `${n}`],
        ['Forma cerrada', stats.isInvalid ? 'No válida' : 'Sí']
      ];
      cardsData.forEach((c, i) => {
        const cardX = padding + (i % 2) * (cardW + 8);
        const cardY = ly + Math.floor(i / 2) * (cardH + 8);
        Export.statCard(ctx, cardX, cardY, cardW, cardH, c[0], c[1]);
      });
      ly += 2 * cardH + 8 + 16;

      const infoFields = [
        ['Dirección', lot.direccion], ['Municipio / Depto', lot.municipio],
        ['Matrícula inmobiliaria', lot.matricula], ['Propietario', lot.propietario],
        ['Observaciones', lot.observaciones]
      ].filter(([, v]) => v);

      if (infoFields.length) {
        ly += Export.sectionTitle(ctx, padding, ly + 10, 'Información del lote');
        ly += 12;
        infoFields.forEach(([label, value]) => {
          ly += Export.keyValueRow(ctx, padding, ly, label, value);
        });
        ly += 6;
      }

      const hasLoc = !!((lot.lat && lot.lng) || lot.mapsLink);
      if (hasLoc) {
        ly += Export.sectionTitle(ctx, padding, ly + 10, 'Ubicación (Google Maps)');
        ly += 12;
        if (lot.lat && lot.lng) ly += Export.keyValueRow(ctx, padding, ly, 'Coordenadas', `${lot.lat}, ${lot.lng}`);
        if (lot.mapsLink) ly += Export.keyValueRow(ctx, padding, ly, 'Enlace', lot.mapsLink);
      }

      // --- Columna derecha ---
      let ry = dividerY + 20;
      ry += Export.sectionTitle(ctx, rightX, ry + 10, 'Medidas de los lados');
      const sideRows = State.points.map((a, i) => {
        const b = State.points[(i + 1) % n];
        const real = Math.hypot(b.x - a.x, b.y - a.y);
        return [State.names[i], MathUtils.formatEs(State.lengths[i], 2) + ' m', MathUtils.formatEs(real, 2) + ' m'];
      });
      ry += Export.table(ctx, rightX, ry + 8, rightW, ['Lado', 'Objetivo', 'Real'], sideRows, [0.4, 0.3, 0.3]);
      ry += 16 + 8;

      ry += Export.sectionTitle(ctx, rightX, ry + 10, 'Coordenadas de los vértices (m)');
      const coordRows = State.points.map((p, i) => [`V${i + 1}`, MathUtils.formatEs(p.x, 2), MathUtils.formatEs(p.y, 2)]);
      ry += Export.table(ctx, rightX, ry + 8, rightW, ['Vértice', 'X', 'Y'], coordRows, [0.34, 0.33, 0.33]);

      const usedHeight = Math.min(scratchHeight, Math.max(ly, ry) + padding);

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = width;
      finalCanvas.height = Math.ceil(usedHeight);
      const fctx = finalCanvas.getContext('2d');
      fctx.drawImage(canvas, 0, 0, width, usedHeight, 0, 0, width, usedHeight);
      return finalCanvas;
    },

    // Reparte un canvas alto en tantas páginas PDF como haga falta, sin recortar contenido.
    addCanvasToPdf: (doc, canvas, margin) => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const availW = pageWidth - margin * 2;
      const availH = pageHeight - margin * 2;
      const scale = availW / canvas.width;
      const sliceHeightPx = Math.max(1, Math.floor(availH / scale));

      let offsetY = 0;
      let first = true;
      while (offsetY < canvas.height) {
        const sliceH = Math.min(sliceHeightPx, canvas.height - offsetY);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        const sctx = sliceCanvas.getContext('2d');
        sctx.drawImage(canvas, 0, offsetY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

        if (!first) doc.addPage();
        doc.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, availW, sliceH * scale);

        offsetY += sliceH;
        first = false;
      }
    }
  };

  /* ==========================================================================
     13. CONTROLADOR PRINCIPAL (Ciclo de vida)
     ========================================================================== */
  const App = {
    updateAndRender: () => {
      Render.clear(DOM.ctx);
      Render.background(DOM.ctx);

      const canvasPoints = State.points.map(Geometry.toCanvas);
      const isInvalid = MathUtils.isSelfIntersecting(State.points);

      Render.shape(DOM.ctx, canvasPoints, isInvalid, ACTIVE);
      Render.labels(DOM.ctx, canvasPoints, ACTIVE);
      if (State.showAngles) Render.cornerAngles(DOM.ctx, canvasPoints, ACTIVE);
      Render.images(DOM.ctx, ACTIVE, true);
      Render.annotations(DOM.ctx, ACTIVE, true);
      Render.linePreview(DOM.ctx, ACTIVE);
      Render.snapIndicator(DOM.ctx, ACTIVE);
      Render.vertices(DOM.ctx, canvasPoints, ACTIVE, State.dragIndex);
      Render.compass(DOM.ctx, ACTIVE);
      Render.scaleBar(DOM.ctx, ACTIVE);

      const area = MathUtils.shoelaceArea(State.points);
      const n = State.points.length;
      let perimetro = 0;
      for (let i = 0; i < n; i++) {
        const a = State.points[i], b = State.points[(i + 1) % n];
        perimetro += Math.hypot(b.x - a.x, b.y - a.y);
      }

      State.lastStats = { area, perimetro, isInvalid };
      UI.updateAll(area, perimetro, isInvalid);
    },

    resetShape: () => {
      State.points = Geometry.defaultShape(State.lengths);
      Geometry.fitView();
      UI.buildAngleInputs(State.points.length);
      App.updateAndRender();
    },

    // Cambia el ángulo interior en el vértice i, conservando todas las medidas de los lados.
    // Gira rígidamente el resto del polígono (desde 'next' hasta antes de 'prev') alrededor
    // del vértice i, y deja que el relajador cierre la única costura que queda pendiente.
    setCornerAngle: (i, targetDeg) => {
      const n = State.points.length;
      if (isNaN(targetDeg) || n < 4) { App.updateAndRender(); return; }
      targetDeg = Math.max(1, Math.min(179, targetDeg));

      const prevIdx = (i - 1 + n) % n, nextIdx = (i + 1) % n;
      const vertex = State.points[i];
      const prevPt = State.points[prevIdx], nextPt = State.points[nextIdx];

      const angleOf = (p) => Math.atan2(p.y - vertex.y, p.x - vertex.x);
      const wrap180 = (deg) => { let d = deg % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };

      const dCurrentDeg = wrap180((angleOf(nextPt) - angleOf(prevPt)) * 180 / Math.PI);
      const sign = dCurrentDeg < 0 ? -1 : 1;
      const phiDeg = (sign * targetDeg) - dCurrentDeg;
      const phi = phiDeg * Math.PI / 180;
      const cosP = Math.cos(phi), sinP = Math.sin(phi);

      const rotateAround = (p) => {
        const dx = p.x - vertex.x, dy = p.y - vertex.y;
        return { x: vertex.x + dx * cosP - dy * sinP, y: vertex.y + dx * sinP + dy * cosP };
      };

      // Gira rígidamente 'next' y todos los vértices intermedios (sin tocar 'prev' ni 'i')
      let idx = nextIdx;
      while (idx !== prevIdx) {
        const rotated = rotateAround(State.points[idx]);
        State.points[idx].x = rotated.x;
        State.points[idx].y = rotated.y;
        idx = (idx + 1) % n;
      }

      // Solo queda por cerrar la costura entre el último vértice girado y el resto del
      // tramo suelto; i, prev y next quedan fijos para que el ángulo no se desvíe.
      Geometry.relax(State.points, Geometry.edgesFromLengths(State.lengths), [i, prevIdx, nextIdx], 200);
      App.updateAndRender();
    },

    readSideInputs: () => {
      const inputs = DOM.ui.sideInputsContainer.querySelectorAll('input[type=number]');
      return Array.from(inputs).map(inp => parseFloat(inp.value));
    },

    updateSidesCount: () => {
      let n = parseInt(DOM.controls.numSides.value, 10);
      if (!Number.isFinite(n)) n = 4;
      n = Math.max(3, Math.min(20, n));
      DOM.controls.numSides.value = n;
      const existing = App.readSideInputs();
      UI.buildSideInputs(n, existing);
    },

    applyMeasurements: () => {
      const lengths = App.readSideInputs().map(v => (isNaN(v) || v <= 0) ? 0.01 : v);
      if (lengths.length < 3) return;
      State.lengths = lengths;
      State.names = Geometry.namesFor(lengths.length);
      App.resetShape();
    },

    getLotInfo: () => ({
      direccion: DOM.controls.lotDireccion.value.trim(),
      municipio: DOM.controls.lotMunicipio.value.trim(),
      matricula: DOM.controls.lotMatricula.value.trim(),
      propietario: DOM.controls.lotPropietario.value.trim(),
      observaciones: DOM.controls.lotObservaciones.value.trim(),
      lat: DOM.controls.lotLat.value.trim(),
      lng: DOM.controls.lotLng.value.trim(),
      mapsLink: DOM.controls.lotMapsLink.value.trim()
    }),

    setMode: (newMode) => {
      State.mode = newMode;
      State.lineStart = null;
      State.previewPoint = null;
      State.snapPoint = null;
      State.dragIndex = -1;
      State.dragTarget = null;

      DOM.modes.mover.classList.toggle('active', newMode === 'mover');
      DOM.modes.texto.classList.toggle('active', newMode === 'texto');
      DOM.modes.linea.classList.toggle('active', newMode === 'linea');
      DOM.modes.imagen.classList.toggle('active', newMode === 'imagen');

      DOM.canvas.classList.toggle('mode-texto', newMode === 'texto');
      DOM.canvas.classList.toggle('mode-linea', newMode === 'linea');
      DOM.canvas.classList.toggle('mode-imagen', newMode === 'imagen');

      const hints = {
        mover: 'Arrastra un punto para cambiar la forma. Arrastra un texto, línea o imagen para moverlo; haz clic para seleccionarlo y poder eliminarlo. Arrastra la manija circular de arriba para rotar un texto o imagen, o la esquina inferior de una imagen para cambiar su tamaño. Doble clic sobre una nota para editar su texto. Arrastra un área vacía para desplazar la vista.',
        texto: 'Haz clic en cualquier parte del plano para escribir una nota, con el tamaño indicado a la izquierda.',
        linea: 'Haz clic para marcar el inicio de la línea y clic de nuevo para terminarla. Si te acercas al extremo de otra línea, se pega a ese punto como un imán.',
        imagen: State.pendingImage ? 'Haz clic en el plano para colocar la imagen elegida.' : 'Elige un archivo de imagen para poder colocarla en el plano.'
      };
      DOM.ui.hintBox.textContent = hints[newMode];

      App.updateAndRender();
    }
  };

  /* ==========================================================================
     14. MANEJO DE EVENTOS (INTERACTIVIDAD)
     ========================================================================== */
  const Events = {
    getPointerPos: (evt) => {
      const rect = DOM.canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      return {
        cx: (clientX - rect.left) * (DOM.canvas.width / rect.width),
        cy: (clientY - rect.top) * (DOM.canvas.height / rect.height)
      };
    },

    canvasPointFromClient: (clientX, clientY) => {
      const rect = DOM.canvas.getBoundingClientRect();
      return {
        cx: (clientX - rect.left) * (DOM.canvas.width / rect.width),
        cy: (clientY - rect.top) * (DOM.canvas.height / rect.height)
      };
    },

    onDown: (evt) => {
      const { cx, cy } = Events.getPointerPos(evt);
      const m = Geometry.toModel(cx, cy);

      if (State.mode === 'mover') {
        const vIdx = Hit.vertexAt(cx, cy);
        if (vIdx >= 0) {
          State.dragTarget = { type: 'vertex', index: vIdx };
          State.dragIndex = vIdx;
          State.selected = null;
          DOM.canvas.classList.add('dragging');
          App.updateAndRender();
          evt.preventDefault();
          return;
        }

        const imgRotIdx = Hit.imageRotateHandleAt(cx, cy);
        if (imgRotIdx >= 0) {
          State.dragTarget = { type: 'imageRotate', index: imgRotIdx };
          DOM.canvas.classList.add('dragging');
          App.updateAndRender();
          evt.preventDefault();
          return;
        }

        const txtRotIdx = Hit.textRotateHandleAt(cx, cy);
        if (txtRotIdx >= 0) {
          State.dragTarget = { type: 'textRotate', index: txtRotIdx };
          DOM.canvas.classList.add('dragging');
          App.updateAndRender();
          evt.preventDefault();
          return;
        }

        const handleIdx = Hit.imageHandleAt(cx, cy);
        if (handleIdx >= 0) {
          const im = State.annotations.images[handleIdx];
          const c = Geometry.toCanvas({ x: im.x, y: im.y });
          State.selected = { type: 'image', index: handleIdx };
          State.dragTarget = {
            type: 'imageResize', index: handleIdx,
            startW: im.w, startH: im.h,
            startDist: Math.hypot(cx - c.x, cy - c.y) || 1
          };
          DOM.canvas.classList.add('dragging');
          App.updateAndRender();
          evt.preventDefault();
          return;
        }

        const imgIdx = Hit.imageAt(cx, cy);
        if (imgIdx >= 0) {
          const im = State.annotations.images[imgIdx];
          State.selected = { type: 'image', index: imgIdx };
          State.dragTarget = { type: 'image', index: imgIdx, offX: m.x - im.x, offY: m.y - im.y };
          DOM.canvas.classList.add('dragging');
          App.updateAndRender();
          evt.preventDefault();
          return;
        }

        const txtIdx = Hit.textAt(cx, cy);
        if (txtIdx >= 0) {
          const t = State.annotations.texts[txtIdx];
          State.selected = { type: 'text', index: txtIdx };
          State.dragTarget = { type: 'text', index: txtIdx, offX: m.x - t.x, offY: m.y - t.y };
          DOM.canvas.classList.add('dragging');
          App.updateAndRender();
          evt.preventDefault();
          return;
        }

        const lineEnd = Hit.lineEndpointAt(cx, cy);
        if (lineEnd) {
          State.selected = { type: 'line', index: lineEnd.index };
          State.dragTarget = { type: 'lineEndpoint', index: lineEnd.index, which: lineEnd.which };
          DOM.canvas.classList.add('dragging');
          App.updateAndRender();
          evt.preventDefault();
          return;
        }

        const lineBodyIdx = Hit.lineBodyAt(cx, cy);
        if (lineBodyIdx >= 0) {
          const l = State.annotations.lines[lineBodyIdx];
          State.selected = { type: 'line', index: lineBodyIdx };
          State.dragTarget = {
            type: 'lineBody', index: lineBodyIdx,
            offX1: m.x - l.x1, offY1: m.y - l.y1,
            offX2: m.x - l.x2, offY2: m.y - l.y2
          };
          DOM.canvas.classList.add('dragging');
          App.updateAndRender();
          evt.preventDefault();
          return;
        }

        if (Hit.backgroundAt(cx, cy)) {
          const bg = State.background;
          State.selected = null;
          State.dragTarget = { type: 'background', offX: m.x - bg.cx, offY: m.y - bg.cy };
          DOM.canvas.classList.add('dragging');
          App.updateAndRender();
          evt.preventDefault();
          return;
        }

        // No se encontró ningún elemento: desplazar la vista (pan) arrastrando el área vacía
        State.selected = null;
        State.dragTarget = { type: 'pan', startCx: cx, startCy: cy, startOffX: State.view.offX, startOffY: State.view.offY };
        DOM.canvas.classList.add('dragging');
        App.updateAndRender();
        evt.preventDefault();

      } else if (State.mode === 'texto') {
        if (!State.pendingTextInput) Interactions.createTextInput(cx, cy, m);
        evt.preventDefault();

      } else if (State.mode === 'imagen') {
        if (State.pendingImage) {
          const img = State.pendingImage;
          const defaultW = 6;
          const defaultH = defaultW * ((img.naturalHeight / img.naturalWidth) || 1);
          State.annotations.images.push({ x: m.x, y: m.y, w: defaultW, h: defaultH, rotation: 0, img });
          const newIndex = State.annotations.images.length - 1;
          State.pendingImage = null;
          App.setMode('mover');
          State.selected = { type: 'image', index: newIndex };
          App.updateAndRender();
        }
        evt.preventDefault();

      } else if (State.mode === 'linea') {
        const snap = Snap.findNearbyEndpoint(m, -1, null);
        const point = snap || m;

        if (!State.lineStart) {
          State.lineStart = point;
          State.previewPoint = point;
        } else {
          State.annotations.lines.push({ x1: State.lineStart.x, y1: State.lineStart.y, x2: point.x, y2: point.y });
          State.lineStart = null;
          State.previewPoint = null;
        }
        State.snapPoint = snap;
        App.updateAndRender();
        evt.preventDefault();
      }
    },

    onMove: (evt) => {
      const { cx, cy } = Events.getPointerPos(evt);
      const m = Geometry.toModel(cx, cy);

      if (State.mode === 'linea' && State.lineStart) {
        const snap = Snap.findNearbyEndpoint(m, -1, null);
        State.previewPoint = snap || m;
        State.snapPoint = snap;
        App.updateAndRender();
        evt.preventDefault();
        return;
      }

      if (!State.dragTarget) return;

      State.snapPoint = null;

      switch (State.dragTarget.type) {
        case 'vertex':
          State.points[State.dragTarget.index].x = m.x;
          State.points[State.dragTarget.index].y = m.y;
          Geometry.relax(State.points, Geometry.edgesFromLengths(State.lengths), State.dragTarget.index, 25);
          break;

        case 'text': {
          const t = State.annotations.texts[State.dragTarget.index];
          t.x = m.x - State.dragTarget.offX;
          t.y = m.y - State.dragTarget.offY;
          break;
        }

        case 'image': {
          const im = State.annotations.images[State.dragTarget.index];
          im.x = m.x - State.dragTarget.offX;
          im.y = m.y - State.dragTarget.offY;
          break;
        }

        case 'imageResize': {
          const im = State.annotations.images[State.dragTarget.index];
          const c = Geometry.toCanvas({ x: im.x, y: im.y });
          const dist = Math.hypot(cx - c.x, cy - c.y);
          const ratio = dist / State.dragTarget.startDist;
          im.w = Math.max(0.3, State.dragTarget.startW * ratio);
          im.h = Math.max(0.3, State.dragTarget.startH * ratio);
          break;
        }

        case 'imageRotate': {
          const im = State.annotations.images[State.dragTarget.index];
          const c = Geometry.toCanvas({ x: im.x, y: im.y });
          im.rotation = Math.atan2(cy - c.y, cx - c.x) * 180 / Math.PI + 90;
          break;
        }

        case 'textRotate': {
          const t = State.annotations.texts[State.dragTarget.index];
          const c = Geometry.toCanvas({ x: t.x, y: t.y });
          t.rotation = Math.atan2(cy - c.y, cx - c.x) * 180 / Math.PI + 90;
          break;
        }

        case 'lineEndpoint': {
          const l = State.annotations.lines[State.dragTarget.index];
          const snap = Snap.findNearbyEndpoint(m, State.dragTarget.index, State.dragTarget.which);
          const point = snap || m;
          if (State.dragTarget.which === 'a') { l.x1 = point.x; l.y1 = point.y; }
          else { l.x2 = point.x; l.y2 = point.y; }
          State.snapPoint = snap;
          break;
        }

        case 'lineBody': {
          const l = State.annotations.lines[State.dragTarget.index];
          l.x1 = m.x - State.dragTarget.offX1;
          l.y1 = m.y - State.dragTarget.offY1;
          l.x2 = m.x - State.dragTarget.offX2;
          l.y2 = m.y - State.dragTarget.offY2;
          break;
        }

        case 'background': {
          State.background.cx = m.x - State.dragTarget.offX;
          State.background.cy = m.y - State.dragTarget.offY;
          break;
        }

        case 'pan': {
          State.view.offX = State.dragTarget.startOffX + (cx - State.dragTarget.startCx);
          State.view.offY = State.dragTarget.startOffY + (cy - State.dragTarget.startCy);
          break;
        }
      }
      App.updateAndRender();
      evt.preventDefault();
    },

    onUp: () => {
      State.dragTarget = null;
      State.dragIndex = -1;
      State.snapPoint = null;
      DOM.canvas.classList.remove('dragging');
      App.updateAndRender();
    },

    onDblClick: (evt) => {
      if (State.mode !== 'mover') return;
      const { cx, cy } = Events.getPointerPos(evt);
      const idx = Hit.textAt(cx, cy);
      if (idx >= 0) Interactions.editText(idx);
    },

    onWheel: (evt) => {
      evt.preventDefault();
      const { cx, cy } = Events.canvasPointFromClient(evt.clientX, evt.clientY);
      const factor = evt.deltaY < 0 ? 1.12 : 1 / 1.12;
      Zoom.zoomAt(cx, cy, factor);
    },

    // --- Touch: gestiona pellizco de dos dedos (zoom) y delega el resto ---
    onTouchStart: (evt) => {
      if (evt.touches.length === 2) {
        evt.preventDefault();
        const t0 = evt.touches[0], t1 = evt.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        const midClientX = (t0.clientX + t1.clientX) / 2, midClientY = (t0.clientY + t1.clientY) / 2;
        const { cx, cy } = Events.canvasPointFromClient(midClientX, midClientY);
        State.pinch = { startDist: dist || 1, startScale: State.view.scale, anchorModel: Geometry.toModel(cx, cy) };
        State.dragTarget = null;
        return;
      }
      Events.onDown(evt);
    },

    onTouchMove: (evt) => {
      if (evt.touches.length === 2 && State.pinch) {
        evt.preventDefault();
        const t0 = evt.touches[0], t1 = evt.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        const midClientX = (t0.clientX + t1.clientX) / 2, midClientY = (t0.clientY + t1.clientY) / 2;
        const { cx, cy } = Events.canvasPointFromClient(midClientX, midClientY);
        const factor = dist / State.pinch.startDist;
        Zoom.setScaleAt(State.pinch.startScale * factor, cx, cy, State.pinch.anchorModel);
        return;
      }
      Events.onMove(evt);
    },

    onTouchEnd: (evt) => {
      if (evt.touches.length < 2) State.pinch = null;
      Events.onUp(evt);
    },

    initListeners: () => {
      // Eventos del Canvas (mouse)
      DOM.canvas.addEventListener('mousedown', Events.onDown);
      window.addEventListener('mousemove', Events.onMove);
      window.addEventListener('mouseup', Events.onUp);
      DOM.canvas.addEventListener('dblclick', Events.onDblClick);
      DOM.canvas.addEventListener('wheel', Events.onWheel, { passive: false });

      // Eventos Touch (con soporte de pellizco para zoom)
      DOM.canvas.addEventListener('touchstart', Events.onTouchStart, { passive: false });
      DOM.canvas.addEventListener('touchmove', Events.onTouchMove, { passive: false });
      window.addEventListener('touchend', Events.onTouchEnd);
      window.addEventListener('touchcancel', Events.onTouchEnd);

      // Botones de Modos
      DOM.modes.mover.addEventListener('click', () => App.setMode('mover'));
      DOM.modes.texto.addEventListener('click', () => App.setMode('texto'));
      DOM.modes.linea.addEventListener('click', () => App.setMode('linea'));
      DOM.modes.imagen.addEventListener('click', () => DOM.controls.imageFileInput.click());

      // Medidas y lados
      DOM.controls.btnUpdateSides.addEventListener('click', App.updateSidesCount);
      DOM.controls.btnApply.addEventListener('click', App.applyMeasurements);
      DOM.controls.btnReset.addEventListener('click', App.resetShape);

      // Tamaño / rotación de elementos
      DOM.controls.fontSize.addEventListener('input', (e) => {
        const sel = State.selected;
        if (sel && sel.type === 'text') {
          State.annotations.texts[sel.index].size = parseInt(e.target.value, 10) || 16;
          App.updateAndRender();
        }
      });

      DOM.controls.textRotation.addEventListener('input', (e) => {
        const sel = State.selected;
        if (!sel) return;
        const val = parseFloat(e.target.value) || 0;
        if (sel.type === 'text') State.annotations.texts[sel.index].rotation = val;
        else if (sel.type === 'image') State.annotations.images[sel.index].rotation = val;
        App.updateAndRender();
      });

      DOM.controls.labelFontSize.addEventListener('input', (e) => {
        State.labelFontSize = parseInt(e.target.value, 10) || 13;
        App.updateAndRender();
      });

      DOM.controls.sideStyle.addEventListener('change', (e) => {
        State.sideStyle = e.target.value;
        App.updateAndRender();
      });

      DOM.controls.lineStyle.addEventListener('change', (e) => {
        State.lineStyle = e.target.value;
        App.updateAndRender();
      });

      DOM.controls.toggleAngles.addEventListener('change', (e) => {
        State.showAngles = e.target.checked;
        App.updateAndRender();
      });

      DOM.controls.btnDeleteSelected.addEventListener('click', () => {
        const sel = State.selected;
        if (!sel) return;
        if (sel.type === 'text') State.annotations.texts.splice(sel.index, 1);
        else if (sel.type === 'line') State.annotations.lines.splice(sel.index, 1);
        else if (sel.type === 'image') State.annotations.images.splice(sel.index, 1);
        State.selected = null;
        App.updateAndRender();
      });

      DOM.controls.btnClearAnnotations.addEventListener('click', () => {
        State.annotations.texts = [];
        State.annotations.lines = [];
        State.annotations.images = [];
        State.selected = null;
        App.updateAndRender();
      });

      // Imagen puntual
      DOM.controls.imageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) { e.target.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            State.pendingImage = img;
            App.setMode('imagen');
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
      });

      // Imagen de fondo
      DOM.controls.btnAddBackground.addEventListener('click', () => DOM.controls.bgFileInput.click());

      DOM.controls.bgFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) { e.target.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const xs = State.points.map(p => p.x), ys = State.points.map(p => p.y);
            const shapeW = Math.max(...xs) - Math.min(...xs);
            const shapeH = Math.max(...ys) - Math.min(...ys);
            const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
            const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
            const baseWidth = (shapeW || 20) * 1.15;
            const baseHeight = baseWidth * (img.naturalHeight / img.naturalWidth || (shapeH / shapeW) || 1);

            State.background = { img, cx, cy, baseWidth, baseHeight, scale: 1 };
            DOM.controls.bgScale.disabled = false;
            DOM.controls.bgScale.value = 1;
            DOM.controls.btnRemoveBackground.disabled = false;
            App.updateAndRender();
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
      });

      DOM.controls.bgScale.addEventListener('input', (e) => {
        if (State.background) {
          State.background.scale = parseFloat(e.target.value) || 1;
          App.updateAndRender();
        }
      });

      DOM.controls.btnRemoveBackground.addEventListener('click', () => {
        State.background = null;
        DOM.controls.bgScale.disabled = true;
        DOM.controls.bgScale.value = 1;
        DOM.controls.btnRemoveBackground.disabled = true;
        App.updateAndRender();
      });

      // Zoom
      DOM.controls.btnZoomIn.addEventListener('click', () => Zoom.zoomAt(DOM.canvas.width / 2, DOM.canvas.height / 2, 1.25));
      DOM.controls.btnZoomOut.addEventListener('click', () => Zoom.zoomAt(DOM.canvas.width / 2, DOM.canvas.height / 2, 1 / 1.25));
      DOM.controls.btnZoomFit.addEventListener('click', () => {
        Geometry.fitView();
        App.updateAndRender();
      });

      // Modo oscuro
      DOM.controls.darkModeToggle.addEventListener('change', (e) => {
        Theme.apply(e.target.checked);
        try { localStorage.setItem('loteDarkMode', e.target.checked ? '1' : '0'); } catch (err) { /* almacenamiento no disponible */ }
      });

      // Información del lote / Google Maps
      DOM.controls.btnOpenMaps.addEventListener('click', () => {
        const lat = parseFloat(DOM.controls.lotLat.value);
        const lng = parseFloat(DOM.controls.lotLng.value);
        const link = DOM.controls.lotMapsLink.value.trim();
        if (!isNaN(lat) && !isNaN(lng)) {
          window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
        } else if (link) {
          window.open(link, '_blank');
        } else {
          alert('Agrega latitud y longitud, o un enlace de Google Maps.');
        }
      });

      // Guardar PNG (con tablas de información al estilo de la página)
      DOM.controls.btnSave.addEventListener('click', () => {
        const composed = Export.build();
        const link = document.createElement('a');
        link.download = 'planimetria-lote.png';
        link.href = composed.toDataURL('image/png');
        link.click();
      });

      // Guardar PDF (mismo reporte, repartido en tantas páginas como haga falta)
      DOM.controls.btnSavePDF.addEventListener('click', () => {
        if (!window.jspdf) {
          alert('No se pudo cargar la librería para generar el PDF. Verifica tu conexión a internet e inténtalo de nuevo.');
          return;
        }
        const composed = Export.build();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        Export.addCanvasToPdf(doc, composed, 28);
        doc.save('planimetria-lote.pdf');
      });
    }
  };

  /* ==========================================================================
     15. INICIALIZACIÓN
     ========================================================================== */
  const init = () => {
    UI.buildSideInputs(State.lengths.length, State.lengths);
    Events.initListeners();

    let savedDark = false;
    try { savedDark = localStorage.getItem('loteDarkMode') === '1'; } catch (err) { /* almacenamiento no disponible */ }
    DOM.controls.darkModeToggle.checked = savedDark;
    Theme.apply(savedDark);

    App.resetShape();
    App.setMode('mover');
  };

  init();

})();
