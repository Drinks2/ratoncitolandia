"use client";

import { useEffect, useRef, useState } from "react";

function DuckPeekFx({
  triggerKey,
  spawnCenterX,
}: {
  triggerKey: number;
  spawnCenterX: number | null;
}) {
  const [visible, setVisible] = useState(false);
  const [leftPx, setLeftPx] = useState<number | null>(null);

  useEffect(() => {
    if (triggerKey === 0) return;

    const duckWidthPx = 256; // matches w-64
    if (spawnCenterX != null) {
      setLeftPx(Math.floor(spawnCenterX - duckWidthPx / 2));
    } else {
      const w = window.innerWidth;
      const maxLeft = Math.max(0, w - duckWidthPx);
      setLeftPx(Math.floor(Math.random() * (maxLeft + 1)));
    }

    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 1100);
    return () => window.clearTimeout(t);
  }, [triggerKey, spawnCenterX]);

  return (
    <div
      className="pointer-events-none fixed bottom-0 left-0 z-30 h-0 w-full"
      aria-hidden="true"
    >
      <img
        src="/duck.png"
        alt=""
        className="absolute bottom-0 h-auto w-64"
        style={{
          left: leftPx == null ? "50%" : `${leftPx}px`,
          marginLeft: leftPx == null ? "-128px" : undefined,
          transform: `translateY(${visible ? "0%" : "120%"})`,
          transition: "transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />
    </div>
  );
}

type HeartBody = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  av: number;
};

type PointerState = {
  x: number;
  y: number;
  isDown: boolean;
  pointerId: number | null;
  grabbed: boolean;
  grabbedId: number | null;
  grabOffsetX: number;
  grabOffsetY: number;
};

type ShapeBoundsFrac = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function HeartPhysicsFx({
  triggerKey,
  clearKey,
  spawnCenterX,
}: {
  triggerKey: number;
  clearKey: number;
  spawnCenterX: number | null;
}) {
  const measureSvgRef = useRef<SVGSVGElement | null>(null);
  const measurePathRef = useRef<SVGPathElement | null>(null);
  const heartElsRef = useRef<Map<number, SVGSVGElement>>(new Map());
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const bodiesRef = useRef<Map<number, HeartBody>>(new Map());
  const heartIdsRef = useRef<number[]>([]);
  const nextIdRef = useRef(1);
  const pointerRef = useRef<PointerState>({
    x: 0,
    y: 0,
    isDown: false,
    pointerId: null,
    grabbed: false,
    grabbedId: null,
    grabOffsetX: 0,
    grabOffsetY: 0,
  });
  const shapeBoundsRef = useRef<ShapeBoundsFrac>({
    minX: 0,
    maxX: 1,
    minY: 0,
    maxY: 1,
  });

  const [heartIds, setHeartIds] = useState<number[]>([]);

  useEffect(() => {
    if (clearKey === 0) return;
    bodiesRef.current.clear();
    heartElsRef.current.clear();
    heartIdsRef.current = [];
    setHeartIds([]);
    pointerRef.current = {
      x: 0,
      y: 0,
      isDown: false,
      pointerId: null,
      grabbed: false,
      grabbedId: null,
      grabOffsetX: 0,
      grabOffsetY: 0,
    };
  }, [clearKey]);

  useEffect(() => {
    const svgEl = measureSvgRef.current;
    const pathEl = measurePathRef.current;
    if (!svgEl || !pathEl) return;

    // Calculate the real bounds of the heart path inside the SVG viewBox.
    // This makes wall collisions match the heart shape instead of the SVG square.
    try {
      const bbox = pathEl.getBBox();
      const vb = svgEl.viewBox?.baseVal;
      const vbW = vb?.width ?? 512;
      const vbH = vb?.height ?? 512;
      if (vbW > 0 && vbH > 0 && bbox.width > 0 && bbox.height > 0) {
        shapeBoundsRef.current = {
          minX: bbox.x / vbW,
          maxX: (bbox.x + bbox.width) / vbW,
          minY: bbox.y / vbH,
          maxY: (bbox.y + bbox.height) / vbH,
        };
      }
    } catch {
      shapeBoundsRef.current = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    }
  }, []);

  useEffect(() => {
    const gravity = 2400;
    const restitution = 0.72;
    const air = 0.997;
    const angularAir = 0.992;

    const heartRestitution = 0.35;
    const heartFriction = 0.06;
    const collisionSlop = 0.5;
    const collisionIterations = 2;

    const maxV = 2400;
    const clamp = (v: number, min: number, max: number) =>
      Math.min(max, Math.max(min, v));

    const getCenter = (b: HeartBody) => ({
      cx: b.x + b.size / 2,
      cy: b.y + b.size / 2,
    });

    const getRadius = (b: HeartBody) => b.size * 0.36;

    const handlePointerDown = (e: PointerEvent) => {
      const ids = heartIdsRef.current;
      if (ids.length === 0) return;

      let chosenId: number | null = null;
      let chosenDist = Number.POSITIVE_INFINITY;

      for (const id of ids) {
        const body = bodiesRef.current.get(id);
        if (!body) continue;
        const { cx, cy } = getCenter(body);
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);
        const grabRadius = body.size * 0.55;
        if (dist <= grabRadius && dist < chosenDist) {
          chosenDist = dist;
          chosenId = id;
        }
      }

      if (chosenId == null) return;
      const body = bodiesRef.current.get(chosenId);
      if (!body) return;
      const { cx, cy } = getCenter(body);

      pointerRef.current = {
        x: e.clientX,
        y: e.clientY,
        isDown: true,
        pointerId: e.pointerId,
        grabbed: true,
        grabbedId: chosenId,
        grabOffsetX: e.clientX - cx,
        grabOffsetY: e.clientY - cy,
      };

      // Prevent accidental clicks on underlying UI when grabbing a heart.
      e.preventDefault();
      e.stopPropagation();
    };

    const handlePointerMove = (e: PointerEvent) => {
      const p = pointerRef.current;
      if (!p.grabbed) return;
      if (p.pointerId !== e.pointerId) return;
      p.x = e.clientX;
      p.y = e.clientY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      const p = pointerRef.current;
      if (!p.grabbed) return;
      if (p.pointerId !== e.pointerId) return;
      pointerRef.current = {
        ...p,
        isDown: false,
        grabbed: false,
        grabbedId: null,
        pointerId: null,
      };
    };

    window.addEventListener("pointerdown", handlePointerDown, {
      passive: false,
      capture: true,
    });
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
      capture: true,
    });
    window.addEventListener("pointerup", handlePointerUp, {
      passive: true,
      capture: true,
    });
    window.addEventListener("pointercancel", handlePointerUp, {
      passive: true,
      capture: true,
    });

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastRef.current = null;

    const step = (now: number) => {
      const last = lastRef.current;
      lastRef.current = now;

      const dt = Math.min(0.034, last ? (now - last) / 1000 : 1 / 60);
      const bounds = shapeBoundsRef.current;
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const p = pointerRef.current;

      // 1) Integrate forces/velocities.
      for (const id of heartIdsRef.current) {
        const body = bodiesRef.current.get(id);
        if (!body) continue;

        // Mouse/touch interaction: spring toward pointer while grabbed.
        if (p.grabbed && p.grabbedId === id) {
          const { cx, cy } = getCenter(body);
          const targetCx = p.x - p.grabOffsetX;
          const targetCy = p.y - p.grabOffsetY;

          const dx = targetCx - cx;
          const dy = targetCy - cy;

          const k = 55; // spring strength
          const fx = dx * k;
          const fy = dy * k;

          body.vx += fx * dt;
          body.vy += fy * dt;

          // Torque while dragging.
          const rx = p.x - cx;
          const ry = p.y - cy;
          const torque = rx * fy - ry * fx;
          body.av += (torque / Math.max(1, body.size * body.size)) * 1.35 * dt;
        }

        body.vy += gravity * dt;
        body.vx *= air;
        body.vy *= air;

        body.vx = clamp(body.vx, -maxV, maxV);
        body.vy = clamp(body.vy, -maxV, maxV);

        body.x += body.vx * dt;
        body.y += body.vy * dt;

        body.av *= angularAir;
        body.angle += body.av * dt;
      }

      // 2) Heart-heart collisions (circle approximation). A couple of iterations helps stability.
      for (let iter = 0; iter < collisionIterations; iter++) {
        const ids = heartIdsRef.current;
        for (let a = 0; a < ids.length; a++) {
          for (let b = a + 1; b < ids.length; b++) {
            const idA = ids[a];
            const idB = ids[b];
            const bodyA = bodiesRef.current.get(idA);
            const bodyB = bodiesRef.current.get(idB);
            if (!bodyA || !bodyB) continue;

            const ca = getCenter(bodyA);
            const cb = getCenter(bodyB);
            let dx = cb.cx - ca.cx;
            let dy = cb.cy - ca.cy;
            let dist = Math.hypot(dx, dy);
            const ra = getRadius(bodyA);
            const rb = getRadius(bodyB);
            const minDist = ra + rb;

            if (dist === 0) {
              dx = (Math.random() - 0.5) * 0.01;
              dy = (Math.random() - 0.5) * 0.01;
              dist = Math.hypot(dx, dy);
            }

            const overlap = minDist - dist;
            if (overlap <= 0) continue;

            const nx = dx / dist;
            const ny = dy / dist;

            // Positional correction.
            const sep = Math.max(0, overlap - collisionSlop);
            const aGrabbed = p.grabbed && p.grabbedId === idA;
            const bGrabbed = p.grabbed && p.grabbedId === idB;

            const moveA = aGrabbed ? 0 : bGrabbed ? 1 : 0.5;
            const moveB = bGrabbed ? 0 : aGrabbed ? 1 : 0.5;

            bodyA.x -= nx * sep * moveA;
            bodyA.y -= ny * sep * moveA;
            bodyB.x += nx * sep * moveB;
            bodyB.y += ny * sep * moveB;

            // Velocity impulse along the normal.
            const rvx = bodyB.vx - bodyA.vx;
            const rvy = bodyB.vy - bodyA.vy;
            const vn = rvx * nx + rvy * ny;
            if (vn > 0) continue;

            const e = heartRestitution;
            const j = (-(1 + e) * vn) / (aGrabbed || bGrabbed ? 1 : 2);
            const ix = j * nx;
            const iy = j * ny;

            if (!aGrabbed) {
              bodyA.vx -= ix;
              bodyA.vy -= iy;
            }
            if (!bGrabbed) {
              bodyB.vx += ix;
              bodyB.vy += iy;
            }

            // Tangential friction impulse.
            const tx = -ny;
            const ty = nx;
            const vt = rvx * tx + rvy * ty;
            const jt = (-vt * heartFriction) / (aGrabbed || bGrabbed ? 1 : 2);
            const jtx = jt * tx;
            const jty = jt * ty;

            if (!aGrabbed) {
              bodyA.vx -= jtx;
              bodyA.vy -= jty;
            }
            if (!bGrabbed) {
              bodyB.vx += jtx;
              bodyB.vy += jty;
            }

            // Add some angular kick from the tangential impulse.
            const leverA = Math.max(1, ra);
            const leverB = Math.max(1, rb);
            if (!aGrabbed) bodyA.av += (jt * leverA) / Math.max(1, bodyA.size * bodyA.size);
            if (!bGrabbed) bodyB.av -= (jt * leverB) / Math.max(1, bodyB.size * bodyB.size);
          }
        }
      }

      // 3) Walls + render transforms.
      for (const id of heartIdsRef.current) {
        const body = bodiesRef.current.get(id);
        const el = heartElsRef.current.get(id);
        if (!body || !el) continue;

        const left = body.x + bounds.minX * body.size;
        const right = body.x + bounds.maxX * body.size;
        const top = body.y + bounds.minY * body.size;
        const bottom = body.y + bounds.maxY * body.size;

        if (left < 0) {
          body.x += -left;
          body.vx = -body.vx * restitution;
          body.av += (body.vy / 1400) * 0.9;
        } else if (right > screenW) {
          body.x -= right - screenW;
          body.vx = -body.vx * restitution;
          body.av -= (body.vy / 1400) * 0.9;
        }

        if (top < 0) {
          body.y += -top;
          body.vy = -body.vy * restitution;
          body.av -= (body.vx / 1400) * 0.9;
        } else if (bottom > screenH) {
          body.y -= bottom - screenH;
          body.vy = -body.vy * restitution;
          body.vx *= 0.92;
          body.av += (body.vx / 1100) * 1.25;
        }

        el.style.display = "block";
        el.style.width = `${body.size}px`;
        el.style.height = `${body.size}px`;
        el.style.transform = `translate3d(${body.x}px, ${body.y}px, 0) rotate(${body.angle}rad)`;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("pointercancel", handlePointerUp, true);
    };
  }, []);

  useEffect(() => {
    if (triggerKey === 0) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const baseSize = Math.min(
      260,
      Math.max(180, Math.floor(Math.min(w, h) * 0.28)),
    );

    const minScale = 0.82;
    const maxScale = 1.14;
    const size = Math.floor(
      Math.min(300, Math.max(150, baseSize * (minScale + Math.random() * (maxScale - minScale)))),
    );

    const id = nextIdRef.current++;
    const startX =
      spawnCenterX != null
        ? Math.floor(spawnCenterX - size / 2)
        : Math.floor(Math.random() * Math.max(1, w - size));
    const startY = h - size - 40;

    bodiesRef.current.set(id, {
      id,
      x: startX,
      y: startY,
      vx: (Math.random() - 0.5) * 700,
      vy: -1100,
      size,
      angle: (Math.random() - 0.5) * 0.35,
      av: (Math.random() - 0.5) * 3.0,
    });

    const maxHearts = 10;
    const prevIds = heartIdsRef.current;
    const nextIds = [...prevIds, id];
    const trimmed =
      nextIds.length > maxHearts
        ? nextIds.slice(nextIds.length - maxHearts)
        : nextIds;

    // Remove old hearts (keep the newest one always).
    for (const oldId of prevIds) {
      if (!trimmed.includes(oldId)) {
        bodiesRef.current.delete(oldId);
        heartElsRef.current.delete(oldId);
      }
    }

    heartIdsRef.current = trimmed;
    setHeartIds(trimmed);
  }, [triggerKey, spawnCenterX]);

  const heartPathD =
    "M256 472s-22.4-13.7-44.9-30.4C142.6 400.8 64 335.3 64 243.6 64 176.3 115.3 128 182.2 128c35.9 0 58.7 17.8 73.8 35.7C271.1 145.8 293.9 128 329.8 128 396.7 128 448 176.3 448 243.6c0 91.7-78.6 157.2-147.1 198C278.4 458.3 256 472 256 472z";

  return (
    <>
      {/* Hidden measurer for getBBox() (needed for accurate bounds) */}
      <svg
        ref={measureSvgRef}
        viewBox="0 0 512 512"
        className="pointer-events-none fixed left-0 top-0"
        style={{
          width: 0,
          height: 0,
          opacity: 0,
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        <path ref={measurePathRef} d={heartPathD} />
      </svg>

      {heartIds.map((id) => (
        <svg
          key={id}
          ref={(node) => {
            if (node) heartElsRef.current.set(id, node);
            else heartElsRef.current.delete(id);
          }}
          viewBox="0 0 512 512"
          className="pointer-events-none fixed left-0 top-0 z-30"
          style={{
            display: "none",
            color: "var(--rosa-fuerte, var(--foreground))",
            filter:
              "drop-shadow(0 12px 30px rgba(0,0,0,0.25)) drop-shadow(0 0 24px currentColor)",
            willChange: "transform",
            transformBox: "fill-box",
            transformOrigin: "center",
          }}
          aria-hidden="true"
        >
          <path
            d={heartPathD}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </>
  );
}


export default function Home() {
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const lastHeroTimeRef = useRef(0);
  const [hotspotPhase, setHotspotPhase] = useState<"start" | "end">("start");
  const [hotspotTransitionEnabled, setHotspotTransitionEnabled] =
    useState(false);
  const [duckFxKey, setDuckFxKey] = useState(0);
  const [heartFxKey, setHeartFxKey] = useState(0);
  const [clearHeartsKey, setClearHeartsKey] = useState(0);
  const [spawnCenterX, setSpawnCenterX] = useState<number | null>(null);

  const getHeartBaseSizePx = (w: number, h: number) =>
    Math.min(260, Math.max(180, Math.floor(Math.min(w, h) * 0.28)));

  const getActiveVideo = () => heroVideoRef.current;

  const stopAndResetVideo = (video: HTMLVideoElement | null) => {
    if (!video) return;
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // Some browsers can throw if not seekable yet.
    }
  };


  const handleHeroTimeUpdate = () => {
    const hero = heroVideoRef.current;
    if (!hero) return;

    const t = hero.currentTime;
    const last = lastHeroTimeRef.current;

    // When the video loops, currentTime jumps backwards.
    // Reset the hotspot to its initial position and animate again.
    if (last > t + 0.25) {
      animateHotspotStartToEnd();
    }

    lastHeroTimeRef.current = t;
  };

  // Posición INICIAL del hotspot (en % del alto/ancho de la pantalla)
  // Por ahora lo bajé más. Luego me dices la posición final + tiempo y lo animamos.
  const surpriseHotspotStart = {
    xPct: 50,
    yPct: 26,
  };

  // Posición FINAL (más arriba). Ajusta yPct para "subirlo mucho".
  const surpriseHotspotEnd = {
    xPct: 50,
    yPct: 6,
  };

  const hotspotMoveDurationMs = 8000;

  const animateHotspotStartToEnd = () => {
    // Jump to start (no animation), then animate to end.
    setHotspotTransitionEnabled(false);
    setHotspotPhase("start");

    requestAnimationFrame(() => {
      setHotspotTransitionEnabled(true);
      requestAnimationFrame(() => {
        setHotspotPhase("end");
      });
    });
  };

  const togglePlayPause = async () => {
    const video = getActiveVideo();
    if (!video) return;

    if (video.paused || video.ended) {
      if (video.ended) {
        video.currentTime = 0;
      }
      try {
        await video.play();
      } catch {
        // Autoplay/play can be blocked; keep UI state driven by events.
      }
      return;
    }

    video.pause();
  };

  const handleSurpriseClick = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const duckWidthPx = 256;
    const heartBasePx = getHeartBaseSizePx(w, h);
    const heartMaxScale = 1.14;
    const heartMaxPx = Math.floor(Math.min(300, Math.max(150, heartBasePx * heartMaxScale)));

    const half = Math.max(duckWidthPx, heartMaxPx) / 2;
    const minCenter = half;
    const maxCenter = Math.max(minCenter, w - half);
    const nextCenter =
      minCenter === maxCenter
        ? Math.floor(minCenter)
        : Math.floor(minCenter + Math.random() * (maxCenter - minCenter));
    setSpawnCenterX(nextCenter);
    setDuckFxKey((v) => v + 1);
    setHeartFxKey((v) => v + 1);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative min-h-screen overflow-hidden">
        {/* HERO container (first in sequence) */}
        <div
          className="absolute inset-0 opacity-100"
          aria-hidden={false}
        >
          <video
            ref={heroVideoRef}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            preload="auto"
            loop
            aria-label="Video de fondo (HERO)"
            src="/video/hero.mov"
            onPlay={() => {
              setIsPlaying(true);
              const video = heroVideoRef.current;
              lastHeroTimeRef.current = video?.currentTime ?? 0;
              if (video && video.currentTime < 0.1) {
                animateHotspotStartToEnd();
              }
            }}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleHeroTimeUpdate}
          >
            <source src="/video/hero.mp4" type="video/mp4" />
            <source src="/video/hero.mov" />
          </video>
        </div>

        {/* Hotspot visible (temporal) para acomodarlo */}
        <div className="pointer-events-none absolute inset-0 z-20">
          <div
            className="pointer-events-auto absolute h-24 w-96 -translate-x-1/2"
            style={{
              left: `${(hotspotPhase === "end" ? surpriseHotspotEnd : surpriseHotspotStart).xPct}%`,
              top: `${(hotspotPhase === "end" ? surpriseHotspotEnd : surpriseHotspotStart).yPct}%`,
              transition: hotspotTransitionEnabled
                ? `left ${hotspotMoveDurationMs}ms ease-in-out, top ${hotspotMoveDurationMs}ms ease-in-out`
                : "none",
            }}
          >
            <button
              type="button"
              onClick={handleSurpriseClick}
              className="h-full w-full cursor-pointer rounded-md bg-transparent"
              aria-label="Sorpresa"
            />
          </div>
        </div>

        <DuckPeekFx triggerKey={duckFxKey} spawnCenterX={spawnCenterX} />
        <HeartPhysicsFx
          triggerKey={heartFxKey}
          clearKey={clearHeartsKey}
          spawnCenterX={spawnCenterX}
        />

        <div className="fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlayPause}
              className="inline-flex items-center justify-center rounded-md border border-foreground/20 bg-background/90 px-2 py-1 text-xs backdrop-blur"
              aria-label={isPlaying ? "Pausar video" : "Reproducir video"}
            >
              {isPlaying ? "Pausar" : "Reproducir"}
            </button>


            <button
              type="button"
              onClick={() => setClearHeartsKey((v) => v + 1)}
              className="inline-flex items-center justify-center rounded-md border border-foreground/20 bg-background/90 px-2 py-1 text-xs backdrop-blur"
              aria-label="Limpiar corazones"
            >
              Limpiar
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
