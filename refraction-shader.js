(() => {
  const host = document.querySelector(".shader");
  if (!host || host.dataset.minimalParticlesReady) return;
  host.dataset.minimalParticlesReady = "true";

  const mobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  host.replaceChildren(canvas);

  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!ctx) {
    host.classList.add("shader-fallback");
    return;
  }

  let width = 1;
  let height = 1;
  let dpr = 1;
  let raf = 0;
  let lastTime = 0;
  let visible = !document.hidden;
  let particles = [];

  const count = mobile ? 13 : 23;
  const frameInterval = mobile ? 1000 / 24 : 1000 / 30;

  function makeParticles() {
    particles = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 3.2;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.55 + Math.random() * 0.72,
        alpha: 0.10 + Math.random() * 0.13,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.62,
        phase: Math.random() * Math.PI * 2,
        breathe: 0.025 + Math.random() * 0.035
      };
    });
  }

  function resize() {
    const rect = host.getBoundingClientRect();
    const nextWidth = Math.max(1, rect.width);
    const nextHeight = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.1 : 1.25);
    width = nextWidth;
    height = nextHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!particles.length) makeParticles();
    else {
      for (const p of particles) {
        p.x = Math.min(width, p.x);
        p.y = Math.min(height, p.y);
      }
    }
    paint(0);
  }

  function paint(time) {
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      const pulse = 1 + Math.sin(time * 0.00035 + p.phase) * p.breathe;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * pulse, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(218, 222, 232, " + p.alpha + ")";
      ctx.fill();
    }
  }

  function draw(now) {
    raf = 0;
    if (!visible) return;
    if (lastTime && now - lastTime < frameInterval) {
      raf = requestAnimationFrame(draw);
      return;
    }

    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
    lastTime = now;

    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < -3) p.x = width + 3;
      if (p.x > width + 3) p.x = -3;
      if (p.y < -3) p.y = height + 3;
      if (p.y > height + 3) p.y = -3;
    }

    paint(now);
    raf = requestAnimationFrame(draw);
  }

  function start() {
    if (!reducedMotion && visible && !raf) {
      raf = requestAnimationFrame(draw);
    }
  }

  function onVisibilityChange() {
    visible = !document.hidden;
    if (!visible && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      lastTime = 0;
      start();
    }
  }

  resize();
  if (reducedMotion) paint(0);
  else start();

  const observer = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  if (observer) observer.observe(host);
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
})();