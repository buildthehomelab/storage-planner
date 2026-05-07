"use client";

import React from 'react';

interface Drive {
  id: number;
  size: number;
}

interface ServerRackProps {
  drives: Drive[];
  onDriveClick: (id: number | null) => void;
  maxSlots?: number;
}

const ServerRack: React.FC<ServerRackProps> = ({
  drives,
  onDriveClick,
  maxSlots = 24
}) => {
  const drivesPerRow = 6;
  const rows = Math.ceil(maxSlots / drivesPerRow);
  const slots = Array.from({ length: maxSlots }, (_, i) => i);

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
        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{ width: 18, height: 28, background: 'var(--rule)', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 10, height: 10, background: '#1a73e8', borderRadius: '1px' }} />
          </div>
          <div style={{ width: 18, height: 28, background: 'var(--rule)', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 10, height: 10, background: '#1a73e8', borderRadius: '1px' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px' }}>
          {[['PWR', 'var(--ok)'], ['NET', 'var(--ok)'], ['HDD', drives.length > 0 ? 'var(--ok)' : 'var(--ink-3)']].map(([label, color]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color as string, boxShadow: drives.length > 0 ? `0 0 6px ${color}` : 'none' }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--ink-3)', letterSpacing: '0.05em' }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
          SRV-R2502 · 4U
        </div>
      </div>

      {/* Drive bays */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} style={{ display: 'grid', gridTemplateColumns: `repeat(${drivesPerRow}, 1fr)`, gap: '6px' }}>
            {slots.slice(rowIndex * drivesPerRow, (rowIndex + 1) * drivesPerRow).map((slotIndex) => {
              const drive = drives.find((_, i) => i === slotIndex);
              return (
                <div
                  key={slotIndex}
                  onClick={() => drive && onDriveClick(drive.id)}
                  style={{
                    position: 'relative',
                    aspectRatio: '3/1',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    border: drive
                      ? '1px solid var(--rule)'
                      : '1px dashed rgba(54,45,89,0.6)',
                    background: drive ? 'var(--paper-2)' : 'var(--paper-3)',
                    cursor: drive ? 'pointer' : 'default',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (drive) {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--crit)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 8px rgba(250,127,170,0.25)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (drive) {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--rule)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }
                  }}
                >
                  {drive && (
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.12 }}>
                      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <pattern id={`hc-${drive.id}`} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="scale(0.5)">
                          <rect width="100%" height="100%" fill="none" />
                          <path d="M0,5 L2.5,0 L7.5,0 L10,5 L7.5,10 L2.5,10 Z" fill="var(--ok)" />
                        </pattern>
                        <rect width="100%" height="100%" fill={`url(#hc-${drive.id})`} />
                      </svg>
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
                          color: 'var(--ink-2)',
                          background: 'rgba(21,15,35,0.75)',
                          padding: '2px 6px',
                          borderRadius: '2px',
                          letterSpacing: '0.03em',
                        }}>
                          {drive.size}<span style={{ fontSize: '9px', color: 'var(--ink-3)', marginLeft: '1px' }}>TB</span>
                        </span>
                      </div>
                      <div style={{ position: 'absolute', top: 3, right: 4 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ok)', boxShadow: '0 0 4px var(--ok)' }} />
                      </div>
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
