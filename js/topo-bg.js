/* ============================================================
   topo-bg.js
   Topographic contour lines on the black page ground, behind
   the liquid gradient. Transparent canvas: only the lines are
   drawn, so the page colour (black, then orange at the outro)
   shows through between them.

   Lines are one colour (a soft grey) and drift
   slowly the same way the gradient does.

   Usage: <canvas class="topo-bg" data-topo-bg></canvas>
   ============================================================ */
(function (global) {
    'use strict';

    var CFG = {
        // one colour for every line: a soft grey
        color:     '#8E8E96',
        lines:     8,    // contour count over the full height range; higher = denser
        lineWidth: 1.0,   // CSS px
        alpha:     0.18,  // line strength, the same for every line (was 0.3)
        scale:     0.75,  // field zoom; higher = smaller, busier hills
        angle:     -5,   // degrees, same as the gradient
        speed:     0.05,  // how fast the hills reshape
        drift:     0.015, // sideways slide, in screen heights per second
                          // (0.015 = ~14px/s on a 900px screen); negative = other way
        parallax:  0.15,  // drift per screen of scroll
        pointer:     0.9,  // how hard the cursor pulls the lines (0 = off), same as the gradient
        pointerEase: 0.09, // cursor follow smoothing; lower = laggier/softer
        // film grain over the black ground, the same as the liquid gradient
        grain:      0.12,   // strength; 0 = off (the gradient uses 0.085)
        grainScale: 0.85,   // grain size (lower = coarser)
        chroma:     1.5,    // colour in the grain, like TV static: 0 = plain
                            // grey grain, 1 = strong red/green/blue specks
        maxDPR:    2
    };

    var VERT = 'attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}';

    var FRAG = [
        '#extension GL_OES_standard_derivatives : enable',
        'precision highp float;',
        'uniform vec2 u_res;',
        'uniform float u_time,u_shift,u_scroll,u_dpr,u_lines,u_lineWidth,u_alpha,u_angle,u_scale;',
        'uniform vec3 u_col;',
        'uniform vec2 u_mouse;',
        'uniform float u_grain,u_grainScale,u_chroma;',
        'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
        'uniform float u_pointer;',

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
        /* Smooth terrain: one broad octave plus a whisper of a second.
           More fine octaves than this is what made the lines wobbly. */
        'float field(vec2 p){return (snoise(p)+0.12*snoise(p*1.9+vec2(3.1,7.4)))/1.12;}',

        'void main(){',
        '  vec2 uv=(gl_FragCoord.xy-0.5*u_res)/u_res.y;',
        /* cursor, measured on the screen before the drift moves things */
        '  vec2 mrel=uv-u_mouse;',
        /* sideways drift, applied in screen space so it is truly horizontal */
        '  uv.x+=u_shift;',
        '  float a=radians(u_angle);',
        '  mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));',
        '  vec2 p=rot*uv*u_scale;',
        '  p.y+=u_scroll;',
        '  float t=u_time;',
        /* Cursor pull, the same as the gradient: a soft gaussian well that
           drags the lines toward the pointer and stirs them a little. */
        '  float infl=exp(-dot(mrel,mrel)*4.0)*u_pointer;',
        '  p+=mrel*infl*0.7;',
        '  t+=infl*0.6;',
        /* broad, slow warp, so the lines bend like the gradient does */
        '  vec2 q=vec2(snoise(p*0.6+t*0.10),snoise(p*0.6+vec2(5.2,1.3)-t*0.08));',
        '  float h=field(p+0.5*q+vec2(1.7,9.2))*0.5+0.5;',
        /* contour lines at even height steps, anti-aliased to a fixed width */
        '  float v=h*u_lines;',
        /* true change per pixel (gradient length). fwidth() adds x and y,
           which reads ~40% high on diagonals and made those lines thicker */
        '  float aa=length(vec2(dFdx(v),dFdy(v)));',
        '  float d=abs(fract(v+0.5)-0.5);',
        '  float hw=max(u_lineWidth*u_dpr*0.5,0.6);',
        /* edge softened over ~1.5px so curves read smooth, not stepped */
        '  float ln=1.0-smoothstep(aa*(hw-0.75),aa*(hw+0.75),d);',
        /* fade out where lines would crowd into a moire */
        '  ln*=1.0-smoothstep(0.25,0.5,aa);',
        /* every line the same strength */
        '  float al=ln*u_alpha;',
        /* Film / TV grain: locked to the screen and re-rolled every frame,
           as in liquid-hero.js. A shared brightness speck plus its own
           random red, green and blue (u_chroma), so the black is dusted
           with coloured static. The canvas is see-through, so the grain is
           drawn as light over the ground (premultiplied colour, its alpha
           the brightest channel); on near-black there is no room to darken
           anyway. The lines are laid over it. */
        '  vec2 gp=gl_FragCoord.xy*u_grainScale+fract(u_time)*91.7;',
        '  float lum=hash(gp)-0.5;',
        '  vec3 chr=vec3(hash(gp+vec2(17.3,4.1)),hash(gp+vec2(3.7,31.9)),hash(gp+vec2(53.1,11.9)))-0.5;',
        '  vec3 gn=max((vec3(lum)+chr*u_chroma)*u_grain,0.0);',
        '  float ga=max(gn.r,max(gn.g,gn.b));',
        '  gl_FragColor=vec4(u_col*al,al)+vec4(gn,ga)*(1.0-al);',
        '}'
    ].join('\n');

    function hexToRgb(h) {
        var n = parseInt(h.slice(1), 16);
        return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
    }

    function mount(canvas) {
        var gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
        // no WebGL or no derivatives: leave the plain black ground
        if (!gl || !gl.getExtension('OES_standard_derivatives')) {
            canvas.style.display = 'none';
            return;
        }

        function compile(type, src) {
            var s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('topo-bg:', gl.getShaderInfoLog(s));
            return s;
        }
        var prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        gl.useProgram(prog);

        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(prog, 'a_pos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        function U(n) { return gl.getUniformLocation(prog, n); }
        var uRes = U('u_res'), uTime = U('u_time'), uShift = U('u_shift'),
            uScroll = U('u_scroll'), uDpr = U('u_dpr'),
            uMouse = U('u_mouse'), uPointer = U('u_pointer');
        gl.uniform1f(U('u_lines'), CFG.lines);
        gl.uniform1f(U('u_lineWidth'), CFG.lineWidth);
        gl.uniform1f(U('u_alpha'), CFG.alpha);
        gl.uniform1f(U('u_grain'), CFG.grain);
        gl.uniform1f(U('u_grainScale'), CFG.grainScale);
        gl.uniform1f(U('u_chroma'), CFG.chroma);
        gl.uniform1f(U('u_angle'), CFG.angle);
        gl.uniform1f(U('u_scale'), CFG.scale);
        gl.uniform3fv(U('u_col'), hexToRgb(CFG.color));

        var w = 0, h = 0;
        function resize() {
            var dpr = Math.min(global.devicePixelRatio || 1, CFG.maxDPR);
            var nw = Math.round(canvas.clientWidth * dpr);
            var nh = Math.round(canvas.clientHeight * dpr);
            if (nw === w && nh === h) return;
            w = canvas.width = nw;
            h = canvas.height = nh;
            gl.viewport(0, 0, w, h);
            gl.uniform2f(uRes, w, h);
            gl.uniform1f(uDpr, dpr);
        }

        // same motion setting as the gradient: OS setting or the nav toggle
        var mq = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
        function reduced() {
            return (mq && mq.matches) ||
                document.documentElement.classList.contains('liquid-hero-reduced');
        }

        // shift is the sideways slide, kept apart from the clock so its speed
        // can be set on its own (CFG.drift)
        var clock = 0, shift = 0, last = performance.now(), raf = null;

        // Pointer, as in liquid-hero.js: mx/my follow the cursor (eased),
        // amt fades the pull in while it moves and out once it stops.
        var mx = 0, my = 0, tmx = 0, tmy = 0, amt = 0, tAmt = 0, idle = null;
        function pointerTo(e) {
            if (reduced()) return;
            var r = canvas.getBoundingClientRect();
            if (!r.width || !r.height) return;
            tmx = ((e.clientX - r.left) / r.width - 0.5) * (r.width / r.height);
            tmy = 0.5 - (e.clientY - r.top) / r.height;
            tAmt = 1;
            if (idle) clearTimeout(idle);
            idle = setTimeout(function () { tAmt = 0; }, 500);
        }
        // on the window: the canvas sits behind the page and gets no events
        global.addEventListener('pointermove', pointerTo, { passive: true });
        global.addEventListener('pointerdown', pointerTo, { passive: true });
        document.addEventListener('pointerleave', function () { tAmt = 0; });

        function render() {
            resize();
            var red = reduced();
            var vh = canvas.clientHeight || 1;
            gl.uniform1f(uTime, red ? 12.0 : clock);
            gl.uniform1f(uShift, red ? 0 : shift);
            gl.uniform2f(uMouse, mx, my);
            gl.uniform1f(uPointer, red ? 0 : CFG.pointer * amt);
            gl.uniform1f(uScroll, red ? 0 : (global.pageYOffset || 0) / vh * CFG.parallax);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        function frame(now) {
            var dt = Math.min((now - last) / 1000, 0.05);
            clock += dt * CFG.speed;
            shift += dt * CFG.drift;
            mx += (tmx - mx) * CFG.pointerEase;
            my += (tmy - my) * CFG.pointerEase;
            amt += (tAmt - amt) * 0.05;
            last = now;
            render();
            raf = (!document.hidden && !reduced()) ? requestAnimationFrame(frame) : null;
        }
        function sync() {
            if (!document.hidden && !reduced()) {
                if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
            } else {
                if (raf) { cancelAnimationFrame(raf); raf = null; }
                render();
            }
        }

        document.addEventListener('visibilitychange', sync);
        if (mq && mq.addEventListener) mq.addEventListener('change', sync);
        new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        global.addEventListener('resize', function () { if (reduced()) render(); });
        render();
        sync();
    }

    function boot() {
        var nodes = document.querySelectorAll('[data-topo-bg]');
        for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})(window);
