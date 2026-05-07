import { describe, it, expect } from 'vitest';
import {
  calcStriped,
  calcMirror,
  calcSingleParity,
  calcDoubleParity,
  calcTripleParity,
  calcSHR,
  calcSHR2,
  calcRaid10,
  calcUnraidParity1,
  calcUnraidParity2,
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

describe('calcSingleParity (RAID 5 / RAID-Z1)', () => {
  // Browser-validated: 6×8TB RAID-Z1 → usable=40, efficiency=83.3%
  it('equal drives: available = (N-1) × driveSize', () => {
    const r = calcSingleParity(drives6x8);
    expect(r.available).toBe(40); // 5 × 8
    expect(r.protection).toBe(8);
    expect(r.reliability).toBe(70);
  });

  it('read/write use (n-1) drives', () => {
    const r = calcSingleParity(drives6x8);
    expect(r.readSpeed).toBeCloseTo(150 * 5 * 0.8);  // 600
    expect(r.writeSpeed).toBeCloseTo(140 * 5 * 0.7); // 490
  });

  it('mixed drives: available = (N-1) × smallest drive', () => {
    // [8,8,8,8,4,4] — Synology-validated: available ≈ 20 TB decimal
    const mixed: Drive[] = [
      {id:0,size:8},{id:1,size:8},{id:2,size:8},{id:3,size:8},{id:4,size:4},{id:5,size:4}
    ];
    expect(calcSingleParity(mixed).available).toBe(20); // 5 × 4
  });

  it('returns 0 usable with only 1 drive', () => {
    expect(calcSingleParity(makeDrives(1, 8)).available).toBe(0);
  });
});

describe('calcDoubleParity (RAID 6 / RAID-Z2)', () => {
  // Browser-validated: 6×8TB RAID-Z2 → usable=32, efficiency=66.7%
  it('equal drives: available = (N-2) × driveSize', () => {
    const r = calcDoubleParity(drives6x8);
    expect(r.available).toBe(32); // 4 × 8
    expect(r.protection).toBe(16);
    expect(r.reliability).toBe(85);
  });

  it('read/write use (n-2) drives', () => {
    const r = calcDoubleParity(drives6x8);
    expect(r.readSpeed).toBeCloseTo(150 * 4 * 0.8);  // 480
    expect(r.writeSpeed).toBeCloseTo(140 * 4 * 0.6); // 336
  });

  it('mixed drives: available = (N-2) × smallest drive', () => {
    // [8,8,8,8,4,4] — Synology-validated: available ≈ 16 TB decimal
    const mixed: Drive[] = [
      {id:0,size:8},{id:1,size:8},{id:2,size:8},{id:3,size:8},{id:4,size:4},{id:5,size:4}
    ];
    expect(calcDoubleParity(mixed).available).toBe(16); // 4 × 4
  });

  it('returns 0 usable with 3 or fewer drives (minimum 4 for RAID 6/Z2)', () => {
    expect(calcDoubleParity(makeDrives(2, 8)).available).toBe(0);
    expect(calcDoubleParity(makeDrives(3, 8)).available).toBe(0);
  });
});

describe('calcTripleParity (RAID-Z3)', () => {
  it('equal drives: available = (N-3) × driveSize', () => {
    const r = calcTripleParity(drives6x8);
    expect(r.available).toBe(24); // 3 × 8
    expect(r.protection).toBe(24);
    expect(r.reliability).toBe(95);
  });

  it('read/write use (n-3) drives', () => {
    const r = calcTripleParity(drives6x8);
    expect(r.readSpeed).toBeCloseTo(150 * 3 * 0.8);  // 360
    expect(r.writeSpeed).toBeCloseTo(140 * 3 * 0.5); // 210
  });

  it('mixed drives: available = (N-3) × smallest drive', () => {
    const mixed: Drive[] = [
      {id:0,size:8},{id:1,size:8},{id:2,size:8},{id:3,size:4},{id:4,size:4},{id:5,size:4}
    ];
    expect(calcTripleParity(mixed).available).toBe(12); // 3 × 4
  });

  it('returns 0 usable with 4 or fewer drives (minimum 5 for RAID-Z3)', () => {
    expect(calcTripleParity(makeDrives(3, 8)).available).toBe(0);
    expect(calcTripleParity(makeDrives(4, 8)).available).toBe(0);
  });
});

describe('calcSHR (Synology Hybrid RAID single-parity)', () => {
  it('equal drives: same as RAID 5', () => {
    const r = calcSHR(drives6x8);
    expect(r.available).toBe(40); // t - max = 48 - 8
    expect(r.protection).toBe(8);
    expect(r.reliability).toBe(70);
  });

  it('mixed drives: available = total minus largest drive', () => {
    // [8,8,8,8,4,4] — Synology-validated: available ≈ 32 TB decimal
    const mixed: Drive[] = [
      {id:0,size:8},{id:1,size:8},{id:2,size:8},{id:3,size:8},{id:4,size:4},{id:5,size:4}
    ];
    expect(calcSHR(mixed).available).toBe(32); // 40 - 8
  });
});

describe('calcSHR2 (Synology Hybrid RAID dual-parity)', () => {
  it('equal drives: same as RAID 6', () => {
    const r = calcSHR2(drives6x8);
    expect(r.available).toBe(32); // t - 2*max = 48 - 16
    expect(r.protection).toBe(16);
    expect(r.reliability).toBe(85);
  });

  it('mixed drives: available = total minus 2 × largest drive', () => {
    // [8,8,8,8,4,4] — Synology-validated: available ≈ 24 TB decimal
    const mixed: Drive[] = [
      {id:0,size:8},{id:1,size:8},{id:2,size:8},{id:3,size:8},{id:4,size:4},{id:5,size:4}
    ];
    expect(calcSHR2(mixed).available).toBe(24); // 40 - 16
  });

  it('returns 0 usable with 3 or fewer drives', () => {
    expect(calcSHR2(makeDrives(3, 8)).available).toBe(0);
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

describe('calcUnraidParity2', () => {
  it('same capacity as double-parity for equal drives, Unraid speed profile', () => {
    const r = calcUnraidParity2(drives6x8);
    expect(r.available).toBe(32); // 4 data × 8 TB
    expect(r.protection).toBe(16);
    expect(r.reliability).toBe(85);
    expect(r.readSpeed).toBeCloseTo(150 * Math.min(1.5, 6 * 0.2));
    expect(r.writeSpeed).toBeCloseTo(140 * 0.5);
  });

  it('mixed sizes: 2 largest drives are parity', () => {
    const mixed: Drive[] = [
      { id: 0, size: 10 }, { id: 1, size: 8 }, { id: 2, size: 6 }, { id: 3, size: 4 },
    ];
    const r = calcUnraidParity2(mixed);
    expect(r.available).toBe(10); // 6+4
    expect(r.protection).toBe(18); // 10+8
  });

  it('returns 0 usable with 2 or fewer drives', () => {
    expect(calcUnraidParity2(makeDrives(2, 8)).available).toBe(0);
  });
});

describe('calcUnraidParity3', () => {
  it('same capacity as triple-parity for equal drives, Unraid speeds', () => {
    const r = calcUnraidParity3(drives6x8);
    expect(r.available).toBe(24); // 3 data × 8 TB
    expect(r.protection).toBe(24);
    expect(r.reliability).toBe(95);
    expect(r.readSpeed).toBeCloseTo(150 * Math.min(1.5, 6 * 0.2));
    expect(r.writeSpeed).toBeCloseTo(140 * 0.35);
  });

  it('mixed sizes: 3 largest drives are parity', () => {
    const mixed: Drive[] = [
      { id: 0, size: 10 }, { id: 1, size: 8 }, { id: 2, size: 6 }, { id: 3, size: 4 },
    ];
    const r = calcUnraidParity3(mixed);
    expect(r.available).toBe(4); // only 4 TB drive is data
    expect(r.protection).toBe(24); // 10+8+6
  });

  it('returns 0 usable with 3 or fewer drives', () => {
    expect(calcUnraidParity3(makeDrives(3, 8)).available).toBe(0);
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
    expect(calcConfigRaid('SHR', drives6x8).available).toBe(40);   // equal drives → same as RAID 5
    expect(calcConfigRaid('RAID 6', drives6x8).available).toBe(32);
    expect(calcConfigRaid('RAID-Z2', drives6x8).available).toBe(32);
    expect(calcConfigRaid('SHR-2', drives6x8).available).toBe(32); // equal drives → same as RAID 6
    expect(calcConfigRaid('Parity 2', drives6x8).available).toBe(32);
    expect(calcConfigRaid('RAID-Z3', drives6x8).available).toBe(24);
    expect(calcConfigRaid('RAID 10', drives6x8).available).toBe(24);
  });

  it('SHR and RAID 5 differ on mixed drives — Synology-validated', () => {
    const mixed: Drive[] = [
      {id:0,size:8},{id:1,size:8},{id:2,size:8},{id:3,size:8},{id:4,size:4},{id:5,size:4}
    ];
    expect(calcConfigRaid('SHR', mixed).available).toBe(32);   // t - max = 40 - 8
    expect(calcConfigRaid('RAID 5', mixed).available).toBe(20); // (N-1) × min = 5 × 4
  });

  it('SHR-2 and RAID 6 differ on mixed drives — Synology-validated', () => {
    const mixed: Drive[] = [
      {id:0,size:8},{id:1,size:8},{id:2,size:8},{id:3,size:8},{id:4,size:4},{id:5,size:4}
    ];
    expect(calcConfigRaid('SHR-2', mixed).available).toBe(24);  // t - 2*max = 40 - 16
    expect(calcConfigRaid('RAID 6', mixed).available).toBe(16); // (N-2) × min = 4 × 4
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
