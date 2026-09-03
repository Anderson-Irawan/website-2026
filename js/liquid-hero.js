/* ============================================================
   liquid-hero.js
   Domain-warped banded gradient background.
   Zero dependencies. ~6 KB unminified.

   Usage:
     <div class="hero"><canvas data-liquid-hero></canvas></div>
     <script src="/js/liquid-hero.js" defer></script>

   Or mount manually with options:
     liquidHero(document.querySelector('#myCanvas'), { order: 0.9 });
   ============================================================ */
(function (global) {
  'use strict';

  var DEFAULTS = {
    colors: ['#201D1E', '#313187', '#D84553', '#EC6142', '#F66531'],
    //         near-black  indigo     pink       coral      orange
    stops:  [0.15, 0.40, 0.60, 0.78, 0.95],

    order:      0.78,   // 0 = noise churn, 1 = clean parallel bands
    bands:      1.4,    // how many bands across the field
    detail:     0.05,   // weight of fine noise octaves; lower is smoother
    scale:      0.65,
    warp:       0.45,   // how far bands get pushed off straight
    contrast:   0.85,
    angle:      -11,    // degrees; negative = lower-left to upper-right
    speed:      0.3,
    grain:      0.085,
    grainScale: 0.85,

    pointer:     0.9,   // how hard the cursor pulls the gradient (0 = off)
    pointerEase: 0.09,  // cursor follow smoothing; lower = laggier/softer
    parallax:    0.35,  // gradient drift per screen of scroll (0 = off)

    maxDPR:     2,      // cap resolution; 2 is plenty
    fallback:   'linear-gradient(135deg,#201D1E,#313187 35%,#D84553 55%,#F66531)'
  };

  var VERT =
    'attribute vec2 a_pos;' +
    'void main(){gl_Position=vec4(a_pos,0.0,1.0);}';

  var FRAG = [
    'precision highp float;',
    'uniform vec2 u_res;',
    'uniform float u_time;',
    'uniform vec3 u_col[5];',
    'uniform float u_stop[5];',
    'uniform float u_order,u_bands,u_detail,u_scale,u_warp,u_contrast,u_angle,u_grain,u_grainScale;',
    'uniform vec2 u_mouse;',
    'uniform float u_pointer;',
    'uniform float u_scroll;',
    'const float TAU=6.28318530718;',

    /* Simplex noise - Ashima / Gustavson, public domain */
    'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}',
    'vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}',
    'float snoise(vec2 v){',
    '  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);',
    '  vec2 i=floor(v+dot(v,C.yy));',
    '  vec2 x0=v-i+dot(i,C.xx);',
    '  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);',
    '  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;',
    '  i=mod289(i);',
    '  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));',
    '  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);',
    '  m=m*m; m=m*m;',
    '  vec3 x=2.0*fract(p*C.www)-1.0;',
    '  vec3 h=abs(x)-0.5;',
    '  vec3 ox=floor(x+0.5);',
    '  vec3 a0=x-ox;',
    '  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);',
    '  vec3 g;',
    '  g.x=a0.x*x0.x+h.x*x0.y;',
    '  g.yz=a0.yz*x12.xz+h.yz*x12.yw;',
    '  return 130.0*dot(m,g);',
    '}',

    /* fBm; u_detail attenuates the upper octaves */
    'float fbm(vec2 p){',
    '  float v=0.0,a=0.5,norm=0.0;',
    '  for(int i=0;i<5;i++){',
    '    float w=(i==0)?1.0:pow(u_detail,float(i));',
    '    v+=a*w*snoise(p); norm+=a*w; p*=2.02; a*=0.5;',
    '  }',
    '  return v/max(norm,0.0001);',
    '}',

    'vec3 ramp(float t){',
    '  vec3 c=u_col[0];',
    '  for(int i=0;i<4;i++){c=mix(c,u_col[i+1],smoothstep(u_stop[i],u_stop[i+1],t));}',
    '  return c;',
    '}',

    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',

    'void main(){',
    '  vec2 uv=(gl_FragCoord.xy-0.5*u_res)/u_res.y;',
    '  float a=radians(u_angle);',
    '  mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));',
    '  vec2 p=rot*uv*u_scale;',
    /* Parallax: pan the field as the page scrolls past the hero. */
    '  p.y+=u_scroll;',
    '  float t=u_time;',
    /* Cursor pull: a soft gaussian well that drags the field toward the pointer. */
    '  vec2 mrel=uv-u_mouse;',
    '  float infl=exp(-dot(mrel,mrel)*4.0)*u_pointer;',
    '  p+=mrel*infl*0.7;',
    '  t+=infl*0.6;',
    '  vec2 q=vec2(fbm(p+t*0.15),fbm(p+vec2(5.2,1.3)-t*0.12));',
    '  vec2 warped=p+u_warp*vec2(',
    '    fbm(p+u_warp*q+vec2(1.7,9.2)+t*0.20),',
    '    fbm(p+u_warp*q+vec2(8.3,2.8)-t*0.18));',
    /* Ordered field: parallel bands displaced by the warp. */
    '  float ordered=0.5+0.5*sin(TAU*warped.y*u_bands);',
    '  float chaotic=fbm(warped)*0.5+0.5;',
    '  float f=mix(chaotic,ordered,u_order);',
    '  f=clamp((f-0.5)*u_contrast+0.5,0.0,1.0);',
    '  vec3 col=ramp(f);',
    /* Grain locked to the screen plane so it never flows with the warp. */
    '  float g=hash(gl_FragCoord.xy*u_grainScale+fract(u_time)*91.7);',
    '  col+=(g-0.5)*u_grain;',
    '  gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  var KEYS = ['order','bands','detail','scale','warp','contrast','angle','grain','grainScale'];

  function hexToRgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  function liquidHero(canvas, options) {
    if (!canvas) return null;

    var cfg = {};
    var k;
    for (k in DEFAULTS) if (DEFAULTS.hasOwnProperty(k)) cfg[k] = DEFAULTS[k];
    if (options) for (k in options) if (options.hasOwnProperty(k)) cfg[k] = options[k];

    var gl = canvas.getContext('webgl', { antialias: false, alpha: false })
          || canvas.getContext('experimental-webgl', { antialias: false, alpha: false });

    if (!gl) {
      // No WebGL: paint a static gradient on the parent and bail out quietly.
      (canvas.parentNode || canvas).style.background = cfg.fallback;
      canvas.style.display = 'none';
      return null;
    }

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('liquid-hero:', gl.getShaderInfoLog(s));
      }
      return s;
    }

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Fullscreen triangle: cheaper than a quad, no seam down the middle.
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var U = {
      res:  gl.getUniformLocation(prog, 'u_res'),
      time: gl.getUniformLocation(prog, 'u_time'),
      col:  gl.getUniformLocation(prog, 'u_col[0]'),
      stop: gl.getUniformLocation(prog, 'u_stop[0]'),
      mouse:   gl.getUniformLocation(prog, 'u_mouse'),
      pointer: gl.getUniformLocation(prog, 'u_pointer'),
      scroll:  gl.getUniformLocation(prog, 'u_scroll')
    };
    KEYS.forEach(function (n) { U[n] = gl.getUniformLocation(prog, 'u_' + n); });

    // Colours and stops never change at runtime, so upload them once.
    var flat = [];
    cfg.colors.forEach(function (c) { flat = flat.concat(hexToRgb(c)); });
    gl.uniform3fv(U.col, new Float32Array(flat));
    gl.uniform1fv(U.stop, new Float32Array(cfg.stops));
    KEYS.forEach(function (n) { gl.uniform1f(U[n], cfg[n]); });

    var w = 0, h = 0;
    function resize() {
      var dpr = Math.min(global.devicePixelRatio || 1, cfg.maxDPR);
      var nw = Math.round(canvas.clientWidth * dpr);
      var nh = Math.round(canvas.clientHeight * dpr);
      if (nw === w && nh === h) return;
      w = canvas.width = nw;
      h = canvas.height = nh;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(U.res, w, h);
    }

    var STORE_KEY = 'liquid-hero:reduced';
    var mq = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
    var mqReduced = !!(mq && mq.matches);
    var forced = false;
    try { forced = global.localStorage.getItem(STORE_KEY) === '1'; } catch (e) {}
    function isReduced() { return mqReduced || forced; }
    if (mq && mq.addEventListener) {
      mq.addEventListener('change', function (e) { mqReduced = e.matches; sync(); });
    }

    var clock = 0, last = performance.now(), raf = null, visible = true, awake = true;

    // Pointer state: mx/my follow the cursor (eased), amt fades the effect in/out.
    var mx = 0, my = 0, tmx = 0, tmy = 0, amt = 0, tAmt = 0;

    var idle = null;
    function pointerTo(e) {
      if (isReduced()) return;
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      tmx = ((e.clientX - r.left) / r.width - 0.5) * (r.width / r.height);
      tmy = 0.5 - (e.clientY - r.top) / r.height;
      tAmt = 1;
      // Relax the effect once the cursor stops moving.
      if (idle) clearTimeout(idle);
      idle = setTimeout(function () { tAmt = 0; }, 500);
    }
    // Listen on the window, not the canvas: the canvas sits at z-index -1
    // behind the page content, so it never receives pointer events itself.
    global.addEventListener('pointermove', pointerTo, { passive: true });
    global.addEventListener('pointerdown', pointerTo, { passive: true });
    document.addEventListener('pointerleave', function () { tAmt = 0; });

    // Draw a single frame with the current state.
    function render() {
      var red = isReduced();
      resize();
      var vh = canvas.clientHeight || 1;
      var scroll = red ? 0 : (global.pageYOffset || 0) / vh * cfg.parallax;
      gl.uniform1f(U.time, red ? 12.0 : clock);
      gl.uniform1f(U.scroll, scroll);
      gl.uniform2f(U.mouse, mx, my);
      gl.uniform1f(U.pointer, red ? 0 : cfg.pointer * amt);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!isReduced()) clock += dt * cfg.speed;

      mx += (tmx - mx) * cfg.pointerEase;
      my += (tmy - my) * cfg.pointerEase;
      amt += (tAmt - amt) * 0.05;

      render();
      raf = (visible && awake && !isReduced()) ? requestAnimationFrame(frame) : null;
    }

    function start() {
      if (raf || !visible || !awake || isReduced()) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    // Settle to the right state: animate, or freeze on a static frame.
    function sync() {
      if (isReduced()) {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        render();
      } else {
        start();
      }
    }

    start();
    render();

    // Stop drawing when the hero area is scrolled away or the tab is
    // hidden. The canvas itself is now position:fixed (always on
    // screen), so watch the hero wrapper instead.
    if (global.IntersectionObserver) {
      var watch = canvas.closest('.hero-pin')
        || document.querySelector('.hero-pin, .liquid-hero')
        || canvas;
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) sync();
      }, { threshold: 0 }).observe(watch);
    }

    document.addEventListener('visibilitychange', function () {
      awake = !document.hidden;
      if (awake) sync();
    });

    function onResize() {
      resize();
      if (isReduced()) render();
    }
    global.addEventListener('resize', onResize);

    return {
      // Live-tweak a numeric param, e.g. hero.set('order', 0.9)
      set: function (name, value) {
        if (KEYS.indexOf(name) === -1) return;
        cfg[name] = value;
        gl.useProgram(prog);
        gl.uniform1f(U[name], value);
        if (isReduced()) render();
      },
      // Freeze / unfreeze all motion (persisted per visitor).
      setReduced: function (v) {
        forced = !!v;
        try { global.localStorage.setItem(STORE_KEY, forced ? '1' : '0'); } catch (e) {}
        sync();
      },
      toggleReduced: function () {
        this.setReduced(!forced);
        return isReduced();
      },
      isReduced: isReduced,
      destroy: function () {
        visible = awake = false;
        if (raf) cancelAnimationFrame(raf);
        global.removeEventListener('resize', onResize);
      }
    };
  }

  global.liquidHero = liquidHero;

  // Auto-mount any <canvas data-liquid-hero>, and wire up any
  // <button data-liquid-hero-toggle> to freeze / unfreeze them.
  function boot() {
    var instances = [];
    var nodes = document.querySelectorAll('[data-liquid-hero]');
    for (var i = 0; i < nodes.length; i++) {
      var inst = liquidHero(nodes[i]);
      if (inst) instances.push(inst);
    }
    liquidHero.instances = instances;

    var toggles = document.querySelectorAll('[data-liquid-hero-toggle]');
    if (!instances.length) {
      // No animated background to control (e.g. no WebGL) - hide the button.
      for (var h = 0; h < toggles.length; h++) toggles[h].hidden = true;
      return;
    }
    function syncToggles(on) {
      for (var j = 0; j < toggles.length; j++) {
        toggles[j].setAttribute('aria-pressed', on ? 'true' : 'false');
        var label = toggles[j].querySelector('.motion-toggle__label');
        if (label) label.textContent = on ? 'Enable Motion' : 'Reduce Motion';
      }
      document.documentElement.classList.toggle('liquid-hero-reduced', on);
    }
    syncToggles(instances[0].isReduced());
    for (var t = 0; t < toggles.length; t++) {
      toggles[t].addEventListener('click', function () {
        var on = instances[0].toggleReduced();
        for (var j = 1; j < instances.length; j++) instances[j].setReduced(on);
        syncToggles(on);
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window);
