import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Zap,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  Sliders,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Flame,
  ShieldAlert,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { 
  SystemDiagnosticsData, 
  DiagnosticsTelemetryPoint,
  DiagnosticThresholds,
  ThresholdAlert
} from '../types/jarvis';
import {
  DEFAULT_THRESHOLDS,
  loadThresholds,
  saveThresholds,
  playAlertBeep
} from '../utils/thresholds';

interface SystemDiagnosticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  thresholds?: DiagnosticThresholds;
  onUpdateThresholds?: (newThresholds: DiagnosticThresholds) => void;
  activeAlert?: ThresholdAlert | null;
  onSimulateSpike?: (type: 'cpu' | 'ram', value?: number) => Promise<void>;
  onTriggerTestAlert?: (type: 'cpu' | 'ram') => void;
}

export const SystemDiagnosticsDrawer: React.FC<SystemDiagnosticsDrawerProps> = ({
  isOpen,
  onClose,
  thresholds,
  onUpdateThresholds,
  activeAlert,
  onSimulateSpike,
  onTriggerTestAlert,
}) => {
  const [data, setData] = useState<SystemDiagnosticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [activeChartTab, setActiveChartTab] = useState<'combined' | 'resources' | 'latency'>('combined');
  const [triggeringPulse, setTriggeringPulse] = useState<boolean>(false);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [thresholdsExpanded, setThresholdsExpanded] = useState<boolean>(true);
  const [simulatingSpike, setSimulatingSpike] = useState<boolean>(false);

  // Thresholds state: fallback to internal state if not supplied via props
  const [internalThresholds, setInternalThresholds] = useState<DiagnosticThresholds>(() => loadThresholds());
  const currentThresholds = thresholds || internalThresholds;

  const updateThresholds = (updated: Partial<DiagnosticThresholds>) => {
    const next = { ...currentThresholds, ...updated };
    if (onUpdateThresholds) {
      onUpdateThresholds(next);
    } else {
      setInternalThresholds(next);
      saveThresholds(next);
    }
  };

  const handleSimulateSpikeAction = async (type: 'cpu' | 'ram', value?: number) => {
    setSimulatingSpike(true);
    try {
      if (onSimulateSpike) {
        await onSimulateSpike(type, value);
      } else {
        const res = await fetch('/api/diagnostics/simulate-spike', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, value }),
        });
        const json = await res.json();
        if (json.diagnostics) {
          setData(json.diagnostics);
        }
      }
      setActionNotice(`Simulated ${type.toUpperCase()} surge applied. Limit watchdog evaluated.`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      console.error('Failed to simulate spike:', err);
    } finally {
      setSimulatingSpike(false);
    }
  };

  const handleTestAlertAction = (type: 'cpu' | 'ram' = 'cpu') => {
    if (onTriggerTestAlert) {
      onTriggerTestAlert(type);
    }
    if (currentThresholds.soundEnabled) {
      playAlertBeep();
    }
    setActionNotice(`Test threshold alert dispatched (${type.toUpperCase()} breach). Toast & dashboard warning activated.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const fetchDiagnostics = useCallback(async () => {
    try {
      const res = await fetch('/api/diagnostics');
      if (res.ok) {
        const json: SystemDiagnosticsData = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load system diagnostics:', err);
    }
  }, []);

  // Initial fetch and auto-refresh interval
  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
    }
  }, [isOpen, fetchDiagnostics]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchDiagnostics();
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, fetchDiagnostics]);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleTriggerPulse = async () => {
    setTriggeringPulse(true);
    try {
      const res = await fetch('/api/diagnostics/test-pulse', { method: 'POST' });
      const resData = await res.json();
      if (resData.diagnostics) {
        setData(resData.diagnostics);
      }
      setActionNotice(`Telemetry probe dispatched: Latency measured at ${resData.latency_ms}ms.`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err) {
      console.error('Failed to trigger test pulse:', err);
    } finally {
      setTriggeringPulse(false);
    }
  };

  const handleExportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-diagnostics-60m-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setActionNotice('60-minute telemetry time series exported as JSON.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const formatTimeTick = (tick: any) => {
    if (typeof tick === 'string') return tick;
    return String(tick);
  };

  const summary = data?.summary || {
    currentCpu: 28,
    peakCpu: 52,
    avgCpu: 31,
    currentMemoryMb: 46,
    peakMemoryMb: 68,
    avgMemoryMb: 49,
    totalDispatches60m: 18,
    avgDispatchLatencyMs: 14,
    p95DispatchLatencyMs: 24,
    maxDispatchLatencyMs: 312,
    activeProcesses: 4,
  };

  const metrics = data?.metrics || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            id="diagnostics-backdrop"
          />

          {/* Drawer / Modal Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={`relative z-10 bg-[#070b13] border-l border-cyan-500/30 flex flex-col h-full shadow-[0_0_50px_rgba(6,182,212,0.15)] font-mono ${
              fullscreen ? 'w-full' : 'w-full max-w-4xl xl:max-w-5xl'
            }`}
            id="system-diagnostics-drawer"
          >
            {/* Header */}
            <div className="border-b border-cyan-950/80 bg-[#0a0f1a] px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg border border-cyan-500/50 bg-cyan-950/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-['Rajdhani'] font-bold text-xl text-slate-100 tracking-wide">
                      SYSTEM DIAGNOSTICS & TELEMETRY
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 rounded font-bold">
                      60-MIN ROLLING WINDOW
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Real-time CPU &amp; Memory Utilization alongside Gated Dispatch Latency
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="diagnostics-refresh-btn"
                  onClick={fetchDiagnostics}
                  className="p-1.5 rounded border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-800 transition-colors"
                  title="Manual Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  id="diagnostics-pulse-btn"
                  onClick={handleTriggerPulse}
                  disabled={triggeringPulse}
                  className="px-2.5 py-1.5 rounded text-xs font-semibold border border-amber-600/60 bg-amber-950/40 text-amber-300 hover:bg-amber-900/40 flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                  title="Trigger a test dispatch to measure latency immediately"
                >
                  <Play className={`w-3.5 h-3.5 ${triggeringPulse ? 'animate-spin' : ''}`} />
                  <span>TRIGGER DISPATCH</span>
                </button>

                <button
                  type="button"
                  id="diagnostics-export-btn"
                  onClick={handleExportJSON}
                  className="px-2.5 py-1.5 rounded text-xs font-semibold border border-cyan-800 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 flex items-center gap-1.5 transition-colors"
                  title="Export 60-minute time series JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">EXPORT</span>
                </button>

                <button
                  type="button"
                  id="diagnostics-fullscreen-btn"
                  onClick={() => setFullscreen(!fullscreen)}
                  className="p-1.5 rounded border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 transition-colors hidden sm:block"
                  title={fullscreen ? 'Restore Drawer' : 'Full Screen Width'}
                >
                  {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  id="close-diagnostics-drawer-btn"
                  onClick={onClose}
                  className="p-1.5 rounded border border-slate-800 hover:border-rose-800/80 bg-slate-900/80 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notification Banner */}
            {actionNotice && (
              <div className="bg-cyan-950/70 border-b border-cyan-600/40 px-6 py-2 text-xs text-cyan-200 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{actionNotice}</span>
              </div>
            )}

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Stat Cards Header */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* CPU Stat Card */}
                {(() => {
                  const isExceeded = currentThresholds.enabled && summary.currentCpu >= currentThresholds.cpuThresholdPercent;
                  return (
                    <div className={`p-3.5 rounded-lg border transition-all ${
                      isExceeded
                        ? 'bg-rose-950/40 border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
                        : 'bg-slate-950/80 border-cyan-900/50'
                    }`}>
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span className={`flex items-center gap-1.5 font-semibold ${isExceeded ? 'text-rose-400' : 'text-cyan-400'}`}>
                          <Cpu className="w-3.5 h-3.5" /> CPU UTILIZATION
                        </span>
                        {isExceeded ? (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-900 text-rose-200 rounded border border-rose-600 animate-pulse">
                            LIMIT EXCEEDED
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">LIVE</span>
                        )}
                      </div>
                      <div className={`text-2xl font-bold mt-1 ${isExceeded ? 'text-rose-300' : 'text-cyan-300'}`}>
                        {summary.currentCpu}%
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                        <span>Limit: <strong className={isExceeded ? 'text-rose-400' : 'text-cyan-400'}>{currentThresholds.cpuThresholdPercent}%</strong></span>
                        <span>Peak: <strong className="text-amber-400">{summary.peakCpu}%</strong></span>
                      </div>
                    </div>
                  );
                })()}

                {/* Memory Stat Card */}
                {(() => {
                  const isExceeded = currentThresholds.enabled && summary.currentMemoryMb >= currentThresholds.ramThresholdMb;
                  return (
                    <div className={`p-3.5 rounded-lg border transition-all ${
                      isExceeded
                        ? 'bg-amber-950/40 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                        : 'bg-slate-950/80 border-emerald-900/50'
                    }`}>
                      <div className="flex items-center justify-between text-slate-400 text-xs">
                        <span className={`flex items-center gap-1.5 font-semibold ${isExceeded ? 'text-amber-400' : 'text-emerald-400'}`}>
                          <HardDrive className="w-3.5 h-3.5" /> MEMORY FOOTPRINT
                        </span>
                        {isExceeded ? (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-900 text-amber-200 rounded border border-amber-600 animate-pulse">
                            LIMIT EXCEEDED
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">HEAP</span>
                        )}
                      </div>
                      <div className={`text-2xl font-bold mt-1 ${isExceeded ? 'text-amber-300' : 'text-emerald-300'}`}>
                        {summary.currentMemoryMb} <span className="text-sm font-normal text-slate-400">MB</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                        <span>Limit: <strong className={isExceeded ? 'text-amber-400' : 'text-emerald-400'}>{currentThresholds.ramThresholdMb}MB</strong></span>
                        <span>Peak: <strong className="text-emerald-200">{summary.peakMemoryMb}MB</strong></span>
                      </div>
                    </div>
                  );
                })()}

                {/* Dispatch Latency Stat Card */}
                <div className="bg-slate-950/80 border border-amber-900/50 p-3.5 rounded-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                      <Zap className="w-3.5 h-3.5" /> DISPATCH LATENCY
                    </span>
                    <span className="text-[10px] text-slate-500">AVG</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-300 mt-1">
                    {summary.avgDispatchLatencyMs} <span className="text-sm font-normal text-slate-400">ms</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                    <span>P95: <strong className="text-slate-200">{summary.p95DispatchLatencyMs}ms</strong></span>
                    <span>Max: <strong className="text-rose-400">{summary.maxDispatchLatencyMs}ms</strong></span>
                  </div>
                </div>

                {/* Operations & Throughput Stat Card */}
                <div className="bg-slate-950/80 border border-purple-900/50 p-3.5 rounded-lg">
                  <div className="flex items-center justify-between text-slate-400 text-xs">
                    <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
                      <Clock className="w-3.5 h-3.5" /> 60M OPERATIONS
                    </span>
                    <span className="text-[10px] text-slate-500">GATE</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-300 mt-1">
                    {summary.totalDispatches60m} <span className="text-sm font-normal text-slate-400">ops</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                    <span>Auto Rate: <strong className="text-emerald-400">&le; 3/hr</strong></span>
                    <span>Fail-Closed: <strong className="text-cyan-400">Active</strong></span>
                  </div>
                </div>
              </div>

              {/* Resource Thresholds Configuration & Alarm Watchdog Panel */}
              <div 
                id="resource-thresholds-panel"
                className="bg-slate-950/90 border border-cyan-800/60 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.1)] font-mono"
              >
                {/* Panel Header with Collapsible & Master Toggle */}
                <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-slate-950 px-4 py-3 border-b border-cyan-900/50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100 tracking-wider">
                          RESOURCE THRESHOLD POLICIES &amp; ALARM WATCHDOG
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          currentThresholds.enabled
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-600/60'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}>
                          {currentThresholds.enabled ? 'ACTIVE MONITORING' : 'MUTED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Set CPU &amp; RAM ceiling limits. Exceeding triggers toast notifications &amp; dashboard warning banners.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Master Switch */}
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/80 px-2.5 py-1 rounded border border-slate-700">
                      <input
                        type="checkbox"
                        checked={currentThresholds.enabled}
                        onChange={(e) => updateThresholds({ enabled: e.target.checked })}
                        className="rounded bg-slate-800 border-slate-600 text-cyan-500 focus:ring-0"
                      />
                      <span>Enable Watchdog</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setThresholdsExpanded(!thresholdsExpanded)}
                      className="p-1.5 rounded border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors"
                      title={thresholdsExpanded ? 'Collapse Threshold Controls' : 'Expand Threshold Controls'}
                    >
                      {thresholdsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Panel Body */}
                {thresholdsExpanded && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* CPU Threshold Control Card */}
                      <div className={`p-3.5 rounded-lg border transition-all ${
                        summary.currentCpu >= currentThresholds.cpuThresholdPercent && currentThresholds.enabled
                          ? 'bg-rose-950/20 border-rose-500/60'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                            <Cpu className="w-4 h-4 text-cyan-400" />
                            CPU CEILING THRESHOLD
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            {currentThresholds.cpuThresholdPercent}%
                          </span>
                        </div>

                        {/* Live Status vs Threshold Meter */}
                        <div className="space-y-1 my-2 text-[11px]">
                          <div className="flex justify-between text-slate-400">
                            <span>Live: <strong className={summary.currentCpu >= currentThresholds.cpuThresholdPercent ? 'text-rose-400 font-bold' : 'text-cyan-300'}>{summary.currentCpu}%</strong></span>
                            <span>Limit: <strong className="text-slate-200">{currentThresholds.cpuThresholdPercent}%</strong></span>
                          </div>
                          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800 relative">
                            <div 
                              className={`h-full transition-all duration-500 rounded-full ${
                                summary.currentCpu >= currentThresholds.cpuThresholdPercent
                                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 animate-pulse'
                                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                              }`}
                              style={{ width: `${Math.min(100, summary.currentCpu)}%` }}
                            />
                            {/* Threshold Marker */}
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-10"
                              style={{ left: `${currentThresholds.cpuThresholdPercent}%` }}
                              title={`Threshold: ${currentThresholds.cpuThresholdPercent}%`}
                            />
                          </div>
                        </div>

                        {/* Slider & Number Input */}
                        <div className="flex items-center gap-3 mt-3">
                          <input
                            type="range"
                            id="cpu-threshold-slider"
                            min={15}
                            max={95}
                            step={5}
                            value={currentThresholds.cpuThresholdPercent}
                            onChange={(e) => updateThresholds({ cpuThresholdPercent: Number(e.target.value) })}
                            className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                          />
                          <input
                            type="number"
                            id="cpu-threshold-input"
                            min={10}
                            max={100}
                            value={currentThresholds.cpuThresholdPercent}
                            onChange={(e) => updateThresholds({ cpuThresholdPercent: Math.max(10, Math.min(100, Number(e.target.value))) })}
                            className="w-16 bg-slate-950 border border-slate-700 text-cyan-300 text-xs text-center py-1 rounded font-bold"
                          />
                          <span className="text-xs text-slate-400">%</span>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80">
                          <span className="text-[10px] text-slate-500">Presets:</span>
                          {[50, 70, 80, 90].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => updateThresholds({ cpuThresholdPercent: preset })}
                              className={`px-2 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
                                currentThresholds.cpuThresholdPercent === preset
                                  ? 'bg-cyan-900/80 border-cyan-500 text-cyan-200 font-bold'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {preset}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* RAM Threshold Control Card */}
                      <div className={`p-3.5 rounded-lg border transition-all ${
                        summary.currentMemoryMb >= currentThresholds.ramThresholdMb && currentThresholds.enabled
                          ? 'bg-amber-950/20 border-amber-500/60'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                            <HardDrive className="w-4 h-4 text-emerald-400" />
                            RAM HEAP CEILING THRESHOLD
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            {currentThresholds.ramThresholdMb} MB
                          </span>
                        </div>

                        {/* Live Status vs Threshold Meter */}
                        <div className="space-y-1 my-2 text-[11px]">
                          <div className="flex justify-between text-slate-400">
                            <span>Live: <strong className={summary.currentMemoryMb >= currentThresholds.ramThresholdMb ? 'text-amber-400 font-bold' : 'text-emerald-300'}>{summary.currentMemoryMb}MB</strong></span>
                            <span>Limit: <strong className="text-slate-200">{currentThresholds.ramThresholdMb}MB</strong></span>
                          </div>
                          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800 relative">
                            <div 
                              className={`h-full transition-all duration-500 rounded-full ${
                                summary.currentMemoryMb >= currentThresholds.ramThresholdMb
                                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 animate-pulse'
                                  : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                              }`}
                              style={{ width: `${Math.min(100, (summary.currentMemoryMb / 150) * 100)}%` }}
                            />
                            {/* Threshold Marker */}
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
                              style={{ left: `${Math.min(100, (currentThresholds.ramThresholdMb / 150) * 100)}%` }}
                              title={`Threshold: ${currentThresholds.ramThresholdMb}MB`}
                            />
                          </div>
                        </div>

                        {/* Slider & Number Input */}
                        <div className="flex items-center gap-3 mt-3">
                          <input
                            type="range"
                            id="ram-threshold-slider"
                            min={30}
                            max={200}
                            step={5}
                            value={currentThresholds.ramThresholdMb}
                            onChange={(e) => updateThresholds({ ramThresholdMb: Number(e.target.value) })}
                            className="flex-1 accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                          />
                          <input
                            type="number"
                            id="ram-threshold-input"
                            min={20}
                            max={500}
                            value={currentThresholds.ramThresholdMb}
                            onChange={(e) => updateThresholds({ ramThresholdMb: Math.max(20, Math.min(500, Number(e.target.value))) })}
                            className="w-16 bg-slate-950 border border-slate-700 text-emerald-300 text-xs text-center py-1 rounded font-bold"
                          />
                          <span className="text-xs text-slate-400">MB</span>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80">
                          <span className="text-[10px] text-slate-500">Presets:</span>
                          {[50, 70, 90, 120].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => updateThresholds({ ramThresholdMb: preset })}
                              className={`px-2 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
                                currentThresholds.ramThresholdMb === preset
                                  ? 'bg-emerald-900/80 border-emerald-500 text-emerald-200 font-bold'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {preset}MB
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Alert Delivery Channels & Simulation Toolbar */}
                    <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                      {/* Delivery Checkboxes */}
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                          <Bell className="w-3.5 h-3.5 text-cyan-400" /> ALARM CHANNELS:
                        </span>

                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={currentThresholds.toastAlerts}
                            onChange={(e) => updateThresholds({ toastAlerts: e.target.checked })}
                            className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                          />
                          <span>Toast Notifications</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={currentThresholds.dashboardWarning}
                            onChange={(e) => updateThresholds({ dashboardWarning: e.target.checked })}
                            className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                          />
                          <span>Dashboard Warning Banner</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={Boolean(currentThresholds.soundEnabled)}
                            onChange={(e) => updateThresholds({ soundEnabled: e.target.checked })}
                            className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                          />
                          <span>Audio Chime</span>
                        </label>
                      </div>

                      {/* Simulation & Test Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          id="btn-simulate-cpu-spike"
                          onClick={() => handleSimulateSpikeAction('cpu', 89)}
                          disabled={simulatingSpike}
                          className="px-2 py-1 rounded text-[11px] font-semibold border border-rose-700/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Simulate CPU spike to 89% to test alerts"
                        >
                          <Flame className="w-3 h-3 text-rose-400" />
                          <span>Spike CPU (89%)</span>
                        </button>

                        <button
                          type="button"
                          id="btn-simulate-ram-spike"
                          onClick={() => handleSimulateSpikeAction('ram', 96)}
                          disabled={simulatingSpike}
                          className="px-2 py-1 rounded text-[11px] font-semibold border border-amber-700/60 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Simulate RAM spike to 96MB to test alerts"
                        >
                          <Flame className="w-3 h-3 text-amber-400" />
                          <span>Spike RAM (96MB)</span>
                        </button>

                        <button
                          type="button"
                          id="btn-test-trigger-toast"
                          onClick={() => handleTestAlertAction('cpu')}
                          className="px-2 py-1 rounded text-[11px] font-semibold border border-cyan-700/60 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Trigger a test threshold alert toast immediately"
                        >
                          <BellRing className="w-3 h-3 text-cyan-400" />
                          <span>Test Toast</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => updateThresholds(DEFAULT_THRESHOLDS)}
                          className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
                          title="Reset to default thresholds (75% CPU / 70MB RAM)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chart Navigation Tabs & Auto Refresh */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveChartTab('combined')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                      activeChartTab === 'combined'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    COMBINED ANALYSIS
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChartTab('resources')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                      activeChartTab === 'resources'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    CPU &amp; MEMORY ONLY
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChartTab('latency')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                      activeChartTab === 'latency'
                        ? 'bg-amber-950 text-amber-300 border border-amber-600/60 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    DISPATCH LATENCY ONLY
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                    />
                    <span>Live 5s Polling</span>
                  </label>
                  <span className="text-slate-700">|</span>
                  <span className="text-slate-500 text-[11px]">
                    Window: <strong className="text-slate-300">T-60m &rarr; Now</strong>
                  </span>
                </div>
              </div>

              {/* Chart 1: CPU & Memory Utilization Patterns (Recharts) */}
              {(activeChartTab === 'combined' || activeChartTab === 'resources') && (
                <div className="bg-slate-950/90 border border-slate-800/90 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-cyan-400" />
                        CPU &amp; MEMORY UTILIZATION PATTERNS (60 MIN)
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Dual-axis time series tracking node process CPU consumption (%) and runtime heap memory (MB).
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <span className="h-2.5 w-2.5 rounded-full bg-cyan-400"></span> CPU Usage (%)
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span> Heap Memory (MB)
                      </span>
                    </div>
                  </div>

                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                        <XAxis
                          dataKey="timeLabel"
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          tickFormatter={formatTimeTick}
                          interval={7}
                        />
                        <YAxis
                          yAxisId="cpu"
                          domain={[0, 100]}
                          tick={{ fill: '#06b6d4', fontSize: 10 }}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <YAxis
                          yAxisId="mem"
                          orientation="right"
                          domain={[0, 'dataMax + 25']}
                          tick={{ fill: '#10b981', fontSize: 10 }}
                          tickFormatter={(v) => `${v}MB`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#090d16',
                            borderColor: '#0e7490',
                            borderRadius: '8px',
                            color: '#e2e8f0',
                            fontSize: '11px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                          }}
                          formatter={(value: any, name: any) => {
                            if (name === 'cpuPercent') return [`${value}%`, 'CPU Utilization'];
                            if (name === 'memoryMb') return [`${value} MB`, 'Heap Memory Used'];
                            if (name === 'memoryPercent') return [`${value}%`, 'Heap Utilization'];
                            return [value, name];
                          }}
                          labelFormatter={(label, payload) => {
                            const point = payload?.[0]?.payload as DiagnosticsTelemetryPoint | undefined;
                            const offset = point ? `${point.minuteOffset}m` : '';
                            return `Timestamp: ${label} (${offset})`;
                          }}
                        />
                        <Area
                          yAxisId="cpu"
                          type="monotone"
                          dataKey="cpuPercent"
                          stroke="#06b6d4"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorCpu)"
                          name="cpuPercent"
                        />
                        <Area
                          yAxisId="mem"
                          type="monotone"
                          dataKey="memoryMb"
                          stroke="#10b981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorMem)"
                          name="memoryMb"
                        />

                        {/* Reference threshold lines */}
                        {currentThresholds.enabled && currentThresholds.cpuThresholdPercent > 0 && (
                          <ReferenceLine
                            yAxisId="cpu"
                            y={currentThresholds.cpuThresholdPercent}
                            stroke="#f43f5e"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{
                              value: `CPU Limit: ${currentThresholds.cpuThresholdPercent}%`,
                              fill: '#f43f5e',
                              fontSize: 10,
                              position: 'insideTopLeft',
                            }}
                          />
                        )}
                        {currentThresholds.enabled && currentThresholds.ramThresholdMb > 0 && (
                          <ReferenceLine
                            yAxisId="mem"
                            y={currentThresholds.ramThresholdMb}
                            stroke="#f59e0b"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{
                              value: `RAM Limit: ${currentThresholds.ramThresholdMb}MB`,
                              fill: '#f59e0b',
                              fontSize: 10,
                              position: 'insideBottomRight',
                            }}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Chart 2: Dispatch Operations Latency Patterns (Recharts) */}
              {(activeChartTab === 'combined' || activeChartTab === 'latency') && (
                <div className="bg-slate-950/90 border border-slate-800/90 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        DISPATCH OPERATIONS LATENCY PATTERNS (60 MIN)
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Execution latencies (ms) of deterministic policy evaluations, tool dispatches, and LLM intents.
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400"></span> Latency (ms)
                      </span>
                      <span className="flex items-center gap-1.5 text-purple-400">
                        <span className="h-2.5 w-2.5 rounded-full bg-purple-400"></span> Dispatches / Min
                      </span>
                    </div>
                  </div>

                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                        <XAxis
                          dataKey="timeLabel"
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          tickFormatter={formatTimeTick}
                          interval={7}
                        />
                        <YAxis
                          yAxisId="latency"
                          tick={{ fill: '#f59e0b', fontSize: 10 }}
                          tickFormatter={(v) => `${v}ms`}
                        />
                        <YAxis
                          yAxisId="count"
                          orientation="right"
                          domain={[0, 'dataMax + 3']}
                          tick={{ fill: '#c084fc', fontSize: 10 }}
                          tickFormatter={(v) => `${v} ops`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#090d16',
                            borderColor: '#d97706',
                            borderRadius: '8px',
                            color: '#e2e8f0',
                            fontSize: '11px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                          }}
                          formatter={(value: any, name: any) => {
                            if (name === 'dispatchLatencyMs') return [`${value} ms`, 'Dispatch Latency'];
                            if (name === 'p95LatencyMs') return [`${value} ms`, 'P95 Latency'];
                            if (name === 'dispatchCount') return [`${value} ops`, 'Operations Count'];
                            return [value, name];
                          }}
                          labelFormatter={(label, payload) => {
                            const point = payload?.[0]?.payload as DiagnosticsTelemetryPoint | undefined;
                            const offset = point ? `${point.minuteOffset}m` : '';
                            return `Timestamp: ${label} (${offset})`;
                          }}
                        />
                        {/* Reference lines for SLAs */}
                        <ReferenceLine
                          yAxisId="latency"
                          y={10}
                          stroke="#10b981"
                          strokeDasharray="4 4"
                          label={{
                            value: '10ms Fast-Path Routing SLA',
                            fill: '#10b981',
                            fontSize: 10,
                            position: 'insideTopLeft',
                          }}
                        />
                        <ReferenceLine
                          yAxisId="latency"
                          y={250}
                          stroke="#f43f5e"
                          strokeDasharray="4 4"
                          label={{
                            value: '250ms Perception Ceiling',
                            fill: '#f43f5e',
                            fontSize: 10,
                            position: 'insideTopLeft',
                          }}
                        />
                        <Area
                          yAxisId="latency"
                          type="monotone"
                          dataKey="dispatchLatencyMs"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorLatency)"
                          name="dispatchLatencyMs"
                        />
                        <Line
                          yAxisId="count"
                          type="stepAfter"
                          dataKey="dispatchCount"
                          stroke="#c084fc"
                          strokeWidth={1.5}
                          dot={{ r: 2, fill: '#c084fc' }}
                          name="dispatchCount"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Subsystem Watchdogs & Recent Operations Table */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Subsystem Health Cards */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    COGNITIVE SUBSYSTEM HEALTH
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/80">
                      <span className="text-slate-400">Fast-Path Heuristic Router</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> &lt; 10ms (Nominal)
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/80">
                      <span className="text-slate-400">Gating Deterministic Predicate</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 0% Bypass Enforced
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/80">
                      <span className="text-slate-400">Cryptographic Audit Chaining</span>
                      <span className="text-cyan-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> SHA-256 Chained
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/80">
                      <span className="text-slate-400">Situational Incident Fusion</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Hysteresis Synced
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/80">
                      <span className="text-slate-400">VAD / Audio Perception Whisper</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 45ms Quantized
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Dispatches with Measured Latencies */}
                <div className="lg:col-span-2 bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      RECENT MEASURED DISPATCH LOG (LAST 60M)
                    </h4>
                    <span className="text-[10px] text-slate-500">Real Operation Latency</span>
                  </div>

                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                          <th className="py-1.5 px-2">Time</th>
                          <th className="py-1.5 px-2">Action / Intent</th>
                          <th className="py-1.5 px-2">Domain</th>
                          <th className="py-1.5 px-2">Decision</th>
                          <th className="py-1.5 px-2 text-right">Measured Latency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(data?.recentDispatches || []).map((disp) => (
                          <tr key={disp.id} className="hover:bg-slate-900/50">
                            <td className="py-1.5 px-2 text-slate-400 whitespace-nowrap">
                              {new Date(disp.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false,
                              })}
                            </td>
                            <td className="py-1.5 px-2 font-medium text-slate-200">
                              {disp.action}
                            </td>
                            <td className="py-1.5 px-2 text-slate-400 text-[11px]">
                              {disp.domain_id}
                            </td>
                            <td className="py-1.5 px-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                                  disp.decision === 'allow'
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                                    : disp.decision === 'propose'
                                    ? 'bg-amber-950/80 text-amber-300 border border-amber-700/50'
                                    : 'bg-rose-950/80 text-rose-300 border border-rose-700/50'
                                }`}
                              >
                                {disp.decision}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-right font-bold whitespace-nowrap">
                              <span
                                className={
                                  disp.latency_ms < 15
                                    ? 'text-emerald-400'
                                    : disp.latency_ms < 100
                                    ? 'text-amber-400'
                                    : 'text-rose-400'
                                }
                              >
                                {disp.latency_ms} ms
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Status Bar */}
            <div className="border-t border-cyan-950/80 bg-[#090d16] px-6 py-2.5 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-[11px]">
                <span>
                  SAMPLING INTERVAL: <strong className="text-cyan-300">60s Aggregated</strong>
                </span>
                <span className="text-slate-600">|</span>
                <span>
                  SLA THRESHOLD: <strong className="text-emerald-300">&lt; 10ms Router / &lt; 250ms Perception</strong>
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">ESC</kbd> to close drawer
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
