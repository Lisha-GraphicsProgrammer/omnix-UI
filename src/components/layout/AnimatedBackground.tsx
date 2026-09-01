import { useEffect, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";
import { ACCENT, GOLD, GOLD_MUTED } from "../../lib/constants";

// Converts a "#rrggbb" hex string to an "r,g,b" string for use inside an
// rgba(...) canvas fill — done once here instead of hardcoding raw RGB
// triples, so this file automatically follows the real palette instead of
// silently freezing whatever colors existed when it was last written.
function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

const NAVY_RGB = hexToRgb(ACCENT);

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mode } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Locked navy + gold palette. Four navy orbs carry the ambient
    // mood; exactly one gold orb gives a real, visible gold touchpoint —
    // matching "gold sparingly, one deliberate spot" rather than nowhere
    // at all. Gold itself swaps between the punchy light-mode shade and
    // the muted dark-mode shade, same as everywhere else gold appears. ──
    const goldRgb = hexToRgb(mode === "dark" ? GOLD_MUTED : GOLD);
    const orbs = [
      { xFactor: 0.2,  yFactor: 0.3,  r: 400, speed: 0.0008, phase: 0,   color: NAVY_RGB },
      { xFactor: 0.8,  yFactor: 0.7,  r: 350, speed: 0.0012, phase: 2.0, color: NAVY_RGB },
      { xFactor: 0.5,  yFactor: 0.15, r: 300, speed: 0.0010, phase: 4.0, color: goldRgb },
      { xFactor: 0.15, yFactor: 0.85, r: 280, speed: 0.0007, phase: 1.0, color: NAVY_RGB },
      { xFactor: 0.85, yFactor: 0.2,  r: 320, speed: 0.0009, phase: 3.0, color: NAVY_RGB },
    ];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 1;

      orbs.forEach((orb, i) => {
        // Slowly drift the orb position
        const driftX = Math.sin(time * orb.speed + orb.phase) * 0.08;
        const driftY = Math.cos(time * orb.speed * 0.7 + orb.phase) * 0.06;
        const cx = (orb.xFactor + driftX) * canvas.width;
        const cy = (orb.yFactor + driftY) * canvas.height;

        // Pulse size
        const pulse = Math.sin(time * orb.speed * 2 + orb.phase) * 0.15 + 1;
        const radius = orb.r * pulse;

        // Opacity breathe
        const breathe = Math.sin(time * orb.speed * 3 + orb.phase) * 0.3 + 0.7;
        const maxAlpha = mode === "dark" ? 0.10 : 0.11;
        const alpha = maxAlpha * breathe;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0,   `rgba(${orb.color},${alpha.toFixed(3)})`);
        grad.addColorStop(0.5, `rgba(${orb.color},${(alpha * 0.4).toFixed(3)})`);
        grad.addColorStop(1,   `rgba(${orb.color},0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0, left: 0,
        width: "100%", height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
