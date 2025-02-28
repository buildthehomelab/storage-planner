"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';

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

const RAIDCalculator = () => {
  const [driveSize, setDriveSize] = useState(20);
  const [selectedDrives, setSelectedDrives] = useState<Drive[]>([]);
  const [raidType, setRaidType] = useState('RAID 6');
  const [fileSystem, setFileSystem] = useState('ZFS');
  const [showRaidInfo, setShowRaidInfo] = useState(false);
  const [vdevs, setVdevs] = useState<Vdev[]>([]);
  const [showVdevManager, setShowVdevManager] = useState(false);
  const [currentVdevType, setCurrentVdevType] = useState('RAID-Z2');
  const [showVdevInfo, setShowVdevInfo] = useState(false);
  const [showSnapraidInfo, setShowSnapraidInfo] = useState(false);
  
  const raidInfoRef = useRef<HTMLDivElement>(null);
  const vdevManagerRef = useRef<HTMLDivElement>(null);
  const vdevInfoRef = useRef<HTMLDivElement>(null);
  const snapraidInfoRef = useRef<HTMLDivElement>(null);

  // Available drive sizes in TB
  const driveSizes = [20, 18, 16, 14, 12, 10, 8, 6, 4, 3, 2, 1];

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

  // Update RAID type when file system changes
  useEffect(() => {
    setRaidType(raidOptions[fileSystem as keyof typeof raidOptions][0]);
    
    // Reset vdevs when changing away from ZFS
    if (fileSystem !== 'ZFS') {
      setVdevs([]);
    }
  }, [fileSystem, raidOptions]);
  
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
  
  // Add a drive to the selection
  const addDrive = (size: number) => {
    if (selectedDrives.length < 16) {
      setSelectedDrives([...selectedDrives, { id: Date.now(), size }]);
    }
  };
  
  // Remove a drive from the selection
  const removeDrive = (id: number) => {
    setSelectedDrives(selectedDrives.filter(drive => drive.id !== id));
  };
  
  // Reset all drives
  const resetDrives = () => {
    setSelectedDrives([]);
    setVdevs([]);
  };
  
  // Create a new vdev with selected drives
  const createVdev = () => {
    if (selectedDrives.length === 0) return;
    
    const newVdev: Vdev = {
      id: Date.now(),
      type: currentVdevType,
      drives: [...selectedDrives]
    };
    
    setVdevs([...vdevs, newVdev]);
    setSelectedDrives([]);
    setShowVdevManager(false);
  };
  
  // Remove a vdev
  const removeVdev = (id: number) => {
    // Return the drives back to the pool
    const vdevToRemove = vdevs.find(vdev => vdev.id === id);
    if (vdevToRemove) {
      setSelectedDrives([...selectedDrives, ...vdevToRemove.drives]);
    }
    
    // Remove the vdev
    setVdevs(vdevs.filter(vdev => vdev.id !== id));
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
    
    switch(vdev.type) {
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
        // since data is duplicated across all drives
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
  
  // Calculate storage stats based on RAID type and selected drives
  const calculateStorage = () => {
    // If ZFS with vdevs, use vdev calculation
    if (fileSystem === 'ZFS' && vdevs.length > 0) {
      // Calculate stats for each vdev
      const vdevStats = vdevs.map(calculateVdevStorage);
      
      // In a ZFS pool with multiple vdevs, the total available space is the sum of 
      // the available space in each vdev (for striped vdevs, which is the default)
      const totalRawStorage = vdevStats.reduce((sum, stat) => sum + stat.total, 0);
      const available = vdevStats.reduce((sum, stat) => sum + stat.available, 0);
      const protection = vdevStats.reduce((sum, stat) => sum + stat.protection, 0);
      
      // ZFS pool read performance scales with multiple vdevs but with diminishing returns
      let readSpeed = 0;
        if (vdevStats.length > 0) {
        // Base calculation - sum of read speeds
        const baseReadSpeed = vdevStats.reduce((sum, stat) => sum + stat.readSpeed, 0);
        
        // Apply diminishing returns factor based on number of vdevs
        // Efficiency decreases as the number of vdevs increases
        const diminishingFactor = Math.max(0.6, 1 - (vdevStats.length * 0.05));
        readSpeed = baseReadSpeed * diminishingFactor;
      }

      // ZFS pool write performance is limited by the slowest vdev
      // With a small parallelism benefit as vdev count increases
      const writeSpeed = vdevStats.length > 0 ? 
        Math.min(...vdevStats.map(stat => stat.writeSpeed)) * 
        Math.min(1.0, 0.75 + (vdevStats.length * 0.03)) : 0;
      
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
      if (selectedDrives.length === 0) return { 
        total: 0, 
        available: 0, 
        protection: 0, 
        formatted: 0,
        readSpeed: 0,
        writeSpeed: 0,
        reliability: 0
      };
      
      const totalRawStorage = selectedDrives.reduce((sum, drive) => sum + drive.size, 0);
      let available = 0;
      let protection = 0;
      let readSpeed = 0;
      let writeSpeed = 0;
      let reliability = 0;
      
      // Base single drive performance values (relative units)
      const baseDriveReadSpeed = 150; // MB/s
      const baseDriveWriteSpeed = 140; // MB/s
      
      // SnapRAID specific calculation
      if (fileSystem === 'SnapRAID') {
        const parityDrives = parseInt(raidType.split(' ')[0]);
        if (selectedDrives.length > parityDrives) {
          // Sort drives by size in descending order
          const sortedDrives = [...selectedDrives].sort((a, b) => b.size - a.size);
          
          // The largest drives are used for parity in SnapRAID
          const parityDrivesSize = sortedDrives.slice(0, parityDrives).reduce((sum, drive) => sum + drive.size, 0);
          const dataDrivesSize = sortedDrives.slice(parityDrives).reduce((sum, drive) => sum + drive.size, 0);
          
          available = dataDrivesSize;
          protection = parityDrivesSize;
          
          // SnapRAID performance characteristics
          // For reads: near-raw performance as it's not striped
          readSpeed = baseDriveReadSpeed * 0.95;
          // For writes: near-raw performance for regular files, but slow for parity updates
          writeSpeed = baseDriveWriteSpeed * 0.9;
          
          // Reliability based on parity drives
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
        switch(raidType) {
          case 'RAID 0':
          case 'Striped':
            available = totalRawStorage;
            protection = 0;
            // Read/write scales with number of drives in RAID 0
            readSpeed = baseDriveReadSpeed * selectedDrives.length * 0.9; // 90% efficiency
            writeSpeed = baseDriveWriteSpeed * selectedDrives.length * 0.9; // 90% efficiency
            reliability = 0; // No redundancy
            break;
          case 'RAID 1':
          case 'Mirror':
            // For mirrored configurations, available space is equal to the smallest drive's capacity
            // since data is duplicated across all drives
            available = selectedDrives.length > 0 ? Math.min(...selectedDrives.map(d => d.size)) : 0;
            protection = totalRawStorage - available;
            // Read can benefit from multiple drives, write is limited to single drive
            readSpeed = baseDriveReadSpeed * Math.min(selectedDrives.length, 2) * 0.9; // Read from multiple drives
            writeSpeed = baseDriveWriteSpeed * 0.95; // Slightly slower than single drive
            reliability = 90; // High reliability with full mirroring
            break;
          case 'RAID 5':
          case 'RAID-Z1':
          case 'SHR':
          case '1 Parity':
            available = selectedDrives.length > 1 ? totalRawStorage - Math.max(...selectedDrives.map(d => d.size)) : 0;
            protection = totalRawStorage - available;
            // RAID 5 read is good, write has parity overhead
            readSpeed = baseDriveReadSpeed * (selectedDrives.length - 1) * 0.8;
            writeSpeed = baseDriveWriteSpeed * (selectedDrives.length - 1) * 0.7; // Parity calculation slows writes
            reliability = 70; // Can survive one drive failure
            break;
          case 'RAID 6':
          case 'RAID-Z2':
          case 'SHR-2':
          case '2 Parity':
          case 'Parity 2':
            available = selectedDrives.length > 2 ? totalRawStorage - (2 * Math.max(...selectedDrives.map(d => d.size))) : 0;
            protection = totalRawStorage - available;
            // RAID 6 read is good, write has double parity overhead
            readSpeed = baseDriveReadSpeed * (selectedDrives.length - 2) * 0.8;
            writeSpeed = baseDriveWriteSpeed * (selectedDrives.length - 2) * 0.6; // Double parity calculation slows writes
            reliability = 85; // Can survive two drive failures
            break;
          case 'Parity 1':
            available = selectedDrives.length > 1 ? totalRawStorage - Math.max(...selectedDrives.map(d => d.size)) : 0;
            protection = totalRawStorage - available;
            // Unraid read performance is limited since it's not striped
            readSpeed = baseDriveReadSpeed * Math.min(1.5, selectedDrives.length * 0.2);
            // Unraid write is slower due to parity calculation and non-striped nature
            writeSpeed = baseDriveWriteSpeed * 0.6;
            reliability = 70; // Can survive one drive failure
            break;
          case 'Parity 3':
          case 'RAID-Z3':
          case '3 Parity':
            available = selectedDrives.length > 3 ? totalRawStorage - (3 * Math.max(...selectedDrives.map(d => d.size))) : 0;
            protection = totalRawStorage - available;
            // For Unraid: read is still limited as it's not striped
            if (raidType === 'Parity 3') {
              readSpeed = baseDriveReadSpeed * Math.min(1.5, selectedDrives.length * 0.2);
              writeSpeed = baseDriveWriteSpeed * 0.35; // Very slow with triple parity
            } else {
              // For RAID-Z3: behavior similar to RAID6 but with more parity
              readSpeed = baseDriveReadSpeed * (selectedDrives.length - 3) * 0.8;
              writeSpeed = baseDriveWriteSpeed * (selectedDrives.length - 3) * 0.5;
            }
            reliability = 95; // Can survive three drive failures
            break;
          case '4 Parity':
            available = selectedDrives.length > 4 ? totalRawStorage - (4 * Math.max(...selectedDrives.map(d => d.size))) : 0;
            protection = totalRawStorage - available;
            readSpeed = baseDriveReadSpeed * (selectedDrives.length - 4) * 0.8;
            writeSpeed = baseDriveWriteSpeed * (selectedDrives.length - 4) * 0.4; // Slower with quadruple parity
            reliability = 96; // Can survive four drive failures
            break;
          case '5 Parity':
            available = selectedDrives.length > 5 ? totalRawStorage - (5 * Math.max(...selectedDrives.map(d => d.size))) : 0;
            protection = totalRawStorage - available;
            readSpeed = baseDriveReadSpeed * (selectedDrives.length - 5) * 0.8;
            writeSpeed = baseDriveWriteSpeed * (selectedDrives.length - 5) * 0.35; // Even slower with quintuple parity
            reliability = 97; // Can survive five drive failures
            break;
          case '6 Parity':
            available = selectedDrives.length > 6 ? totalRawStorage - (6 * Math.max(...selectedDrives.map(d => d.size))) : 0;
            protection = totalRawStorage - available;
            readSpeed = baseDriveReadSpeed * (selectedDrives.length - 6) * 0.8;
            writeSpeed = baseDriveWriteSpeed * (selectedDrives.length - 6) * 0.3; // Very slow with sextuple parity
            reliability = 98; // Can survive six drive failures
            break;
          case 'RAID 10':
            available = totalRawStorage / 2;
            protection = totalRawStorage - available;
            // RAID 10 has excellent read/write performance
            readSpeed = baseDriveReadSpeed * (selectedDrives.length / 2) * 0.95;
            writeSpeed = baseDriveWriteSpeed * (selectedDrives.length / 2) * 0.9;
            reliability = 80; // Good reliability with mirroring
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
        'ZFS': 0.08,  // ZFS typically has 5-10% overhead
        'Unraid': 0.03, // Unraid has minimal overhead around 2-3%
        'Synology SHR': 0.085, // Synology SHR uses ext4, around 8-9% overhead
        'Synology BTRFS': 0.12, // BTRFS has higher overhead due to COW features, around 10-15%
        'SnapRAID': 0.01, // SnapRAID has very minimal overhead, around 1%
        'Standard': 0.05  // Generic filesystems like ext4, NTFS around 5% overhead
      };
      
      const overheadPercentage = overheadPercentages[fileSystem] || 0.05;
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
  
  const stats = calculateStorage();
  
  // Get total number of drives (selected + in vdevs)
  const totalDrivesCount = selectedDrives.length + vdevs.reduce((sum, vdev) => sum + vdev.drives.length, 0);
  
  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-8">Storage Planner</h1>
      
      {/* Step 1: Select drives */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-4">Select drives</h2>
        
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
        </div>
        
        {/* Selected drives visualization */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {[...Array(16)].map((_, index) => {
              const drive = selectedDrives[index];
              return (
                <div 
                  key={index} 
                  className={`aspect-[3/4] rounded flex items-center justify-center text-center p-2 ${
                    drive ? 'bg-gray-600 cursor-pointer text-gray-100' : 'border-2 border-dashed border-gray-600 text-gray-400'
                  }`}
                  onClick={() => drive && removeDrive(drive.id)}
                >
                  {drive && (
                    <div>
                      <div className="font-medium">{drive.size} TB</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="flex justify-between mt-4">
          <div className="text-gray-800 dark:text-gray-200">
            Unassigned drives: {selectedDrives.length} / Total drives: {totalDrivesCount}
          </div>
          <div className="flex gap-2">
            {fileSystem === 'ZFS' && (
              <button 
                className="py-1 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded"
                onClick={() => setShowVdevManager(true)}
                disabled={selectedDrives.length === 0}
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
      </div>
      
      {/* Display vdevs if ZFS is selected */}
      {fileSystem === 'ZFS' && vdevs.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200">
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
            {vdevs.map((vdev, index) => {
              const vdevStats = calculateVdevStorage(vdev);
              return (
                <div key={vdev.id} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">
                      vdev {index + 1}: {vdev.type} ({vdev.drives.length} drives)
                    </h3>
                    <button 
                      className="text-red-600 hover:text-red-800"
                      onClick={() => removeVdev(vdev.id)}
                      title="Remove vdev"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* vdev drives */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 mb-3">
                    {vdev.drives.map(drive => (
                      <div 
                        key={drive.id} 
                        className="aspect-[3/4] bg-gray-600 rounded flex items-center justify-center text-center p-2 text-gray-100"
                      >
                        <div className="font-medium">{drive.size} TB</div>
                      </div>
                    ))}
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
      
      {/* Step 2: Usage estimate */}
      <div>
        {/* File System and RAID type selection in a single row */}
        <div className="flex flex-wrap items-center gap-8 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File System</label>
            <select 
              className="w-48 border border-gray-300 rounded-md px-3 py-2 text-gray-800 bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              value={fileSystem}
              onChange={(e) => setFileSystem(e.target.value)}
            >
              {Object.keys(raidOptions).map(fs => (
                <option key={fs} value={fs}>{fs}</option>
              ))}
            </select>
            {fileSystem === 'SnapRAID' && (
              <button 
                className="ml-2 text-blue-600 hover:underline text-sm"
                onClick={() => setShowSnapraidInfo(true)}
              >
                What is SnapRAID?
              </button>
            )}
          </div>
          
          {/* RAID type selection - only show if not using ZFS with vdevs */}
          {!(fileSystem === 'ZFS' && vdevs.length > 0) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RAID types</label>
              <div className="flex items-center gap-2 relative">
                <select 
                  className="w-48 border border-gray-300 rounded-md px-3 py-2 text-gray-800 bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                  value={raidType}
                  onChange={(e) => setRaidType(e.target.value)}
                >
                  {raidOptions[fileSystem as keyof typeof raidOptions].map(type => (
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
        </div>
        
        {/* Simple bar graph for storage visualization */}
        {(selectedDrives.length > 0 || vdevs.length > 0) && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Storage Distribution</h3>
            
            <div className="mb-4">
              <div className="flex w-full rounded-md overflow-hidden h-10">
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
            <div className="flex flex-wrap gap-6 text-sm text-gray-800 dark:text-gray-200">
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
            <div className="mt-4 space-y-6">
              {/* Storage capacity metrics */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Storage Capacity</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        className={`h-2 rounded-full ${
                          stats.reliability > 80 ? 'bg-green-500' : 
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
      
      {/* vdev Manager modal */}
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
                Selected Drives: {selectedDrives.length}
              </label>
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-md max-h-40 overflow-y-auto">
                {selectedDrives.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-2">No drives selected</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {selectedDrives.map(drive => (
                      <div 
                        key={drive.id} 
                        className="aspect-square bg-gray-600 rounded flex items-center justify-center text-center p-1 text-gray-100 text-sm"
                      >
                        {drive.size} TB
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                className={`py-2 px-4 bg-blue-600 text-white rounded ${
                  selectedDrives.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
                onClick={createVdev}
                disabled={selectedDrives.length === 0}
              >
                Create vdev
              </button>
            </div>
          </div>
        </div>
      )}
      
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
      
      {/* SnapRAID Info modal */}
      {showSnapraidInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            ref={snapraidInfoRef}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Understanding SnapRAID</h3>
              <button 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setShowSnapraidInfo(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
                              <p>
                SnapRAID is a software solution that provides data redundancy for home media servers and NAS systems. 
                Unlike traditional RAID, SnapRAID is designed for arrays that are primarily read-only with infrequent writes.
              </p>
              
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Key Features</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Parity Protection</strong>: Supports up to 6 parity drives for data protection.</li>
                <li><strong>Independent Drives</strong>: Each drive can use different filesystems and sizes.</li>
                <li><strong>Flexibility</strong>: Drives can be added or removed easily without rebuilding the array.</li>
                <li><strong>Data Scrubbing</strong>: Periodic verification to protect against bit rot and silent corruption.</li>
                <li><strong>File Snapshots</strong>: Keeps track of deleted files, providing a form of file history.</li>
              </ul>
              
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">How SnapRAID Works</h4>
              <p>
                SnapRAID calculates parity information across data drives and stores it on dedicated parity drives.
                This is done in a scheduled manner (not real-time), typically daily or weekly.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Data is protected only after a sync operation is completed</li>
                <li>The largest drive(s) are typically used for parity</li>
                <li>Each parity drive allows you to recover from one additional drive failure</li>
              </ul>
              
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Advantages</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Protection against disk failures</strong>: Can recover from multiple drive failures (depending on parity configuration)</li>
                <li><strong>Protection against file corruption</strong>: Due to checksum verification</li>
                <li><strong>Protection against accidental deletion</strong>: Through file snapshots</li>
                <li><strong>Ability to use disks of different sizes</strong>: Great for upgrading over time</li>
                <li><strong>Low CPU usage</strong>: Only during sync operations</li>
              </ul>
              
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Best Use Cases</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>Media collections (movies, music, photos)</li>
                <li>Backup storage</li>
                <li>Any data that changes infrequently</li>
                <li>Systems where individual drive access is desired</li>
              </ul>
              
              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Limitations</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>Not designed for frequently changing data</li>
                <li>No real-time protection (only after manual or scheduled sync)</li>
                <li>No data striping for performance improvement</li>
                <li>Not ideal for databases or virtual machines</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* RAID Info modal */}
      {showRaidInfo && (
        <div 
          ref={raidInfoRef}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="relative">
              <button 
                className="absolute top-0 right-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setShowRaidInfo(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 pr-8">RAID Types Explained</h3>
              
              <div className="space-y-6">
                {/* SHR */}
                <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">SHR (Synology Hybrid RAID)</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Minimum drives: 1 (2 for data protection)</p>
                  <p className="text-gray-700 dark:text-gray-300">1 drive redundancy and optimized storage pool size. Best used when combining drives of varying sizes.</p>
                </div>
                
                {/* SHR-2 */}
                <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">SHR-2 (Synology Hybrid RAID)</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Minimum drives: 4</p>
                  <p className="text-gray-700 dark:text-gray-300">2 drive redundancy and optimized storage pool size. Best used when combining drives of varying sizes.</p>
                </div>
                
                {/* RAID 0 */}
                <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">RAID 0</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Minimum drives: 2</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Pros: Faster data access, maximum capacity.</p>
                  <p className="text-gray-700 dark:text-gray-300">Cons: No drive redundancy, meaning increased risk of data loss. Not optimized for drives of varying sizes.</p>
                </div>
                
                {/* RAID 1 */}
                <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">RAID 1</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Minimum drives: 2</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Pros: Complete data redundancy, decent read performance.</p>
                  <p className="text-gray-700 dark:text-gray-300">Cons: Only 50% of total capacity is usable.</p>
                </div>
                
                {/* RAID 5 */}
                <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">RAID 5</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Minimum drives: 3</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Pros: Good balance of performance and redundancy, can survive one drive failure.</p>
                  <p className="text-gray-700 dark:text-gray-300">Cons: Capacity of one drive is used for parity information.</p>
                </div>
                
                {/* RAID 6 */}
                <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">RAID 6</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Minimum drives: 4</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Pros: Enhanced data protection, can survive two drive failures.</p>
                  <p className="text-gray-700 dark:text-gray-300">Cons: Capacity of two drives is used for parity information.</p>
                </div>
                
                {/* RAID 10 */}
                <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">RAID 10</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Minimum drives: 4</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Pros: Best performance and redundancy combination, can survive multiple drive failures.</p>
                  <p className="text-gray-700 dark:text-gray-300">Cons: Only 50% of total capacity is usable.</p>
                </div>
                
                {/* ZFS RAID-Z1 */}
                <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">RAID-Z1 (ZFS)</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Minimum drives: 3</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Pros: Similar to RAID 5 but with better data integrity, protection against data corruption.</p>
                  <p className="text-gray-700 dark:text-gray-300">Cons: Capacity of one drive is used for parity.</p>
                </div>
                
                {/* ZFS RAID-Z2 */}
                <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">RAID-Z2 (ZFS)</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Minimum drives: 4</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Pros: Similar to RAID 6 but with better data integrity, can survive two drive failures.</p>
                  <p className="text-gray-700 dark:text-gray-300">Cons: Capacity of two drives is used for parity.</p>
                </div>
                
                {/* ZFS RAID-Z3 */}
                <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">RAID-Z3 (ZFS)</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Minimum drives: 5</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Pros: Triple parity, can survive three drive failures.</p>
                  <p className="text-gray-700 dark:text-gray-300">Cons: Capacity of three drives is used for parity.</p>
                </div>
                
                {/* ZFS Mirror */}
                <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Mirror (ZFS)</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Minimum drives: 2</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Pros: Similar to RAID 1, provides full redundancy and excellent read performance.</p>
                  <p className="text-gray-700 dark:text-gray-300">Cons: Only 50% of total capacity is usable.</p>
                </div>
                
                {/* Synology BTRFS */}
                <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Synology BTRFS</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Synology&#39;s implementation of BTRFS offers several advantages:</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">• Snapshots: Point-in-time copies of data for easy recovery</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">• Self-healing: Automatic detection and repair of file corruption</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">• Quotas: Limit storage usage for shared folders</p>
                  <p className="text-gray-700 dark:text-gray-300">• Checksums: Data integrity verification to prevent silent data corruption</p>
                </div>
                
                {/* SnapRAID Parity */}
                <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">SnapRAID Parity</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">SnapRAID uses a parity-based protection system:</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">• 1 Parity: Single parity drive, protects against one drive failure.</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">• 2-6 Parity: Multiple parity drives for increased protection.</p>
                  <p className="text-gray-700 dark:text-gray-300">• Unlike traditional RAID, parity is calculated periodically, not in real-time.</p>
                </div>
                
                {/* UnRAID Parity */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Unraid Parity</h4>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Unraid uses a parity system that allows for varying drive sizes.</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Parity 1: Single parity drive, protects against one drive failure.</p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">Parity 2: Dual parity drives, protects against two drive failures.</p>
                  <p className="text-gray-700 dark:text-gray-300">Parity 3: Triple parity drives, protects against three drive failures.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RAIDCalculator;
