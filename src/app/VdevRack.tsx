"use client";

import React from 'react';

interface Drive {
  id: number;
  size: number;
  type?: 'hdd' | 'nvme';
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

const VdevRack: React.FC<VdevRackProps> = ({ drives, type, vdevIndex }) => {
  const drivesPerRow = 6;
  const rows = Math.ceil(drives.length / drivesPerRow);

  return (
    <div style={{
      width: '100%',
      background: 'var(--paper-3)',
      border: '1px solid var(--rule)',
      borderRadius: '6px',
      padding: '10px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '8px',
        paddingBottom: '8px',
        borderBottom: '1px solid var(--rule)',
      }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-2)' }}>
          vdev {vdevIndex + 1}
          <span style={{ color: 'var(--accent)', marginLeft: '6px' }}>{type}</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--ink-3)' }}>
            {drives.length} drives
          </span>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ok)', boxShadow: '0 0 4px var(--ok)' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} style={{ display: 'grid', gridTemplateColumns: `repeat(${drivesPerRow}, 1fr)`, gap: '4px' }}>
            {drives.slice(rowIndex * drivesPerRow, (rowIndex + 1) * drivesPerRow).map((drive) => {
              const isNvme = drive.type === 'nvme';
              const { value, unit } = formatSize(drive.size);
              return (
                <div
                  key={drive.id}
                  style={{
                    position: 'relative',
                    aspectRatio: '3/1',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    border: isNvme ? '1px solid rgba(0,212,255,0.35)' : '1px solid var(--rule)',
                    background: isNvme ? 'rgba(0,10,18,0.95)' : 'var(--paper-2)',
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0, opacity: isNvme ? 0.18 : 0.1 }}>
                    {isNvme ? (
                      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id={`nvv-${drive.id}`} patternUnits="userSpaceOnUse" width="8" height="6">
                            <rect x="0.5" y="1" width="7" height="4" fill="none" stroke="var(--nvme)" strokeWidth="0.6" rx="0.5" />
                            <rect x="2" y="2.5" width="4" height="1" fill="var(--nvme)" rx="0.3" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#nvv-${drive.id})`} />
                      </svg>
                    ) : (
                      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id={`hcv-${drive.id}`} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="scale(0.5)">
                            <rect width="100%" height="100%" fill="none" />
                            <path d="M0,5 L2.5,0 L7.5,0 L10,5 L7.5,10 L2.5,10 Z" fill="var(--accent)" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#hcv-${drive.id})`} />
                      </svg>
                    )}
                  </div>
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '10px',
                      color: isNvme ? 'var(--nvme)' : 'var(--ink-2)',
                      background: isNvme ? 'rgba(0,8,14,0.82)' : 'rgba(21,15,35,0.75)',
                      padding: '1px 4px',
                      borderRadius: '2px',
                    }}>
                      {value}<span style={{ fontSize: '8px', color: isNvme ? 'rgba(0,212,255,0.55)' : 'var(--ink-3)' }}>{unit}</span>
                    </span>
                  </div>
                  <div style={{ position: 'absolute', top: 2, right: 3 }}>
                    <div style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: isNvme ? 'var(--nvme)' : 'var(--ok)',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VdevRack;
