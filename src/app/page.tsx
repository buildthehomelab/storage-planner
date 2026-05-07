"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import ServerRack from './ServerRack';
import VdevRack from './VdevRack';
import { type Drive, calcVdevRaid, calcConfigRaid, calcSnapRaid } from './raidCalc';

interface Vdev {
  id: number;
  type: string;
  drives: Drive[];
}

interface StorageConfig {
  id: number;
  fileSystem: string;
  raidType: string;
  selectedDrives: Drive[];
  vdevs: Vdev[];
}

// Mini drive grid used inside the vdev manager modal
const VdevManagerDriveGrid = ({ drives }: { drives: Drive[] }) => (
  <div style={{
    background: 'var(--paper-3)',
    border: '1px solid var(--rule)',
    borderRadius: '4px',
    padding: '10px',
    maxHeight: '140px',
    overflowY: 'auto',
  }}>
    {drives.length === 0 ? (
      <p style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--ink-3)', textAlign: 'center', margin: '8px 0' }}>
        No drives selected
      </p>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {Array.from({ length: Math.ceil(drives.length / 4) }).map((_, rowIndex) => (
          <div key={rowIndex} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {drives.slice(rowIndex * 4, (rowIndex + 1) * 4).map(drive => (
              <div key={drive.id} style={{
                position: 'relative',
                aspectRatio: '3/1',
                borderRadius: '2px',
                overflow: 'hidden',
                border: '1px solid var(--rule)',
                background: 'var(--paper-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--ink-2)' }}>
                  {drive.size}TB
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    )}
  </div>
);

const VDEV_MIN_DRIVES: Record<string, number> = {
  'RAID-Z1': 3,
  'RAID-Z2': 4,
  'RAID-Z3': 5,
  'Mirror': 2,
  'Striped': 2,
};

const FS_DESCRIPTIONS: Record<string, { tagline: string; detail: string }> = {
  'ZFS':            { tagline: 'Copy-on-write pool',      detail: 'Checksummed, self-healing. Groups drives into vdevs.' },
  'Unraid':         { tagline: 'Parity-protected array',  detail: 'Each data drive is independently accessible. Mixes sizes.' },
  'Synology SHR':   { tagline: 'Synology Hybrid RAID',   detail: 'Auto-optimizes capacity when mixing different drive sizes.' },
  'Synology BTRFS': { tagline: 'Synology + BTRFS',       detail: 'Adds CoW snapshots and checksums to Synology RAID.' },
  'SnapRAID':       { tagline: 'Snapshot parity',         detail: 'Parity computed periodically. Best for large media libraries.' },
  'Standard':       { tagline: 'Traditional RAID',        detail: 'Classic RAID via mdadm or hardware controller.' },
};

const RAID_DESCRIPTIONS: Record<string, { canFail: string; efficiency: string; minDrives: string }> = {
  'RAID-Z1':  { canFail: '1 drive',     efficiency: 'n−1',    minDrives: '3' },
  'RAID-Z2':  { canFail: '2 drives',    efficiency: 'n−2',    minDrives: '4' },
  'RAID-Z3':  { canFail: '3 drives',    efficiency: 'n−3',    minDrives: '5' },
  'Mirror':   { canFail: '1 per pair',  efficiency: '50%',    minDrives: '2' },
  'Striped':  { canFail: 'none',        efficiency: '100%',   minDrives: '1' },
  'Parity 1': { canFail: '1 drive',     efficiency: 'n−1',    minDrives: '2' },
  'Parity 2': { canFail: '2 drives',    efficiency: 'n−2',    minDrives: '3' },
  'Parity 3': { canFail: '3 drives',    efficiency: 'n−3',    minDrives: '4' },
  'SHR':      { canFail: '1 drive',     efficiency: 'varies', minDrives: '2' },
  'SHR-2':    { canFail: '2 drives',    efficiency: 'varies', minDrives: '4' },
  'RAID 0':   { canFail: 'none',        efficiency: '100%',   minDrives: '2' },
  'RAID 1':   { canFail: '1 drive',     efficiency: '50%',    minDrives: '2' },
  'RAID 5':   { canFail: '1 drive',     efficiency: 'n−1',    minDrives: '3' },
  'RAID 6':   { canFail: '2 drives',    efficiency: 'n−2',    minDrives: '4' },
  'RAID 10':  { canFail: '1 per pair',  efficiency: '50%',    minDrives: '4' },
  '1 Parity': { canFail: '1 drive',     efficiency: 'n−1',    minDrives: '2' },
  '2 Parity': { canFail: '2 drives',    efficiency: 'n−2',    minDrives: '3' },
  '3 Parity': { canFail: '3 drives',    efficiency: 'n−3',    minDrives: '4' },
  '4 Parity': { canFail: '4 drives',    efficiency: 'n−4',    minDrives: '5' },
  '5 Parity': { canFail: '5 drives',    efficiency: 'n−5',    minDrives: '6' },
  '6 Parity': { canFail: '6 drives',    efficiency: 'n−6',    minDrives: '7' },
};

const RAIDCalculator = () => {
  const [driveSize, setDriveSize] = useState(20);
  const [showComparisonMode, setShowComparisonMode] = useState(false);
  const [activeConfigIndex, setActiveConfigIndex] = useState(0);

  const [configs, setConfigs] = useState<StorageConfig[]>([
    { id: 1, fileSystem: 'ZFS', raidType: 'RAID-Z2', selectedDrives: [], vdevs: [] },
    { id: 2, fileSystem: 'Standard', raidType: 'RAID 10', selectedDrives: [], vdevs: [] },
  ]);

  const [showRaidInfo, setShowRaidInfo] = useState(false);
  const [raidInfoFileSystem, setRaidInfoFileSystem] = useState('ZFS');
  const [showVdevManager, setShowVdevManager] = useState(false);
  const [showVdevInfo, setShowVdevInfo] = useState(false);
  const [showSnapraidInfo, setShowSnapraidInfo] = useState(false);
  const [currentVdevType, setCurrentVdevType] = useState('RAID-Z2');

  const raidInfoRef = useRef<HTMLDivElement>(null);
  const vdevManagerRef = useRef<HTMLDivElement>(null);
  const vdevInfoRef = useRef<HTMLDivElement>(null);
  const snapraidInfoRef = useRef<HTMLDivElement>(null);

  const driveSizes = [48, 40, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 3, 2, 1];

  const raidOptions = useMemo(() => ({
    'ZFS': ['RAID-Z1', 'RAID-Z2', 'RAID-Z3', 'Mirror', 'Striped'],
    'Unraid': ['Parity 1', 'Parity 2', 'Parity 3'],
    'Synology SHR': ['SHR', 'SHR-2'],
    'Synology BTRFS': ['RAID 0', 'RAID 1', 'RAID 5', 'RAID 6', 'RAID 10', 'SHR', 'SHR-2'],
    'SnapRAID': ['1 Parity', '2 Parity', '3 Parity', '4 Parity', '5 Parity', '6 Parity'],
    'Standard': ['RAID 0', 'RAID 1', 'RAID 5', 'RAID 6', 'RAID 10'],
  }), []);

  const vdevTypes = useMemo(() => ['RAID-Z1', 'RAID-Z2', 'RAID-Z3', 'Mirror', 'Striped'], []);

  const updateConfig = (configIndex: number, updates: Partial<StorageConfig>) => {
    setConfigs(prevConfigs => {
      const newConfigs = [...prevConfigs];
      newConfigs[configIndex] = { ...newConfigs[configIndex], ...updates };
      return newConfigs;
    });
  };

  // Only normalize raidType when fileSystem changes — not on every config update.
  // Vdev drives are returned to selectedDrives instead of silently deleted.
  const prevFileSystems = useRef(configs.map(c => c.fileSystem));
  useEffect(() => {
    configs.forEach((config, index) => {
      const fsChanged = config.fileSystem !== prevFileSystems.current[index];
      prevFileSystems.current[index] = config.fileSystem;
      if (!raidOptions[config.fileSystem as keyof typeof raidOptions].includes(config.raidType)) {
        const firstOption = raidOptions[config.fileSystem as keyof typeof raidOptions][0];
        if (config.fileSystem !== 'ZFS' && config.vdevs.length > 0) {
          // Return all vdev drives to the unassigned pool instead of deleting them
          const freedDrives = config.vdevs.flatMap(v => v.drives).map(d => ({ ...d, id: Date.now() + Math.random() }));
          updateConfig(index, {
            raidType: firstOption,
            vdevs: [],
            selectedDrives: [...config.selectedDrives, ...freedDrives],
          });
        } else {
          updateConfig(index, { raidType: firstOption });
        }
      } else if (fsChanged && config.fileSystem !== 'ZFS' && config.vdevs.length > 0) {
        // fileSystem changed away from ZFS — return vdev drives even if raidType happened to match
        const freedDrives = config.vdevs.flatMap(v => v.drives).map(d => ({ ...d, id: Date.now() + Math.random() }));
        updateConfig(index, {
          vdevs: [],
          selectedDrives: [...config.selectedDrives, ...freedDrives],
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs.map(c => c.fileSystem).join(','), configs.map(c => c.raidType).join(',')]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (raidInfoRef.current && !raidInfoRef.current.contains(event.target as Node)) setShowRaidInfo(false);
      if (vdevManagerRef.current && !vdevManagerRef.current.contains(event.target as Node)) setShowVdevManager(false);
      if (vdevInfoRef.current && !vdevInfoRef.current.contains(event.target as Node)) setShowVdevInfo(false);
      if (snapraidInfoRef.current && !snapraidInfoRef.current.contains(event.target as Node)) setShowSnapraidInfo(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [raidInfoRef, vdevManagerRef, vdevInfoRef, snapraidInfoRef]);

  const [driveCapHit, setDriveCapHit] = useState(false);

  const addDrive = (size: number) => {
    const activeConfig = configs[activeConfigIndex];
    const totalDrives = activeConfig.selectedDrives.length + activeConfig.vdevs.reduce((s, v) => s + v.drives.length, 0);
    if (totalDrives < 24) {
      updateConfig(activeConfigIndex, { selectedDrives: [...activeConfig.selectedDrives, { id: Date.now(), size }] });
      setDriveCapHit(false);
    } else {
      setDriveCapHit(true);
    }
  };

  const removeDrive = (id: number) => {
    const activeConfig = configs[activeConfigIndex];
    updateConfig(activeConfigIndex, { selectedDrives: activeConfig.selectedDrives.filter(drive => drive.id !== id) });
  };

  const resetDrives = () => updateConfig(activeConfigIndex, { selectedDrives: [], vdevs: [] });

  const resetAllConfigs = () => setConfigs(prevConfigs => prevConfigs.map(config => ({ ...config, selectedDrives: [], vdevs: [] })));

  const createVdev = () => {
    const activeConfig = configs[activeConfigIndex];
    if (activeConfig.selectedDrives.length === 0) return;
    const newVdev: Vdev = { id: Date.now(), type: currentVdevType, drives: [...activeConfig.selectedDrives] };
    updateConfig(activeConfigIndex, { vdevs: [...activeConfig.vdevs, newVdev], selectedDrives: [] });
    setShowVdevManager(false);
  };

  const removeVdev = (id: number, configIndex: number) => {
    const config = configs[configIndex];
    const vdevToRemove = config.vdevs.find(vdev => vdev.id === id);
    if (vdevToRemove) {
      updateConfig(configIndex, {
        selectedDrives: [...config.selectedDrives, ...vdevToRemove.drives],
        vdevs: config.vdevs.filter(vdev => vdev.id !== id),
      });
    }
  };

  const copyDrives = (fromIndex: number, toIndex: number) => {
    const src = configs[fromIndex];
    const dst = configs[toIndex];
    const allDrives = [
      ...src.selectedDrives,
      ...src.vdevs.flatMap(v => v.drives),
    ];
    if (allDrives.length === 0) return;
    const dstTotal = dst.selectedDrives.length + dst.vdevs.reduce((s, v) => s + v.drives.length, 0);
    const slots = Math.max(0, 24 - dstTotal);
    const newDrives = allDrives.slice(0, slots).map(drive => ({ id: Date.now() + Math.random(), size: drive.size }));
    if (newDrives.length === 0) return;
    updateConfig(toIndex, { selectedDrives: [...dst.selectedDrives, ...newDrives] });
  };

  const calculateVdevStorage = (vdev: Vdev) => {
    if (vdev.drives.length === 0) return { total: 0, available: 0, protection: 0, formatted: 0, readSpeed: 0, writeSpeed: 0, reliability: 0 };
    const totalRawStorage = vdev.drives.reduce((sum, drive) => sum + drive.size, 0);
    const stats = calcVdevRaid(vdev.type, vdev.drives);
    return {
      total: totalRawStorage,
      available: Math.max(0, stats.available),
      protection: Math.max(0, stats.protection),
      formatted: 0,
      readSpeed: Math.max(0, Math.round(stats.readSpeed)),
      writeSpeed: Math.max(0, Math.round(stats.writeSpeed)),
      reliability: Math.max(0, Math.min(100, stats.reliability)),
    };
  };

  const calculateStorage = (config: StorageConfig) => {
    if (config.fileSystem === 'ZFS' && config.vdevs.length > 0) {
      const vdevStats = config.vdevs.map(calculateVdevStorage);
      const totalRawStorage = vdevStats.reduce((sum, stat) => sum + stat.total, 0);
      const available = vdevStats.reduce((sum, stat) => sum + stat.available, 0);
      const protection = vdevStats.reduce((sum, stat) => sum + stat.protection, 0);
      let readSpeed = 0;
      if (vdevStats.length > 0) {
        const baseReadSpeed = vdevStats.reduce((sum, stat) => sum + stat.readSpeed, 0);
        readSpeed = baseReadSpeed * Math.max(0.7, 0.95 - (vdevStats.length * 0.03));
      }
      let writeSpeed = 0;
      if (vdevStats.length > 0) {
        const avgWriteSpeed = vdevStats.reduce((sum, stat) => sum + stat.writeSpeed, 0) / vdevStats.length;
        writeSpeed = avgWriteSpeed * Math.min(1.8, 0.9 + (vdevStats.length * 0.15));
      }
      const reliability = vdevStats.length > 0 ? Math.min(...vdevStats.map(stat => stat.reliability)) : 0;
      const formatted = Math.max(0, available) * 0.92;
      return {
        total: totalRawStorage, available, protection, formatted,
        readSpeed: Math.max(0, Math.round(readSpeed)),
        writeSpeed: Math.max(0, Math.round(writeSpeed)),
        reliability,
      };
    } else {
      if (config.selectedDrives.length === 0) return { total: 0, available: 0, protection: 0, formatted: 0, readSpeed: 0, writeSpeed: 0, reliability: 0 };
      const totalRawStorage = config.selectedDrives.reduce((sum, drive) => sum + drive.size, 0);
      const stats = config.fileSystem === 'SnapRAID'
        ? calcSnapRaid(config.selectedDrives, parseInt(config.raidType.split(' ')[0]))
        : calcConfigRaid(config.raidType, config.selectedDrives);
      const overheadPct: { [key: string]: number } = {
        'ZFS': 0.08, 'Unraid': 0.03, 'Synology SHR': 0.085,
        'Synology BTRFS': 0.12, 'SnapRAID': 0.01, 'Standard': 0.05,
      };
      const formatted = Math.max(0, stats.available) * (1 - (overheadPct[config.fileSystem] ?? 0.05));
      return {
        total: totalRawStorage,
        available: Math.max(0, stats.available),
        protection: Math.max(0, stats.protection),
        formatted: Math.max(0, formatted),
        readSpeed: Math.max(0, Math.round(stats.readSpeed)),
        writeSpeed: Math.max(0, Math.round(stats.writeSpeed)),
        reliability: Math.max(0, Math.min(100, stats.reliability)),
      };
    }
  };

  const configStats = configs.map(calculateStorage);

  const getConfigLabel = (config: StorageConfig) => {
    if (config.fileSystem === 'ZFS' && config.vdevs.length > 0) {
      const counts = config.vdevs.reduce((acc, v) => ({ ...acc, [v.type]: (acc[v.type] || 0) + 1 }), {} as Record<string, number>);
      return `ZFS · ${Object.entries(counts).map(([type, n]) => `${n}× ${type}`).join(', ')}`;
    }
    return `${config.fileSystem} · ${config.raidType}`;
  };

  const comparisonResult = useMemo(() => {
    if (!showComparisonMode) return null;
    const [s1, s2] = configStats;
    const diff = (a: number, b: number) => ({ winner: a > b ? 0 : a < b ? 1 : null, difference: Math.abs(a - b), percentDiff: (a && b) ? Math.abs(((a - b) / Math.min(a, b)) * 100).toFixed(1) : '0' });
    return {
      capacity:    diff(s1.formatted, s2.formatted),
      efficiency:  diff(s1.available / s1.total, s2.available / s2.total),
      readSpeed:   diff(s1.readSpeed, s2.readSpeed),
      writeSpeed:  diff(s1.writeSpeed, s2.writeSpeed),
      reliability: diff(s1.reliability, s2.reliability),
    };
  }, [showComparisonMode, configStats]);

  const getTotalDrivesCount = (config: StorageConfig) =>
    config.selectedDrives.length + config.vdevs.reduce((sum, vdev) => sum + vdev.drives.length, 0);

  // Reliability -> color
  const reliabilityColor = (r: number) => r > 80 ? 'var(--ok)' : r > 50 ? 'var(--warn)' : 'var(--crit)';

  const renderStorageConfig = (config: StorageConfig, index: number, stats: ReturnType<typeof calculateStorage>) => {
    const accentColor = index === 0 ? 'var(--ok)' : 'var(--accent)';
    const efficiency = stats.total > 0 ? ((stats.available / stats.total) * 100) : 0;

    return (
      <div>
        {/* File system + RAID type row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '28px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="nw-label">File System</label>
            <select
              className="nw-select"
              style={{ width: '180px' }}
              value={config.fileSystem}
              onChange={(e) => updateConfig(index, { fileSystem: e.target.value })}
            >
              {Object.keys(raidOptions).map(fs => <option key={fs} value={fs}>{fs}</option>)}
            </select>
            {FS_DESCRIPTIONS[config.fileSystem] && (
              <div style={{ width: '180px' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ok)', display: 'block', marginBottom: '2px' }}>
                  {FS_DESCRIPTIONS[config.fileSystem].tagline}
                </span>
                <span style={{ fontFamily: 'var(--sans)', fontSize: '11px', color: 'var(--ink-3)', lineHeight: '1.4', display: 'block' }}>
                  {FS_DESCRIPTIONS[config.fileSystem].detail}
                </span>
                {config.fileSystem === 'SnapRAID' && (
                  <button className="link-btn" style={{ marginTop: '4px', fontSize: '11px' }} onClick={() => setShowSnapraidInfo(true)}>
                    Learn more →
                  </button>
                )}
              </div>
            )}
          </div>

          {!(config.fileSystem === 'ZFS' && config.vdevs.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="nw-label">RAID Type</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  className="nw-select"
                  style={{ width: '180px' }}
                  value={config.raidType}
                  onChange={(e) => updateConfig(index, { raidType: e.target.value })}
                >
                  {raidOptions[config.fileSystem as keyof typeof raidOptions].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <button className="info-btn" onClick={() => { setRaidInfoFileSystem(config.fileSystem); setShowRaidInfo(!showRaidInfo); }}>?</button>
              </div>
              {RAID_DESCRIPTIONS[config.raidType] && (
                <div style={{ width: '180px' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ color: 'var(--ink-3)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Can lose</span>
                      <span style={{ color: RAID_DESCRIPTIONS[config.raidType].canFail === 'none' ? 'var(--ink-3)' : 'var(--ok)' }}>
                        {RAID_DESCRIPTIONS[config.raidType].canFail}
                      </span>
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ color: 'var(--ink-3)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Efficiency</span>
                      <span style={{ color: 'var(--accent)' }}>{RAID_DESCRIPTIONS[config.raidType].efficiency}</span>
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ color: 'var(--ink-3)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Min drives</span>
                      <span style={{ color: 'var(--ink-2)' }}>{RAID_DESCRIPTIONS[config.raidType].minDrives}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {showComparisonMode && getTotalDrivesCount(configs[1 - index]) > 0 && (
            <button
              className="btn-ghost"
              style={{ marginBottom: '0', alignSelf: 'flex-end' }}
              onClick={() => copyDrives(1 - index, index)}
            >
              Copy from {configs[1 - index].fileSystem}
            </button>
          )}
        </div>

        {/* ZFS vdevs */}
        {config.fileSystem === 'ZFS' && config.vdevs.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div className="section-label">
              <span>ZFS vdevs</span>
              <button
                className="link-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                onClick={() => setShowVdevInfo(true)}
              >
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                What are vdevs?
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {config.vdevs.map((vdev, vdevIndex) => {
                const vdevStats = calculateVdevStorage(vdev);
                return (
                  <div key={vdev.id} className="vdev-card">
                    <div className="vdev-card__header">
                      <span className="vdev-card__title">
                        vdev {vdevIndex + 1}
                        <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>{vdev.type}</span>
                        <span style={{ color: 'var(--ink-3)', marginLeft: '8px', fontSize: '11px' }}>{vdev.drives.length} drives</span>
                      </span>
                      <button
                        className="link-btn link-btn--crit"
                        onClick={() => removeVdev(vdev.id, index)}
                        title="Remove vdev"
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <VdevRack drives={vdev.drives} type={vdev.type} vdevIndex={vdevIndex} />
                    </div>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      {[['Raw', `${vdevStats.total.toFixed(1)} TB`], ['Usable', `${vdevStats.available.toFixed(1)} TB`], ['Parity', `${vdevStats.protection.toFixed(1)} TB`]].map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                          <span style={{ fontFamily: 'var(--sans)', fontSize: '10px', color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--ink-2)' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        {(config.selectedDrives.length > 0 || config.vdevs.length > 0) && (
          <div className="rise rise-3">
            {/* Distribution bar */}
            <div style={{ marginBottom: '28px' }}>
              <div className="section-label">Storage Distribution</div>
              <div className="dist-bar" style={{ marginBottom: '10px' }}>
                {stats.available > 0 && (
                  <div
                    className="dist-bar"
                    style={{ background: 'var(--ok)', width: `${Math.max(1, (stats.available / stats.total) * 100)}%`, borderRadius: 0 }}
                  />
                )}
                {stats.protection > 0 && (
                  <div
                    style={{ background: 'var(--accent)', opacity: 0.8, width: `${Math.max(1, (stats.protection / stats.total) * 100)}%` }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                {[['var(--ok)', 'Usable capacity'], ['var(--accent)', 'Parity / protection']].map(([color, label]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '2px', background: color }} />
                    <span style={{ fontFamily: 'var(--sans)', fontSize: '12px', color: 'var(--ink-3)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Capacity metrics */}
            <div style={{ marginBottom: '24px' }}>
              <div className="section-label">Capacity</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                {[
                  ['Raw', `${stats.total.toFixed(1)} TB`, '', ''],
                  ['Usable', `${stats.available.toFixed(1)} TB`, 'ok', 'stat-card--ok'],
                  ['Formatted', `${stats.formatted.toFixed(1)} TB`, '', ''],
                  ['Efficiency', `${efficiency.toFixed(1)}%`, efficiency >= 70 ? 'ok' : efficiency >= 40 ? 'warn' : 'crit',
                    efficiency >= 70 ? 'stat-card--ok' : efficiency >= 40 ? 'stat-card--warn' : ''],
                ].map(([label, value, valueClass, cardClass]) => (
                  <div key={label} className={`stat-card ${cardClass}`}>
                    <div className="nw-label">{label}</div>
                    <div className={`stat-value ${valueClass ? `stat-value--${valueClass}` : ''}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance metrics */}
            <div>
              <div className="section-label">Performance</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                {/* Read speed */}
                <div className="stat-card">
                  <div className="nw-label">Read (est.)</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <div className="stat-value">{stats.readSpeed}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-3)' }}>MB/s</div>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill bar-fill--accent" style={{ width: `${Math.min(100, (stats.readSpeed / 1000) * 100)}%` }} />
                  </div>
                </div>
                {/* Write speed */}
                <div className="stat-card">
                  <div className="nw-label">Write (est.)</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <div className="stat-value">{stats.writeSpeed}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-3)' }}>MB/s</div>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill bar-fill--ok" style={{ width: `${Math.min(100, (stats.writeSpeed / 1000) * 100)}%` }} />
                  </div>
                </div>
                {/* Reliability */}
                <div className="stat-card">
                  <div className="nw-label">Reliability</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <div className="stat-value" style={{ color: reliabilityColor(stats.reliability) }}>{stats.reliability}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-3)' }}>/100</div>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${stats.reliability}%`,
                        background: reliabilityColor(stats.reliability),
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const activeStats = configStats[activeConfigIndex];

  return (
    <div className="page">
      {/* Masthead */}
      <header className="masthead rise">
        <div className="eyebrow">Storage Planner</div>
        <h1>Plan Your Array.</h1>
        <p className="sub">Visualize RAID configurations, estimate usable capacity and performance.</p>
      </header>

      {/* Step 1: Select drives */}
      <section style={{ marginBottom: '48px' }} className="rise rise-1">
        <div className="section-label">
          <span>Add Drives</span>
          {(configs[activeConfigIndex].selectedDrives.length > 0 || configs[activeConfigIndex].vdevs.length > 0) && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
              click a bay to remove
            </span>
          )}
        </div>

        {/* Drive size buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
          {driveSizes.map(size => (
            <button key={size} className="drive-btn" onClick={() => addDrive(size)}>
              {size} TB
            </button>
          ))}
          <button
            className={`drive-btn ${showComparisonMode ? 'drive-btn--active' : ''}`}
            onClick={() => setShowComparisonMode(!showComparisonMode)}
          >
            {showComparisonMode ? '← Single' : 'Compare →'}
          </button>
        </div>

        {/* Comparison mode tabs */}
        {showComparisonMode && (
          <div style={{ display: 'flex', marginBottom: '-1px' }}>
            {configs.map((config, index) => (
              <button
                key={config.id}
                className={`tab-btn ${activeConfigIndex === index ? 'active' : ''}`}
                onClick={() => setActiveConfigIndex(index)}
              >
                Config {index + 1}: {getConfigLabel(config)}
              </button>
            ))}
          </div>
        )}

        {/* Server rack */}
        <div style={showComparisonMode ? { border: '1px solid var(--rule)', borderTop: 'none', borderRadius: '0 4px 4px 4px', padding: '1px' } : {}}>
          <ServerRack
            drives={configs[activeConfigIndex].selectedDrives}
            onDriveClick={(id) => { if (id) removeDrive(id); }}
          />
        </div>

        {/* Drive count + actions */}
        {driveCapHit && (
          <div style={{
            marginBottom: '8px', padding: '8px 12px',
            background: 'rgba(250,127,170,0.08)', border: '1px solid rgba(250,127,170,0.25)',
            borderRadius: '4px', fontFamily: 'var(--sans)', fontSize: '12px', color: 'var(--crit)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>Maximum 24 drives per config reached.</span>
            <button className="link-btn link-btn--crit" style={{ fontSize: '11px' }} onClick={() => setDriveCapHit(false)}>dismiss</button>
          </div>
        )}
        <div className="drive-info">
          <div className="drive-count">
            <span>{configs[activeConfigIndex].selectedDrives.length}</span> unassigned
            {' · '}
            <span>{getTotalDrivesCount(configs[activeConfigIndex])}</span> / 24 total
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {configs[activeConfigIndex].fileSystem === 'ZFS' && (
              <button
                className="btn-primary"
                onClick={() => setShowVdevManager(true)}
                disabled={configs[activeConfigIndex].selectedDrives.length === 0}
              >
                Create vdev
              </button>
            )}
            <button className="btn-ghost" onClick={resetDrives}>Reset</button>
            {showComparisonMode && (
              <button className="btn-ghost" style={{ borderColor: 'rgba(250,127,170,0.3)', color: 'var(--crit)' }} onClick={resetAllConfigs}>
                Reset All
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Step 2: Config & results */}
      <section className="rise rise-2">
        {!showComparisonMode ? (
          renderStorageConfig(configs[0], 0, configStats[0])
        ) : (
          <div>
            <div className="section-label">Compare Configurations</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
              {configs.map((config, index) => (
                <div key={config.id} className={`config-card config-card--${index}`}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 800, color: index === 0 ? 'var(--ok)' : 'var(--accent)', marginBottom: '16px' }}>
                    Config {index + 1}
                    <span style={{ fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 400, color: 'var(--ink-3)', marginLeft: '10px' }}>
                      {getConfigLabel(config)}
                    </span>
                  </div>
                  {renderStorageConfig(config, index, configStats[index])}
                </div>
              ))}
            </div>

            {/* Comparison results */}
            {comparisonResult && configStats[0].total > 0 && configStats[1].total > 0 && (
              <div className="panel" style={{ padding: '24px' }}>
                <div className="section-label" style={{ marginBottom: '20px' }}>Head-to-Head</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {([
                    ['Usable Capacity', `${configStats[0].formatted.toFixed(1)} TB`, `${configStats[1].formatted.toFixed(1)} TB`, comparisonResult.capacity, `${comparisonResult.capacity.difference as unknown as number > 0 ? (comparisonResult.capacity.difference as unknown as number).toFixed(1) : '0.0'} TB`],
                    ['Efficiency', `${configStats[0].total > 0 ? ((configStats[0].available / configStats[0].total) * 100).toFixed(1) : 0}%`, `${configStats[1].total > 0 ? ((configStats[1].available / configStats[1].total) * 100).toFixed(1) : 0}%`, comparisonResult.efficiency, `${(parseFloat(comparisonResult.efficiency.difference as unknown as string) * 100).toFixed(1)}%`],
                    ['Read Speed', `${configStats[0].readSpeed} MB/s`, `${configStats[1].readSpeed} MB/s`, comparisonResult.readSpeed, `${comparisonResult.readSpeed.difference} MB/s`],
                    ['Write Speed', `${configStats[0].writeSpeed} MB/s`, `${configStats[1].writeSpeed} MB/s`, comparisonResult.writeSpeed, `${comparisonResult.writeSpeed.difference} MB/s`],
                    ['Reliability', `${configStats[0].reliability}/100`, `${configStats[1].reliability}/100`, comparisonResult.reliability, `${comparisonResult.reliability.difference} pts`],
                  ] as [string, string, string, { winner: number | null; percentDiff: string }, string][]).map(([metric, v1, v2, result, diff]) => (
                    <div key={metric} style={{
                      display: 'grid',
                      gridTemplateColumns: '160px 1fr 90px 1fr',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: '1px solid var(--rule)',
                    }}>
                      <span style={{ fontFamily: 'var(--sans)', fontSize: '12px', fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {metric}
                      </span>
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: '14px', color: result.winner === 0 ? 'var(--ok)' : 'var(--ink-2)',
                        padding: '4px 10px', background: result.winner === 0 ? 'rgba(194,239,78,0.08)' : 'var(--paper-2)',
                        borderRadius: '4px', textAlign: 'center', border: result.winner === 0 ? '1px solid rgba(194,239,78,0.2)' : '1px solid var(--rule)',
                      }}>
                        {v1}
                      </span>
                      <div style={{ textAlign: 'center' }}>
                        {result.winner !== null ? (
                          <div>
                            <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: result.winner === 0 ? 'var(--ok)' : 'var(--accent)', lineHeight: 1.2 }}>{diff}</div>
                            <div style={{ fontSize: '10px', color: 'var(--ink-3)' }}>{result.percentDiff}% diff</div>
                          </div>
                        ) : (
                          <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ink-3)' }}>tie</span>
                        )}
                      </div>
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: '14px', color: result.winner === 1 ? 'var(--accent)' : 'var(--ink-2)',
                        padding: '4px 10px', background: result.winner === 1 ? 'rgba(106,95,193,0.1)' : 'var(--paper-2)',
                        borderRadius: '4px', textAlign: 'center', border: result.winner === 1 ? '1px solid rgba(106,95,193,0.25)' : '1px solid var(--rule)',
                      }}>
                        {v2}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Recommendation */}
                <div style={{ marginTop: '20px', padding: '16px', background: 'var(--paper-3)', borderRadius: '6px', border: '1px solid var(--rule)' }}>
                  <div className="nw-label" style={{ marginBottom: '8px' }}>Recommendation</div>
                  {(() => {
                    let c1 = 0, c2 = 0;
                    [comparisonResult.capacity, comparisonResult.efficiency, comparisonResult.readSpeed, comparisonResult.writeSpeed, comparisonResult.reliability].forEach(r => {
                      if (r.winner === 0) c1++;
                      if (r.winner === 1) c2++;
                    });
                    const better = c1 > c2 ? 0 : c1 < c2 ? 1 : null;
                    const color = better === 0 ? 'var(--ok)' : better === 1 ? 'var(--accent)' : 'var(--ink-3)';
                    return (
                      <p style={{ fontFamily: 'var(--sans)', fontSize: '14px', color: 'var(--ink-2)', margin: 0 }}>
                        {better !== null ? (
                          <>
                            <strong style={{ color }}>Configuration {better + 1} ({configs[better].fileSystem} {configs[better].raidType})</strong>
                            {' '}wins on {better === 0 ? c1 : c2} of 5 metrics.
                          </>
                        ) : (
                          'Both configurations are evenly matched across all metrics.'
                        )}
                      </p>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Modals ─────────────────────────────────────── */}

      {/* vdev Manager */}
      {showVdevManager && (
        <div className="modal-overlay">
          <div ref={vdevManagerRef} className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">Create vdev</h3>
              <button className="modal-close" onClick={() => setShowVdevManager(false)}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="nw-label">vdev Type</label>
              <select className="nw-select" style={{ width: '100%' }} value={currentVdevType} onChange={(e) => setCurrentVdevType(e.target.value)}>
                {vdevTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="nw-label">Selected Drives ({configs[activeConfigIndex].selectedDrives.length})</label>
              <VdevManagerDriveGrid drives={configs[activeConfigIndex].selectedDrives} />
            </div>

            <div style={{ fontFamily: 'var(--sans)', fontSize: '12px', color: 'var(--ink-3)', marginBottom: '20px', lineHeight: 1.6 }}>
              {[['RAID-Z1', '3+ drives · 1 drive redundancy'], ['RAID-Z2', '4+ drives · 2 drive redundancy'], ['RAID-Z3', '5+ drives · 3 drive redundancy'], ['Mirror', '2+ drives · 1:1 mirroring'], ['Striped', '2+ drives · no redundancy']].map(([t, d]) => (
                <div key={t} style={{
                  display: 'flex', gap: '8px', padding: '3px 0', borderBottom: '1px solid var(--rule-soft)',
                  background: t === currentVdevType ? 'rgba(106,95,193,0.08)' : 'transparent',
                  marginLeft: '-4px', marginRight: '-4px', paddingLeft: '4px', paddingRight: '4px',
                  borderRadius: '2px',
                }}>
                  <span style={{ fontFamily: 'var(--mono)', color: t === currentVdevType ? 'var(--ok)' : 'var(--accent)', minWidth: '70px' }}>{t}</span>
                  <span>{d}</span>
                </div>
              ))}
            </div>

            {(() => {
              const driveCount = configs[activeConfigIndex].selectedDrives.length;
              const minDrives = VDEV_MIN_DRIVES[currentVdevType] ?? 2;
              if (driveCount > 0 && driveCount < minDrives) {
                return (
                  <div style={{
                    marginBottom: '16px', padding: '10px 12px',
                    background: 'rgba(250,127,170,0.08)', border: '1px solid rgba(250,127,170,0.25)',
                    borderRadius: '4px', fontFamily: 'var(--sans)', fontSize: '12px', color: 'var(--crit)',
                  }}>
                    {currentVdevType} requires at least {minDrives} drives — you have {driveCount} selected.
                  </div>
                );
              }
              return null;
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn-ghost" onClick={() => setShowVdevManager(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={createVdev}
                disabled={configs[activeConfigIndex].selectedDrives.length < (VDEV_MIN_DRIVES[currentVdevType] ?? 2)}
              >
                Create vdev
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RAID Info */}
      {showRaidInfo && (
        <div className="modal-overlay">
          <div ref={raidInfoRef} className="modal-box modal-box--wide">
            <div className="modal-header">
              <h3 className="modal-title">RAID Types</h3>
              <button className="modal-close" onClick={() => setShowRaidInfo(false)}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-prose">
              {((): [string, string][] => {
                if (raidInfoFileSystem === 'ZFS') return [
                  ['RAID-Z1', 'ZFS single parity. Min 3 drives. Tolerates 1 drive failure. Full integrity with checksums.'],
                  ['RAID-Z2', 'ZFS double parity. Min 4 drives. Tolerates 2 simultaneous failures. Recommended for most pools.'],
                  ['RAID-Z3', 'ZFS triple parity. Min 5 drives. Tolerates 3 simultaneous failures. Mission-critical data.'],
                  ['Mirror', 'Full mirroring within the vdev. 50% efficiency. Fastest reads. Can lose all-but-one drive.'],
                  ['Striped', 'No redundancy — RAID-0. Maximum capacity and speed. Any failure = pool loss.'],
                ];
                if (raidInfoFileSystem === 'Unraid') return [
                  ['Parity 1', '1 parity drive. Tolerates 1 drive failure. Remaining drives keep full capacity.'],
                  ['Parity 2', '2 parity drives. Tolerates 2 simultaneous failures.'],
                  ['Parity 3', '3 parity drives. Tolerates 3 simultaneous failures. Maximum protection for Unraid.'],
                ];
                if (raidInfoFileSystem === 'SnapRAID') return [
                  ['1–6 Parity', 'SnapRAID uses 1–6 largest drives as parity. Parity is computed on-demand, not in real-time.'],
                  ['Data drives', 'All non-parity drives store data at full capacity. Mixed sizes are supported.'],
                ];
                if (raidInfoFileSystem === 'Synology SHR' || raidInfoFileSystem === 'Synology BTRFS') return [
                  ['SHR', 'Synology Hybrid RAID. Tolerates 1 drive failure. Optimizes capacity when mixing drive sizes.'],
                  ['SHR-2', 'SHR with 2-drive redundancy. Tolerates 2 simultaneous failures. Min 4 drives.'],
                  ['RAID 0', 'Striped, no redundancy. Max capacity. Any failure = full data loss.'],
                  ['RAID 1', 'Full mirror across 2 drives. 50% efficiency. Survives 1 failure.'],
                  ['RAID 5', 'Single parity across 3+ drives. n−1 usable. Tolerates 1 failure.'],
                  ['RAID 6', 'Double parity across 4+ drives. n−2 usable. Tolerates 2 failures.'],
                  ['RAID 10', 'Mirror + stripe. 50% efficiency. Excellent performance and redundancy.'],
                ];
                return [
                  ['RAID 0', 'Striped. No redundancy. Max performance and capacity. Any failure = full data loss.'],
                  ['RAID 1', 'Full mirror. 50% efficiency. Survives all-but-one drive failure.'],
                  ['RAID 5', 'Single parity. n−1 usable drives. Tolerates 1 drive failure.'],
                  ['RAID 6', 'Double parity. n−2 usable drives. Tolerates 2 simultaneous failures.'],
                  ['RAID 10', 'Mirror + stripe. 50% efficiency. Best balance of performance and redundancy.'],
                ];
              })().map(([name, desc]) => (
                <div key={name} style={{ padding: '12px 0', borderBottom: '1px solid var(--rule-soft)' }}>
                  <strong>{name}</strong>
                  <p style={{ margin: '4px 0 0', color: 'var(--ink-3)', fontSize: '13px' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* vdev Info */}
      {showVdevInfo && (
        <div className="modal-overlay">
          <div ref={vdevInfoRef} className="modal-box modal-box--wide">
            <div className="modal-header">
              <h3 className="modal-title">ZFS vdevs</h3>
              <button className="modal-close" onClick={() => setShowVdevInfo(false)}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-prose">
              <p>In ZFS, a virtual device (vdev) is a group of physical drives that acts as a single storage unit. Multiple vdevs combine into a ZFS pool striped together (RAID-0 between vdevs).</p>
              <h4>vdev Types</h4>
              <ul>
                <li><strong>RAID-Z1</strong> — min 3 drives, 1 drive redundancy</li>
                <li><strong>RAID-Z2</strong> — min 4 drives, 2 drive redundancy</li>
                <li><strong>RAID-Z3</strong> — min 5 drives, 3 drive redundancy</li>
                <li><strong>Mirror</strong> — 2+ drives, all data mirrored</li>
                <li><strong>Striped</strong> — 2+ drives, no redundancy (RAID-0)</li>
              </ul>
              <h4>Key Facts</h4>
              <ul>
                <li>Total capacity = sum of all vdev capacities</li>
                <li>If any single vdev fails, the entire pool fails</li>
                <li>Performance scales with vdev count</li>
                <li>Use identical drives within each vdev for best results</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SnapRAID Info */}
      {showSnapraidInfo && (
        <div className="modal-overlay">
          <div ref={snapraidInfoRef} className="modal-box modal-box--wide">
            <div className="modal-header">
              <h3 className="modal-title">SnapRAID</h3>
              <button className="modal-close" onClick={() => setShowSnapraidInfo(false)}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-prose">
              <p>SnapRAID is a backup program for disk arrays. Unlike traditional RAID, it computes parity periodically (not in real-time), making it ideal for media storage where files rarely change.</p>
              <h4>Key Characteristics</h4>
              <ul>
                <li>Parity is calculated on-demand, not continuously</li>
                <li>Largest drives become parity drives — data drives keep their full capacity</li>
                <li>Supports mixed drive sizes — a big advantage over traditional RAID</li>
                <li>Files are accessible even without parity rebuild</li>
                <li>Not suitable for frequently-changing data (databases, VMs)</li>
              </ul>
              <h4>Parity Drives</h4>
              <ul>
                <li>1 Parity — protects against 1 drive failure</li>
                <li>2 Parity — protects against 2 simultaneous failures</li>
                <li>Up to 6 parity drives supported</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Ambient bottom bar */}
      <div className="ambient">
        {/* Left: branding */}
        <div className="ambient-app">
          <div className="ambient-app-dot" />
          <span className="ambient-app-name">Storage Planner</span>
        </div>
        <div className="ambient-sep" />

        {/* Center: live stats */}
        {activeStats.total > 0 ? (
          <>
            <div className="ambient-item">
              <span className="ambient-k">RAW</span>
              <span className="ambient-v">{activeStats.total.toFixed(1)} TB</span>
            </div>
            <div className="ambient-item">
              <span className="ambient-k">USABLE</span>
              <span className={`ambient-v ${activeStats.available > 0 ? 'ambient-v--ok' : 'ambient-v--none'}`}>
                {activeStats.available.toFixed(1)} TB
              </span>
            </div>
            <div className="ambient-item">
              <span className="ambient-k">EFF</span>
              <span className={`ambient-v ${
                activeStats.total > 0
                  ? (activeStats.available / activeStats.total) >= 0.65 ? 'ambient-v--ok' : 'ambient-v--warn'
                  : 'ambient-v--none'
              }`}>
                {activeStats.total > 0 ? ((activeStats.available / activeStats.total) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="ambient-sep" />
            <div className="ambient-item">
              <span className="ambient-k">READ</span>
              <span className="ambient-v">{activeStats.readSpeed} MB/s</span>
            </div>
            <div className="ambient-item">
              <span className="ambient-k">WRITE</span>
              <span className="ambient-v">{activeStats.writeSpeed} MB/s</span>
            </div>
            <div className="ambient-sep" />
            <div className="ambient-item">
              <span className="ambient-k">RELIABILITY</span>
              <span className="ambient-v" style={{ color: reliabilityColor(activeStats.reliability) }}>
                {activeStats.reliability}/100
              </span>
            </div>
          </>
        ) : (
          <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--ink-3)' }}>
            Add drives to see stats
          </span>
        )}

        {/* Right: GitHub link pushed to end */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <div className="ambient-sep" style={{ marginRight: '12px' }} />
          <a
            href="https://github.com/buildthehomelab/storage-planner"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              fontFamily: 'var(--sans)', fontSize: '11px', fontWeight: 600,
              color: 'var(--ink-3)', textDecoration: 'none',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink-2)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-3)')}
          >
            <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            Source
          </a>
        </div>
      </div>
    </div>
  );
};

export default RAIDCalculator;
