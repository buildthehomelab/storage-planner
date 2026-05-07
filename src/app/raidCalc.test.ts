import { describe, it, expect } from 'vitest';
import {
  calcStriped,
  calcMirror,
  calcSingleParity,
  calcDoubleParity,
  calcTripleParity,
  calcRaid10,
  calcUnraidParity1,
  calcUnraidParity3,
  calcSnapRaid,
  calcVdevRaid,
  calcConfigRaid,
  type Drive,
} from './raidCalc';

// 6 identical 8TB drives — mirrors the primary browser test session
const drives6x8: Drive[] = Array.from({ length: 6 }, (_, i) => ({ id: i, size: 8 }));

// Helper: build N drives of a given size
const makeDrives = (count: number, size: number): Drive[] =>
  Array.from({ length: count }, (_, i) => ({ id: i, size }));

describe('calcStriped (RAID 0)', () => {
  it('uses all raw storage, no protection, reliability 0', () => {
    const r = calcStriped(drives6x8);
    expect(r.available).toBe(48);
    expect(r.protection).toBe(0);
    expect(r.reliability).toBe(0);
  });

  it('read/write scale linearly with drive count', () => {
    const r = calcStriped(drives6x8);
    expect(r.readSpeed).toBeCloseTo(150 * 6 * 0.9);
    expect(r.writeSpeed).toBeCloseTo(140 * 6 * 0.9);
  });
});

describe('calcMirror (RAID 1)', () => {
  it('available = smallest drive, high reliability', () => {
    const r = calcMirror(drives6x8);
    expect(r.available).toBe(8);
    expect(r.protection).toBe(40);
    expect(r.reliability).toBe(90);
  });

  it('read benefits from multiple drives (capped at 2x), write single-drive', () => {
    const r = calcMirror(drives6x8);
    expect(r.readSpeed).toBeCloseTo(150 * 2 * 0.9);
    expect(r.writeSpeed).toBeCloseTo(140 * 0.95);
  });

  it('mixed drive sizes — available = smallest', () => {
    const mixed: Drive[] = [{ id: 0, size: 4 }, { id: 1, size: 8 }, { id: 2, size: 12 }];
    expect(calcMirror(mixed).available).toBe(4);
  });
});

describe('calcSingleParity (RAID 5 / RAID-Z1 / SHR)', () => {
  // Browser-validated: 6×8TB RAID-Z1 → usable=40, efficiency=83.3%
  it('available = total minus largest drive', () => {
    const r = calcSingleParity(drives6x8);
    expect(r.available).toBe(40); // 48 - 8
    expect(r.protection).toBe(8);
    expect(r.reliability).toBe(70);
  });

  it('read/write use (n-1) drives', () => {
    const r = calcSingleParity(drives6x8);
    expect(r.readSpeed).toBeCloseTo(150 * 5 * 0.8);  // 600
    expect(r.writeSpeed).toBeCloseTo(140 * 5 * 0.7); // 490
  });

  it('returns 0 usable with only 1 drive', () => {
    expect(calcSingleParity(makeDrives(1, 8)).available).toBe(0);
  });
});

describe('calcDoubleParity (RAID 6 / RAID-Z2 / SHR-2)', () => {
  // Browser-validated: 6×8TB RAID-Z2 → usable=32, efficiency=66.7%
  it('available = total minus 2 × largest drive', () => {
    const r = calcDoubleParity(drives6x8);
    expect(r.available).toBe(32); // 48 - 16
    expect(r.protection).toBe(16);
    expect(r.reliability).toBe(85);
  });

  it('read/write use (n-2) drives', () => {
    const r = calcDoubleParity(drives6x8);
    expect(r.readSpeed).toBeCloseTo(150 * 4 * 0.8);  // 480
    expect(r.writeSpeed).toBeCloseTo(140 * 4 * 0.6); // 336
  });

  it('returns 0 usable with 2 or fewer drives', () => {
    expect(calcDoubleParity(makeDrives(2, 8)).available).toBe(0);
  });
});

describe('calcTripleParity (RAID-Z3)', () => {
  it('available = total minus 3 × largest drive', () => {
    const r = calcTripleParity(drives6x8);
    expect(r.available).toBe(24); // 48 - 24
    expect(r.protection).toBe(24);
    expect(r.reliability).toBe(95);
  });

  it('read/write use (n-3) drives', () => {
    const r = calcTripleParity(drives6x8);
    expect(r.readSpeed).toBeCloseTo(150 * 3 * 0.8);  // 360
    expect(r.writeSpeed).toBeCloseTo(140 * 3 * 0.5); // 210
  });

  it('returns 0 usable with 3 or fewer drives', () => {
    expect(calcTripleParity(makeDrives(3, 8)).available).toBe(0);
  });
});

describe('calcRaid10', () => {
  // Browser-validated: 6×8TB RAID 10 → usable=24, read=428, write=378, reliability=80
  it('available = total / 2', () => {
    const r = calcRaid10(drives6x8);
    expect(r.available).toBe(24);
    expect(r.protection).toBe(24);
    expect(r.reliability).toBe(80);
  });

  it('read/write use (n/2) drives', () => {
    const r = calcRaid10(drives6x8);
    expect(r.readSpeed).toBeCloseTo(150 * 3 * 0.95); // 427.5 → 428 rounded
    expect(r.writeSpeed).toBeCloseTo(140 * 3 * 0.9);  // 378
  });
});

describe('calcUnraidParity1', () => {
  it('same capacity as single-parity but different speeds', () => {
    const r = calcUnraidParity1(drives6x8);
    expect(r.available).toBe(40);
    expect(r.protection).toBe(8);
    expect(r.reliability).toBe(70);
    // Unraid uses fixed-ish speed profile
    expect(r.readSpeed).toBeCloseTo(150 * Math.min(1.5, 6 * 0.2));
    expect(r.writeSpeed).toBeCloseTo(140 * 0.6);
  });
});

describe('calcUnraidParity3', () => {
  it('same capacity as triple-parity but Unraid speeds', () => {
    const r = calcUnraidParity3(drives6x8);
    expect(r.available).toBe(24);
    expect(r.protection).toBe(24);
    expect(r.reliability).toBe(95);
    expect(r.readSpeed).toBeCloseTo(150 * Math.min(1.5, 6 * 0.2));
    expect(r.writeSpeed).toBeCloseTo(140 * 0.35);
  });
});

describe('calcSnapRaid', () => {
  // Browser-validated: 6×8TB, 1 Parity → available=40, protection=8, reliability=65
  it('1 parity: largest drive(s) are parity, data drives keep full size', () => {
    const r = calcSnapRaid(drives6x8, 1);
    expect(r.available).toBe(40);
    expect(r.protection).toBe(8);
    expect(r.reliability).toBe(65); // min(95, 50+1*15)
    expect(r.readSpeed).toBeCloseTo(150 * 0.95);
    expect(r.writeSpeed).toBeCloseTo(140 * 0.9);
  });

  it('2 parity: two largest drives used', () => {
    const r = calcSnapRaid(drives6x8, 2);
    expect(r.available).toBe(32);
    expect(r.protection).toBe(16);
    expect(r.reliability).toBe(80); // min(95, 50+2*15)
  });

  it('mixed sizes: largest drives become parity', () => {
    const mixed: Drive[] = [
      { id: 0, size: 12 }, { id: 1, size: 8 }, { id: 2, size: 4 },
      { id: 3, size: 4 }, { id: 4, size: 4 },
    ];
    const r = calcSnapRaid(mixed, 1);
    expect(r.available).toBe(20); // 8+4+4+4
    expect(r.protection).toBe(12);
  });

  it('not enough data drives returns 0 usable', () => {
    const r = calcSnapRaid(makeDrives(2, 8), 2);
    expect(r.available).toBe(0);
    expect(r.reliability).toBe(0);
  });

  it('reliability caps at 95', () => {
    expect(calcSnapRaid(makeDrives(10, 8), 6).reliability).toBe(95);
  });
});

describe('calcVdevRaid dispatcher', () => {
  it('routes ZFS types correctly', () => {
    expect(calcVdevRaid('Striped', drives6x8).available).toBe(48);
    expect(calcVdevRaid('Mirror', drives6x8).available).toBe(8);
    expect(calcVdevRaid('RAID-Z1', drives6x8).available).toBe(40);
    expect(calcVdevRaid('RAID-Z2', drives6x8).available).toBe(32);
    expect(calcVdevRaid('RAID-Z3', drives6x8).available).toBe(24);
  });

  it('unknown type falls back to total/2', () => {
    const r = calcVdevRaid('bogus', drives6x8);
    expect(r.available).toBe(24);
  });
});

describe('calcConfigRaid dispatcher', () => {
  it('routes standard RAID types correctly', () => {
    expect(calcConfigRaid('RAID 0', drives6x8).available).toBe(48);
    expect(calcConfigRaid('Striped', drives6x8).available).toBe(48);
    expect(calcConfigRaid('RAID 1', drives6x8).available).toBe(8);
    expect(calcConfigRaid('Mirror', drives6x8).available).toBe(8);
    expect(calcConfigRaid('RAID 5', drives6x8).available).toBe(40);
    expect(calcConfigRaid('RAID-Z1', drives6x8).available).toBe(40);
    expect(calcConfigRaid('SHR', drives6x8).available).toBe(40);
    expect(calcConfigRaid('RAID 6', drives6x8).available).toBe(32);
    expect(calcConfigRaid('RAID-Z2', drives6x8).available).toBe(32);
    expect(calcConfigRaid('SHR-2', drives6x8).available).toBe(32);
    expect(calcConfigRaid('Parity 2', drives6x8).available).toBe(32);
    expect(calcConfigRaid('RAID-Z3', drives6x8).available).toBe(24);
    expect(calcConfigRaid('RAID 10', drives6x8).available).toBe(24);
  });

  it('Parity 1 (Unraid) uses Unraid speed profile, not Z1 profile', () => {
    const unraid = calcConfigRaid('Parity 1', drives6x8);
    const z1 = calcConfigRaid('RAID-Z1', drives6x8);
    expect(unraid.available).toBe(z1.available); // same capacity
    expect(unraid.readSpeed).not.toBe(z1.readSpeed); // different perf model
  });

  it('Parity 3 (Unraid) uses Unraid speed profile, not Z3 profile', () => {
    const unraid = calcConfigRaid('Parity 3', drives6x8);
    const z3 = calcConfigRaid('RAID-Z3', drives6x8);
    expect(unraid.available).toBe(z3.available);
    expect(unraid.writeSpeed).not.toBe(z3.writeSpeed);
  });
});
