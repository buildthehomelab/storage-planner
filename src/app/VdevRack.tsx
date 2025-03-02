"use client";

import React from 'react';

// Interface for drive objects
interface Drive {
  id: number;
  size: number;
}

// Fix the interface to clearly define the props
interface VdevRackProps {
  drives: Drive[];
  type: string;
  vdevIndex: number;
}

const VdevRack: React.FC<VdevRackProps> = ({ 
  drives, 
  type,
  vdevIndex 
}) => {
  // Calculate how many rows and columns we need
  const drivesPerRow = 4;
  const rows = Math.ceil(drives.length / drivesPerRow);
  
  return (
    <div className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-md">
      {/* Vdev header with type and indicator */}
      <div className="mb-2 flex justify-between items-center bg-gray-900 rounded-md p-2">
        <div className="text-gray-300 text-sm font-semibold">vdev {vdevIndex + 1}: {type}</div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">{drives.length} drives</span>
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        </div>
      </div>
      
      {/* Drive bay area */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-4 gap-2">
            {drives.slice(rowIndex * drivesPerRow, (rowIndex + 1) * drivesPerRow).map((drive) => (
              <div 
                key={drive.id}
                className="relative aspect-[3/1] rounded-sm overflow-hidden border border-gray-600
                          bg-gray-700 transition-all duration-300"
              >
                {/* Honeycomb pattern for the drive face */}
                <div className="absolute inset-0 opacity-30">
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <pattern id={`honeycomb-${drive.id}`} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="scale(0.5)">
                      <rect width="100%" height="100%" fill="none" />
                      <path d="M0,5 L2.5,0 L7.5,0 L10,5 L7.5,10 L2.5,10 Z" fill="currentColor" />
                    </pattern>
                    <rect width="100%" height="100%" fill={`url(#honeycomb-${drive.id})`} />
                  </svg>
                </div>
                
                {/* Drive content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="font-bold text-gray-200 text-sm bg-gray-800 bg-opacity-70 px-2 py-1 rounded">
                    {drive.size} TB
                  </div>
                </div>
                
                {/* Activity LED */}
                <div className="absolute right-1 top-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
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
