"use client";

import React from 'react';

interface Drive {
  id: number;
  size: number;
  type?: 'hdd' | 'nvme';
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

const ServerRack: React.FC<ServerRackProps> = ({
  drives,
  onDriveClick,
  maxSlots = 24
}) => {
  const drivesPerRow = 6;
  const rows = Math.ceil(maxSlots / drivesPerRow);
  const slots = Array.from({ length: maxSlots }, (_, i) => i);
  const hasNvme = drives.some(d => d.type === 'nvme');

  return (
    <div style={{
      width: '100%',
      background: 'var(--paper-3)',
      border: '1px solid var(--rule)',
      borderRadius: '8px',
      padding: '12px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      {/* Server header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--paper-2)',
        borderRadius: '4px',
        padding: '7px 12px',
        marginBottom: '10px',
        border: '1px solid var(--rule)',
      }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
          SRV-R2502 · 4U
        </div>

        <div style={{ display: 'flex', gap: '14px' }}>
          {[
            ['PWR', 'var(--ok)', true],
            ['NET', 'var(--ok)', true],
            ['HDD', drives.some(d => !d.type || d.type === 'hdd') ? 'var(--ok)' : 'var(--ink-3)', drives.some(d => !d.type || d.type === 'hdd')],
            ['NVMe', hasNvme ? 'var(--nvme)' : 'var(--ink-3)', hasNvme],
          ].map(([label, color, active]) => (
            <div key={label as string} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: color as string,
                boxShadow: active ? `0 0 6px ${color}` : 'none',
              }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--ink-3)', letterSpacing: '0.05em' }}>{label as string}</span>
            </div>
          ))}
        </div>

      </div>

      {/* Drive bays */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} style={{ display: 'grid', gridTemplateColumns: `repeat(${drivesPerRow}, 1fr)`, gap: '6px' }}>
            {slots.slice(rowIndex * drivesPerRow, (rowIndex + 1) * drivesPerRow).map((slotIndex) => {
              const drive = drives.find((_, i) => i === slotIndex);
              const isNvme = drive?.type === 'nvme';
              const { value, unit } = drive ? formatSize(drive.size) : { value: '', unit: '' };

              const activeBorder = isNvme ? '1px solid rgba(0,212,255,0.45)' : '1px solid var(--rule)';
              const activeBg = isNvme ? 'rgba(0,10,18,0.95)' : 'var(--paper-2)';
              const ledColor = isNvme ? 'var(--nvme)' : 'var(--ok)';

              return (
                <div
                  key={slotIndex}
                  onClick={() => drive && onDriveClick(drive.id)}
                  style={{
                    position: 'relative',
                    aspectRatio: '3/1',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    border: drive ? activeBorder : '1px dashed rgba(54,45,89,0.6)',
                    background: drive ? activeBg : 'var(--paper-3)',
                    cursor: drive ? 'pointer' : 'default',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (drive) {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.borderColor = isNvme ? 'var(--nvme)' : 'var(--crit)';
                      el.style.boxShadow = isNvme
                        ? '0 0 8px rgba(0,212,255,0.3)'
                        : '0 0 8px rgba(250,127,170,0.25)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (drive) {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.borderColor = isNvme ? 'rgba(0,212,255,0.45)' : 'var(--rule)';
                      el.style.boxShadow = 'none';
                    }
                  }}
                >
                  {drive && (
                    <div style={{ position: 'absolute', inset: 0, opacity: isNvme ? 0.18 : 0.12 }}>
                      {isNvme ? (
                        /* NVMe: circuit trace grid pattern */
                        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <pattern id={`nv-${drive.id}`} patternUnits="userSpaceOnUse" width="8" height="6">
                              <rect x="0.5" y="1" width="7" height="4" fill="none" stroke="var(--nvme)" strokeWidth="0.6" rx="0.5" />
                              <rect x="2" y="2.5" width="4" height="1" fill="var(--nvme)" rx="0.3" />
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill={`url(#nv-${drive.id})`} />
                        </svg>
                      ) : (
                        /* HDD: honeycomb pattern */
                        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <pattern id={`hc-${drive.id}`} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="scale(0.5)">
                              <rect width="100%" height="100%" fill="none" />
                              <path d="M0,5 L2.5,0 L7.5,0 L10,5 L7.5,10 L2.5,10 Z" fill="var(--ok)" />
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill={`url(#hc-${drive.id})`} />
                        </svg>
                      )}
                    </div>
                  )}

                  {drive ? (
                    <>
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: isNvme ? 'var(--nvme)' : 'var(--ink-2)',
                          background: isNvme ? 'rgba(0,8,14,0.82)' : 'rgba(21,15,35,0.75)',
                          padding: '2px 6px',
                          borderRadius: '2px',
                          letterSpacing: '0.03em',
                        }}>
                          {value}<span style={{ fontSize: '9px', color: isNvme ? 'rgba(0,212,255,0.6)' : 'var(--ink-3)', marginLeft: '1px' }}>{unit}</span>
                        </span>
                      </div>
                      <div style={{ position: 'absolute', top: 3, right: 4 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: ledColor, boxShadow: `0 0 4px ${ledColor}` }} />
                      </div>
                      {isNvme && (
                        <div style={{
                          position: 'absolute', bottom: 2, left: 4,
                          fontFamily: 'var(--mono)', fontSize: '7px',
                          color: 'rgba(0,212,255,0.45)', letterSpacing: '0.06em',
                        }}>
                          M.2
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0.25,
                    }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--ink-3)" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Server footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--paper-2)', borderRadius: '4px', padding: '5px 12px', marginTop: '10px',
        border: '1px solid var(--rule)',
      }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--ink-3)' }}>
          {drives.length}/{maxSlots} bays occupied
          {drives.some(d => !d.type || d.type === 'hdd') && (
            <span style={{ color: 'var(--ok)', marginLeft: '8px' }}>
              {drives.filter(d => !d.type || d.type === 'hdd').length} HDD
            </span>
          )}
          {hasNvme && (
            <span style={{ color: 'var(--nvme)', marginLeft: '8px' }}>
              {drives.filter(d => d.type === 'nvme').length} NVMe
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--warn)' }} />
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ok)' }} />
        </div>
      </div>
    </div>
  );
};

export default ServerRack;
