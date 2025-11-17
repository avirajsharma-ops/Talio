"use client";

import { useEffect } from "react";

// React hook that renders the organic MAYA blob animation into
// #maya-blob-canvas inside #maya-blob-card.
//
// This is a direct adaptation of the original blob IIFE from public/maya-runtime.js,
// but structured as a hook that cleans up its listeners.
export function useMayaBlob() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    function init(cardEl, canvasEl) {
      const card = cardEl;
      const canvas = canvasEl;

      if (!card || !canvas) {
        console.error("MAYA: Cannot initialize blob - missing elements");
        return () => {};
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("MAYA: Cannot get 2d context from canvas");
        return () => {};
      }

      const COLORS = [
        ["#00f5d4", "#00e1a5", "#4ea1ff"],
        ["#6a5cff", "#7b66ff", "#48e1c6"],
        ["#39ffd0", "#32e6b7", "#5a8bff"],
      ];

      let canvasW = 0;
      let canvasH = 0;

      const sizeCanvas = () => {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const rect = card.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        if (width === 0 || height === 0) {
          console.warn("MAYA: Card has zero dimensions, retrying...");
          window.setTimeout(sizeCanvas, 100);
          return;
        }

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        canvasW = width;
        canvasH = height;
      };

      sizeCanvas();
      window.addEventListener("resize", sizeCanvas, { passive: true });

      const BLOBS = [];
      const MAX = window.matchMedia && window.matchMedia("(max-width: 640px)").matches ? 3 : 5;
      const mouse = { x: 0.5, y: 0.5, active: false };
      let pointerInside = false;

      const rand = (min, max) => Math.random() * (max - min) + min;

      const initBlobs = () => {
        BLOBS.length = 0;
        const width = canvasW;
        const height = canvasH;
        const cx = width * 0.5;
        const cy = height * 0.5;
        const margin = Math.min(width, height) * 0.08;
        const baseRmin = Math.min(width, height) * 0.18;
        const baseRmax = Math.min(width, height) * 0.35;

        for (let i = 0; i < MAX; i += 1) {
          const angle = rand(0, Math.PI * 2);
          const dist = rand(0, Math.min(width, height) * 0.15);
          const r = rand(baseRmin, baseRmax);
          const homeX = cx + Math.cos(angle) * dist;
          const homeY = cy + Math.sin(angle) * dist;
          const speed = rand(0.12, 0.25);
          const theta = rand(0, Math.PI * 2);
          const palette = COLORS[i % COLORS.length];

          BLOBS.push({
            x: homeX,
            y: homeY,
            r,
            vx: Math.cos(theta) * speed,
            vy: Math.sin(theta) * speed,
            hx: homeX,
            hy: homeY,
            palette,
            pulsePhase: rand(0, 1000),
            margin,
            noiseOffset: rand(0, 1000),
          });
        }
      };

      initBlobs();
      window.addEventListener("resize", initBlobs, { passive: true });

      const onPointerEnter = () => {
        pointerInside = true;
        mouse.active = true;
      };

      const onPointerLeave = () => {
        pointerInside = false;
        mouse.active = false;
      };

      const onPointerMove = (e) => {
        const rect = card.getBoundingClientRect();
        mouse.x = (e.clientX - rect.left) / rect.width;
        mouse.y = (e.clientY - rect.top) / rect.height;
        mouse.active = true;
      };

      card.addEventListener("pointerenter", onPointerEnter);
      card.addEventListener("pointerleave", onPointerLeave);
      card.addEventListener("pointermove", onPointerMove);

      const hexWithAlpha = (hex, a) => {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!m) return hex;
        const r = parseInt(m[1], 16);
        const g = parseInt(m[2], 16);
        const b = parseInt(m[3], 16);
        return `rgba(${r},${g},${b},${a})`;
      };

      const drawBlob = (b, now) => {
        const isMobile =
          window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
        let points = isMobile ? 8 : 10;

        const speaking = Boolean(window.mayaSpeaking);
        if (speaking) points += 2;

        const angleStep = (Math.PI * 2) / points;
        const noiseScale = speaking ? 0.32 : 0.18;
        const speedMultiplier = speaking ? 2.2 : 0.95;
        const rotationOffset = speaking ? now * 0.001 : 0;

        const grd = ctx.createRadialGradient(
          b.x,
          b.y,
          b.r * 0.1,
          b.x,
          b.y,
          b.r * 1.2,
        );

        if (speaking) {
          grd.addColorStop(0, hexWithAlpha("#4dffb3", 0.98));
          grd.addColorStop(0.5, hexWithAlpha("#4dffc8", 0.85));
          grd.addColorStop(1, hexWithAlpha(b.palette[2], 0));
        } else {
          grd.addColorStop(0, hexWithAlpha(b.palette[0], 0.95));
          grd.addColorStop(0.5, hexWithAlpha(b.palette[1], 0.75));
          grd.addColorStop(1, hexWithAlpha(b.palette[2], 0));
        }

        ctx.fillStyle = grd;
        ctx.beginPath();

        const pts = [];
        for (let i = 0; i < points; i += 1) {
          const angle = i * angleStep + rotationOffset;
          const noise =
            Math.sin((now * speedMultiplier + b.noiseOffset + i * 100) / 800) *
            noiseScale;
          const noise2 =
            Math.cos((now * speedMultiplier + b.noiseOffset + i * 150) / 600) *
            noiseScale *
            0.5;
          const r = b.r * (1 + noise + noise2);
          const px = b.x + Math.cos(angle) * r;
          const py = b.y + Math.sin(angle) * r;
          pts.push({ x: px, y: py });
        }

        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 0; i < points; i += 1) {
          const p1 = pts[i];
          const p2 = pts[(i + 1) % points];
          const cp1x = p1.x + (p2.x - p1.x) * 0.5;
          const cp1y = p1.y + (p2.y - p1.y) * 0.5;
          ctx.quadraticCurveTo(p1.x, p1.y, cp1x, cp1y);
        }

        ctx.closePath();
        ctx.fill();
      };

      let last = window.performance.now();
      let frameId = null;

      const tick = (now) => {
        const dt = Math.min(32, now - last);
        last = now;

        const width = canvasW;
        const height = canvasH;
        const influenceR = Math.min(width, height) * 0.35;
        const damping = 0.97;
        const step = dt * 0.04;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";

        for (let i = 0; i < BLOBS.length; i += 1) {
          const b = BLOBS[i];
          const k = 0.015;
          const fxHome = (b.hx - b.x) * k;
          const fyHome = (b.hy - b.y) * k;
          let fxMouse = 0;
          let fyMouse = 0;

          if (mouse.active) {
            const mx = mouse.x * width;
            const my = mouse.y * height;
            const dx = mx - b.x;
            const dy = my - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist < influenceR) {
              const strength = 1 - dist / influenceR;
              const att = 0.015 * strength;
              fxMouse = dx * att;
              fyMouse = dy * att;
            }
          }

          b.vx = (b.vx + fxHome + fxMouse) * damping;
          b.vy = (b.vy + fyHome + fyMouse) * damping;
          b.x += b.vx * step;
          b.y += b.vy * step;
          b.r *= 1 + Math.sin((now + b.pulsePhase) / 1200) * 0.001;

          const minX = b.margin + b.r;
          const maxX = width - b.margin - b.r;
          const minY = b.margin + b.r;
          const maxY = height - b.margin - b.r;

          if (b.x < minX) {
            b.x = minX;
            b.vx = Math.abs(b.vx) * 0.5;
          }
          if (b.x > maxX) {
            b.x = maxX;
            b.vx = -Math.abs(b.vx) * 0.5;
          }
          if (b.y < minY) {
            b.y = minY;
            b.vy = Math.abs(b.vy) * 0.5;
          }
          if (b.y > maxY) {
            b.y = maxY;
            b.vy = -Math.abs(b.vy) * 0.5;
          }

          drawBlob(b, now);
        }

        const visible = Boolean(window.mayaVisible);
        if (!visible) {
          window.setTimeout(() => {
            frameId = window.requestAnimationFrame(tick);
          }, 33);
        } else {
          frameId = window.requestAnimationFrame(tick);
        }
      };

      // Draw one immediate frame for instant appearance
      tick(window.performance.now());

      return () => {
        window.removeEventListener("resize", sizeCanvas);
        window.removeEventListener("resize", initBlobs);
        card.removeEventListener("pointerenter", onPointerEnter);
        card.removeEventListener("pointerleave", onPointerLeave);
        card.removeEventListener("pointermove", onPointerMove);
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
        }
      };
    }

    const card = document.getElementById("maya-blob-card");
    const canvas = document.getElementById("maya-blob-canvas");

    if (!card || !canvas) {
      const onReady = () => {
        const c1 = document.getElementById("maya-blob-card");
        const c2 = document.getElementById("maya-blob-canvas");
        if (c1 && c2) {
          init(c1, c2);
        }
      };

      document.addEventListener("DOMContentLoaded", onReady, { once: true });

      return () => {
        document.removeEventListener("DOMContentLoaded", onReady);
      };
    }

    const cleanup = init(card, canvas);

    return () => {
      if (cleanup) cleanup();
    };
  }, []);
}

