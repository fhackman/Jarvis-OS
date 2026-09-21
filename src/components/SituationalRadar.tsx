import React, { useState } from 'react';
import { 
  Radar, 
  Flame, 
  Plane, 
  Activity, 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw, 
  CheckCircle2, 
  Clock,
  Zap
} from 'lucide-react';
import { 
  SeismicEvent, 
  WildfireEvent, 
  AircraftTelemetry, 
  ProactiveAlert 
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
  onInjectHazard: (type: 'seismic' | 'airspace', severity: number) => Promise<void>;
  onRefresh: () => void;
  loading: boolean;
}

export const SituationalRadar: React.FC<SituationalRadarProps> = ({
  seismic,
  wildfire,
  aircraft,
  alerts,
  hysteresisStatus,
  onInjectHazard,
  onRefresh,
  loading,
}) => {
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [injecting, setInjecting] = useState(false);

  const handleInject = async (type: 'seismic' | 'airspace', severity: number) => {
    setInjecting(true);
    try {
      await onInjectHazard(type, severity);
    } finally {
      setInjecting(false);
    }
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
              USGS / NASA FIRMS / ADS-B
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Section 5.1 & Phase 4: Normalized situational cache with threshold triggers (Seismic &gt; 4.5, Squawk 7700) and 1-hour alert hysteresis dampening.
          </p>
        </div>

        {/* Hazard Injections */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="inject-seismic-btn"
            onClick={() => handleInject('seismic', 5.3)}
            disabled={injecting}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-rose-950/70 hover:bg-rose-900 border border-rose-700/60 text-rose-300 flex items-center gap-1.5 transition-colors"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>INJECT M5.3 SEISMIC</span>
          </button>

          <button
            type="button"
            id="inject-airspace-btn"
            onClick={() => handleInject('airspace', 7700)}
            disabled={injecting}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-amber-950/70 hover:bg-amber-900 border border-amber-700/60 text-amber-300 flex items-center gap-1.5 transition-colors"
          >
            <Plane className="w-3.5 h-3.5" />
            <span>INJECT SQUAWK 7700</span>
          </button>

          <button
            type="button"
            id="refresh-intel-btn"
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-1.5 rounded text-xs border border-slate-700 bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Main Tactical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Radar View Canvas */}
        <div className="lg:col-span-7 border border-cyan-900/60 bg-[#060a12] rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[380px]">
          {/* Radar Background Circles & Crosshairs */}
          <div className="relative w-72 h-72 rounded-full border border-cyan-800/40 flex items-center justify-center">
            {/* Concentric Range Rings */}
            <div className="absolute w-52 h-52 rounded-full border border-cyan-800/30" />
            <div className="absolute w-32 h-32 rounded-full border border-cyan-800/20" />
            <div className="absolute w-12 h-12 rounded-full border border-cyan-700/30" />
            {/* Crosshairs */}
            <div className="absolute w-full h-[1px] bg-cyan-900/40" />
            <div className="absolute h-full w-[1px] bg-cyan-900/40" />

            {/* Sweep Line Animation */}
            <div className="absolute w-1/2 h-[1px] bg-gradient-to-r from-transparent to-cyan-400 origin-left top-1/2 left-1/2 animate-[spin_4s_linear_infinite]" />

            {/* Center Anchor (Malibu Estate Sector) */}
            <div className="relative z-10 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] flex items-center justify-center">
              <span className="text-[8px] font-bold text-black">M</span>
            </div>

            {/* Seismic Blips */}
            {seismic.map((eq, idx) => {
              // Simulated positioning relative to center
              const top = 35 + (idx * 28) % 60;
              const left = 25 + (idx * 35) % 65;
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

            {/* Wildfire Blips */}
            {wildfire.map((fire, idx) => {
              const top = 20 + (idx * 40) % 70;
              const left = 60 + (idx * 20) % 35;

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

            {/* Aircraft ADS-B Vectors */}
            {aircraft.map((craft, idx) => {
              const top = 70 - (idx * 30) % 55;
              const left = 30 + (idx * 25) % 60;

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

        {/* Telemetry Feeds & Proactive Alerts Panel */}
        <div className="lg:col-span-5 space-y-3">
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
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    className="p-2 rounded bg-rose-950/30 border border-rose-900/50 text-[11px]"
                  >
                    <div className="font-bold text-rose-300 flex items-center justify-between">
                      <span>{al.title}</span>
                      <span className="text-[9px] text-slate-400">{new Date(al.timestamp).toLocaleTimeString()}</span>
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

          {/* Selected Item Inspector */}
          {selectedItem && (
            <div className="border border-cyan-800/60 bg-[#090e18] rounded-lg p-3 text-xs">
              <div className="text-[10px] text-cyan-400 font-bold uppercase mb-1 flex items-center justify-between">
                <span>Selected Telemetry Target:</span>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="text-slate-500 hover:text-white"
                >
                  &times;
                </button>
              </div>
              <pre className="text-[11px] text-emerald-300 bg-black/60 p-2 rounded border border-slate-800 whitespace-pre-wrap font-mono">
                {JSON.stringify(selectedItem.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Feeds Summary Counts */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
              <div className="text-[10px] text-slate-400 font-semibold">USGS Seismic</div>
              <div className="text-base font-bold text-slate-200 mt-0.5">{seismic.length} Events</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
              <div className="text-[10px] text-slate-400 font-semibold">NASA FIRMS</div>
              <div className="text-base font-bold text-orange-300 mt-0.5">{wildfire.length} Hotspots</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-2 rounded">
              <div className="text-[10px] text-slate-400 font-semibold">ADS-B Radar</div>
              <div className="text-base font-bold text-cyan-300 mt-0.5">{aircraft.length} Aircraft</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
