"use client";

import React from 'react';

interface Drive {
  id: number;
  size: number;
  type?: 'hdd' | 'nvme' | 'nvme-ent';
}

interface VdevRackProps {
  drives: Drive[];
  type: string;
  vdevIndex: number;
}

function formatSize(size: number): { value: string; unit: string } {
  if (size < 1) return { value: String(Math.round(size * 1000)), unit: 'GB' };
  return { value: String(size), unit: 'TB' };
}

function meshStyle(tint: 'warm' | 'cool' | 'ember'): React.CSSProperties {
  const hole = tint === 'cool' ? 'rgba(2,6,12,1)' : tint === 'ember' ? 'rgba(12,6,0,1)' : 'rgba(0,0,0,1)';
  const ground = tint === 'cool' ? '#1a1c22' : tint === 'ember' ? '#1c1a16' : '#1a1a1d';
  return {
    backgroundColor: ground,
    backgroundImage: `
      radial-gradient(${hole} 0.9px, transparent 1.2px),
      radial-gradient(${hole} 0.9px, transparent 1.2px)
    `,
    backgroundSize: '4px 4px, 4px 4px',
    backgroundPosition: '0 0, 2px 2px',
  };
}

function MiniCaddy({ size, unit, kind, slot }: { size: string; unit: string; kind: 'hdd' | 'nvme' | 'nvme-ent'; slot: string }) {
  const isNvme = kind === 'nvme';
  const isEnt = kind === 'nvme-ent';
  const ledColor = isNvme ? 'var(--nvme)' : isEnt ? 'var(--nvme-ent)' : 'var(--ok)';
  const stickerBg = isNvme
    ? 'linear-gradient(180deg, #07131c 0%, #03080e 100%)'
    : isEnt
    ? 'linear-gradient(180deg, #1c0f00 0%, #0e0700 100%)'
    : 'linear-gradient(180deg, #f3efe2 0%, #d8d3c2 100%)';
  const stickerColor = isNvme ? 'var(--nvme)' : isEnt ? 'var(--nvme-ent)' : '#1a1a1d';
  const stickerLabel = isNvme ? 'NVMe' : isEnt ? 'ENT' : 'SAS';
  const stickerShadow = isNvme
    ? 'inset 0 0 0 1px rgba(41,225,255,0.5), 0 0 5px rgba(41,225,255,0.18), 0 1px 1px rgba(0,0,0,0.6)'
    : isEnt
    ? 'inset 0 0 0 1px rgba(240,165,0,0.5), 0 0 5px rgba(240,165,0,0.18), 0 1px 1px rgba(0,0,0,0.6)'
    : 'inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 1px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.4)';
  const stickerTextShadow = isNvme ? '0 0 3px rgba(41,225,255,0.6)' : isEnt ? '0 0 3px rgba(240,165,0,0.6)' : 'none';

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      borderRadius: 2,
      background: 'linear-gradient(180deg, #2a2a2e 0%, #1a1a1d 50%, #0e0e10 100%)',
      boxShadow: `
        inset 0 1px 0 rgba(255,255,255,0.1),
        inset 0 -1px 0 rgba(0,0,0,0.7),
        inset 1px 0 0 rgba(255,255,255,0.05),
        inset -1px 0 0 rgba(0,0,0,0.5)
      `,
      overflow: 'hidden',
    }}>
      {/* Handle strip with LEDs */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 14,
        background: 'linear-gradient(180deg, #1d1d20 0%, #101012 100%)',
        boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.6)',
      }}>
        <div style={{
          position: 'absolute', left: '50%', top: 5,
          transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <span style={{
            width: 3.5, height: 3.5, borderRadius: '50%', display: 'block',
            background: '#1de9b6',
            boxShadow: '0 0 4px #1de9b6',
          }} />
          <span style={{
            width: 3.5, height: 3.5, borderRadius: '50%', display: 'block',
            background: ledColor,
            boxShadow: `0 0 5px ${ledColor}`,
            animation: isNvme ? 'caddy-blink-fast 0.9s ease-in-out infinite' : isEnt ? 'caddy-blink-fast 1.2s ease-in-out infinite' : 'caddy-blink 1.6s ease-in-out infinite',
          }} />
        </div>
      </div>

      {/* Sticker */}
      <div style={{
        position: 'absolute', left: 17, top: '50%', transform: 'translateY(-50%)',
        background: stickerBg, color: stickerColor,
        padding: '2px 4px', fontSize: 7.5, fontWeight: 700, letterSpacing: 0.2,
        borderRadius: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start',
        boxShadow: stickerShadow, textShadow: stickerTextShadow,
        zIndex: 3, lineHeight: 1.1, minWidth: 32,
        fontFamily: 'var(--mono)',
      }}>
        <span style={{ fontSize: 6, opacity: isNvme ? 0.85 : 0.7, letterSpacing: 0.5 }}>{stickerLabel}</span>
        <span style={{ fontSize: 8, fontWeight: 700 }}>
          {size}<span style={{ fontSize: 5.5, opacity: 0.7, marginLeft: 1 }}>{unit}</span>
        </span>
      </div>

      {/* Mesh grille */}
      <div style={{
        position: 'absolute', left: 53, right: 4, top: 4, bottom: 4,
        ...meshStyle(isNvme ? 'cool' : isEnt ? 'ember' : 'warm'),
        borderRadius: 1.5,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.65)',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.55)', pointerEvents: 'none' }} />
      </div>

      {/* Slot tag */}
      <div style={{
        position: 'absolute', right: 4, bottom: 2,
        fontSize: 6.5, letterSpacing: 0.5, zIndex: 4,
        color: isNvme ? 'rgba(120,200,255,0.4)' : isEnt ? 'rgba(240,165,0,0.35)' : 'rgba(220,220,230,0.35)',
        textShadow: '0 0 2px rgba(0,0,0,0.9)',
        fontFamily: 'var(--mono)',
      }}>{slot}</div>
    </div>
  );
}

const COLS = 4;

const VdevRack: React.FC<VdevRackProps> = ({ drives }) => {
  return (
    <div style={{
      background: 'linear-gradient(180deg, #080809 0%, #030304 100%)',
      borderRadius: 6,
      border: '1px solid #1a1a1e',
      padding: 6,
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8), inset 0 0 0 1px #0e0e10',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gap: 4,
      }}>
        {drives.map((drive, i) => {
          const { value, unit } = formatSize(drive.size);
          const slot = String(i + 1).padStart(2, '0');
          return (
            <div key={drive.id} style={{ height: 30 }}>
              <MiniCaddy
                kind={drive.type ?? 'hdd'}
                size={value}
                unit={unit}
                slot={slot}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VdevRack;
