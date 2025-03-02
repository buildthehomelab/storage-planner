// A custom component to render the server rack with drive bays
"use client";

import React from 'react';

// Interface for drive objects
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
  maxSlots = 16 
}) => {
  // Calculate how many rows and columns we need
  const drivesPerRow = 4;
  const rows = Math.ceil(maxSlots / drivesPerRow);
  
  // Create an array of slot indexes
  const slots = Array.from({ length: maxSlots }, (_, i) => i);
  
  return (
    <div className="w-full bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg">
      {/* Server header with ports and indicators */}
      <div className="mb-4 flex justify-between items-center bg-gray-900 rounded-md p-2">
        <div className="flex space-x-2">
          {/* USB Ports */}
          <div className="w-6 h-10 bg-gray-700 rounded-sm flex flex-col justify-center items-center">
            <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
          </div>
          <div className="w-6 h-10 bg-gray-700 rounded-sm flex flex-col justify-center items-center">
            <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
          </div>
        </div>
        
        {/* Status LEDs */}
        <div className="flex space-x-3">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-gray-400">PWR</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-xs text-gray-400">NET</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-xs text-gray-400">HDD</span>
          </div>
        </div>
        
        {/* Server model/logo */}
        <div className="text-gray-400 text-sm font-mono">Storage Planner</div>
      </div>
      
      {/* Drive bay area */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-4 gap-2">
            {slots.slice(rowIndex * drivesPerRow, (rowIndex + 1) * drivesPerRow).map((slotIndex) => {
              const drive = drives.find((_, i) => i === slotIndex);
              
              return (
                <div 
                  key={slotIndex}
                  onClick={() => drive && onDriveClick(drive.id)}
                  className={`
                    relative aspect-[3/1] rounded-sm overflow-hidden border
                    ${drive ? 'cursor-pointer border-gray-600' : 'border-gray-700 border-dashed'}
                    transition-all duration-300 hover:shadow-md
                  `}
                >
                  {/* Drive bay background */}
                  <div className={`
                    absolute inset-0 
                    ${drive ? 'bg-gray-700' : 'bg-gray-800'}
                  `}>
                    {/* Honeycomb pattern for the drive face */}
                    {drive && (
                      <div className="absolute inset-0 opacity-30">
                        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                          <pattern id="honeycomb" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="scale(0.5)">
                            <rect width="100%" height="100%" fill="none" />
                            <path d="M0,5 L2.5,0 L7.5,0 L10,5 L7.5,10 L2.5,10 Z" fill="currentColor" />
                          </pattern>
                          <rect width="100%" height="100%" fill="url(#honeycomb)" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Drive content */}
                  {drive && (
                    <>
                      {/* Drive label */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="font-bold text-gray-200 text-sm bg-gray-800 bg-opacity-70 px-2 py-1 rounded">
                          {drive.size} TB
                        </div>
                      </div>
                      
                      {/* Activity LED */}
                      <div className="absolute right-1 top-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      </div>
                    </>
                  )}
                  
                  {/* Empty slot indicator */}
                  {!drive && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-40">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Server bottom with model info */}
      <div className="mt-4 flex justify-between items-center bg-gray-900 rounded-md p-2">
        <div className="text-xs text-gray-500">SRV-R2502</div>
        <div className="text-xs text-gray-500">4U Rack</div>
        <div className="flex space-x-2">
          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default ServerRack;
