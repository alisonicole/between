"use client";

/** Second Wind's illustrations, ported from its plantSVG/birdSVG/greenhouseFrame/winterBloom. */
import React from "react";
import { stageOf, type Plant } from "@/lib/garden";

function shade(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - 38), g = Math.max(0, ((n >> 8) & 255) - 30), b = Math.max(0, (n & 255) - 38);
  return `rgb(${r},${g},${b})`;
}

export function PlantArt({ plant }: { plant: Plant }) {
  const st = stageOf(plant), c = plant.color;
  const H = [0, 9, 17, 25, 33, 39, 45, 50][st];
  const top = 84 - H;
  const leaves: React.ReactNode[] = [];
  for (let i = 0; i < Math.min(st, 4); i++) {
    const y = 84 - H * (0.28 + i * 0.2);
    const s = 0.75 + i * 0.08;
    leaves.push(<path key={`l${i}`} d={`M40 ${y} q ${-14 * s} ${-4 * s} ${-17 * s} ${-12 * s} q ${10 * s} ${-1 * s} ${17 * s} ${12 * s}z`} fill={c} opacity=".9" />);
    leaves.push(<path key={`r${i}`} d={`M40 ${y - 3} q ${14 * s} ${-4 * s} ${17 * s} ${-12 * s} q ${-10 * s} ${-1 * s} ${-17 * s} ${12 * s}z`} fill={c} opacity=".75" />);
  }
  let head: React.ReactNode = null;
  if (st === 0) {
    head = (<><ellipse cx="40" cy="83" rx="4" ry="2.4" fill="#6B4F3A" /><path d="M40 82 q1 -4 3 -5" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" /></>);
  } else if (st === 5) {
    head = (<><ellipse cx="40" cy={top - 3} rx="4.5" ry="6.5" fill={c} /><ellipse cx="40" cy={top - 4} rx="2.2" ry="4" fill="#fff" opacity=".35" /></>);
  } else if (st >= 6) {
    const n = st === 6 ? 5 : 8, r = st === 6 ? 7 : 8.5;
    head = (
      <>
        {Array.from({ length: n }, (_, i) => (
          <ellipse key={i} cx="40" cy={top - 6 - r * 0.55} rx={r * 0.45} ry={r * 0.75} fill={c} opacity=".88" transform={`rotate(${(i * 360) / n} 40 ${top - 6})`} />
        ))}
        <circle cx="40" cy={top - 6} r={st === 6 ? 3.4 : 4} fill="#F3D9A4" />
        <circle cx="40" cy={top - 6} r="1.6" fill="#B8935A" />
      </>
    );
  }
  return (
    <svg viewBox="0 0 80 112" aria-hidden="true" style={{ width: "100px", height: "130px", overflow: "visible" }}>
      <g className="sway">
        {st > 0 && <path d={`M40 85 Q 38 ${84 - H / 2} 40 ${top}`} stroke={shade(c)} strokeWidth="2.2" fill="none" strokeLinecap="round" />}
        {leaves}
        {head}
      </g>
      <path d="M22 86 h36 l-4 22 q-1 3 -4 3 h-20 q-3 0 -4 -3z" fill="#C9886F" />
      <path d="M20 83 h40 q2 0 2 2 v2 q0 2 -2 2 h-40 q-2 0 -2 -2 v-2 q0 -2 2 -2z" fill="#B87660" />
      <ellipse cx="40" cy="85.5" rx="17" ry="2" fill="#6B4F3A" opacity=".55" />
    </svg>
  );
}

export function WinterBloom() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="12" cy="7" rx="3.2" ry="5" fill="#F4ECEC" stroke="#DBA898" strokeWidth=".6" transform={`rotate(${a} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="2.4" fill="#D4B47A" />
    </svg>
  );
}

export function Bird() {
  return (
    <svg viewBox="0 0 64 54" width="64" height="54" aria-hidden="true">
      <g className="bob">
        <path d="M10 30 q-8 -2 -9 -8 q6 3 12 3z" fill="#6B8F6E" />
        <ellipse cx="30" cy="31" rx="18" ry="15" fill="#8DAE82" />
        <ellipse cx="33" cy="36" rx="11" ry="9" fill="#F1E3C8" />
        <path d="M22 28 q8 -4 14 6 q-9 3 -14 -6z" fill="#6B8F6E" />
        <circle cx="40" cy="22" r="11" fill="#8DAE82" />
        <circle cx="43" cy="20" r="2" fill="#3D2B1F" />
        <circle cx="43.7" cy="19.3" r=".6" fill="#fff" />
        <ellipse cx="42" cy="25.5" rx="2.6" ry="1.6" fill="#DBA898" opacity=".8" />
        <path d="M50 21 l7 2 l-7 2.4z" fill="#D4B47A" />
        <path d="M27 45 v5 M33 45 v5" stroke="#8B6347" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function GreenhouseFrame() {
  return (
    <svg className="gh-frame" viewBox="0 0 390 300" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 52 Q195 -18 390 52 Z" fill="rgba(255,255,255,.35)" stroke="#C9BBA4" strokeWidth="1.4" />
      <path d="M65 52 V30 M130 52 V16 M195 52 V12 M260 52 V16 M325 52 V30" stroke="#DDD1BD" strokeWidth="1" />
      <path d="M0 52 H390" stroke="#E2D8C6" strokeWidth="1" />
    </svg>
  );
}

export function BoxBreath() {
  return (
    <svg viewBox="0 0 120 120" style={{ width: "220px", height: "220px" }} aria-hidden="true">
      <rect x="10" y="10" width="100" height="100" rx="6" fill="none" stroke="#f3e8ff" strokeWidth="4" />
      <path className="trace" pathLength={100} d="M10 110 L10 10 L110 10 L110 110 Z" fill="none" stroke="#9333ea" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
