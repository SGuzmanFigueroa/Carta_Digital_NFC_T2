import { useId } from 'react';

/** A padded plot and aligned HTML labels keep text readable on landscape tablets. */
export function PassVelocityChart() {
  const gradientId = useId();
  return (
    <div className="min-w-0">
      <svg role="img" aria-label="Curva de velocidad del pase entre las 14:00 y las 14:48"
        className="block w-full h-20 text-[#ff5708] my-3" preserveAspectRatio="none" viewBox="0 0 320 110">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ff5708" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff5708" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <g transform="translate(10 28)">
          <path d="M 0,45 Q 40,20 80,35 T 160,15 T 240,40 T 300,10 L 300,60 L 0,60 Z" fill={`url(#${gradientId})`} />
          <path d="M 0,45 Q 40,20 80,35 T 160,15 T 240,40 T 300,10" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          <circle className="animate-ping" cx="300" cy="10" r="4" fill="#ffb4ab" stroke="#93000a" strokeWidth="1.5" />
          <circle cx="300" cy="10" r="4.5" fill="#ff5708" />
        </g>
      </svg>
      <div className="grid grid-cols-3 gap-2 font-mono-code text-[11px] leading-4 text-[#c6c5cf]" style={{ paddingInline: '3.125%' }}>
        <div className="min-w-0 text-left"><time>14:00</time><span className="block">18 Platos</span></div>
        <div className="min-w-0 text-center"><time>14:30</time><span className="block">34 Platos</span></div>
        <div className="min-w-0 text-right text-[#ff5708] font-bold"><time>14:48</time><span className="block">Pico Activo</span></div>
      </div>
    </div>
  );
}
