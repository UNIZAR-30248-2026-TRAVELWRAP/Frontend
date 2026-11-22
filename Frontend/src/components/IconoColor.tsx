import type { ReactNode } from "react"

// Iconos decorativos a color, con el estilo del logo: contorno azul marino grueso y colores planos.
// Los iconos de acción (flechas, +, papelera...) siguen siendo de línea en Icon.tsx
const TINTA = "#10243F"
const ROJO = "#E53E3E"
const CORAL = "#EB6F63"
const GRIS = "#D5DBE3"
const AZUL = "#3182CE"
const AZUL_CLARO = "#90CDF4"
const VERDE = "#68B04D"
const TURQUESA = "#2C9AA8"
const AMARILLO = "#F6C945"
const ARENA = "#F5DDA0"

const ICONOS: Record<string, ReactNode> = {
  pin: (
    <>
      <path d="M12 22.2s-7-6.2-7-12.2a7 7 0 0114 0c0 6-7 12.2-7 12.2z" fill={CORAL} />
      <circle cx="12" cy="10" r="2.6" fill="white" />
    </>
  ),
  map: (
    <>
      <path d="M2.5 5.5l6-2v15l-6 2z" fill={VERDE} />
      <path d="M8.5 3.5l7 2v15l-7-2z" fill={AZUL_CLARO} />
      <path d="M15.5 5.5l6-2v15l-6 2z" fill={VERDE} />
      <circle cx="12" cy="10.5" r="2.2" fill={CORAL} />
    </>
  ),
  route: (
    <>
      <path d="M8.4 18.5H13a3.2 3.2 0 000-6.4h-2a3.2 3.2 0 010-6.4h2.5" fill="none" strokeDasharray="2 2.2" />
      <circle cx="5.5" cy="18.5" r="2.6" fill={AZUL} />
      <path d="M17.5 11.5s-4-3.2-4-6.2a4 4 0 018 0c0 3-4 6.2-4 6.2z" fill={CORAL} />
      <circle cx="17.5" cy="5.2" r="1.3" fill="white" strokeWidth="0.8" />
    </>
  ),
  flight: (
    <g transform="translate(12 12) rotate(45) scale(0.85) translate(-12 -12)">
      <path
        d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        fill="white"
      />
      <path d="M11.5 9.5V4M3 15l8-3.5" fill="none" stroke={AZUL} strokeWidth="1.2" />
    </g>
  ),
  medal: (
    <>
      <path d="M7 2h4l2 7-4 1z" fill={ROJO} />
      <path d="M17 2h-4l-2 7 4 1z" fill={AZUL} />
      <circle cx="12" cy="15" r="6.3" fill={AMARILLO} />
      <path
        d="M12 11.6l1.05 2.1 2.35.35-1.7 1.65.4 2.35L12 16.9l-2.1 1.15.4-2.35-1.7-1.65 2.35-.35z"
        fill="#F59E0B"
        strokeWidth="0.8"
      />
    </>
  ),
  finish: (
    <>
      <path d="M5 4.5h13.5l-3 4 3 4H5z" fill={ROJO} />
      <path d="M5 2.5v19.5" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 6h18a1 1 0 011 1v3a2 2 0 000 4v3a1 1 0 01-1 1H3a1 1 0 01-1-1v-3a2 2 0 000-4V7a1 1 0 011-1z" fill="white" />
      <path d="M3 6h18a1 1 0 011 1v2.5H2V7a1 1 0 011-1z" fill={AZUL} />
      <path d="M15.5 12v5" strokeDasharray="1.4 1.6" />
      <path d="M7 15.5l1.2-2.8 3 .2-1.6 3.2z" fill={AZUL} strokeWidth="1" />
    </>
  ),
  restaurant: (
    <>
      <circle cx="12" cy="12" r="6.5" fill="white" />
      <circle cx="12" cy="12" r="3.6" fill={ARENA} />
      <path d="M3 3.5v4a1.5 1.5 0 003 0v-4M4.5 3.5V21" fill="none" />
      <path d="M21 3c-1.8 1.4-2 5-2 8h2zM21 11v10" fill={AZUL_CLARO} />
    </>
  ),
  gallery: (
    <>
      <path d="M3 8.5a2 2 0 012-2h2.5l1.5-2h6l1.5 2H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill={TURQUESA} />
      <circle cx="12" cy="13.3" r="4.2" fill="white" />
      <circle cx="12" cy="13.3" r="2.1" fill={AZUL} />
      <circle cx="18" cy="9.5" r="0.9" fill={AMARILLO} strokeWidth="0.6" />
    </>
  ),
  car: (
    <>
      <path d="M6.5 11l1.8-3.6A2 2 0 0110.1 6.3h3.8a2 2 0 011.8 1.1L17.5 11z" fill={GRIS} />
      <path d="M8.6 10.6l1.2-2.4h4.4l1.2 2.4zM12 8.2v2.4" fill={AZUL_CLARO} strokeWidth="1.1" />
      <path d="M2 17V13.5a2 2 0 011.5-1.9L6 11h12l2.5.6A2 2 0 0122 13.5V17a1 1 0 01-1 1H3a1 1 0 01-1-1z" fill={GRIS} />
      <circle cx="20" cy="13.6" r="0.9" fill={AMARILLO} strokeWidth="0.6" />
      <circle cx="7" cy="18" r="2.6" fill={TINTA} />
      <circle cx="17" cy="18" r="2.6" fill={TINTA} />
      <circle cx="7" cy="18" r="0.9" fill={AZUL_CLARO} stroke="none" />
      <circle cx="17" cy="18" r="0.9" fill={AZUL_CLARO} stroke="none" />
    </>
  ),
  house: (
    <>
      <path d="M4.5 21V4.5a1.5 1.5 0 011.5-1.5h12a1.5 1.5 0 011.5 1.5V21z" fill={ARENA} />
      <path d="M7.5 6.5h3v2.5h-3zM13.5 6.5h3v2.5h-3zM7.5 11.5h3v2.5h-3zM13.5 11.5h3v2.5h-3z" fill={AZUL_CLARO} strokeWidth="1" />
      <path d="M10 21v-4h4v4z" fill={ROJO} strokeWidth="1.2" />
      <path d="M2.5 21h19" />
    </>
  ),
  document: (
    <>
      <path d="M14 2.5H6.5a2 2 0 00-2 2v15a2 2 0 002 2h11a2 2 0 002-2V8z" fill="white" />
      <path d="M14 2.5V8h5.5" fill={AZUL_CLARO} />
      <path d="M8 12.5h8M8 16h8" stroke={AZUL} />
    </>
  ),
  euro: (
    <>
      <circle cx="12" cy="12" r="9.5" fill={AMARILLO} />
      <g transform="translate(12 12) scale(0.5) translate(-12 -12)">
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" fill="none" strokeWidth="2.6" />
      </g>
    </>
  ),
  vote: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="white" />
      <path d="M7.5 12.5l3 3 6-7" fill="none" stroke={VERDE} strokeWidth="2.6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9.5" fill={AZUL_CLARO} />
      <path d="M6.5 6.5c2-1.3 3.6.2 3 2.2s-2.8 1.6-3.8.4z" fill={VERDE} strokeWidth="1" />
      <path d="M12.5 12c2-1 5 0 5 3s-3 4.5-4 3.5-2-5.5-1-6.5z" fill={VERDE} strokeWidth="1" />
    </>
  ),
  maleta: (
    <>
      <path d="M9.5 6V3.5h5V6" fill="none" strokeWidth="1.8" />
      <rect x="5" y="6" width="14" height="14" rx="3" fill={TURQUESA} />
      <path d="M9 9.5v7M15 9.5v7" strokeWidth="1.2" />
      <circle cx="8" cy="21.2" r="0.6" fill={TINTA} />
      <circle cx="16" cy="21.2" r="0.6" fill={TINTA} />
    </>
  ),
}

export default function IconoColor({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={TINTA}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      {ICONOS[name] ?? null}
    </svg>
  )
}
