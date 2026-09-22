import React, { useState } from 'react';
import {
  Radar,
  Flame,
  Plane,
  Activity,
  AlertTriangle,
  RefreshCw,
  Clock,
  MapPin,
  Globe,
  Compass,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair
} from 'lucide-react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';
import {
  SeismicEvent,
  WildfireEvent,
  AircraftTelemetry,
  ProactiveAlert,
} from '../types/jarvis';

interface SituationalRadarProps {
  seismic: SeismicEvent[];
  wildfire: WildfireEvent[];
  aircraft: AircraftTelemetry[];
  alerts: ProactiveAlert[];
  hysteresisStatus: {
    active_entries: number;
    suppression_window_sec: number;
  } | null;
  onInjectHazard: (type: 'seismic' | 'wildfire' | 'airspace', severity: number) => Promise<void>;
  onRefresh: () => void;
  loading: boolean;
}

// Malibu Command Post coordinates [lon, lat]
const MALIBU_SECTOR_COORDS: [number, number] = [-118.4085, 34.0195];

// Calculate Haversine distance in km between two [lon, lat] points
function calculateDistanceKm(coord1: [number, number], coord2: [number, number]): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const SituationalRadar: React.FC<SituationalRadarProps> = ({
  seismic,
  wildfire,
  aircraft,
  alerts,
  onInjectHazard,
  onRefresh,
  loading,
}) => {
  const [viewMode, setViewMode] = useState<'map' | 'radar' | 'split'>('map');
  const [selectedItem, setSelectedItem] = useState<{
    type: 'seismic' | 'wildfire' | 'aircraft' | 'command';
    data: any;
  } | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [injecting, setInjecting] = useState(false);

  // Map Navigation & Zoom state
  const [mapPosition, setMapPosition] = useState<{
    coordinates: [number, number];
    zoom: number;
  }>({
    coordinates: [-118.45, 34.15],
    zoom: 3.8,
  });

  // Layer Visibility
  const [layerFilter, setLayerFilter] = useState({
    seismic: true,
    wildfire: true,
    aircraft: true,
    labels: true,
  });

  const handleInject = async (type: 'seismic' | 'wildfire' | 'airspace', severity: number) => {
    setInjecting(true);
    try {
      await onInjectHazard(type, severity);
    } finally {
      setInjecting(false);
    }
  };

  const handleZoomIn = () => {
    setMapPosition((prev) => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.4, 12),
    }));
  };

  const handleZoomOut = () => {
    setMapPosition((prev) => ({
      ...prev,
      zoom: Math.max(prev.zoom / 1.4, 1),
    }));
  };

  const handleResetView = () => {
    setMapPosition({
      coordinates: [-118.45, 34.15],
      zoom: 3.8,
    });
  };

  const handlePresetSector = (preset: 'socal' | 'ca' | 'usa') => {
    if (preset === 'socal') {
      setMapPosition({ coordinates: [-118.45, 34.15], zoom: 3.8 });
    } else if (preset === 'ca') {
      setMapPosition({ coordinates: [-119.5, 36.5], zoom: 2.0 });
    } else if (preset === 'usa') {
      setMapPosition({ coordinates: [-96, 38], zoom: 1.0 });
    }
  };

  // Render the Geographic Map using react-simple-maps
  const renderGeographicMap = () => {
    return (
      <div className="relative w-full h-full min-h-[420px] bg-[#040813] rounded-lg overflow-hidden border border-cyan-900/60 flex flex-col">
        {/* Map Top HUD Controls */}
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Sector Coordinates Readout */}
          <div className="pointer-events-auto bg-slate-950/90 border border-cyan-800/80 rounded px-2.5 py-1.5 text-[11px] font-mono shadow-lg flex items-center gap-2 text-cyan-300">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              SECTOR: <strong>34.02°N, 118.41°W</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              ZOOM: <strong>{mapPosition.zoom.toFixed(1)}x</strong>
            </span>
          </div>

          {/* Quick Presets & Layer Toggles */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/90 border border-slate-800/80 rounded p-1 shadow-lg text-[10px]">
            <span className="text-slate-400 px-1 font-semibold hidden sm:inline">VIEW:</span>
            <button
              type="button"
              onClick={() => handlePresetSector('socal')}
              className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 hover:bg-cyan-900/80"
              title="Focus Southern California Tactical Sector"
            >
              SoCal
            </button>
            <button
              type="button"
              onClick={() => handlePresetSector('ca')}
              className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
              title="California State View"
            >
              West Coast
            </button>
            <button
              type="button"
              onClick={() => handlePresetSector('usa')}
              className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
              title="Continental US Overview"
            >
              CONUS
            </button>

            <span className="text-slate-700 mx-0.5">|</span>

            {/* Layer visibility buttons */}
            <button
              type="button"
              onClick={() => setLayerFilter((p) => ({ ...p, seismic: !p.seismic }))}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors ${
                layerFilter.seismic
                  ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                  : 'bg-slate-900 text-slate-500 opacity-60'
              }`}
              title="Toggle Seismic Events"
            >
              <Activity className="w-3 h-3" />
              <span>{seismic.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setLayerFilter((p) => ({ ...p, wildfire: !p.wildfire }))}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors ${
                layerFilter.wildfire
                  ? 'bg-orange-950 text-orange-300 border border-orange-700/60'
                  : 'bg-slate-900 text-slate-500 opacity-60'
              }`}
              title="Toggle Wildfires"
            >
              <Flame className="w-3 h-3" />
              <span>{wildfire.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setLayerFilter((p) => ({ ...p, aircraft: !p.aircraft }))}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors ${
                layerFilter.aircraft
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60'
                  : 'bg-slate-900 text-slate-500 opacity-60'
              }`}
              title="Toggle Airspace ADS-B"
            >
              <Plane className="w-3 h-3" />
              <span>{aircraft.length}</span>
            </button>
          </div>
        </div>

        {/* Map Zoom Controls (Right Side) */}
        <div className="absolute right-3 bottom-12 z-20 flex flex-col gap-1.5 bg-slate-950/90 border border-slate-800 p-1 rounded shadow-xl">
          <button
            type="button"
            id="map-zoom-in-btn"
            onClick={handleZoomIn}
            className="p-1.5 text-slate-300 hover:text-cyan-300 hover:bg-slate-900 rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            id="map-zoom-out-btn"
            onClick={handleZoomOut}
            className="p-1.5 text-slate-300 hover:text-cyan-300 hover:bg-slate-900 rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            id="map-reset-btn"
            onClick={handleResetView}
            className="p-1.5 text-slate-300 hover:text-cyan-300 hover:bg-slate-900 rounded"
            title="Reset to Malibu Command Sector"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Tactical Grid Background & Overlay Scanlines */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#0e2038_1px,transparent_1px)] [background-size:24px_24px] opacity-40 z-0" />

        {/* Main react-simple-maps Map */}
        <div className="w-full flex-1 relative z-10 cursor-grab active:cursor-grabbing">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 850,
            }}
            width={800}
            height={500}
            className="w-full h-full"
          >
            <ZoomableGroup
              zoom={mapPosition.zoom}
              center={mapPosition.coordinates}
              onMoveEnd={(pos) => {
                if (pos && pos.coordinates) {
                  setMapPosition({ coordinates: pos.coordinates, zoom: pos.zoom || 1 });
                }
              }}
              minZoom={0.8}
              maxZoom={15}
            >
              {/* Geographies Layer: US States TopoJSON from internal server endpoint */}
              <Geographies geography="/api/geo/us-states">
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#081020"
                      stroke="#163359"
                      strokeWidth={0.6 / (mapPosition.zoom * 0.5)}
                      className="hover:fill-[#0d1a33] hover:stroke-cyan-400 transition-colors duration-150 outline-none"
                    />
                  ))
                }
              </Geographies>

              {/* Range Ring Circles around Malibu Command Post */}
              <Marker coordinates={MALIBU_SECTOR_COORDS}>
                <circle
                  r={12}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth={0.8 / mapPosition.zoom}
                  strokeDasharray="2 2"
                  opacity={0.6}
                />
                <circle
                  r={28}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth={0.6 / mapPosition.zoom}
                  strokeDasharray="3 3"
                  opacity={0.4}
                />
                <circle
                  r={56}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth={0.5 / mapPosition.zoom}
                  strokeDasharray="4 4"
                  opacity={0.3}
                />
              </Marker>

              {/* JARVIS Malibu Command Sector Marker */}
              <Marker
                coordinates={MALIBU_SECTOR_COORDS}
                onClick={() =>
                  setSelectedItem({
                    type: 'command',
                    data: {
                      name: 'MALIBU ESTATE / SEC-01',
                      role: 'Primary Autonomous Command Post & Gate Node',
                      coordinates: MALIBU_SECTOR_COORDS,
                      status: 'Secured & Nominal',
                    },
                  })
                }
              >
                <g className="cursor-pointer">
                  {/* Outer pulse */}
                  <circle
                    r={7}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth={1.5 / mapPosition.zoom}
                    className="animate-ping"
                    opacity={0.7}
                  />
                  {/* Crosshair ring */}
                  <circle
                    r={5}
                    fill="#083344"
                    stroke="#06b6d4"
                    strokeWidth={1.2 / mapPosition.zoom}
                  />
                  {/* Center dot */}
                  <circle r={2} fill="#22d3ee" />
                  {/* Label */}
                  {layerFilter.labels && (
                    <text
                      textAnchor="middle"
                      y={-9}
                      className="font-mono font-bold fill-cyan-300 pointer-events-none select-none"
                      style={{ fontSize: `${Math.max(8 / mapPosition.zoom, 3.2)}px` }}
                    >
                      MALIBU BASE [SEC-01]
                    </text>
                  )}
                </g>
              </Marker>

              {/* 1. Geographically Plotted Active Seismic Events */}
              {layerFilter.seismic &&
                seismic.map((eq) => {
                  const isSevere = eq.severity >= 4.5;
                  const distKm = calculateDistanceKm(MALIBU_SECTOR_COORDS, eq.coordinates);

                  return (
                    <Marker
                      key={eq.event_id}
                      coordinates={eq.coordinates}
                      onClick={() =>
                        setSelectedItem({
                          type: 'seismic',
                          data: { ...eq, distance_from_malibu_km: distKm },
                        })
                      }
                      onMouseEnter={() => setHoveredItem(eq.event_id)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <g className="cursor-pointer">
                        {/* Radiating shockwave ring */}
                        <circle
                          r={isSevere ? 10 : 6}
                          fill="none"
                          stroke={isSevere ? '#f43f5e' : '#f59e0b'}
                          strokeWidth={1.2 / mapPosition.zoom}
                          className={isSevere ? 'animate-ping' : ''}
                          opacity={isSevere ? 0.8 : 0.5}
                        />
                        {/* Epicenter base */}
                        <circle
                          r={isSevere ? 4.5 : 3}
                          fill={isSevere ? '#881337' : '#78350f'}
                          stroke={isSevere ? '#fda4af' : '#fcd34d'}
                          strokeWidth={1 / mapPosition.zoom}
                        />
                        <circle r={1.5} fill={isSevere ? '#ffe4e6' : '#fef3c7'} />

                        {/* Text Magnitude Badge */}
                        {layerFilter.labels && (
                          <g transform={`translate(0, ${isSevere ? -8 : -6})`}>
                            <rect
                              x={-10}
                              y={-6}
                              width={20}
                              height={7}
                              rx={1.5}
                              fill="#090d16"
                              stroke={isSevere ? '#e11d48' : '#d97706'}
                              strokeWidth={0.5 / mapPosition.zoom}
                              opacity={0.9}
                            />
                            <text
                              textAnchor="middle"
                              y={-1}
                              className={`font-mono font-bold pointer-events-none select-none ${
                                isSevere ? 'fill-rose-300' : 'fill-amber-300'
                              }`}
                              style={{ fontSize: `${Math.max(6.5 / mapPosition.zoom, 2.8)}px` }}
                            >
                              M{eq.severity.toFixed(1)}
                            </text>
                          </g>
                        )}
                      </g>
                    </Marker>
                  );
                })}

              {/* 2. Geographically Plotted Active Wildfire Hotspots */}
              {layerFilter.wildfire &&
                wildfire.map((fire) => {
                  const distKm = calculateDistanceKm(MALIBU_SECTOR_COORDS, fire.coordinates);
                  const isHighFrp = fire.frp >= 50;

                  return (
                    <Marker
                      key={fire.event_id}
                      coordinates={fire.coordinates}
                      onClick={() =>
                        setSelectedItem({
                          type: 'wildfire',
                          data: { ...fire, distance_from_malibu_km: distKm },
                        })
                      }
                      onMouseEnter={() => setHoveredItem(fire.event_id)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <g className="cursor-pointer">
                        {/* Radiative Thermal Halo */}
                        <circle
                          r={isHighFrp ? 9 : 6}
                          fill="#ea580c"
                          fillOpacity={0.25}
                          stroke="#ea580c"
                          strokeWidth={1 / mapPosition.zoom}
                          className="animate-pulse"
                        />
                        {/* Thermal Core */}
                        <circle
                          r={isHighFrp ? 4 : 2.8}
                          fill="#c2410c"
                          stroke="#fdba74"
                          strokeWidth={0.9 / mapPosition.zoom}
                        />
                        <circle r={1.5} fill="#ffedd5" />

                        {/* FRP Value Pill */}
                        {layerFilter.labels && (
                          <g transform="translate(0, -7)">
                            <rect
                              x={-14}
                              y={-6}
                              width={28}
                              height={7}
                              rx={1.5}
                              fill="#090d16"
                              stroke="#ea580c"
                              strokeWidth={0.5 / mapPosition.zoom}
                              opacity={0.9}
                            />
                            <text
                              textAnchor="middle"
                              y={-1}
                              className="font-mono font-bold fill-orange-300 pointer-events-none select-none"
                              style={{ fontSize: `${Math.max(6 / mapPosition.zoom, 2.6)}px` }}
                            >
                              {fire.frp}MW
                            </text>
                          </g>
                        )}
                      </g>
                    </Marker>
                  );
                })}

              {/* 3. Geographically Plotted Aircraft ADS-B Vectors */}
              {layerFilter.aircraft &&
                aircraft.map((craft) => {
                  const isEmergency = craft.emergency || craft.squawk === '7700';
                  const distKm = calculateDistanceKm(MALIBU_SECTOR_COORDS, craft.coordinates);

                  return (
                    <Marker
                      key={craft.callsign}
                      coordinates={craft.coordinates}
                      onClick={() =>
                        setSelectedItem({
                          type: 'aircraft',
                          data: { ...craft, distance_from_malibu_km: distKm },
                        })
                      }
                      onMouseEnter={() => setHoveredItem(craft.callsign)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <g
                        className="cursor-pointer"
                        transform={`rotate(${craft.heading_deg || 0})`}
                      >
                        {/* Directional Aircraft Triangle */}
                        <polygon
                          points="0,-4 3,3 0,1.5 -3,3"
                          fill={isEmergency ? '#ef4444' : '#38bdf8'}
                          stroke={isEmergency ? '#fee2e2' : '#bae6fd'}
                          strokeWidth={0.6 / mapPosition.zoom}
                        />
                      </g>

                      {/* Callsign Tag */}
                      {layerFilter.labels && (
                        <g transform="translate(0, 5)">
                          <text
                            textAnchor="middle"
                            className={`font-mono font-bold pointer-events-none select-none ${
                              isEmergency ? 'fill-rose-300 animate-pulse' : 'fill-sky-300'
                            }`}
                            style={{ fontSize: `${Math.max(5.5 / mapPosition.zoom, 2.4)}px` }}
                          >
                            {craft.callsign} {isEmergency ? '⚠ 7700' : ''}
                          </text>
                        </g>
                      )}
                    </Marker>
                  );
                })}
            </ZoomableGroup>
          </ComposableMap>
        </div>

        {/* Map Bottom Legend / Ticker */}
        <div className="bg-[#060a14] border-t border-slate-800/80 px-4 py-2 text-[10px] flex flex-wrap items-center justify-between gap-3 text-slate-400 z-20">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1 text-cyan-300 font-semibold">
              <Crosshair className="w-3 h-3 text-cyan-400" />
              <span>MALIBU COMMAND</span>
            </span>

            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <span>SEISMIC (&ge; M4.5 Red / &lt; M4.5 Amber)</span>
            </span>

            <span className="flex items-center gap-1.5 text-orange-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <span>NASA FIRMS THERMAL HOTSPOTS (MW)</span>
            </span>

            <span className="flex items-center gap-1.5 text-sky-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              <span>ADS-B AIRSPACE VECTORS</span>
            </span>
          </div>

          <div className="text-slate-500 hidden md:block">
            GEODETIC: WGS-84 &bull; MERCATOR PROJECTION &bull; TOPOLOGY: US-ATLAS
          </div>
        </div>
      </div>
    );
  };

  // Render the Polar Sweep Radar (concentric ring radar)
  const renderPolarRadar = () => {
    return (
      <div className="border border-cyan-900/60 bg-[#060a12] rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[420px]">
        {/* Radar Background Circles & Crosshairs */}
        <div className="relative w-80 h-80 rounded-full border border-cyan-800/40 flex items-center justify-center">
          {/* Concentric Range Rings */}
          <div className="absolute w-60 h-60 rounded-full border border-cyan-800/30" />
          <div className="absolute w-40 h-40 rounded-full border border-cyan-800/20" />
          <div className="absolute w-20 h-20 rounded-full border border-cyan-700/30" />
          {/* Crosshairs */}
          <div className="absolute w-full h-[1px] bg-cyan-900/40" />
          <div className="absolute h-full w-[1px] bg-cyan-900/40" />

          {/* Sweep Line Animation */}
          <div className="absolute w-1/2 h-[1px] bg-gradient-to-r from-transparent to-cyan-400 origin-left top-1/2 left-1/2 animate-[spin_4s_linear_infinite]" />

          {/* Center Anchor (Malibu Estate Sector) */}
          <div className="relative z-10 w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee] flex items-center justify-center cursor-pointer">
            <span className="text-[8px] font-bold text-black">M</span>
          </div>

          {/* Seismic Blips on Radar */}
          {seismic.map((eq, idx) => {
            const top = 35 + ((idx * 28) % 60);
            const left = 25 + ((idx * 35) % 65);
            const isHazard = eq.severity >= 4.5;

            return (
              <div
                key={eq.event_id}
                onClick={() => setSelectedItem({ type: 'seismic', data: eq })}
                style={{ top: `${top}%`, left: `${left}%` }}
                className={`absolute z-20 cursor-pointer p-1 rounded-full -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125 ${
                  isHazard ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                }`}
                title={`Seismic M${eq.severity} - ${eq.place}`}
              >
                <Activity className="w-4 h-4" />
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-black/80 px-1 rounded whitespace-nowrap">
                  M{eq.severity}
                </span>
              </div>
            );
          })}

          {/* Wildfire Blips on Radar */}
          {wildfire.map((fire, idx) => {
            const top = 20 + ((idx * 40) % 70);
            const left = 60 + ((idx * 20) % 35);

            return (
              <div
                key={fire.event_id}
                onClick={() => setSelectedItem({ type: 'wildfire', data: fire })}
                style={{ top: `${top}%`, left: `${left}%` }}
                className="absolute z-20 cursor-pointer text-orange-400 -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform"
                title={`Wildfire Hotspot ${fire.frp}MW - ${fire.place}`}
              >
                <Flame className="w-4 h-4" />
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-black/80 px-1 rounded whitespace-nowrap text-orange-300">
                  {fire.frp}MW
                </span>
              </div>
            );
          })}

          {/* Aircraft ADS-B Vectors on Radar */}
          {aircraft.map((craft, idx) => {
            const top = 70 - ((idx * 30) % 55);
            const left = 30 + ((idx * 25) % 60);

            return (
              <div
                key={craft.callsign}
                onClick={() => setSelectedItem({ type: 'aircraft', data: craft })}
                style={{ top: `${top}%`, left: `${left}%` }}
                className={`absolute z-20 cursor-pointer -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform ${
                  craft.emergency ? 'text-rose-400 animate-bounce' : 'text-cyan-300'
                }`}
                title={`Aircraft ${craft.callsign} - Squawk ${craft.squawk}`}
              >
                <Plane className="w-4 h-4" style={{ transform: `rotate(${craft.heading_deg}deg)` }} />
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-black/80 px-1 rounded whitespace-nowrap">
                  {craft.callsign}
                </span>
              </div>
            );
          })}
        </div>

        {/* Compass & Range Legend */}
        <div className="w-full flex items-center justify-between text-[10px] text-slate-500 mt-4 px-2">
          <span>SECTOR: 34.0195°N / 118.4085°W [MALIBU]</span>
          <span>RINGS: 10km / 25km / 50km / 100km</span>
          <span>POLAR SWEEP: 360° AUTO</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="border border-cyan-900/60 bg-[#090e18] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radar className="w-5 h-5 text-cyan-400" />
            <h2 className="font-['Rajdhani'] font-bold text-lg text-slate-100 tracking-wider">
              INCIDENT INTELLIGENCE & SITUATIONAL SENSOR FUSION
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-600/60 text-cyan-300">
              REACT-SIMPLE-MAPS &bull; USGS / NASA FIRMS / ADS-B
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Geospatial cartographic plotting of real-time seismic epicenters, wildfire radiative clusters, and airspace telemetry with 1-hour hysteresis dampening.
          </p>
        </div>

        {/* Action Controls & Hazard Injections */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5 mr-2">
            <button
              type="button"
              id="view-mode-map-btn"
              onClick={() => setViewMode('map')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'map'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>GEOMAP</span>
            </button>
            <button
              type="button"
              id="view-mode-radar-btn"
              onClick={() => setViewMode('radar')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'radar'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radar className="w-3.5 h-3.5" />
              <span>RADAR</span>
            </button>
            <button
              type="button"
              id="view-mode-split-btn"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'split'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>DUAL HUD</span>
            </button>
          </div>

          <button
            type="button"
            id="inject-seismic-btn"
            onClick={() => handleInject('seismic', 5.3)}
            disabled={injecting}
            className="px-2.5 py-1.5 rounded text-xs font-semibold bg-rose-950/70 hover:bg-rose-900 border border-rose-700/60 text-rose-300 flex items-center gap-1.5 transition-colors shadow-[0_0_8px_rgba(244,63,94,0.15)]"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>+ M5.3 SEISMIC</span>
          </button>

          <button
            type="button"
            id="inject-wildfire-btn"
            onClick={() => handleInject('wildfire', 85.4)}
            disabled={injecting}
            className="px-2.5 py-1.5 rounded text-xs font-semibold bg-orange-950/70 hover:bg-orange-900 border border-orange-700/60 text-orange-300 flex items-center gap-1.5 transition-colors shadow-[0_0_8px_rgba(234,88,12,0.15)]"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>+ 85MW WILDFIRE</span>
          </button>

          <button
            type="button"
            id="inject-airspace-btn"
            onClick={() => handleInject('airspace', 7700)}
            disabled={injecting}
            className="px-2.5 py-1.5 rounded text-xs font-semibold bg-amber-950/70 hover:bg-amber-900 border border-amber-700/60 text-amber-300 flex items-center gap-1.5 transition-colors"
          >
            <Plane className="w-3.5 h-3.5" />
            <span>+ SQUAWK 7700</span>
          </button>

          <button
            type="button"
            id="refresh-intel-btn"
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded text-xs border border-slate-700 bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            title="Refresh Sensor Feeds"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tactical Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Visualizer Area (Geospatial Map, Polar Radar, or Split) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {viewMode === 'map' && renderGeographicMap()}
          {viewMode === 'radar' && renderPolarRadar()}
          {viewMode === 'split' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderGeographicMap()}
              {renderPolarRadar()}
            </div>
          )}
        </div>

        {/* Telemetry Feeds & Target Details Panel */}
        <div className="lg:col-span-4 space-y-3">
          {/* Active Proactive Alerts Box */}
          <div className="border border-rose-900/60 bg-[#0d0912] rounded-lg p-3">
            <div className="flex items-center justify-between border-b border-rose-950 pb-2 mb-2">
              <div className="flex items-center gap-1.5 text-rose-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>THRESHOLD ALERTS & HYSTERESIS</span>
              </div>
              <span className="text-[10px] text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                1-Hr Window
              </span>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500">
                Zero active threshold alerts. Situational cache nominal.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    className="p-2 rounded bg-rose-950/30 border border-rose-900/50 text-[11px]"
                  >
                    <div className="font-bold text-rose-300 flex items-center justify-between">
                      <span>{al.title}</span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(al.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-slate-300 mt-0.5">{al.message}</div>
                    {al.suppressed_duplicates > 0 && (
                      <div className="text-[9px] text-cyan-300 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>Hysteresis Active: {al.suppressed_duplicates} redundant updates suppressed</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Item Geodetic Inspector */}
          {selectedItem && (
            <div className="border border-cyan-800/70 bg-[#090f1c] rounded-lg p-3 text-xs space-y-2">
              <div className="text-[10px] text-cyan-400 font-bold uppercase flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>TARGET TELEMETRY INSPECTOR</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800"
                >
                  &times;
                </button>
              </div>

              {selectedItem.type === 'seismic' && (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Event:</span>
                    <strong className="text-rose-400 font-bold">
                      Richter Magnitude M{selectedItem.data.severity}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Location:</span>
                    <span className="text-slate-200 text-right">{selectedItem.data.place}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Coordinates:</span>
                    <span className="text-cyan-300">
                      {selectedItem.data.coordinates?.[1].toFixed(4)}°N,{' '}
                      {selectedItem.data.coordinates?.[0].toFixed(4)}°W
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Distance to Command Post:</span>
                    <span className="text-amber-300 font-semibold">
                      {selectedItem.data.distance_from_malibu_km ?? calculateDistanceKm(MALIBU_SECTOR_COORDS, selectedItem.data.coordinates)} km
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Depth / Confidence:</span>
                    <span className="text-slate-300">
                      {selectedItem.data.depth_km} km / {(selectedItem.data.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              {selectedItem.type === 'wildfire' && (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Thermal Hotspot:</span>
                    <strong className="text-orange-400 font-bold">
                      {selectedItem.data.frp} MW (Radiative Power)
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Location:</span>
                    <span className="text-slate-200 text-right">{selectedItem.data.place}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Coordinates:</span>
                    <span className="text-cyan-300">
                      {selectedItem.data.coordinates?.[1].toFixed(4)}°N,{' '}
                      {selectedItem.data.coordinates?.[0].toFixed(4)}°W
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Distance to Command Post:</span>
                    <span className="text-amber-300 font-semibold">
                      {selectedItem.data.distance_from_malibu_km ?? calculateDistanceKm(MALIBU_SECTOR_COORDS, selectedItem.data.coordinates)} km
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Detection Source:</span>
                    <span className="text-slate-300">NASA FIRMS (VIIRS / MODIS)</span>
                  </div>
                </div>
              )}

              {selectedItem.type === 'aircraft' && (
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Callsign:</span>
                    <strong className="text-sky-300 font-bold">{selectedItem.data.callsign}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Transponder Squawk:</span>
                    <span
                      className={`font-bold px-1 rounded ${
                        selectedItem.data.squawk === '7700'
                          ? 'bg-rose-950 text-rose-300 border border-rose-700'
                          : 'text-slate-300'
                      }`}
                    >
                      {selectedItem.data.squawk} {selectedItem.data.squawk === '7700' ? '(EMERGENCY)' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Altitude / Speed:</span>
                    <span className="text-slate-300">
                      {selectedItem.data.altitude_ft} ft / {selectedItem.data.speed_kts} kts
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Heading:</span>
                    <span className="text-slate-300">{selectedItem.data.heading_deg}°</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Distance to Command Post:</span>
                    <span className="text-amber-300 font-semibold">
                      {selectedItem.data.distance_from_malibu_km ?? calculateDistanceKm(MALIBU_SECTOR_COORDS, selectedItem.data.coordinates)} km
                    </span>
                  </div>
                </div>
              )}

              {selectedItem.type === 'command' && (
                <div className="space-y-1.5 text-[11px]">
                  <div className="text-cyan-300 font-bold">{selectedItem.data.name}</div>
                  <div className="text-slate-400">{selectedItem.data.role}</div>
                  <div className="text-slate-300">
                    Coords: 34.0195°N, 118.4085°W [Perimeter Radius: 100km]
                  </div>
                  <div className="text-emerald-400 font-semibold">Security State: {selectedItem.data.status}</div>
                </div>
              )}
            </div>
          )}

          {/* Sensor Feeds Summary Counts */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded">
              <div className="text-[10px] text-slate-400 font-semibold">USGS Seismic</div>
              <div className="text-base font-bold text-rose-300 mt-0.5">{seismic.length} Events</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded">
              <div className="text-[10px] text-slate-400 font-semibold">NASA FIRMS</div>
              <div className="text-base font-bold text-orange-300 mt-0.5">{wildfire.length} Hotspots</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded">
              <div className="text-[10px] text-slate-400 font-semibold">ADS-B Radar</div>
              <div className="text-base font-bold text-cyan-300 mt-0.5">{aircraft.length} Aircraft</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
