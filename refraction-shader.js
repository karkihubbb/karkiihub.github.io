(() => {
  const host = document.querySelector(".shader");
  if (!host || host.dataset.refractionReady) return;
  host.dataset.refractionReady = "true";
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  const fallback = () => {
    host.classList.add("shader-fallback");
    canvas.style.display = "none";
  };
  host.replaceChildren(canvas);

  const isMobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gl = canvas.getContext("webgl", {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: "low-power", preserveDrawingBuffer: false
  });
  if (!gl) { fallback(); return; }

  const vertexSource = [
    "attribute vec2 aPosition;",
    "varying vec2 vUv;",
    "void main() {",
    "  vUv = aPosition * 0.5 + 0.5;",
    "  gl_Position = vec4(aPosition, 0.0, 1.0);",
    "}"
  ].join("\n");

  const fragmentSource = [
    "precision highp float;",
    "varying vec2 vUv;",
    "uniform vec2 uResolution;",
    "uniform float uTime;",
    "float hash21(vec2 p) {",
    "  p = fract(p * vec2(123.34, 456.21));",
    "  p += dot(p, p + 45.32);",
    "  return fract(p.x * p.y);",
    "}",
    "float noise(vec2 p) {",
    "  vec2 i = floor(p);",
    "  vec2 f = fract(p);",
    "  f = f * f * (3.0 - 2.0 * f);",
    "  float a = hash21(i);",
    "  float b = hash21(i + vec2(1.0, 0.0));",
    "  float c = hash21(i + vec2(0.0, 1.0));",
    "  float d = hash21(i + vec2(1.0, 1.0));",
    "  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);",
    "}",
    "float fbm(vec2 p) {",
    "  float value = 0.0;",
    "  float amplitude = 0.5;",
    "  for (int i = 0; i < 3; i++) {",
    "    value += noise(p) * amplitude;",
    "    p = p * 2.02 + vec2(17.1, 9.2);",
    "    amplitude *= 0.5;",
    "  }",
    "  return value;",
    "}",
    "void main() {",
    "  vec2 uv = vUv;",
    "  float aspect = uResolution.x / max(uResolution.y, 1.0);",
    "  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);",
    "  float t = uTime;",
    "  vec2 warp = vec2(",
    "    fbm(p * 1.28 + vec2(0.0, t * 0.040)),",
    "    fbm(p * 1.28 + vec2(5.2, 1.7) - vec2(t * 0.034, t * 0.027))",
    "  );",
    "  vec2 q = p + (warp - 0.5) * 1.24;",
    "  vec2 drift = vec2(t * 0.030, -t * 0.023);",
    "  float field = fbm(q * 1.72 + drift);",
    "  float detail = fbm(q * 3.18 - vec2(t * 0.018, t * 0.021));",
    "  float phase = q.x * 1.52 + q.y * 1.18",
    "    + sin(q.x * 1.34 + t * 0.075) * 0.72",
    "    + sin(q.y * 1.16 - t * 0.065) * 0.56",
    "    + field * 2.65;",
    "  float ridge = 1.0 - abs(sin(phase * 1.12 + detail * 0.62));",
    "  float caustic = pow(max(ridge, 0.0), 8.0);",
    "  float dx = noise((q + vec2(0.014, 0.0)) * 1.72 + drift) - noise(q * 1.72 + drift);",
    "  float dy = noise((q + vec2(0.0, 0.014)) * 1.72 + drift) - noise(q * 1.72 + drift);",
    "  vec3 normal = normalize(vec3(-dx * 5.2, -dy * 5.2, 0.72));",
    "  vec3 lightDir = normalize(vec3(-0.46, 0.52, 0.82));",
    "  float diffuse = max(dot(normal, lightDir), 0.0);",
    "  float specular = pow(max(dot(reflect(-lightDir, normal), vec3(0.0, 0.0, 1.0)), 0.0), 22.0);",
    "  float edgeLight = pow(1.0 - clamp(normal.z, 0.0, 1.0), 1.8);",
    "  vec3 deep = vec3(0.012, 0.014, 0.018);",
    "  vec3 graphite = vec3(0.052, 0.057, 0.066);",
    "  vec3 wine = vec3(0.052, 0.019, 0.026);",
    "  float warmth = smoothstep(0.48, 0.88, detail) * smoothstep(0.22, 0.78, field);",
    "  vec3 color = mix(deep, graphite, smoothstep(0.16, 0.82, field) * 0.72);",
    "  color = mix(color, wine, warmth * 0.34);",
    "  color += vec3(0.12, 0.13, 0.15) * diffuse * 0.52;",
    "  color += vec3(0.42, 0.45, 0.50) * specular * 0.24;",
    "  color += vec3(0.30, 0.12, 0.15) * caustic * 0.20;",
    "  color += vec3(0.24, 0.27, 0.32) * edgeLight * 0.055;",
    "  float softRibbon = pow(max(0.0, 0.5 + 0.5 * sin(phase * 0.72 + detail * 1.4)), 5.0);",
    "  color += vec3(0.085, 0.095, 0.11) * softRibbon * 0.32;",
    "  float vignette = 1.0 - smoothstep(0.36, 1.18, length((uv - 0.5) * vec2(aspect, 1.0)));",
    "  color *= mix(0.58, 1.0, vignette);",
    "  color = pow(max(color, 0.0), vec3(0.94));",
    "  gl_FragColor = vec4(color, 1.0);",
    "}"
  ].join("\n");

  function compile(type, source) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("KarkiVerse refraction shader:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) { fallback(); return; }
  const program = gl.createProgram();
  if (!program) { fallback(); return; }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("KarkiVerse refraction shader link:", gl.getProgramInfoLog(program));
    fallback();
    return;
  }

  gl.useProgram(program);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolutionLocation = gl.getUniformLocation(program, "uResolution");
  const timeLocation = gl.getUniformLocation(program, "uTime");

  let width = 0, height = 0, frame = 0, lastFrame = 0;
  let visible = !document.hidden, disposed = false;
  const frameInterval = isMobile ? 1000 / 30 : 1000 / 40;

  function resize() {
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.05 : 1.35);
    const nextWidth = Math.max(1, Math.floor(rect.width * dpr));
    const nextHeight = Math.max(1, Math.floor(rect.height * dpr));
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(resolutionLocation, width, height);
  }
  function draw(now) {
    frame = 0;
    if (disposed || !visible) return;
    if (lastFrame && now - lastFrame < frameInterval) {
      frame = requestAnimationFrame(draw);
      return;
    }
    lastFrame = now;
    gl.uniform1f(timeLocation, reducedMotion ? 0.0 : now * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (!reducedMotion) frame = requestAnimationFrame(draw);
  }
  function start() {
    if (!disposed && visible && !frame && !reducedMotion) frame = requestAnimationFrame(draw);
  }
  function onVisibility() {
    visible = !document.hidden;
    if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; }
    else start();
  }

  resize();
  if (reducedMotion) {
    gl.uniform1f(timeLocation, 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  } else start();

  const observer = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  if (observer) observer.observe(host);
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    disposed = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    fallback();
  });
})();