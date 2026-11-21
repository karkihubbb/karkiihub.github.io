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
    "    p = p * 2.03 + vec2(11.7, 8.3);",
    "    amplitude *= 0.5;",
    "  }",
    "  return value;",
    "}",
    "float surfaceHeight(vec2 p, float t) {",
    "  vec2 drift = vec2(t * 0.040, -t * 0.028);",
    "  float warpX = fbm(p * 1.12 + drift);",
    "  float warpY = fbm(p * 1.12 + vec2(4.7, -2.3) - drift * 0.8);",
    "  vec2 q = p + (vec2(warpX, warpY) - 0.5) * 0.92;",
    "  float broad = fbm(q * 1.55 + drift);",
    "  float detail = fbm(q * 2.9 - drift * 1.35);",
    "  float foldA = sin(q.x * 2.15 + sin(q.y * 1.7 + t * 0.095) * 1.15 + broad * 4.1 + t * 0.12);",
    "  float foldB = cos(q.y * 2.35 + sin(q.x * 1.35 - t * 0.075) * 0.95 + detail * 3.3 - t * 0.09);",
    "  return broad * 0.58 + detail * 0.19 + foldA * 0.13 + foldB * 0.10;",
    "}",
    "void main() {",
    "  float aspect = uResolution.x / max(uResolution.y, 1.0);",
    "  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);",
    "  float t = uTime;",
    "  float h = surfaceHeight(p, t);",
    "  float hx = surfaceHeight(p + vec2(0.022, 0.0), t);",
    "  float hy = surfaceHeight(p + vec2(0.0, 0.022), t);",
    "  vec3 normal = normalize(vec3((h - hx) * 25.0, (h - hy) * 25.0, 0.72));",
    "  vec3 viewDir = vec3(0.0, 0.0, 1.0);",
    "  vec3 lightA = normalize(vec3(-0.48, 0.58, 0.78));",
    "  vec3 lightB = normalize(vec3(0.64, -0.28, 0.72));",
    "  float diffuse = max(dot(normal, lightA), 0.0);",
    "  float specA = pow(max(dot(reflect(-lightA, normal), viewDir), 0.0), 30.0);",
    "  float specB = pow(max(dot(reflect(-lightB, normal), viewDir), 0.0), 48.0);",
    "  float fresnel = pow(1.0 - max(normal.z, 0.0), 2.3);",
    "  vec2 drift = vec2(t * 0.040, -t * 0.028);",
    "  float field = fbm(p * 1.55 + drift);",
    "  float detail = fbm(p * 2.9 - drift * 1.35);",
    "  vec2 q = p + vec2(field - 0.5, detail - 0.5) * 0.8;",
    "  float phase = q.x * 2.1 + q.y * 1.65 + sin(q.x * 1.6 + t * 0.08) * 1.15 + field * 4.2 + t * 0.11;",
    "  float filament = pow(max(0.0, 1.0 - abs(sin(phase))), 9.0);",
    "  float softBand = pow(max(0.0, 0.5 + 0.5 * sin(phase * 0.56 + detail * 2.0)), 3.0);",
    "  float path = q.y - sin(q.x * 1.65 + t * 0.065) * 0.17 - sin(q.x * 3.0 - t * 0.045) * 0.045;",
    "  float glassFold = exp(-pow(path / 0.17, 2.0));",
    "  float foldEdge = exp(-pow((abs(path) - 0.075) / 0.025, 2.0));",
    "  vec2 refractedUv = vUv + normal.xy * 0.13;",
    "  float refracted = fbm(refractedUv * vec2(2.1, 1.65) + drift);",
    "  vec3 deep = vec3(0.006, 0.007, 0.010);",
    "  vec3 graphite = vec3(0.032, 0.038, 0.047);",
    "  vec3 refractionTint = mix(vec3(0.012, 0.016, 0.022), vec3(0.085, 0.105, 0.13), smoothstep(0.28, 0.78, refracted));",
    "  vec3 color = mix(deep, graphite, smoothstep(0.18, 0.82, field) * 0.68);",
    "  color = mix(color, refractionTint, 0.32);",
    "  color += vec3(0.10, 0.12, 0.15) * diffuse * 0.42;",
    "  color += vec3(0.58, 0.66, 0.76) * specA * 0.72;",
    "  color += vec3(0.28, 0.33, 0.40) * specB * 0.40;",
    "  color += vec3(0.27, 0.31, 0.36) * filament * 0.62;",
    "  color += vec3(0.075, 0.085, 0.10) * softBand * 0.52;",
    "  color += vec3(0.13, 0.15, 0.18) * glassFold * 0.25;",
    "  color += vec3(0.42, 0.46, 0.52) * foldEdge * 0.14;",
    "  color += vec3(0.20, 0.055, 0.075) * filament * smoothstep(0.45, 0.85, detail) * 0.20;",
    "  color += vec3(0.13, 0.15, 0.18) * fresnel * 0.08;",
    "  float vignette = 1.0 - smoothstep(0.38, 1.18, length((vUv - 0.5) * vec2(aspect, 1.0)));",
    "  color *= mix(0.72, 1.0, vignette);",
    "  color = pow(max(color, 0.0), vec3(0.92));",
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