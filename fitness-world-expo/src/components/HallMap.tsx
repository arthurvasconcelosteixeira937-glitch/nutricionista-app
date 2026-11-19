import type { Brand } from '@/domain/types';
import { HALL, LAUNCH_PODIUM, SLOTS, STAGE } from '@/expo/engine/layout';

// Planta 2D do pavilhão (SVG). Usada no minimapa da feira, na página inicial
// e no gerenciamento de estandes do administrador.

function isLight(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
}

interface Props {
  brands: Brand[];
  player?: { x: number; z: number; yaw: number } | null;
  sellersOnline?: { x: number; z: number }[];
  highlightBrandId?: string | null;
  selectedSlot?: string | null;
  onSlotClick?: (slotId: string) => void;
  showLabels?: boolean;
  className?: string;
}

export function HallMap({ brands, player, sellersOnline = [], highlightBrandId, selectedSlot, onSlotClick, showLabels = true, className }: Props) {
  const pad = 2;
  const vb = `${HALL.minX - pad} ${HALL.minZ - pad} ${HALL.maxX - HALL.minX + pad * 2} ${HALL.maxZ - HALL.minZ + pad * 2}`;
  return (
    <svg viewBox={vb} className={className} role="img" aria-label="Planta do pavilhão">
      <rect x={HALL.minX} y={HALL.minZ} width={HALL.maxX - HALL.minX} height={HALL.maxZ - HALL.minZ} rx={1.5} fill="#0e1015" stroke="rgba(255,255,255,0.12)" strokeWidth={0.4} />
      <rect x={-7} y={-52} width={14} height={62} fill="#181a20" />
      <rect x={HALL.minX + 2} y={-30.5} width={HALL.maxX - HALL.minX - 4} height={9} fill="#181a20" />
      <line x1={-7} y1={-52} x2={-7} y2={10} stroke="#e9c46a" strokeWidth={0.15} opacity={0.6} />
      <line x1={7} y1={-52} x2={7} y2={10} stroke="#e9c46a" strokeWidth={0.15} opacity={0.6} />
      {/* lobby */}
      <circle cx={0} cy={15} r={5} fill="none" stroke="#e9c46a" strokeWidth={0.25} opacity={0.6} />
      <rect x={-12.6} y={7.8} width={25.2} height={2.4} fill="#e9c46a" opacity={0.18} />
      {/* arena */}
      <circle cx={LAUNCH_PODIUM.x} cy={LAUNCH_PODIUM.z} r={3.3} fill="#1d2028" stroke="#e9c46a" strokeWidth={0.25} />
      {/* palco */}
      <rect x={STAGE.x - STAGE.w / 2} y={STAGE.z - STAGE.d / 2} width={STAGE.w} height={STAGE.d} fill="#1f2430" stroke="#4ff0c8" strokeWidth={0.3} />
      <rect x={-15} y={HALL.minZ + 0.2} width={30} height={0.8} fill="#4ff0c8" opacity={0.8} />
      <rect x={-12.4} y={-63} width={11.2} height={9.4} fill="#151821" />
      <rect x={1.2} y={-63} width={11.2} height={9.4} fill="#151821" />
      {showLabels && (
        <>
          <text x={0} y={-71} fill="#cfd3dc" fontSize={2.4} textAnchor="middle" fontWeight={700}>PALCO</text>
          <text x={0} y={21} fill="#e9c46a" fontSize={2.2} textAnchor="middle" fontWeight={700}>ENTRADA</text>
        </>
      )}
      {SLOTS.map((s) => {
        const b = brands.find((x) => x.slotId === s.id && x.status === 'aprovada');
        const hl = (highlightBrandId && b?.id === highlightBrandId) || selectedSlot === s.id;
        return (
          <g key={s.id} onClick={onSlotClick ? () => onSlotClick(s.id) : undefined} style={{ cursor: onSlotClick ? 'pointer' : undefined }}>
            <rect
              x={s.x - s.w / 2}
              y={s.z - s.d / 2}
              width={s.w}
              height={s.d}
              rx={0.8}
              fill={b ? b.booth.primaryColor : '#12141a'}
              stroke={hl ? '#e9c46a' : b ? b.booth.secondaryColor : 'rgba(255,255,255,0.18)'}
              strokeWidth={hl ? 0.9 : 0.4}
              strokeDasharray={b ? undefined : '1 1'}
            />
            {showLabels && (
              <>
                <text x={s.x} y={s.z - 1} fill={b ? (isLight(b.booth.primaryColor) ? '#0b0d12' : '#ffffff') : '#6b7280'} fontSize={2.6} textAnchor="middle" fontWeight={800}>{s.label}</text>
                <text x={s.x} y={s.z + 2.6} fill={b ? b.booth.secondaryColor : '#6b7280'} fontSize={1.6} textAnchor="middle" fontWeight={600}>
                  {b ? (b.booth.logoText || b.name).slice(0, 14) : 'DISPONÍVEL'}
                </text>
              </>
            )}
          </g>
        );
      })}
      {sellersOnline.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.z} r={0.9} fill="#22d39b" stroke="#07080b" strokeWidth={0.3} />
      ))}
      {player && (
        <g transform={`translate(${player.x} ${player.z}) rotate(${(-player.yaw * 180) / Math.PI})`}>
          <path d="M0 -6 L3.5 2 L-3.5 2 Z" fill="rgba(233,196,106,0.22)" />
          <circle r={1.4} fill="#e9c46a" stroke="#07080b" strokeWidth={0.4} />
        </g>
      )}
    </svg>
  );
}
