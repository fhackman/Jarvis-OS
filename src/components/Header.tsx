import React from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Terminal, 
  Layers, 
  Radar, 
  Lock, 
  Hash, 
  CheckSquare, 
  Cpu,
  Radio,
  Bot,
  FileText
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingApprovalsCount: number;
  activeAlertsCount: number;
  systemHealth: {
    status: string;
    uptime_seconds: number;
    memory_usage_mb: number;
  } | null;
  onOpenDiagnostics?: () => void;
  hasThresholdBreach?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingApprovalsCount,
  activeAlertsCount,
  systemHealth,
  onOpenDiagnostics,
  hasThresholdBreach,
}) => {
  const tabs = [
    { id: 'terminal', label: 'Command HUD', icon: Terminal, badge: null },
    { id: 'chat', label: 'Neural AI Chat', icon: Bot, badge: null },
    { id: 'approvals', label: 'Approval Gate', icon: Lock, badge: pendingApprovalsCount },
    { id: 'audit', label: 'Audit Chain', icon: Hash, badge: null },
    { id: 'domains', label: 'Domain Manifest', icon: Layers, badge: null },
    { id: 'radar', label: 'Situational Radar', icon: Radar, badge: activeAlertsCount },
    { id: 'devices', label: 'Estate Devices', icon: Cpu, badge: null },
    { id: 'logs', label: 'System Logs', icon: FileText, badge: null },
    { id: 'contracts', label: 'Contracts', icon: CheckSquare, badge: null },
  ];

  return (
    <header className="border-b border-cyan-950/60 bg-[#070b12]/95 backdrop-blur-md sticky top-0 z-50">
      {/* Top Telemetry Ticker */}
      <div className="border-b border-cyan-950/40 px-4 py-1.5 text-[11px] font-mono flex flex-wrap items-center justify-between gap-3 text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            JARVIS // COGNITIVE_OS
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 hidden sm:inline">
            POLICY: <span className="text-emerald-400 font-medium">FAIL-CLOSED DETERMINISTIC</span>
          </span>
          <span className="text-slate-600 hidden md:inline">|</span>
          <span className="text-slate-400 hidden md:inline">
            HASH CHAIN: <span className="text-cyan-400">SHA-256 APPEND-ONLY</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-300">WATCHDOG:</span>
            <span className="text-emerald-400 font-medium uppercase">
              {systemHealth?.status || 'NOMINAL'}
            </span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">
            HEAP: <span className="text-amber-300">{systemHealth?.memory_usage_mb || 38}MB</span>
          </span>
          <span className="text-slate-600 hidden lg:inline">|</span>
          <span className="text-slate-400 hidden lg:inline">
            UPTIME: <span className="text-slate-200">{Math.floor(systemHealth?.uptime_seconds || 120)}s</span>
          </span>
          {onOpenDiagnostics && (
            <>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                id="open-diagnostics-ticker-btn"
                onClick={onOpenDiagnostics}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all cursor-pointer border ${
                  hasThresholdBreach
                    ? 'bg-rose-950 border-rose-500 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-pulse'
                    : 'bg-cyan-950/80 border-cyan-700/60 text-cyan-300 hover:bg-cyan-900/60 hover:text-white'
                }`}
                title={hasThresholdBreach ? 'Resource Threshold Exceeded! Open Diagnostics Drawer' : 'Open 60-Minute System Diagnostics & Telemetry Drawer'}
              >
                <Activity className={`w-3 h-3 ${hasThresholdBreach ? 'text-rose-400' : 'text-cyan-400'} animate-pulse`} />
                <span className="font-semibold text-[10px] tracking-wider">
                  {hasThresholdBreach ? 'LIMIT ALERT' : 'DIAGNOSTICS'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded border border-cyan-500/40 bg-cyan-950/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-['Rajdhani'] font-bold text-lg text-slate-100 tracking-wide">
                TACTICAL HUD & GOVERNANCE GATE
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 rounded">
                v1.0.0
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 hidden sm:block">
              Continuous Trust Calibration &bull; Single Cryptographic Audit Trail
            </p>
          </div>
        </div>

        {/* Navigation Tabs & Actions */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== null && tab.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 border border-amber-500/60 text-amber-300 animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {onOpenDiagnostics && (
            <button
              type="button"
              id="open-diagnostics-btn"
              onClick={onOpenDiagnostics}
              className="px-2.5 py-1.5 rounded text-xs font-mono font-medium border border-cyan-500/50 bg-cyan-950/50 text-cyan-300 hover:bg-cyan-900/60 hover:text-white flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.2)] shrink-0"
              title="Open System Diagnostics Drawer (Recharts 60-Minute CPU, Memory & Latency Plot)"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline font-semibold">DIAGNOSTICS</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
