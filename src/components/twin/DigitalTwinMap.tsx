// Adapter for DigitalTwinMap: directs all consumers to RealRailwayMap (The Single Master Map)
import React from 'react';
import { RealRailwayMap } from './RealRailwayMap';

export const DigitalTwinMap: React.FC = () => {
  return <RealRailwayMap />;
};

export default DigitalTwinMap;
