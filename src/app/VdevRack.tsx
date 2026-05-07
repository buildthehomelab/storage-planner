"use client";

import React from 'react';

interface Drive {
  id: number;
  size: number;
}

interface VdevRackProps {
  drives: Drive[];
  type: string;
  vdevIndex: number;
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
            {drives.slice(rowIndex * drivesPerRow, (rowIndex + 1) * drivesPerRow).map((drive) => (
              <div
                key={drive.id}
                style={{
                  position: 'relative',
                  aspectRatio: '3/1',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  border: '1px solid var(--rule)',
                  background: 'var(--paper-2)',
                }}
              >
                <div style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <pattern id={`hcv-${drive.id}`} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="scale(0.5)">
                      <rect width="100%" height="100%" fill="none" />
                      <path d="M0,5 L2.5,0 L7.5,0 L10,5 L7.5,10 L2.5,10 Z" fill="var(--accent)" />
                    </pattern>
                    <rect width="100%" height="100%" fill={`url(#hcv-${drive.id})`} />
                  </svg>
                </div>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '10px',
                    color: 'var(--ink-2)',
                    background: 'rgba(21,15,35,0.75)',
                    padding: '1px 4px',
                    borderRadius: '2px',
                  }}>
                    {drive.size}<span style={{ fontSize: '8px', color: 'var(--ink-3)' }}>TB</span>
                  </span>
                </div>
                <div style={{ position: 'absolute', top: 2, right: 3 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--ok)' }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VdevRack;
