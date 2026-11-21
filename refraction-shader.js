(() => {
  const host = document.querySelector(".shader");
  if (!host || host.dataset.localizedParticlesReady) return;
  host.dataset.localizedParticlesReady = "true";

  const mobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
  host.replaceChildren(canvas);

  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!ctx) return;

  let width = 1;
  let height = 1;
  let dpr = 1;
  let raf = 0;
  let lastTime = 0;
  let visible = !document.hidden;
  let particles = [];

  // Keep the motion inside one quiet pocket; the rest of the page stays black.
  const count = mobile ? 5 : 8;
  const frameInterval = mobile ? 1000 / 24 : 1000 / 30;
  let centerX = 0;
  let centerY = 0;
  let radiusX = 0;
  let radiusY = 0;

  function layoutField() {
    centerX = width * (mobile ? 0.72 : 0.76);
    centerY = height * (mobile ? 0.38 : 0.40);
    radiusX = Math.min(width * (mobile ? 0.19 : 0.17), mobile ? 84 : 210);
    radiusY = Math.min(height * (mobile ? 0.13 : 0.16), mobile ? 82 : 150);
  }

  function makeParticles() {
    particles = Array.from({ length: count }, (_, index) => {
      const angle = Math.random() * Math.PI * 2;
      const orbit = 0.24 + Math.random() * 0.72;
      return {
        angle,
        orbitX: radiusX * orbit,
        orbitY: radiusY * orbit,
        speed: (0.035 + Math.random() * 0.045) * (index % 2 ? -1 : 1),
        radius: 0.72 + Math.random() * 0.55,
        alpha: 0.12 + Math.random() * 0.10,
        phase: Math.random() * Math.PI * 2,
        drift: 0.018 + Math.random() * 0.025,
        x: centerX,
        y: centerY
      };
    });
    placeParticles();
  }

  function placeParticles() {
    for (const p of particles) {
      p.x = centerX + Math.cos(p.angle) * p.orbitX;
      p.y = centerY + Math.sin(p.angle) * p.orbitY;
    }
  }

  function resize() {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.1 : 1.25);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layoutField();
    if (!particles.length) makeParticles();
    else {
      for (const p of particles) {
        p.orbitX = Math.min(p.orbitX, radiusX * 0.92);
        p.orbitY = Math.min(p.orbitY, radiusY * 0.92);
      }
      placeParticles();
    }
    paint(0);
  }

  function paint(time) {
    ctx.clearRect(0, 0, width, height);

    // A very low-contrast localized haze gives the dots a little depth.
    const glow = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, Math.max(radiusX, radiusY) * 1.08
    );
    glow.addColorStop(0, "rgba(145, 151, 166, 0.018)");
    glow.addColorStop(0.62, "rgba(145, 151, 166, 0.009)");
    glow.addColorStop(1, "rgba(145, 151, 166, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(
      centerX - radiusX * 1.1,
      centerY - radiusY * 1.1,
      radiusX * 2.2,
      radiusY * 2.2
    );

    for (const p of particles) {
      const pulse = 0.94 + Math.sin(time * 0.00042 + p.phase) * 0.06;
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
      p.angle += p.speed * dt;
      const sway = Math.sin(now * 0.00012 + p.phase) * p.drift;
      p.x = centerX + Math.cos(p.angle) * p.orbitX + sway * radiusX;
      p.y = centerY + Math.sin(p.angle) * p.orbitY + Math.cos(now * 0.00010 + p.phase) * p.drift * radiusY;
    }

    paint(now);
    raf = requestAnimationFrame(draw);
  }

  function start() {
    if (!reducedMotion && visible && !raf) raf = requestAnimationFrame(draw);
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