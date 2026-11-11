import type { Illustration } from "@/content/lessons";
import { cn } from "@/lib/utils";

/** Grafik hero: x + y = 7 dan x − y = 1 berpotongan di (4, 3). */
export function HeroGraph({ className }: { className?: string }) {
  // skala: 1 satuan = 28px, titik asal (40, 260)
  const X = (x: number) => 40 + x * 28;
  const Y = (y: number) => 260 - y * 28;
  return (
    <svg viewBox="0 0 320 300" className={cn("h-auto w-full", className)} role="img" aria-label="Grafik dua garis x + y = 7 dan x − y = 1 yang berpotongan di titik (4, 3)">
      <rect x="0" y="0" width="320" height="300" rx="24" fill="white" />
      {Array.from({ length: 10 }, (_, i) => (
        <g key={i} stroke="#e2e8f0" strokeWidth="1">
          <line x1={X(i)} y1={Y(0)} x2={X(i)} y2={Y(8.5)} />
          <line x1={X(0)} y1={Y(i)} x2={X(9.5)} y2={Y(i)} />
        </g>
      ))}
      <line x1={X(0)} y1={Y(0)} x2={X(9.6)} y2={Y(0)} stroke="#334155" strokeWidth="2" />
      <line x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(8.6)} stroke="#334155" strokeWidth="2" />
      <text x={X(9.6)} y={Y(0) + 18} fontSize="13" fill="#334155" fontWeight="700">x</text>
      <text x={X(0) - 18} y={Y(8.4)} fontSize="13" fill="#334155" fontWeight="700">y</text>
      <line x1={X(0)} y1={Y(7)} x2={X(7)} y2={Y(0)} stroke="#2546ea" strokeWidth="4" strokeLinecap="round" />
      <line x1={X(1)} y1={Y(0)} x2={X(9)} y2={Y(8)} stroke="#7c3aed" strokeWidth="4" strokeLinecap="round" />
      <line x1={X(4)} y1={Y(3)} x2={X(4)} y2={Y(0)} stroke="#10b981" strokeDasharray="4 4" strokeWidth="2" />
      <line x1={X(4)} y1={Y(3)} x2={X(0)} y2={Y(3)} stroke="#10b981" strokeDasharray="4 4" strokeWidth="2" />
      <circle cx={X(4)} cy={Y(3)} r="9" fill="#10b981" stroke="white" strokeWidth="3" />
      <rect x={X(4) + 14} y={Y(3) - 30} width="62" height="26" rx="8" fill="#ecfdf5" stroke="#10b981" />
      <text x={X(4) + 45} y={Y(3) - 12} fontSize="13" textAnchor="middle" fill="#065f46" fontWeight="800">(4, 3)</text>
      <rect x="150" y="18" width="150" height="26" rx="8" fill="#eef4ff" />
      <text x="225" y="36" fontSize="13" textAnchor="middle" fill="#1d35d7" fontWeight="700" fontFamily="monospace">x + y = 7</text>
      <rect x="150" y="50" width="150" height="26" rx="8" fill="#f5f3ff" />
      <text x="225" y="68" fontSize="13" textAnchor="middle" fill="#6d28d9" fontWeight="700" fontFamily="monospace">x − y = 1</text>
    </svg>
  );
}

function Balance() {
  return (
    <svg viewBox="0 0 220 140" className="h-auto w-full" aria-hidden>
      <rect x="104" y="40" width="12" height="80" rx="4" fill="#94a3b8" />
      <rect x="70" y="118" width="80" height="10" rx="5" fill="#64748b" />
      <rect x="20" y="40" width="180" height="8" rx="4" fill="#475569" />
      <path d="M30 48 L18 80 H66 L54 48" fill="none" stroke="#94a3b8" strokeWidth="2" />
      <path d="M166 48 L154 80 H202 L190 48" fill="none" stroke="#94a3b8" strokeWidth="2" />
      <rect x="22" y="62" width="18" height="18" rx="4" fill="#ef4444" />
      <rect x="42" y="62" width="18" height="18" rx="4" fill="#3b65f5" />
      <text x="178" y="76" textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">10</text>
      <text x="110" y="28" textAnchor="middle" fontSize="12" fontWeight="700" fill="#2546ea">seimbang</text>
    </svg>
  );
}

function Receipt() {
  return (
    <svg viewBox="0 0 220 140" className="h-auto w-full" aria-hidden>
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(${20 + i * 100} ${14 + i * 8}) rotate(${i ? 4 : -4})`}>
          <path d="M0 0 H80 V100 L70 94 L60 100 L50 94 L40 100 L30 94 L20 100 L10 94 L0 100 Z" fill="white" stroke="#cbd5e1" />
          <rect x="10" y="12" width="40" height="6" rx="3" fill={i ? "#a78bfa" : "#608bfa"} />
          <rect x="10" y="28" width="58" height="4" rx="2" fill="#e2e8f0" />
          <rect x="10" y="38" width="50" height="4" rx="2" fill="#e2e8f0" />
          <rect x="10" y="48" width="54" height="4" rx="2" fill="#e2e8f0" />
          <rect x="10" y="66" width="60" height="1.5" fill="#94a3b8" />
          <text x="40" y="84" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0f172a">{i ? "Rp11.000" : "Rp19.000"}</text>
        </g>
      ))}
    </svg>
  );
}

function Lines() {
  return (
    <svg viewBox="0 0 220 140" className="h-auto w-full" aria-hidden>
      <rect width="220" height="140" rx="16" fill="#f8fafc" />
      <path d="M20 120 L200 20" stroke="#2546ea" strokeWidth="4" strokeLinecap="round" />
      <path d="M20 30 L200 110" stroke="#7c3aed" strokeWidth="4" strokeLinecap="round" />
      <circle cx="108" cy="71" r="8" fill="#10b981" stroke="white" strokeWidth="3" />
      <text x="124" y="64" fontSize="12" fontWeight="800" fill="#065f46">satu titik</text>
    </svg>
  );
}

function Steps() {
  return (
    <svg viewBox="0 0 220 140" className="h-auto w-full" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={20 + i * 46} y={100 - i * 24} width="40" height={24 + i * 24} rx="6" fill={["#bfd3fe", "#93b4fd", "#a78bfa", "#7c3aed"][i]} />
          <text x={40 + i * 46} y={118 - i * 24 + i * 24} textAnchor="middle" fontSize="13" fontWeight="800" fill="white">{i + 1}</text>
        </g>
      ))}
      <path d="M32 84 L190 18" stroke="#10b981" strokeWidth="3" strokeDasharray="5 5" />
      <circle cx="190" cy="18" r="7" fill="#10b981" />
    </svg>
  );
}

function Checklist() {
  return (
    <svg viewBox="0 0 220 140" className="h-auto w-full" aria-hidden>
      <rect x="45" y="10" width="130" height="120" rx="14" fill="white" stroke="#cbd5e1" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="62" y={30 + i * 32} width="20" height="20" rx="6" fill={i < 2 ? "#10b981" : "#f1f5f9"} stroke={i < 2 ? "none" : "#cbd5e1"} />
          {i < 2 && <path d={`M67 ${40 + i * 32} l4 4 l7 -8`} stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />}
          <rect x="92" y={36 + i * 32} width={i === 2 ? 50 : 66} height="7" rx="3.5" fill="#e2e8f0" />
        </g>
      ))}
    </svg>
  );
}

function Story() {
  return (
    <svg viewBox="0 0 220 140" className="h-auto w-full" aria-hidden>
      <rect x="20" y="20" width="80" height="100" rx="12" fill="#eef4ff" />
      <rect x="120" y="20" width="80" height="100" rx="12" fill="#f5f3ff" />
      <circle cx="60" cy="58" r="20" fill="#608bfa" />
      <text x="60" y="64" textAnchor="middle" fontSize="18" fontWeight="800" fill="white">x</text>
      <circle cx="160" cy="58" r="20" fill="#a78bfa" />
      <text x="160" y="64" textAnchor="middle" fontSize="18" fontWeight="800" fill="white">y</text>
      <rect x="36" y="92" width="48" height="8" rx="4" fill="#93b4fd" />
      <rect x="136" y="92" width="48" height="8" rx="4" fill="#c4b5fd" />
      <text x="110" y="64" textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f172a">+</text>
    </svg>
  );
}

export function LessonIllustration({ kind }: { kind: Illustration }) {
  switch (kind) {
    case "balance":
    case "scale-multiply":
      return <Balance />;
    case "receipt":
      return <Receipt />;
    case "lines":
      return <Lines />;
    case "steps":
      return <Steps />;
    case "checklist":
      return <Checklist />;
    case "story":
      return <Story />;
  }
}
