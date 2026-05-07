"use client";

import React from 'react';

interface Drive {
  id: number;
  size: number;
  type?: 'hdd' | 'nvme' | 'nvme-ent';
}

interface ServerRackProps {
  drives: Drive[];
  onDriveClick: (id: number | null) => void;
  maxSlots?: number;
}

function formatSize(size: number): { value: string; unit: string } {
  if (size < 1) return { value: String(Math.round(size * 1000)), unit: 'GB' };
  return { value: String(size), unit: 'TB' };
}

// Diamond-dot mesh — the iconic perforated airflow grille on Dell PE hot-swap caddies.
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

function EmptyBay({ label }: { label: string }) {
  return (
    <div style={{
      width: '100%', height: '100%', borderRadius: 2,
      background: 'linear-gradient(180deg, #050506 0%, #020203 100%)',
      boxShadow: 'inset 0 0 0 1px #14141a, inset 0 2px 4px rgba(0,0,0,0.85)',
      position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ color: '#26262e', fontSize: 14, fontWeight: 300 }}>+</span>
      <div style={{
        position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
        fontSize: 7, color: '#26262e', letterSpacing: 0.5,
        fontFamily: 'var(--mono)',
      }}>{label}</div>
    </div>
  );
}

interface CaddyProps {
  kind: 'hdd' | 'nvme' | 'nvme-ent';
  value: string;
  unit: string;
  slot: string;
  onClick: () => void;
}

function Caddy({ kind, value, unit, slot, onClick }: CaddyProps) {
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
    <button
      onClick={onClick}
      title={`${value} ${unit} ${stickerLabel} — click to remove`}
      style={{
        all: 'unset', cursor: 'pointer', display: 'block',
        width: '100%', height: '100%', position: 'relative',
        borderRadius: 2,
        background: 'linear-gradient(180deg, #2a2a2e 0%, #1a1a1d 50%, #0e0e10 100%)',
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.1),
          inset 0 -1px 0 rgba(0,0,0,0.7),
          inset 1px 0 0 rgba(255,255,255,0.05),
          inset -1px 0 0 rgba(0,0,0,0.5),
          0 1px 2px rgba(0,0,0,0.5)
        `,
        overflow: 'hidden', transition: 'transform 0.08s',
      }}
      onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(1px)'; }}
      onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
    >
      {/* Handle strip with LEDs */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 14,
        background: 'linear-gradient(180deg, #1d1d20 0%, #101012 100%)',
        boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.6), inset 1px 0 0 rgba(255,255,255,0.05)',
      }}>
        <div style={{
          position: 'absolute', left: '50%', top: 5,
          transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <span style={{
            width: 3.5, height: 3.5, borderRadius: '50%', display: 'block',
            background: '#1de9b6',
            boxShadow: '0 0 4px #1de9b6, inset 0 0 1px rgba(255,255,255,0.6)',
          }} />
          <span style={{
            width: 3.5, height: 3.5, borderRadius: '50%', display: 'block',
            background: ledColor,
            boxShadow: `0 0 5px ${ledColor}, inset 0 0 1px rgba(255,255,255,0.6)`,
            animation: isNvme ? 'caddy-blink-fast 0.9s ease-in-out infinite' : isEnt ? 'caddy-blink-fast 1.2s ease-in-out infinite' : 'caddy-blink 1.6s ease-in-out infinite',
          }} />
        </div>
        <div style={{
          position: 'absolute', left: '50%', top: 22, bottom: 4,
          width: 1, background: 'rgba(0,0,0,0.6)',
          boxShadow: '1px 0 0 rgba(255,255,255,0.06)',
          transform: 'translateX(-50%)',
        }} />
      </div>

      {/* Sticker label */}
      <div style={{
        position: 'absolute', left: 17, top: '50%', transform: 'translateY(-50%)',
        background: stickerBg, color: stickerColor,
        padding: '2px 4px', fontSize: 7.5, fontWeight: 700, letterSpacing: 0.2,
        borderRadius: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', gap: 0,
        boxShadow: stickerShadow, textShadow: stickerTextShadow,
        zIndex: 3, lineHeight: 1.1, minWidth: 32,
        fontFamily: 'var(--mono)',
      }}>
        <span style={{ fontSize: 6, opacity: isNvme ? 0.85 : 0.7, letterSpacing: 0.5 }}>{stickerLabel}</span>
        <span style={{ fontSize: 8, fontWeight: 700 }}>
          {value}<span style={{ fontSize: 5.5, opacity: 0.7, marginLeft: 1 }}>{unit}</span>
        </span>
      </div>

      {/* Diamond-mesh airflow grille */}
      <div style={{
        position: 'absolute', left: 53, right: 4, top: 4, bottom: 4,
        ...meshStyle(isNvme ? 'cool' : isEnt ? 'ember' : 'warm'),
        borderRadius: 1.5,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.06),
          inset 0 -1px 0 rgba(0,0,0,0.6),
          inset 0 0 0 1px rgba(0,0,0,0.65)
        `,
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.55)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Slot number */}
      <div style={{
        position: 'absolute', right: 4, bottom: 2,
        fontSize: 6.5, letterSpacing: 0.5, zIndex: 4,
        color: isNvme ? 'rgba(120,200,255,0.4)' : isEnt ? 'rgba(240,165,0,0.35)' : 'rgba(220,220,230,0.35)',
        textShadow: '0 0 2px rgba(0,0,0,0.9)',
        fontFamily: 'var(--mono)',
      }}>{slot}</div>
    </button>
  );
}

function StatusLamp({ color, label, on = true }: { color: string; label: string; on?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', display: 'block',
        background: on ? color : '#0a0a0a',
        boxShadow: on
          ? `0 0 6px ${color}, inset 0 0 2px rgba(255,255,255,0.5)`
          : 'inset 0 0 2px rgba(0,0,0,0.8)',
      }} />
      <span style={{ fontSize: 8, color: '#6a6a72', letterSpacing: 1, fontFamily: 'var(--mono)' }}>{label}</span>
    </div>
  );
}

function ChassisRails() {
  const slotStrip: React.CSSProperties = {
    position: 'absolute', top: 4, bottom: 4, width: 60,
    backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.85) 0 2px, transparent 2px 5px)',
    borderRadius: 1,
  };
  return (
    <div style={{
      height: 14,
      background: 'linear-gradient(180deg, #1c1c1f 0%, #0e0e10 50%, #050506 100%)',
      borderRadius: '6px 6px 0 0',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.7)',
      position: 'relative',
    }}>
      <div style={{ ...slotStrip, left: 18 }} />
      <div style={{ ...slotStrip, right: 18 }} />
    </div>
  );
}

function ChassisFooter() {
  const slotStrip: React.CSSProperties = {
    position: 'absolute', top: 4, bottom: 4, width: 60,
    backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.85) 0 2px, transparent 2px 5px)',
    borderRadius: 1,
  };
  return (
    <div style={{
      height: 14,
      background: 'linear-gradient(0deg, #1c1c1f 0%, #0e0e10 50%, #050506 100%)',
      borderRadius: '0 0 6px 6px',
      boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.04), inset 0 1px 0 rgba(0,0,0,0.7)',
      position: 'relative',
    }}>
      <div style={{ ...slotStrip, left: 18 }} />
      <div style={{ ...slotStrip, right: 18 }} />
    </div>
  );
}

function RackEar({ side }: { side: 'left' | 'right' }) {
  return (
    <div style={{
      width: 22,
      background: 'linear-gradient(180deg, #1a1a1c 0%, #0a0a0c 50%, #030304 100%)',
      borderRadius: side === 'left' ? '6px 0 0 6px' : '0 6px 6px 0',
      boxShadow: side === 'left'
        ? 'inset 1px 0 0 rgba(255,255,255,0.05), inset -1px 0 0 rgba(0,0,0,0.6)'
        : 'inset -1px 0 0 rgba(255,255,255,0.05), inset 1px 0 0 rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0',
    }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #000 0%, #050505 100%)',
          boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.95), 0 1px 0 rgba(255,255,255,0.04)',
        }} />
      ))}
    </div>
  );
}

const COLS = 4;

const ServerRack: React.FC<ServerRackProps> = ({ drives, onDriveClick, maxSlots = 24 }) => {
  const hddCount = drives.filter(d => !d.type || d.type === 'hdd').length;
  const nvmeCount = drives.filter(d => d.type === 'nvme' || d.type === 'nvme-ent').length;

  return (
    <div style={{
      background: 'linear-gradient(180deg, #0a0a0c 0%, #050506 100%)',
      borderRadius: 10,
      boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 12px 32px rgba(0,0,0,0.7)',
      border: '1px solid #1a1a1e',
      overflow: 'hidden',
    }}>
      <ChassisRails />

      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <RackEar side="left" />

        <div style={{ flex: 1, padding: '14px 16px' }}>
          {/* Bezel header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px', marginBottom: 12,
            background: 'linear-gradient(180deg, #131316 0%, #0a0a0c 100%)',
            borderRadius: 4,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.7), inset 0 0 0 1px #1a1a1e',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: '#d6d3e0',
                padding: '4px 8px',
                background: 'linear-gradient(180deg, #1c1c20 0%, #0a0a0c 100%)',
                borderRadius: 2, letterSpacing: 1.5,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.7), inset 0 0 0 1px #25252a',
                fontFamily: 'var(--mono)',
              }}>RX·CORE</div>
              <span style={{ fontSize: 11, color: '#a59bc6', letterSpacing: 1, fontFamily: 'var(--mono)' }}>
                SRV-R2502
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <StatusLamp color="#1de9b6" label="PWR" />
              <StatusLamp color="#1de9b6" label="NET" />
              <StatusLamp color="var(--ok)" label="HDD" on={hddCount > 0} />
              <StatusLamp color="var(--nvme)" label="NVMe" on={nvmeCount > 0} />
              <StatusLamp color="var(--warn)" label="ALRT" on={false} />
            </div>
          </div>

          {/* 4×6 bay grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gap: 4, padding: 6,
            background: 'linear-gradient(180deg, #030304 0%, #000 100%)',
            borderRadius: 4,
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9), inset 0 0 0 1px #0e0e10',
          }}>
            {Array.from({ length: maxSlots }).map((_, i) => {
              const drive = drives[i];
              const slot = String(i + 1).padStart(2, '0');
              if (drive) {
                const { value, unit } = formatSize(drive.size);
                return (
                  <div key={i} style={{ height: 32 }}>
                    <Caddy
                      kind={drive.type ?? 'hdd'}
                      value={value}
                      unit={unit}
                      slot={slot}
                      onClick={() => onDriveClick(drive.id)}
                    />
                  </div>
                );
              }
              return (
                <div key={i} style={{ height: 32 }}>
                  <EmptyBay label={slot} />
                </div>
              );
            })}
          </div>

          {/* Rack footer summary */}
          <div style={{
            marginTop: 12, padding: '8px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'linear-gradient(180deg, #131316 0%, #0a0a0c 100%)',
            borderRadius: 4,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.7), inset 0 0 0 1px #1a1a1e',
            fontSize: 11,
          }}>
            <span style={{ color: '#a59bc6', letterSpacing: 0.5, fontFamily: 'var(--mono)' }}>
              <span style={{ color: '#e7e3f4' }}>{drives.length}/{maxSlots}</span> bays
              <span style={{ margin: '0 8px', color: '#3a3245' }}>·</span>
              <span style={{ color: 'var(--ok)' }}>{hddCount}</span> HDD
              <span style={{ margin: '0 8px', color: '#3a3245' }}>·</span>
              <span style={{ color: 'var(--nvme)' }}>{nvmeCount}</span> NVMe
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', display: 'block', background: '#ff9a3e', boxShadow: '0 0 4px #ff9a3e' }} />
              <span style={{ width: 6, height: 6, borderRadius: '50%', display: 'block', background: 'var(--ok)', boxShadow: '0 0 4px var(--ok)' }} />
            </div>
          </div>
        </div>

        <RackEar side="right" />
      </div>

      <ChassisFooter />
    </div>
  );
};

export default ServerRack;
