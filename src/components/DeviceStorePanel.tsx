import React, { useState } from 'react';
import { 
  Cpu, 
  Lock, 
  Unlock, 
  Power, 
  Thermometer, 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  RefreshCw 
} from 'lucide-react';
import { DeviceState, DispatchResult } from '../types/jarvis';

interface DeviceStorePanelProps {
  devices: DeviceState[];
  onToggleDevice: (deviceId: string, update: Record<string, any>) => Promise<DispatchResult | null>;
  onRefresh: () => void;
  loading: boolean;
  onNavigateToTab: (tab: string) => void;
}

export const DeviceStorePanel: React.FC<DeviceStorePanelProps> = ({
  devices,
  onToggleDevice,
  onRefresh,
  loading,
  onNavigateToTab,
}) => {
  const [actingDeviceId, setActingDeviceId] = useState<string | null>(null);
  const [lastActionResult, setLastActionResult] = useState<DispatchResult | null>(null);

  const handleDeviceAction = async (deviceId: string, update: Record<string, any>) => {
    setActingDeviceId(deviceId);
    try {
      const res = await onToggleDevice(deviceId, update);
      setLastActionResult(res);
    } finally {
      setActingDeviceId(null);
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="border border-cyan-900/60 bg-[#090e18] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h2 className="font-['Rajdhani'] font-bold text-lg text-slate-100 tracking-wider">
              ENVIRONMENTAL CONTROL // SIMULATED DEVICE STATE STORE
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-600/60 text-cyan-300">
              SIMULATED &bull; NO PHYSICAL BROKER
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Architectural Integrity Rule: In-memory virtual state machine. Zero phantom physical effectors. All mutations pass through Dispatch Predicate.
          </p>
        </div>

        <button
          type="button"
          id="refresh-devices-btn"
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1.5 rounded text-xs border border-slate-700 bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync State</span>
        </button>
      </div>

      {/* Action Notice if proposed */}
      {lastActionResult && (
        <div className={`p-3 rounded text-xs border flex items-center justify-between gap-3 ${
          lastActionResult.decision === 'allow'
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
            : lastActionResult.decision === 'propose'
            ? 'bg-amber-950/40 border-amber-800 text-amber-200'
            : 'bg-rose-950/40 border-rose-800 text-rose-200'
        }`}>
          <div>
            <span className="font-bold uppercase tracking-wider">Gatekeeper Decision: {lastActionResult.decision}</span>
            <div className="mt-0.5 text-[11px] opacity-90">{lastActionResult.reason}</div>
          </div>
          {lastActionResult.decision === 'propose' && (
            <button
              type="button"
              id="goto-approvals-from-device"
              onClick={() => onNavigateToTab('approvals')}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold whitespace-nowrap shadow-[0_0_10px_rgba(245,158,11,0.3)]"
            >
              Sign in Approval Gate &rarr;
            </button>
          )}
        </div>
      )}

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {devices.map((dev) => {
          const isBusy = actingDeviceId === dev.id;

          return (
            <div
              key={dev.id}
              id={`device-card-${dev.id}`}
              className="border border-slate-800/90 bg-[#090d16] rounded-lg p-4 flex flex-col justify-between hover:border-cyan-800/60 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 font-['Rajdhani']">
                      {dev.name}
                    </h3>
                    <div className="text-[10px] text-slate-400">{dev.location}</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-950 border border-cyan-800/60 text-cyan-300 uppercase">
                    {dev.type}
                  </span>
                </div>

                {/* State Dump */}
                <div className="bg-black/50 border border-slate-800/80 rounded p-2.5 text-xs mb-3">
                  <div className="text-[10px] text-slate-400 font-semibold mb-1">Virtual State:</div>
                  <div className="space-y-1 text-[11px]">
                    {Object.entries(dev.state).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-400">{k}:</span>
                        <span className={`font-semibold ${
                          typeof v === 'boolean'
                            ? v
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                            : 'text-cyan-300'
                        }`}>
                          {String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  Last: {new Date(dev.last_updated).toLocaleTimeString()}
                </span>

                <div className="flex gap-2">
                  {dev.id === 'estate_main_gate' && (
                    <button
                      type="button"
                      id="toggle-gate-btn"
                      onClick={() =>
                        handleDeviceAction(dev.id, { locked: !dev.state.locked })
                      }
                      disabled={isBusy}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-cyan-950/80 border border-cyan-600/60 text-cyan-300 hover:bg-cyan-900 transition-colors flex items-center gap-1"
                    >
                      {dev.state.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>{dev.state.locked ? 'Request Unlock' : 'Request Lock'}</span>
                    </button>
                  )}

                  {dev.id === 'perimeter_sensor_grid' && (
                    <button
                      type="button"
                      id="toggle-sensors-btn"
                      onClick={() =>
                        handleDeviceAction(dev.id, { armed: !dev.state.armed })
                      }
                      disabled={isBusy}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-cyan-950/80 border border-cyan-600/60 text-cyan-300 hover:bg-cyan-900 transition-colors flex items-center gap-1"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>{dev.state.armed ? 'Disarm' : 'Arm Grid'}</span>
                    </button>
                  )}

                  {dev.id === 'server_lab_hvac' && (
                    <button
                      type="button"
                      id="toggle-hvac-btn"
                      onClick={() =>
                        handleDeviceAction(dev.id, { target_temp_c: dev.state.target_temp_c === 18 ? 16.5 : 18 })
                      }
                      disabled={isBusy}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-cyan-950/80 border border-cyan-600/60 text-cyan-300 hover:bg-cyan-900 transition-colors flex items-center gap-1"
                    >
                      <Thermometer className="w-3.5 h-3.5" />
                      <span>Set {dev.state.target_temp_c === 18 ? '16.5°C' : '18.0°C'}</span>
                    </button>
                  )}

                  {dev.id === 'reactor_substation_breaker' && (
                    <button
                      type="button"
                      id="toggle-breaker-btn"
                      onClick={() =>
                        handleDeviceAction(dev.id, { breaker_closed: !dev.state.breaker_closed })
                      }
                      disabled={isBusy}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-cyan-950/80 border border-cyan-600/60 text-cyan-300 hover:bg-cyan-900 transition-colors flex items-center gap-1"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{dev.state.breaker_closed ? 'Trip Breaker' : 'Reset Breaker'}</span>
                    </button>
                  )}

                  {dev.id === 'holographic_emitter_array' && (
                    <button
                      type="button"
                      id="toggle-hologram-btn"
                      onClick={() =>
                        handleDeviceAction(dev.id, { active: !dev.state.active })
                      }
                      disabled={isBusy}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-cyan-950/80 border border-cyan-600/60 text-cyan-300 hover:bg-cyan-900 transition-colors flex items-center gap-1"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>{dev.state.active ? 'Standby' : 'Engage'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
