"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import ServerRack from './ServerRack';
import VdevRack from './VdevRack';

// Interface for drive objects
interface Drive {
  id: number;
  size: number;
}

// Interface for vdev objects
interface Vdev {
  id: number;
  type: string;
  drives: Drive[];
}

// Interface for a storage configuration
interface StorageConfig {
  id: number;
  fileSystem: string;
  raidType: string;
  selectedDrives: Drive[];
  vdevs: Vdev[];
}

// Component for the vdev manager
const VdevManagerDriveGrid = ({ drives }: { drives: Drive[] }) => {
  return (
    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md max-h-40 overflow-y-auto">
      {drives.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-2">No drives selected</p>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: Math.ceil(drives.length / 4) }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-4 gap-2">
              {drives.slice(rowIndex * 4, (rowIndex + 1) * 4).map(drive => (
                <div
                  key={drive.id}
                  className="relative aspect-[3/1] rounded-sm overflow-hidden border border-gray-600
                            bg-gray-700 transition-all duration-300"
                >
                  {/* Honeycomb pattern */}
                  <div className="absolute inset-0 opacity-30">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <pattern id={`honeycomb-vdev-${drive.id}`} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="scale(0.5)">
                        <rect width="100%" height="100%" fill="none" />
                        <path d="M0,5 L2.5,0 L7.5,0 L10,5 L7.5,10 L2.5,10 Z" fill="currentColor" />
                      </pattern>
                      <rect width="100%" height="100%" fill={`url(#honeycomb-vdev-${drive.id})`} />
                    </svg>
                  </div>

                  {/* Drive label */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="font-medium text-gray-200 text-xs bg-gray-800 bg-opacity-70 px-2 py-0.5 rounded">
                      {drive.size} TB
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RAIDCalculator = () => {
  const [driveSize, setDriveSize] = useState(20);
  const [showComparisonMode, setShowComparisonMode] = useState(false);
  const [activeConfigIndex, setActiveConfigIndex] = useState(0);
  const [maxSlots, setMaxSlots] = useState(16);

  // Initialize with two configurations
  const [configs, setConfigs] = useState<StorageConfig[]>([
    {
      id: 1,
      fileSystem: 'ZFS',
      raidType: 'RAID-Z2',
      selectedDrives: [],
      vdevs: []
    },
    {
      id: 2,
      fileSystem: 'Standard',
      raidType: 'RAID 10',
      selectedDrives: [],
      vdevs: []
    }
  ]);

  // Existing modal states
  const [showRaidInfo, setShowRaidInfo] = useState(false);
  const [showVdevManager, setShowVdevManager] = useState(false);
  const [showVdevInfo, setShowVdevInfo] = useState(false);
  const [showSnapraidInfo, setShowSnapraidInfo] = useState(false);
  const [currentVdevType, setCurrentVdevType] = useState('RAID-Z2');

  // Refs for modals
  const raidInfoRef = useRef<HTMLDivElement>(null);
  const vdevManagerRef = useRef<HTMLDivElement>(null);
  const vdevInfoRef = useRef<HTMLDivElement>(null);
  const snapraidInfoRef = useRef<HTMLDivElement>(null);

  // Available drive sizes in TB
  const driveSizes = [32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 3, 2, 1];

  // Raid type options based on file system
  const raidOptions = useMemo(() => ({
    'ZFS': ['RAID-Z1', 'RAID-Z2', 'RAID-Z3', 'Mirror', 'Striped'],
    'Unraid': ['Parity 1', 'Parity 2', 'Parity 3'],
    'Synology SHR': ['SHR', 'SHR-2'],
    'Synology BTRFS': ['RAID 0', 'RAID 1', 'RAID 5', 'RAID 6', 'RAID 10', 'SHR', 'SHR-2'],
    'SnapRAID': ['1 Parity', '2 Parity', '3 Parity', '4 Parity', '5 Parity', '6 Parity'],
    'Standard': ['RAID 0', 'RAID 1', 'RAID 5', 'RAID 6', 'RAID 10']
  }), []);

  // vdev type options for ZFS
  const vdevTypes = useMemo(() => [
    'RAID-Z1', 'RAID-Z2', 'RAID-Z3', 'Mirror', 'Striped'
  ], []);

  // Helper function to update a specific config
  const updateConfig = (configIndex: number, updates: Partial<StorageConfig>) => {
    setConfigs(prevConfigs => {
      const newConfigs = [...prevConfigs];
      newConfigs[configIndex] = { ...newConfigs[configIndex], ...updates };
      return newConfigs;
    });
  };

  // Update  when file system changes for a config
  useEffect(() => {
    configs.forEach((config, index) => {
      if (!raidOptions[config.fileSystem as keyof typeof raidOptions].includes(config.raidType)) {
        updateConfig(index, {
          raidType: raidOptions[config.fileSystem as keyof typeof raidOptions][0]
        });

        // Reset vdevs when changing away from ZFS
        if (config.fileSystem !== 'ZFS') {
          updateConfig(index, { vdevs: [] });
        }
      }
    });
  }, [configs, raidOptions]);

  // Close popup windows when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (raidInfoRef.current && !raidInfoRef.current.contains(event.target as Node)) {
        setShowRaidInfo(false);
      }
      if (vdevManagerRef.current && !vdevManagerRef.current.contains(event.target as Node)) {
        setShowVdevManager(false);
      }
      if (vdevInfoRef.current && !vdevInfoRef.current.contains(event.target as Node)) {
        setShowVdevInfo(false);
      }
      if (snapraidInfoRef.current && !snapraidInfoRef.current.contains(event.target as Node)) {
        setShowSnapraidInfo(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [raidInfoRef, vdevManagerRef, vdevInfoRef, snapraidInfoRef]);

  // Trim excess drives when maxSlots is reduced
  useEffect(() => {
    setConfigs(prevConfigs => {
      const newConfigs = prevConfigs.map(config => {
        if (config.selectedDrives.length > maxSlots) {
          const trimmedDrives = config.selectedDrives.slice(0, maxSlots);
          return { ...config, selectedDrives: trimmedDrives };
        }
        return config;
      });
      return newConfigs;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxSlots]);

  // Reset activeConfigIndex to 0 when exiting comparison mode
  useEffect(() => {
    if (!showComparisonMode) {
      setActiveConfigIndex(0);
    }
  }, [showComparisonMode]);

  // Add a drive to the active configuration
  const addDrive = (size: number) => {
    const activeConfig = configs[activeConfigIndex];
    if (activeConfig.selectedDrives.length < maxSlots) {
      const updatedDrives = [...activeConfig.selectedDrives, { id: Date.now(), size }];
      updateConfig(activeConfigIndex, { selectedDrives: updatedDrives });
    }
  };

  // Remove a drive from the active configuration
  const removeDrive = (id: number) => {
    const activeConfig = configs[activeConfigIndex];
    const updatedDrives = activeConfig.selectedDrives.filter(drive => drive.id !== id);
    updateConfig(activeConfigIndex, { selectedDrives: updatedDrives });
  };

  // Reset drives for the active configuration
  const resetDrives = () => {
    updateConfig(activeConfigIndex, {
      selectedDrives: [],
      vdevs: []
    });
  };

  // Reset all configurations
  const resetAllConfigs = () => {
    setConfigs(prevConfigs => prevConfigs.map(config => ({
      ...config,
      selectedDrives: [],
      vdevs: []
    })));
  };

  // Create a new vdev with selected drives for the active configuration
  const createVdev = () => {
    const activeConfig = configs[activeConfigIndex];
    if (activeConfig.selectedDrives.length === 0) return;

    const newVdev: Vdev = {
      id: Date.now(),
      type: currentVdevType,
      drives: [...activeConfig.selectedDrives]
    };

    const updatedVdevs = [...activeConfig.vdevs, newVdev];
    updateConfig(activeConfigIndex, {
      vdevs: updatedVdevs,
      selectedDrives: []
    });
    setShowVdevManager(false);
  };

  // Remove a vdev from the active configuration
  const removeVdev = (id: number) => {
    const activeConfig = configs[activeConfigIndex];
    // Return the drives back to the pool
    const vdevToRemove = activeConfig.vdevs.find(vdev => vdev.id === id);
    if (vdevToRemove) {
      const updatedDrives = [...activeConfig.selectedDrives, ...vdevToRemove.drives];
      const updatedVdevs = activeConfig.vdevs.filter(vdev => vdev.id !== id);
      updateConfig(activeConfigIndex, {
        selectedDrives: updatedDrives,
        vdevs: updatedVdevs
      });
    }
  };

  // Copy drives from one configuration to another
  const copyDrives = (fromIndex: number, toIndex: number) => {
    setConfigs(prevConfigs => {
      const sourceDrives = [...prevConfigs[fromIndex].selectedDrives];
      if (sourceDrives.length === 0) return prevConfigs;

      const targetConfig = prevConfigs[toIndex];
      const currentDriveCount = targetConfig.selectedDrives.length;
      const availableSlots = maxSlots - currentDriveCount;

      if (availableSlots <= 0) return prevConfigs; // No available slots

      // Only copy as many drives as can fit within maxSlots
      const drivesToCopy = sourceDrives.slice(0, availableSlots);

      // Create new drive objects with new IDs to avoid conflicts
      const newDrives = drivesToCopy.map(drive => ({
        id: Date.now() + Math.random(),
        size: drive.size
      }));

      const newConfigs = [...prevConfigs];
      newConfigs[toIndex] = {
        ...targetConfig,
        selectedDrives: [...targetConfig.selectedDrives, ...newDrives]
      };
      return newConfigs;
    });
  };

  // Calculate storage stats for a single vdev
  const calculateVdevStorage = (vdev: Vdev) => {
    if (vdev.drives.length === 0) return {
      total: 0,
      available: 0,
      protection: 0,
      formatted: 0,
      readSpeed: 0,
      writeSpeed: 0,
      reliability: 0
    };

    const totalRawStorage = vdev.drives.reduce((sum, drive) => sum + drive.size, 0);
    let available = 0;
    let protection = 0;
    let readSpeed = 0;
    let writeSpeed = 0;
    let reliability = 0;

    // Base single drive performance values (relative units)
    const baseDriveReadSpeed = 150; // MB/s
    const baseDriveWriteSpeed = 140; // MB/s

    switch (vdev.type) {
      case 'RAID 0':
      case 'Striped':
        available = totalRawStorage;
        protection = 0;
        // Read/write scales with number of drives in RAID 0
        readSpeed = baseDriveReadSpeed * vdev.drives.length * 0.9; // 90% efficiency
        writeSpeed = baseDriveWriteSpeed * vdev.drives.length * 0.9; // 90% efficiency
        reliability = 0; // No redundancy
        break;
      case 'RAID 1':
      case 'Mirror':
        // For mirrored configurations, available space is equal to the smallest drive's capacity
        available = vdev.drives.length > 0 ? Math.min(...vdev.drives.map(d => d.size)) : 0;
        protection = totalRawStorage - available;
        // Read can benefit from multiple drives, write is limited to single drive
        readSpeed = baseDriveReadSpeed * Math.min(vdev.drives.length, 2) * 0.9; // Read from multiple drives
        writeSpeed = baseDriveWriteSpeed * 0.95; // Slightly slower than single drive
        reliability = 90; // High reliability with full mirroring
        break;
      case 'RAID 5':
      case 'RAID-Z1':
      case 'Parity 1':
      case 'SHR':
        available = vdev.drives.length > 1 ? totalRawStorage - Math.max(...vdev.drives.map(d => d.size)) : 0;
        protection = totalRawStorage - available;
        // RAID 5 read is good, write has parity overhead
        readSpeed = baseDriveReadSpeed * (vdev.drives.length - 1) * 0.8;
        writeSpeed = baseDriveWriteSpeed * (vdev.drives.length - 1) * 0.7; // Parity calculation slows writes
        reliability = 70; // Can survive one drive failure
        break;
      case 'RAID 6':
      case 'RAID-Z2':
      case 'Parity 2':
      case 'SHR-2':
        available = vdev.drives.length > 2 ? totalRawStorage - (2 * Math.max(...vdev.drives.map(d => d.size))) : 0;
        protection = totalRawStorage - available;
        // RAID 6 read is good, write has double parity overhead
        readSpeed = baseDriveReadSpeed * (vdev.drives.length - 2) * 0.8;
        writeSpeed = baseDriveWriteSpeed * (vdev.drives.length - 2) * 0.6; // Double parity calculation slows writes
        reliability = 85; // Can survive two drive failures
        break;
      case 'RAID-Z3':
      case 'Parity 3':
        available = vdev.drives.length > 3 ? totalRawStorage - (3 * Math.max(...vdev.drives.map(d => d.size))) : 0;
        protection = totalRawStorage - available;
        // RAID Z3 read is good, write has triple parity overhead
        readSpeed = baseDriveReadSpeed * (vdev.drives.length - 3) * 0.8;
        writeSpeed = baseDriveWriteSpeed * (vdev.drives.length - 3) * 0.5; // Triple parity calculation slows writes
        reliability = 95; // Can survive three drive failures
        break;
      case 'RAID 10':
        available = totalRawStorage / 2;
        protection = totalRawStorage - available;
        // RAID 10 has excellent read/write performance
        readSpeed = baseDriveReadSpeed * (vdev.drives.length / 2) * 0.95;
        writeSpeed = baseDriveWriteSpeed * (vdev.drives.length / 2) * 0.9;
        reliability = 80; // Good reliability with mirroring
        break;
      default:
        available = totalRawStorage / 2;
        protection = totalRawStorage - available;
        readSpeed = baseDriveReadSpeed;
        writeSpeed = baseDriveWriteSpeed;
        reliability = 50;
    }

    return {
      total: totalRawStorage,
      available: Math.max(0, available),
      protection: Math.max(0, protection),
      formatted: 0, // This will be calculated later
      readSpeed: Math.max(0, Math.round(readSpeed)),
      writeSpeed: Math.max(0, Math.round(writeSpeed)),
      reliability: Math.max(0, Math.min(100, reliability))
    };
  };

  // Calculate storage stats for a configuration
  const calculateStorage = (config: StorageConfig) => {
    // If ZFS with vdevs, use vdev calculation
    if (config.fileSystem === 'ZFS' && config.vdevs.length > 0) {
      // Calculate stats for each vdev
      const vdevStats = config.vdevs.map(calculateVdevStorage);

      // In a ZFS pool with multiple vdevs, total available space is the sum
      const totalRawStorage = vdevStats.reduce((sum, stat) => sum + stat.total, 0);
      const available = vdevStats.reduce((sum, stat) => sum + stat.available, 0);
      const protection = vdevStats.reduce((sum, stat) => sum + stat.protection, 0);

      // Calculate read speed with diminishing returns
      let readSpeed = 0;
      if (vdevStats.length > 0) {
        const baseReadSpeed = vdevStats.reduce((sum, stat) => sum + stat.readSpeed, 0);
        const diminishingFactor = Math.max(0.7, 0.95 - (vdevStats.length * 0.03));
        readSpeed = baseReadSpeed * diminishingFactor;
      }

      // Calculate write speed with parallelism boost
      let writeSpeed = 0;
      if (vdevStats.length > 0) {
        const avgWriteSpeed = vdevStats.reduce((sum, stat) => sum + stat.writeSpeed, 0) / vdevStats.length;
        const parallelismBoost = Math.min(1.8, 0.9 + (vdevStats.length * 0.15));
        writeSpeed = avgWriteSpeed * parallelismBoost;
      }

      // Overall reliability is limited by the least reliable vdev
      const reliability = vdevStats.length > 0 ?
        Math.min(...vdevStats.map(stat => stat.reliability)) : 0;

      // Calculate formatted capacity based on file system overhead
      const overheadPercentage = 0.08; // ZFS typically has 5-10% overhead
      const formatted = Math.max(0, available) * (1 - overheadPercentage);

      return {
        total: totalRawStorage,
        available,
        protection,
        formatted,
        readSpeed: Math.max(0, Math.round(readSpeed)),
        writeSpeed: Math.max(0, Math.round(writeSpeed)),
        reliability
      };
    } else {
      // Standard calculation for non-ZFS or ZFS without vdevs
      if (config.selectedDrives.length === 0) return {
        total: 0,
        available: 0,
        protection: 0,
        formatted: 0,
        readSpeed: 0,
        writeSpeed: 0,
        reliability: 0
      };

      const totalRawStorage = config.selectedDrives.reduce((sum, drive) => sum + drive.size, 0);
      let available = 0;
      let protection = 0;
      let readSpeed = 0;
      let writeSpeed = 0;
      let reliability = 0;

      // Base single drive performance values (relative units)
      const baseDriveReadSpeed = 150; // MB/s
      const baseDriveWriteSpeed = 140; // MB/s

      // SnapRAID specific calculation
      if (config.fileSystem === 'SnapRAID') {
        const parityDrives = parseInt(config.raidType.split(' ')[0]);
        if (config.selectedDrives.length > parityDrives) {
          // Sort drives by size in descending order
          const sortedDrives = [...config.selectedDrives].sort((a, b) => b.size - a.size);

          // The largest drives are used for parity in SnapRAID
          const parityDrivesSize = sortedDrives.slice(0, parityDrives).reduce((sum, drive) => sum + drive.size, 0);
          const dataDrivesSize = sortedDrives.slice(parityDrives).reduce((sum, drive) => sum + drive.size, 0);

          available = dataDrivesSize;
          protection = parityDrivesSize;

          // SnapRAID performance characteristics
          readSpeed = baseDriveReadSpeed * 0.95;
          writeSpeed = baseDriveWriteSpeed * 0.9;
          reliability = Math.min(95, 50 + (parityDrives * 15)); // Up to 95% with sufficient parity drives
        } else {
          available = 0;
          protection = totalRawStorage;
          readSpeed = 0;
          writeSpeed = 0;
          reliability = 0;
        }
      } else {
        // Non-SnapRAID calculation
        switch (config.raidType) {
          case 'RAID 0':
          case 'Striped':
            available = totalRawStorage;
            protection = 0;
            readSpeed = baseDriveReadSpeed * config.selectedDrives.length * 0.9;
            writeSpeed = baseDriveWriteSpeed * config.selectedDrives.length * 0.9;
            reliability = 0;
            break;
          case 'RAID 1':
          case 'Mirror':
            available = config.selectedDrives.length > 0 ? Math.min(...config.selectedDrives.map(d => d.size)) : 0;
            protection = totalRawStorage - available;
            readSpeed = baseDriveReadSpeed * Math.min(config.selectedDrives.length, 2) * 0.9;
            writeSpeed = baseDriveWriteSpeed * 0.95;
            reliability = 90;
            break;
          case 'RAID 5':
          case 'RAID-Z1':
          case 'SHR':
          case '1 Parity':
            available = config.selectedDrives.length > 1 ? totalRawStorage - Math.max(...config.selectedDrives.map(d => d.size)) : 0;
            protection = totalRawStorage - available;
            readSpeed = baseDriveReadSpeed * (config.selectedDrives.length - 1) * 0.8;
            writeSpeed = baseDriveWriteSpeed * (config.selectedDrives.length - 1) * 0.7;
            reliability = 70;
            break;
          case 'RAID 6':
          case 'RAID-Z2':
          case 'SHR-2':
          case '2 Parity':
          case 'Parity 2':
            available = config.selectedDrives.length > 2 ? totalRawStorage - (2 * Math.max(...config.selectedDrives.map(d => d.size))) : 0;
            protection = totalRawStorage - available;
            readSpeed = baseDriveReadSpeed * (config.selectedDrives.length - 2) * 0.8;
            writeSpeed = baseDriveWriteSpeed * (config.selectedDrives.length - 2) * 0.6;
            reliability = 85;
            break;
          case 'Parity 1':
            available = config.selectedDrives.length > 1 ? totalRawStorage - Math.max(...config.selectedDrives.map(d => d.size)) : 0;
            protection = totalRawStorage - available;
            readSpeed = baseDriveReadSpeed * Math.min(1.5, config.selectedDrives.length * 0.2);
            writeSpeed = baseDriveWriteSpeed * 0.6;
            reliability = 70;
            break;
          case 'Parity 3':
          case 'RAID-Z3':
          case '3 Parity':
            available = config.selectedDrives.length > 3 ? totalRawStorage - (3 * Math.max(...config.selectedDrives.map(d => d.size))) : 0;
            protection = totalRawStorage - available;
            if (config.raidType === 'Parity 3') {
              readSpeed = baseDriveReadSpeed * Math.min(1.5, config.selectedDrives.length * 0.2);
              writeSpeed = baseDriveWriteSpeed * 0.35;
            } else {
              readSpeed = baseDriveReadSpeed * (config.selectedDrives.length - 3) * 0.8;
              writeSpeed = baseDriveWriteSpeed * (config.selectedDrives.length - 3) * 0.5;
            }
            reliability = 95;
            break;
          case '4 Parity':
            available = config.selectedDrives.length > 4 ? totalRawStorage - (4 * Math.max(...config.selectedDrives.map(d => d.size))) : 0;
            protection = totalRawStorage - available;
            readSpeed = baseDriveReadSpeed * (config.selectedDrives.length - 4) * 0.8;
            writeSpeed = baseDriveWriteSpeed * (config.selectedDrives.length - 4) * 0.4;
            reliability = 96;
            break;
          case '5 Parity':
            available = config.selectedDrives.length > 5 ? totalRawStorage - (5 * Math.max(...config.selectedDrives.map(d => d.size))) : 0;
            protection = totalRawStorage - available;
            readSpeed = baseDriveReadSpeed * (config.selectedDrives.length - 5) * 0.8;
            writeSpeed = baseDriveWriteSpeed * (config.selectedDrives.length - 5) * 0.35;
            reliability = 97;
            break;
          case '6 Parity':
            available = config.selectedDrives.length > 6 ? totalRawStorage - (6 * Math.max(...config.selectedDrives.map(d => d.size))) : 0;
            protection = totalRawStorage - available;
            readSpeed = baseDriveReadSpeed * (config.selectedDrives.length - 6) * 0.8;
            writeSpeed = baseDriveWriteSpeed * (config.selectedDrives.length - 6) * 0.3;
            reliability = 98;
            break;
          case 'RAID 10':
            available = totalRawStorage / 2;
            protection = totalRawStorage - available;
            readSpeed = baseDriveReadSpeed * (config.selectedDrives.length / 2) * 0.95;
            writeSpeed = baseDriveWriteSpeed * (config.selectedDrives.length / 2) * 0.9;
            reliability = 80;
            break;
          default:
            available = totalRawStorage / 2;
            protection = totalRawStorage - available;
            readSpeed = baseDriveReadSpeed;
            writeSpeed = baseDriveWriteSpeed;
            reliability = 50;
        }
      }

      // Calculate formatted capacity based on file system overhead
      const overheadPercentages: { [key: string]: number } = {
        'ZFS': 0.08,
        'Unraid': 0.03,
        'Synology SHR': 0.085,
        'Synology BTRFS': 0.12,
        'SnapRAID': 0.01,
        'Standard': 0.05
      };

      const overheadPercentage = overheadPercentages[config.fileSystem] || 0.05;
      const formatted = Math.max(0, available) * (1 - overheadPercentage);

      return {
        total: totalRawStorage,
        available: Math.max(0, available),
        protection: Math.max(0, protection),
        formatted: Math.max(0, formatted),
        readSpeed: Math.max(0, Math.round(readSpeed)),
        writeSpeed: Math.max(0, Math.round(writeSpeed)),
        reliability: Math.max(0, Math.min(100, reliability))
      };
    }
  };

  // Calculate stats for both configurations
  const configStats = configs.map(calculateStorage);

  // Compare the two configurations and determine which is better in each category
  const comparisonResult = useMemo(() => {
    if (!showComparisonMode) return null;

    const stats1 = configStats[0];
    const stats2 = configStats[1];

    return {
      capacity: {
        winner: stats1.formatted > stats2.formatted ? 0 : stats1.formatted < stats2.formatted ? 1 : null,
        difference: Math.abs(stats1.formatted - stats2.formatted).toFixed(1),
        percentDiff: stats1.formatted && stats2.formatted ?
          Math.abs(((stats1.formatted - stats2.formatted) / Math.min(stats1.formatted, stats2.formatted)) * 100).toFixed(1) : '0'
      },
      efficiency: {
        winner: (stats1.available / stats1.total) > (stats2.available / stats2.total) ? 0 :
          (stats1.available / stats1.total) < (stats2.available / stats2.total) ? 1 : null,
        difference: Math.abs((stats1.available / stats1.total) - (stats2.available / stats2.total)).toFixed(2),
        percentDiff: (stats1.available && stats2.available) ?
          Math.abs((((stats1.available / stats1.total) - (stats2.available / stats2.total)) /
            Math.min((stats1.available / stats1.total), (stats2.available / stats2.total))) * 100).toFixed(1) : '0'
      },
      readSpeed: {
        winner: stats1.readSpeed > stats2.readSpeed ? 0 : stats1.readSpeed < stats2.readSpeed ? 1 : null,
        difference: Math.abs(stats1.readSpeed - stats2.readSpeed),
        percentDiff: (stats1.readSpeed && stats2.readSpeed) ?
          Math.abs(((stats1.readSpeed - stats2.readSpeed) / Math.min(stats1.readSpeed, stats2.readSpeed)) * 100).toFixed(1) : '0'
      },
      writeSpeed: {
        winner: stats1.writeSpeed > stats2.writeSpeed ? 0 : stats1.writeSpeed < stats2.writeSpeed ? 1 : null,
        difference: Math.abs(stats1.writeSpeed - stats2.writeSpeed),
        percentDiff: (stats1.writeSpeed && stats2.writeSpeed) ?
          Math.abs(((stats1.writeSpeed - stats2.writeSpeed) / Math.min(stats1.writeSpeed, stats2.writeSpeed)) * 100).toFixed(1) : '0'
      },
      reliability: {
        winner: stats1.reliability > stats2.reliability ? 0 : stats1.reliability < stats2.reliability ? 1 : null,
        difference: Math.abs(stats1.reliability - stats2.reliability),
        percentDiff: (stats1.reliability && stats2.reliability) ?
          Math.abs(((stats1.reliability - stats2.reliability) / Math.min(stats1.reliability, stats2.reliability)) * 100).toFixed(1) : '0'
      }
    };
  }, [showComparisonMode, configStats]);

  // Get total number of drives (selected + in vdevs) for a config
  const getTotalDrivesCount = (config: StorageConfig) => {
    return config.selectedDrives.length + config.vdevs.reduce((sum, vdev) => sum + vdev.drives.length, 0);
  };

  // Render a storage configuration
  const renderStorageConfig = (config: StorageConfig, index: number, stats: any) => {
    return (
      <div className={`${showComparisonMode ? 'w-full' : ''}`}>
        {/* File System and RAID type selection in a single row */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File System</label>
            <select
              className="w-48 border border-gray-300 rounded-md px-3 py-2 text-gray-800 bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              value={config.fileSystem}
              onChange={(e) => updateConfig(index, { fileSystem: e.target.value })}
            >
              {Object.keys(raidOptions).map(fs => (
                <option key={fs} value={fs}>{fs}</option>
              ))}
            </select>
            {config.fileSystem === 'SnapRAID' && (
              <button
                className="ml-2 text-blue-600 hover:underline text-sm"
                onClick={() => setShowSnapraidInfo(true)}
              >
                What is SnapRAID?
              </button>
            )}
          </div>

          {/* RAID type selection - only show if not using ZFS with vdevs */}
          {!(config.fileSystem === 'ZFS' && config.vdevs.length > 0) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RAID types</label>
              <div className="flex items-center gap-2 relative">
                <select
                  className="w-48 border border-gray-300 rounded-md px-3 py-2 text-gray-800 bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                  value={config.raidType}
                  onChange={(e) => updateConfig(index, { raidType: e.target.value })}
                >
                  {raidOptions[config.fileSystem as keyof typeof raidOptions].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <div
                  className="bg-gray-800 text-gray-100 rounded-full w-6 h-6 flex items-center justify-center text-sm cursor-pointer"
                  onClick={() => setShowRaidInfo(!showRaidInfo)}
                >?</div>
              </div>
            </div>
          )}

          {/* Option to copy from other config */}
          {showComparisonMode && getTotalDrivesCount(configs[1 - index]) > 0 && (
            <button
              className="mt-6 py-1 px-3 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-sm"
              onClick={() => copyDrives(1 - index, index)}
            >
              Copy drives from {configs[1 - index].fileSystem}
            </button>
          )}
        </div>

        {/* Display vdevs if ZFS is selected */}
        {config.fileSystem === 'ZFS' && config.vdevs.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">
                ZFS Virtual Devices (vdevs)
              </h2>
              <button
                className="text-blue-600 hover:underline flex items-center"
                onClick={() => setShowVdevInfo(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                What are vdevs?
              </button>
            </div>

            <div className="space-y-4">
              {config.vdevs.map((vdev, vdevIndex) => {
                const vdevStats = calculateVdevStorage(vdev);
                return (
                  <div key={vdev.id} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-gray-800 dark:text-gray-200">
                        vdev {vdevIndex + 1}: {vdev.type} ({vdev.drives.length} drives)
                      </h3>
                      <button
                        className="text-red-600 hover:text-red-800"
                        onClick={() => {
                          setActiveConfigIndex(index);
                          removeVdev(vdev.id);
                        }}
                        title="Remove vdev"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Replace the grid of drives with VdevRack */}
                    <div className="mb-3">
                      <VdevRack
                        drives={vdev.drives}
                        type={vdev.type}
                        vdevIndex={vdevIndex}
                      />
                    </div>

                    {/* vdev stats */}
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Raw:</span> {vdevStats.total.toFixed(1)} TB
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Usable:</span> {vdevStats.available.toFixed(1)} TB
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Protection:</span> {vdevStats.protection.toFixed(1)} TB
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Simple bar graph for storage visualization */}
        {(config.selectedDrives.length > 0 || config.vdevs.length > 0) && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Storage Distribution</h3>

            <div className="mb-4">
              <div className="flex w-full rounded-md overflow-hidden h-8">
                {stats.available > 0 && (
                  <div
                    className="bg-green-400 flex items-center justify-center text-xs text-gray-800"
                    style={{ width: `${Math.max(1, (stats.available / stats.total) * 100)}%` }}
                  >
                    {stats.available.toFixed(1)} TB
                  </div>
                )}

                {stats.protection > 0 && (
                  <div
                    className="bg-blue-500 flex items-center justify-center text-xs text-gray-800"
                    style={{ width: `${Math.max(1, (stats.protection / stats.total) * 100)}%` }}
                  >
                    {stats.protection.toFixed(1)} TB
                  </div>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-800 dark:text-gray-200 mb-4">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-400"></div>
                <span>Available capacity</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-500"></div>
                <span>Protection</span>
              </div>
            </div>

            {/* Storage summary */}
            <div className="space-y-4">
              {/* Storage capacity metrics */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Storage Capacity</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Raw Storage</div>
                    <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{stats.total.toFixed(1)} TB</div>
                  </div>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Usable Storage</div>
                    <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{stats.available.toFixed(1)} TB</div>
                  </div>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Actual Storage</div>
                    <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{stats.formatted.toFixed(1)} TB</div>
                  </div>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Storage Efficiency</div>
                    <div className="text-xl font-bold text-gray-800 dark:text-gray-200">
                      {stats.total > 0 ? ((stats.available / stats.total) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance metrics */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Performance Metrics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Read Speed (estimated)</div>
                    <div className="flex items-end gap-2">
                      <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{stats.readSpeed}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">MB/s</div>
                    </div>
                    <div className="mt-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (stats.readSpeed / 1000) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Write Speed (estimated)</div>
                    <div className="flex items-end gap-2">
                      <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{stats.writeSpeed}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">MB/s</div>
                    </div>
                    <div className="mt-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (stats.writeSpeed / 1000) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Reliability</div>
                    <div className="flex items-end gap-2">
                      <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{stats.reliability}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">/100</div>
                    </div>
                    <div className="mt-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${stats.reliability > 80 ? 'bg-green-500' :
                          stats.reliability > 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                        style={{ width: `${stats.reliability}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-8">
      </div>

      {/* Step 1: Select drives */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200">Click on drives to get started</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Slots:</label>
            <input
              type="number"
              min="1"
              max="64"
              value={maxSlots}
              onChange={(e) => setMaxSlots(Math.max(1, Math.min(64, parseInt(e.target.value) || 16)))}
              className="w-20 border border-gray-300 rounded-md px-2 py-1 text-gray-800 bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 text-center"
            />
          </div>
        </div>

        {/* Drive size options */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-6">
          {driveSizes.map(size => (
            <button
              key={size}
              className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-center"
              onClick={() => addDrive(size)}
            >
              {size} TB
            </button>
          ))}
          <button
            className={`py-2 px-4 rounded ${showComparisonMode
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            onClick={() => setShowComparisonMode(!showComparisonMode)}
          >
            {showComparisonMode ? 'Exit Comparison' : 'Compare'}
          </button>
        </div>

        {!showComparisonMode ? (
          // Regular mode: Show one set of drives with ServerRack
          <>
            <ServerRack
              drives={configs[activeConfigIndex].selectedDrives}
              onDriveClick={(id) => {
                if (id) removeDrive(id);
              }}
              maxSlots={maxSlots}
            />

            <div className="flex justify-between mt-4">
              <div className="text-gray-800 dark:text-gray-200">
                Unassigned drives: {configs[activeConfigIndex].selectedDrives.length} /
                Total drives: {getTotalDrivesCount(configs[activeConfigIndex])}
              </div>
              <div className="flex gap-2">
                {configs[activeConfigIndex].fileSystem === 'ZFS' && (
                  <button
                    className="py-1 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded"
                    onClick={() => setShowVdevManager(true)}
                    disabled={configs[activeConfigIndex].selectedDrives.length === 0}
                  >
                    Create vdev
                  </button>
                )}
                <button
                  className="text-blue-600 hover:underline"
                  onClick={resetDrives}
                >
                  Reset
                </button>
              </div>
            </div>
          </>
        ) : (
          // Comparison mode: Show tabs and ServerRack
          <>
            {/* Configuration tabs */}
            <div className="flex mb-4">
              {configs.map((config, index) => (
                <button
                  key={config.id}
                  className={`py-2 px-4 border-t border-l border-r rounded-t ${activeConfigIndex === index
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  onClick={() => setActiveConfigIndex(index)}
                >
                  Config {index + 1}: {config.fileSystem} {config.raidType}
                </button>
              ))}
            </div>

            {/* Active configuration drives */}
            <ServerRack
              drives={configs[activeConfigIndex].selectedDrives}
              onDriveClick={(id) => {
                if (id) removeDrive(id);
              }}
              maxSlots={maxSlots}
            />

            <div className="flex justify-between mt-4">
              <div className="text-gray-800 dark:text-gray-200">
                Unassigned drives: {configs[activeConfigIndex].selectedDrives.length} /
                Total drives: {getTotalDrivesCount(configs[activeConfigIndex])}
              </div>
              <div className="flex gap-2">
                {configs[activeConfigIndex].fileSystem === 'ZFS' && (
                  <button
                    className="py-1 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded"
                    onClick={() => setShowVdevManager(true)}
                    disabled={configs[activeConfigIndex].selectedDrives.length === 0}
                  >
                    Create vdev
                  </button>
                )}
                <button
                  className="text-blue-600 hover:underline"
                  onClick={resetDrives}
                >
                  Reset Config
                </button>
                <button
                  className="text-red-600 hover:underline"
                  onClick={resetAllConfigs}
                >
                  Reset All
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Step 2: Configuration & results */}
      {!showComparisonMode ? (
        // Regular mode: Single configuration
        renderStorageConfig(configs[0], 0, configStats[0])
      ) : (
        // Comparison mode: Two configurations side by side
        <div>
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-4">Compare Configurations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {configs.map((config, index) => (
              <div key={config.id} className="border rounded-lg p-4">
                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-3">
                  Configuration {index + 1}: {config.fileSystem} {config.raidType}
                </h3>
                {renderStorageConfig(config, index, configStats[index])}
              </div>
            ))}
          </div>

          {/* Comparison results */}
          {comparisonResult && configStats[0].total > 0 && configStats[1].total > 0 && (
            <div className="mt-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Comparison Results</h3>

              <div className="space-y-4">
                {/* Capacity comparison */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div className="font-medium text-gray-700 dark:text-gray-300">Usable Capacity</div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded p-2 text-center">
                    {configStats[0].formatted.toFixed(1)} TB
                  </div>
                  <div className="flex items-center justify-center">
                    {comparisonResult.capacity.winner !== null ? (
                      <div className="text-center">
                        <div className={`text-lg font-bold ${comparisonResult.capacity.winner === 0 ? 'text-green-600' : 'text-blue-600'}`}>
                          {comparisonResult.capacity.difference} TB
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {comparisonResult.capacity.percentDiff}% difference
                        </div>
                        <div className="flex justify-center mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${comparisonResult.capacity.winner === 0 ? 'text-green-600 rotate-180' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400">Equal</div>
                    )}
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded p-2 text-center">
                    {configStats[1].formatted.toFixed(1)} TB
                  </div>
                  <div className="text-center text-sm">
                    {comparisonResult.capacity.winner === 0 ? (
                      <span className="text-green-600 font-medium">Config 1 has {comparisonResult.capacity.percentDiff}% more capacity</span>
                    ) : comparisonResult.capacity.winner === 1 ? (
                      <span className="text-blue-600 font-medium">Config 2 has {comparisonResult.capacity.percentDiff}% more capacity</span>
                    ) : (
                      <span className="text-gray-500">Same capacity</span>
                    )}
                  </div>
                </div>

                {/* Efficiency comparison */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div className="font-medium text-gray-700 dark:text-gray-300">Storage Efficiency</div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded p-2 text-center">
                    {configStats[0].total > 0 ? ((configStats[0].available / configStats[0].total) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="flex items-center justify-center">
                    {comparisonResult.efficiency.winner !== null ? (
                      <div className="text-center">
                        <div className={`text-lg font-bold ${comparisonResult.efficiency.winner === 0 ? 'text-green-600' : 'text-blue-600'}`}>
                          {(parseFloat(comparisonResult.efficiency.difference) * 100).toFixed(1)}%
                        </div>
                        <div className="flex justify-center mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${comparisonResult.efficiency.winner === 0 ? 'text-green-600 rotate-180' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400">Equal</div>
                    )}
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded p-2 text-center">
                    {configStats[1].total > 0 ? ((configStats[1].available / configStats[1].total) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-center text-sm">
                    {comparisonResult.efficiency.winner === 0 ? (
                      <span className="text-green-600 font-medium">Config 1 is more efficient</span>
                    ) : comparisonResult.efficiency.winner === 1 ? (
                      <span className="text-blue-600 font-medium">Config 2 is more efficient</span>
                    ) : (
                      <span className="text-gray-500">Same efficiency</span>
                    )}
                  </div>
                </div>

                {/* Read Speed comparison */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div className="font-medium text-gray-700 dark:text-gray-300">Read Speed</div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded p-2 text-center">
                    {configStats[0].readSpeed} MB/s
                  </div>
                  <div className="flex items-center justify-center">
                    {comparisonResult.readSpeed.winner !== null ? (
                      <div className="text-center">
                        <div className={`text-lg font-bold ${comparisonResult.readSpeed.winner === 0 ? 'text-green-600' : 'text-blue-600'}`}>
                          {comparisonResult.readSpeed.difference} MB/s
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {comparisonResult.readSpeed.percentDiff}% difference
                        </div>
                        <div className="flex justify-center mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${comparisonResult.readSpeed.winner === 0 ? 'text-green-600 rotate-180' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400">Equal</div>
                    )}
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded p-2 text-center">
                    {configStats[1].readSpeed} MB/s
                  </div>
                  <div className="text-center text-sm">
                    {comparisonResult.readSpeed.winner === 0 ? (
                      <span className="text-green-600 font-medium">Config 1 is {comparisonResult.readSpeed.percentDiff}% faster for reads</span>
                    ) : comparisonResult.readSpeed.winner === 1 ? (
                      <span className="text-blue-600 font-medium">Config 2 is {comparisonResult.readSpeed.percentDiff}% faster for reads</span>
                    ) : (
                      <span className="text-gray-500">Same read speed</span>
                    )}
                  </div>
                </div>

                {/* Write Speed comparison */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div className="font-medium text-gray-700 dark:text-gray-300">Write Speed</div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded p-2 text-center">
                    {configStats[0].writeSpeed} MB/s
                  </div>
                  <div className="flex items-center justify-center">
                    {comparisonResult.writeSpeed.winner !== null ? (
                      <div className="text-center">
                        <div className={`text-lg font-bold ${comparisonResult.writeSpeed.winner === 0 ? 'text-green-600' : 'text-blue-600'}`}>
                          {comparisonResult.writeSpeed.difference} MB/s
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {comparisonResult.writeSpeed.percentDiff}% difference
                        </div>
                        <div className="flex justify-center mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${comparisonResult.writeSpeed.winner === 0 ? 'text-green-600 rotate-180' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400">Equal</div>
                    )}
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded p-2 text-center">
                    {configStats[1].writeSpeed} MB/s
                  </div>
                  <div className="text-center text-sm">
                    {comparisonResult.writeSpeed.winner === 0 ? (
                      <span className="text-green-600 font-medium">Config 1 is {comparisonResult.writeSpeed.percentDiff}% faster for writes</span>
                    ) : comparisonResult.writeSpeed.winner === 1 ? (
                      <span className="text-blue-600 font-medium">Config 2 is {comparisonResult.writeSpeed.percentDiff}% faster for writes</span>
                    ) : (
                      <span className="text-gray-500">Same write speed</span>
                    )}
                  </div>
                </div>

                {/* Reliability comparison */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div className="font-medium text-gray-700 dark:text-gray-300">Reliability</div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded p-2 text-center">
                    {configStats[0].reliability}/100
                  </div>
                  <div className="flex items-center justify-center">
                    {comparisonResult.reliability.winner !== null ? (
                      <div className="text-center">
                        <div className={`text-lg font-bold ${comparisonResult.reliability.winner === 0 ? 'text-green-600' : 'text-blue-600'}`}>
                          {comparisonResult.reliability.difference} points
                        </div>
                        <div className="flex justify-center mt-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${comparisonResult.reliability.winner === 0 ? 'text-green-600 rotate-180' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400">Equal</div>
                    )}
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded p-2 text-center">
                    {configStats[1].reliability}/100
                  </div>
                  <div className="text-center text-sm">
                    {comparisonResult.reliability.winner === 0 ? (
                      <span className="text-green-600 font-medium">Config 1 is more reliable</span>
                    ) : comparisonResult.reliability.winner === 1 ? (
                      <span className="text-blue-600 font-medium">Config 2 is more reliable</span>
                    ) : (
                      <span className="text-gray-500">Same reliability</span>
                    )}
                  </div>
                </div>

                {/* Overall Recommendation */}
                <div className="mt-6 p-4 bg-gray-200 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Recommendation</h4>
                  {(() => {
                    // Count advantages for each configuration
                    let config1Advantages = 0;
                    let config2Advantages = 0;

                    if (comparisonResult.capacity.winner === 0) config1Advantages++;
                    if (comparisonResult.capacity.winner === 1) config2Advantages++;

                    if (comparisonResult.efficiency.winner === 0) config1Advantages++;
                    if (comparisonResult.efficiency.winner === 1) config2Advantages++;

                    if (comparisonResult.readSpeed.winner === 0) config1Advantages++;
                    if (comparisonResult.readSpeed.winner === 1) config2Advantages++;

                    if (comparisonResult.writeSpeed.winner === 0) config1Advantages++;
                    if (comparisonResult.writeSpeed.winner === 1) config2Advantages++;

                    if (comparisonResult.reliability.winner === 0) config1Advantages++;
                    if (comparisonResult.reliability.winner === 1) config2Advantages++;

                    if (config1Advantages > config2Advantages) {
                      return (
                        <div className="text-gray-800 dark:text-gray-200">
                          <strong className="text-green-600">Configuration 1 ({configs[0].fileSystem} {configs[0].raidType})</strong> is
                          recommended as it performs better in {config1Advantages} out of 5 metrics.
                          {configStats[0].reliability > 80 && configStats[0].reliability > configStats[1].reliability &&
                            " It offers superior reliability which is crucial for data protection."}
                          {configStats[0].formatted > configStats[1].formatted &&
                            ` It also provides ${(configStats[0].formatted - configStats[1].formatted).toFixed(1)} TB more usable storage.`}
                        </div>
                      );
                    } else if (config2Advantages > config1Advantages) {
                      return (
                        <div className="text-gray-800 dark:text-gray-200">
                          <strong className="text-blue-600">Configuration 2 ({configs[1].fileSystem} {configs[1].raidType})</strong> is
                          recommended as it performs better in {config2Advantages} out of 5 metrics.
                          {configStats[1].reliability > 80 && configStats[1].reliability > configStats[0].reliability &&
                            " It offers superior reliability which is crucial for data protection."}
                          {configStats[1].formatted > configStats[0].formatted &&
                            ` It also provides ${(configStats[1].formatted - configStats[0].formatted).toFixed(1)} TB more usable storage.`}
                        </div>
                      );
                    } else {
                      // Count tiebreakers
                      if (configStats[0].reliability > configStats[1].reliability) {
                        return (
                          <div className="text-gray-800 dark:text-gray-200">
                            Both configurations have equal advantages, but <strong className="text-green-600">Configuration 1</strong> is
                            slightly recommended due to better reliability which is crucial for data protection.
                          </div>
                        );
                      } else if (configStats[1].reliability > configStats[0].reliability) {
                        return (
                          <div className="text-gray-800 dark:text-gray-200">
                            Both configurations have equal advantages, but <strong className="text-blue-600">Configuration 2</strong> is
                            slightly recommended due to better reliability which is crucial for data protection.
                          </div>
                        );
                      } else if (configStats[0].formatted > configStats[1].formatted) {
                        return (
                          <div className="text-gray-800 dark:text-gray-200">
                            Both configurations have equal advantages, but <strong className="text-green-600">Configuration 1</strong> is
                            slightly recommended due to higher usable storage capacity.
                          </div>
                        );
                      } else if (configStats[1].formatted > configStats[0].formatted) {
                        return (
                          <div className="text-gray-800 dark:text-gray-200">
                            Both configurations have equal advantages, but <strong className="text-blue-600">Configuration 2</strong> is
                            slightly recommended due to higher usable storage capacity.
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-gray-800 dark:text-gray-200">
                            Both configurations are equally matched across all metrics. Choose based on your specific needs or preference.
                          </div>
                        );
                      }
                    }
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {/* VDev Manager with updated drive grid */}
      {showVdevManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            ref={vdevManagerRef}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Create vdev</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">vdev Type</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                value={currentVdevType}
                onChange={(e) => setCurrentVdevType(e.target.value)}
              >
                {vdevTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Selected Drives: {configs[activeConfigIndex].selectedDrives.length}
              </label>

              {/* Replace the grid with our new VdevManagerDriveGrid component */}
              <VdevManagerDriveGrid drives={configs[activeConfigIndex].selectedDrives} />
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              <p>Minimum drives needed:</p>
              <ul className="list-disc pl-5 mt-1">
                <li>RAID-Z1: 3 drives (1 drive redundancy)</li>
                <li>RAID-Z2: 4 drives (2 drive redundancy)</li>
                <li>RAID-Z3: 5 drives (3 drive redundancy)</li>
                <li>Mirror: 2 drives (1:1 mirroring)</li>
                <li>Striped: 2 drives (no redundancy)</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="py-2 px-4 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded"
                onClick={() => setShowVdevManager(false)}
              >
                Cancel
              </button>
              <button
                className={`py-2 px-4 bg-blue-600 text-white rounded ${configs[activeConfigIndex].selectedDrives.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                  }`}
                onClick={createVdev}
                disabled={configs[activeConfigIndex].selectedDrives.length === 0}
              >
                Create vdev
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Other modals would remain the same as in the original code */}
      {/* vdev Info modal */}
      {showVdevInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            ref={vdevInfoRef}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Understanding ZFS vdevs</h3>
              <button
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setShowVdevInfo(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* vdev info content - same as original */}
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                In ZFS, a virtual device (vdev) is a group of physical drives that acts as a single storage unit.
                Multiple vdevs are combined to create a ZFS pool, which serves as the overall storage system.
              </p>

              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">vdev Types</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>RAID-Z1 (Similar to RAID 5)</strong>: Requires minimum 3 drives, offers single drive redundancy.</li>
                <li><strong>RAID-Z2 (Similar to RAID 6)</strong>: Requires minimum 4 drives, offers two-drive redundancy.</li>
                <li><strong>RAID-Z3</strong>: Requires minimum 5 drives, offers three-drive redundancy.</li>
                <li><strong>Mirror (Similar to RAID 1)</strong>: Data is duplicated across all drives in the vdev.</li>
                <li><strong>Striped (Similar to RAID 0)</strong>: Data is striped across all drives with no redundancy.</li>
              </ul>

              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">ZFS Pool Architecture</h4>
              <p>
                A ZFS pool combines multiple vdevs in a RAID-0 (striped) arrangement. This means:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Total capacity is the sum of all vdev capacities</li>
                <li>Performance can scale with the number of vdevs</li>
                <li>If one entire vdev fails, the entire pool fails</li>
              </ul>

              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Common vdev Configurations</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Multiple RAID-Z2 vdevs</strong>: Good balance of performance, capacity, and redundancy</li>
                <li><strong>Multiple mirror vdevs</strong>: Best performance, but lower capacity efficiency</li>
                <li><strong>Mixed vdev types</strong>: Not recommended for production, but supported</li>
              </ul>

              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Best Practices</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>Use identical drives within each vdev for optimal performance</li>
                <li>Keep multiple vdevs balanced in size</li>
                <li>Use RAID-Z2 or mirror vdevs for important data</li>
                <li>Consider using hot spares for critical systems</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SnapRAID Info modal and RAID Info modal would remain the same */}
    </div>
  );
};

export default RAIDCalculator;