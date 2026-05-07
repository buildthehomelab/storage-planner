export interface Drive {
  id: number;
  size: number;
  type?: 'hdd' | 'nvme' | 'nvme-ent';
}

export interface RaidStats {
  available: number;
  protection: number;
  readSpeed: number;
  writeSpeed: number;
  reliability: number;
}

const BASE_READ_HDD = 150;
const BASE_WRITE_HDD = 140;
const BASE_READ_NVME = 3200;
const BASE_WRITE_NVME = 2800;

export function formatDriveSize(sizeInTB: number): string {
  if (sizeInTB < 1) return `${Math.round(sizeInTB * 1000)} GB`;
  return `${sizeInTB} TB`;
}

function getBaseSpeeds(drives: Drive[]): { r: number; w: number } {
  if (drives.length === 0) return { r: BASE_READ_HDD, w: BASE_WRITE_HDD };
  const nvmeCount = drives.filter(d => d.type === 'nvme' || d.type === 'nvme-ent').length;
  if (nvmeCount === drives.length) return { r: BASE_READ_NVME, w: BASE_WRITE_NVME };
  if (nvmeCount > 0) return { r: BASE_READ_HDD * 2, w: BASE_WRITE_HDD * 2 };
  return { r: BASE_READ_HDD, w: BASE_WRITE_HDD };
}

function sumDrives(drives: Drive[]): number {
  return drives.reduce((s, d) => s + d.size, 0);
}

function maxDrive(drives: Drive[]): number {
  return Math.max(...drives.map(d => d.size));
}

function minDrive(drives: Drive[]): number {
  return Math.min(...drives.map(d => d.size));
}

export function calcStriped(drives: Drive[]): RaidStats {
  const { r, w } = getBaseSpeeds(drives);
  const t = sumDrives(drives);
  return {
    available: t,
    protection: 0,
    readSpeed: r * drives.length * 0.9,
    writeSpeed: w * drives.length * 0.9,
    reliability: 0,
  };
}

export function calcMirror(drives: Drive[]): RaidStats {
  const { r, w } = getBaseSpeeds(drives);
  const t = sumDrives(drives);
  const available = drives.length > 0 ? Math.min(...drives.map(d => d.size)) : 0;
  return {
    available,
    protection: t - available,
    readSpeed: r * Math.min(drives.length, 2) * 0.9,
    writeSpeed: w * 0.95,
    reliability: 90,
  };
}

// RAID 5 / RAID-Z1 — 1 distributed parity stripe; usable = (N-1) × smallest drive
export function calcSingleParity(drives: Drive[]): RaidStats {
  const { r, w } = getBaseSpeeds(drives);
  const t = sumDrives(drives);
  const available = drives.length > 1 ? (drives.length - 1) * minDrive(drives) : 0;
  return {
    available,
    protection: t - available,
    readSpeed: r * (drives.length - 1) * 0.8,
    writeSpeed: w * (drives.length - 1) * 0.7,
    reliability: 70,
  };
}

// RAID 6 / RAID-Z2 — 2 distributed parity stripes; usable = (N-2) × smallest drive, minimum 4 drives
export function calcDoubleParity(drives: Drive[]): RaidStats {
  const { r, w } = getBaseSpeeds(drives);
  const t = sumDrives(drives);
  const available = drives.length > 3 ? (drives.length - 2) * minDrive(drives) : 0;
  return {
    available,
    protection: t - available,
    readSpeed: r * (drives.length - 2) * 0.8,
    writeSpeed: w * (drives.length - 2) * 0.6,
    reliability: 85,
  };
}

// RAID-Z3 — 3 distributed parity stripes; usable = (N-3) × smallest drive, minimum 5 drives
export function calcTripleParity(drives: Drive[]): RaidStats {
  const { r, w } = getBaseSpeeds(drives);
  const t = sumDrives(drives);
  const available = drives.length > 4 ? (drives.length - 3) * minDrive(drives) : 0;
  return {
    available,
    protection: t - available,
    readSpeed: r * (drives.length - 3) * 0.8,
    writeSpeed: w * (drives.length - 3) * 0.5,
    reliability: 95,
  };
}

// SHR (Synology Hybrid RAID) — largest drive is parity; smaller drives use remaining space fully
export function calcSHR(drives: Drive[]): RaidStats {
  const { r, w } = getBaseSpeeds(drives);
  const t = sumDrives(drives);
  const available = drives.length > 1 ? t - maxDrive(drives) : 0;
  return {
    available,
    protection: t - available,
    readSpeed: r * (drives.length - 1) * 0.8,
    writeSpeed: w * (drives.length - 1) * 0.7,
    reliability: 70,
  };
}

// SHR-2 (Synology Hybrid RAID 2) — 2 largest drives are parity overhead; minimum 4 drives
export function calcSHR2(drives: Drive[]): RaidStats {
  const { r, w } = getBaseSpeeds(drives);
  const t = sumDrives(drives);
  const available = drives.length > 3 ? t - 2 * maxDrive(drives) : 0;
  return {
    available,
    protection: t - available,
    readSpeed: r * (drives.length - 2) * 0.8,
    writeSpeed: w * (drives.length - 2) * 0.6,
    reliability: 85,
  };
}

export function calcRaid10(drives: Drive[]): RaidStats {
  const { r, w } = getBaseSpeeds(drives);
  const t = sumDrives(drives);
  const available = t / 2;
  return {
    available,
    protection: t - available,
    readSpeed: r * (drives.length / 2) * 0.95,
    writeSpeed: w * (drives.length / 2) * 0.9,
    reliability: 80,
  };
}

// Unraid Parity 1 — lower sequential perf than Z1
export function calcUnraidParity1(drives: Drive[]): RaidStats {
  const { r, w } = getBaseSpeeds(drives);
  const t = sumDrives(drives);
  const available = drives.length > 1 ? t - maxDrive(drives) : 0;
  return {
    available,
    protection: t - available,
    readSpeed: r * Math.min(1.5, drives.length * 0.2),
    writeSpeed: w * 0.6,
    reliability: 70,
  };
}

// Unraid Parity 2 — 2 largest drives are parity; data drives keep full capacity
export function calcUnraidParity2(drives: Drive[]): RaidStats {
  const { r, w } = getBaseSpeeds(drives);
  const t = sumDrives(drives);
  if (drives.length <= 2) return { available: 0, protection: t, readSpeed: 0, writeSpeed: 0, reliability: 0 };
  const sorted = [...drives].sort((a, b) => b.size - a.size);
  const available = sorted.slice(2).reduce((s, d) => s + d.size, 0);
  return {
    available,
    protection: t - available,
    readSpeed: r * Math.min(1.5, drives.length * 0.2),
    writeSpeed: w * 0.5,
    reliability: 85,
  };
}

// Unraid Parity 3 — 3 largest drives are parity; data drives keep full capacity
export function calcUnraidParity3(drives: Drive[]): RaidStats {
  const { r, w } = getBaseSpeeds(drives);
  const t = sumDrives(drives);
  if (drives.length <= 3) return { available: 0, protection: t, readSpeed: 0, writeSpeed: 0, reliability: 0 };
  const sorted = [...drives].sort((a, b) => b.size - a.size);
  const available = sorted.slice(3).reduce((s, d) => s + d.size, 0);
  return {
    available,
    protection: t - available,
    readSpeed: r * Math.min(1.5, drives.length * 0.2),
    writeSpeed: w * 0.35,
    reliability: 95,
  };
}

// SnapRAID — parity drives are the largest drives; data drives keep full capacity
export function calcSnapRaid(drives: Drive[], parityCount: number): RaidStats {
  const { r, w } = getBaseSpeeds(drives);
  const t = sumDrives(drives);
  if (drives.length <= parityCount) {
    return { available: 0, protection: t, readSpeed: 0, writeSpeed: 0, reliability: 0 };
  }
  const sorted = [...drives].sort((a, b) => b.size - a.size);
  const paritySize = sorted.slice(0, parityCount).reduce((s, d) => s + d.size, 0);
  const dataSize = sorted.slice(parityCount).reduce((s, d) => s + d.size, 0);
  return {
    available: dataSize,
    protection: paritySize,
    readSpeed: r * 0.95,
    writeSpeed: w * 0.9,
    reliability: Math.min(95, 50 + parityCount * 15),
  };
}

const DEFAULT_STATS: RaidStats = {
  available: 0,
  protection: 0,
  readSpeed: BASE_READ_HDD,
  writeSpeed: BASE_WRITE_HDD,
  reliability: 50,
};

// Map used for ZFS vdevs (ZFS types only)
export const VDEV_CALC_MAP: Record<string, (drives: Drive[]) => RaidStats> = {
  'Striped':  calcStriped,
  'Mirror':   calcMirror,
  'RAID-Z1':  calcSingleParity,
  'RAID-Z2':  calcDoubleParity,
  'RAID-Z3':  calcTripleParity,
};

// Map used for full config calculations (all file systems)
export const CONFIG_CALC_MAP: Record<string, (drives: Drive[]) => RaidStats> = {
  'RAID 0':   calcStriped,
  'Striped':  calcStriped,
  'RAID 1':   calcMirror,
  'Mirror':   calcMirror,
  'RAID 5':   calcSingleParity,
  'RAID-Z1':  calcSingleParity,
  'SHR':      calcSHR,
  'Parity 1': calcUnraidParity1,
  'RAID 6':   calcDoubleParity,
  'RAID-Z2':  calcDoubleParity,
  'SHR-2':    calcSHR2,
  'Parity 2': calcUnraidParity2,
  'RAID-Z3':  calcTripleParity,
  'Parity 3': calcUnraidParity3,
  'RAID 10':  calcRaid10,
};

export function calcVdevRaid(raidType: string, drives: Drive[]): RaidStats {
  const fn = VDEV_CALC_MAP[raidType];
  if (!fn) {
    const t = sumDrives(drives);
    return { ...DEFAULT_STATS, available: t / 2, protection: t / 2 };
  }
  return fn(drives);
}

export function calcConfigRaid(raidType: string, drives: Drive[]): RaidStats {
  const fn = CONFIG_CALC_MAP[raidType];
  if (!fn) {
    const t = sumDrives(drives);
    return { ...DEFAULT_STATS, available: t / 2, protection: t / 2 };
  }
  return fn(drives);
}
