import React from 'react';

export const SkeletonLoader: React.FC = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-64 bg-gray-300 rounded-t-2xl"></div>
    <div className="space-y-2 p-4">
      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      <div className="h-32 bg-gray-300 rounded"></div>
      <div className="h-8 bg-gray-300 rounded w-1/4"></div>
    </div>
  </div>
);