import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Terminal, 
  Search, 
  Filter, 
  Trash2, 
  Download, 
  Play, 
  Pause, 
  ChevronDown, 
  ChevronRight, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Cpu, 
  ShieldCheck, 
  Zap,
  Activity,
  Copy,
  Check
} from 'lucide-react';
import { SystemLogEvent, LogLevel, LogCategory } from '../types/jarvis';

interface SystemLogsViewProps {
  onNavigateToTab?: (tab: string) => void;
}

export const SystemLogsView: React.FC<SystemLogsViewProps> = ({ onNavigateToTab }) => {
  const [logs, setLogs] = useState<SystemLogEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [streaming, setStreaming] = useState<boolean>(true);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [simulating, setSimulating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Initial fetch of logs
  const fetchInitialLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/logs?limit=300');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to load initial system logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Setup Server-Sent Events (SSE) stream
  useEffect(() => {
    fetchInitialLogs();

    if (!streaming) return;

    const es = new EventSource('/api/logs/stream');
    eventSourceRef.current = es;

    es.onopen = () => {
      // Stream connected
    };

    es.onmessage = (e) => {
      try {
        const eventData = JSON.parse(e.data);
        if (eventData.type === 'connected') return;
        
        setLogs((prev) => {
          // Avoid duplicate entries
          if (prev.some((l) => l.id === eventData.id)) return prev;
          const next = [...prev, eventData];
          if (next.length > 1000) return next.slice(-1000);
          return next;
        });
      } catch (err) {
        console.error('Error parsing SSE event in SystemLogsView:', err);
      }
    };

    es.onerror = () => {
      // Reconnection handled automatically by browser EventSource
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [streaming]);

  // Auto-scroll when new logs arrive if enabled
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Filter logs based on search, level, category
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedLevel !== 'ALL' && log.level !== selectedLevel) return false;
      if (selectedCategory !== 'ALL' && log.category !== selectedCategory) return false;
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const matchMsg = log.message.toLowerCase().includes(q);
        const matchSource = log.source.toLowerCase().includes(q);
        const matchCat = log.category.toLowerCase().includes(q);
        const matchMeta = log.metadata ? JSON.stringify(log.metadata).toLowerCase().includes(q) : false;
        return matchMsg || matchSource || matchCat || matchMeta;
      }
      return true;
    });
  }, [logs, selectedLevel, selectedCategory, searchTerm]);

  // Operational metrics summary
  const metrics = useMemo(() => {
    const errorCount = logs.filter((l) => l.level === 'ERROR').length;
    const warnCount = logs.filter((l) => l.level === 'WARN').length;
    const successCount = logs.filter((l) => l.level === 'SUCCESS').length;
    const dispatchCount = logs.filter((l) => l.category === 'DISPATCH').length;
    const statusChangeCount = logs.filter((l) => l.category === 'STATUS_CHANGE').length;
    const apiCount = logs.filter((l) => l.category === 'API').length;
    return { errorCount, warnCount, successCount, dispatchCount, statusChangeCount, apiCount, total: logs.length };
  }, [logs]);

  // Toggle JSON metadata view
  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Simulate real-time operational events
  const handleSimulateEvent = async (type: 'dispatch_success' | 'api_error' | 'status_change' | 'auth_gate') => {
    setSimulating(true);
    try {
      await fetch('/api/logs/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
    } catch (err) {
      console.error('Failed to simulate log event:', err);
    } finally {
      setSimulating(false);
    }
  };

  // Clear buffer
  const handleClearLogs = async () => {
    try {
      await fetch('/api/logs/clear', { method: 'POST' });
      setLogs([]);
      setExpandedLogIds(new Set());
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  // Export logs
  const handleExportLogs = (format: 'text' | 'json') => {
    let content = '';
    let filename = `jarvis_system_logs_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    let mimeType = 'text/plain';

    if (format === 'json') {
      content = JSON.stringify(filteredLogs, null, 2);
      filename += '.json';
      mimeType = 'application/json';
    } else {
      content = filteredLogs
        .map((l) => {
          const time = new Date(l.timestamp).toISOString();
          const meta = l.metadata ? ` | META: ${JSON.stringify(l.metadata)}` : '';
          return `[${time}] [${l.level.padEnd(7)}] [${l.category.padEnd(13)}] (${l.source}) ${l.message}${meta}`;
        })
        .join('\n');
      filename += '.log';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyLog = (log: SystemLogEvent) => {
    const text = `[${new Date(log.timestamp).toISOString()}] [${log.level}] [${log.category}] (${log.source}) ${log.message}`;
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-700/60">
            <CheckCircle2 className="w-2.5 h-2.5" />
            SUCCESS
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-rose-950/90 text-rose-400 border border-rose-700/80 animate-pulse">
            <AlertCircle className="w-2.5 h-2.5" />
            ERROR
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-950/80 text-amber-400 border border-amber-700/60">
            <AlertTriangle className="w-2.5 h-2.5" />
            WARN
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
            <Info className="w-2.5 h-2.5" />
            INFO
          </span>
        );
    }
  };

  const getCategoryBadge = (category: LogCategory) => {
    switch (category) {
      case 'DISPATCH':
        return <span className="text-cyan-400 font-semibold">[DISPATCH]</span>;
      case 'API':
        return <span className="text-indigo-400 font-semibold">[API]</span>;
      case 'AUTH_GATE':
        return <span className="text-amber-400 font-semibold">[AUTH_GATE]</span>;
      case 'STATUS_CHANGE':
        return <span className="text-emerald-400 font-semibold">[STATUS_CHANGE]</span>;
      case 'PERCEPTION':
        return <span className="text-rose-400 font-semibold">[PERCEPTION]</span>;
      case 'CRYPTO_AUDIT':
        return <span className="text-violet-400 font-semibold">[CRYPTO_AUDIT]</span>;
      case 'SYSTEM':
      default:
        return <span className="text-slate-400 font-semibold">[SYSTEM]</span>;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const d = new Date(timestamp);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  };

  return (
    <div id="system-logs-container" className="space-y-4">
      {/* Top Banner & Overview */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 md:p-5 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
                  Operational System Logs
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                    streaming 
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60' 
                      : 'bg-amber-950/60 text-amber-400 border-amber-700/60'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${streaming ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
                    {streaming ? 'LIVE STREAM (SSE)' : 'STREAM PAUSED'}
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Real-time event bus capturing timestamped state changes, API HTTP status codes, and dispatch executions
                </p>
              </div>
            </div>
          </div>

          {/* Quick Simulation Injectors */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500 mr-1 hidden lg:inline">SIMULATE:</span>
            <button
              id="btn-sim-dispatch"
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateEvent('dispatch_success')}
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/80 hover:border-emerald-500/80 hover:bg-emerald-950/40 text-[11px] font-mono text-slate-300 hover:text-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Simulate Dispatch Success"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              + Dispatch
            </button>
            <button
              id="btn-sim-status"
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateEvent('status_change')}
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/80 hover:border-cyan-500/80 hover:bg-cyan-950/40 text-[11px] font-mono text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Simulate Device Status Change"
            >
              <Cpu className="w-3 h-3 text-cyan-400" />
              + Status Change
            </button>
            <button
              id="btn-sim-gate"
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateEvent('auth_gate')}
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/80 hover:border-amber-500/80 hover:bg-amber-950/40 text-[11px] font-mono text-slate-300 hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Simulate 2FA Gate Escalation"
            >
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              + Gate Req
            </button>
            <button
              id="btn-sim-error"
              type="button"
              disabled={simulating}
              onClick={() => handleSimulateEvent('api_error')}
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/80 hover:border-rose-500/80 hover:bg-rose-950/40 text-[11px] font-mono text-slate-300 hover:text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Simulate API 502/Error"
            >
              <AlertCircle className="w-3 h-3 text-rose-400" />
              + API Error
            </button>
          </div>
        </div>

        {/* Operational Metrics Ticker */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4 pt-4 border-t border-slate-800/80 font-mono text-xs">
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase">BUFFER SIZE</span>
            <span className="text-base font-bold text-slate-200 mt-0.5 block">{metrics.total} Events</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase">DISPATCH SUCCESS</span>
            <span className="text-base font-bold text-emerald-400 mt-0.5 block">{metrics.dispatchCount}</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase">STATUS CHANGES</span>
            <span className="text-base font-bold text-cyan-400 mt-0.5 block">{metrics.statusChangeCount}</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase">API REQUESTS</span>
            <span className="text-base font-bold text-indigo-400 mt-0.5 block">{metrics.apiCount}</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase">GATE WARNINGS</span>
            <span className="text-base font-bold text-amber-400 mt-0.5 block">{metrics.warnCount}</span>
          </div>
          <div className={`p-2.5 rounded-lg border ${metrics.errorCount > 0 ? 'bg-rose-950/40 border-rose-800/70' : 'bg-slate-900/60 border-slate-800'}`}>
            <span className="text-[10px] text-slate-500 block uppercase">API / SYS ERRORS</span>
            <span className={`text-base font-bold mt-0.5 block ${metrics.errorCount > 0 ? 'text-rose-400 font-black' : 'text-slate-400'}`}>
              {metrics.errorCount}
            </span>
          </div>
        </div>
      </div>

      {/* Terminal Container */}
      <div className="bg-[#02050b] border border-cyan-950/80 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Terminal Header & Navigation Bar */}
        <div className="bg-[#070d18] border-b border-cyan-950/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs select-none">
          {/* Mac-style traffic lights & Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80 border border-rose-600/60"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 border border-amber-600/60"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 border border-emerald-600/60"></div>
            </div>
            <span className="text-slate-400 font-semibold tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              JARVIS_OS://telemetry/var/log/operational.log
            </span>
          </div>

          {/* Terminal Controls */}
          <div className="flex items-center gap-2">
            {/* Auto-scroll toggle */}
            <button
              type="button"
              id="btn-toggle-autoscroll"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                autoScroll
                  ? 'bg-cyan-950/80 border-cyan-700/80 text-cyan-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Automatically scroll terminal to latest entry"
            >
              <span>AUTO-SCROLL:</span>
              <span className={autoScroll ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
                {autoScroll ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Stream toggle */}
            <button
              type="button"
              id="btn-toggle-stream"
              onClick={() => setStreaming(!streaming)}
              className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                streaming
                  ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-amber-950/70 border-amber-700/80 text-amber-300 hover:bg-amber-900/60'
              }`}
              title={streaming ? 'Pause live streaming' : 'Resume live streaming'}
            >
              {streaming ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {streaming ? 'PAUSE' : 'RESUME'}
            </button>

            {/* Clear button */}
            <button
              type="button"
              id="btn-clear-logs"
              onClick={handleClearLogs}
              className="px-2 py-1 rounded text-[11px] font-semibold bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-rose-400 hover:border-rose-800/80 transition-colors cursor-pointer flex items-center gap-1"
              title="Clear current terminal log buffer"
            >
              <Trash2 className="w-3 h-3" />
              CLEAR
            </button>

            {/* Export Dropdown */}
            <div className="flex items-center rounded overflow-hidden border border-slate-700/80 bg-slate-900">
              <button
                type="button"
                id="btn-export-log-txt"
                onClick={() => handleExportLogs('text')}
                className="px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                title="Download raw .log text format"
              >
                <Download className="w-3 h-3" />
                .LOG
              </button>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                id="btn-export-log-json"
                onClick={() => handleExportLogs('json')}
                className="px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Download structured JSON format"
              >
                JSON
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#050912] border-b border-slate-900 p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              id="terminal-log-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="grep -i [pattern, device, error, status, action]..."
              className="w-full bg-[#03060f] border border-slate-800 rounded px-2.5 py-1 pl-8 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-[10px]"
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-500 uppercase">CAT:</span>
            {(['ALL', 'DISPATCH', 'STATUS_CHANGE', 'API', 'AUTH_GATE', 'CRYPTO_AUDIT', 'PERCEPTION', 'SYSTEM'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-600/80 font-bold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase">LVL:</span>
            {(['ALL', 'INFO', 'SUCCESS', 'WARN', 'ERROR'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  selectedLevel === lvl
                    ? 'bg-slate-800 text-slate-100 border border-slate-600 font-bold'
                    : 'bg-slate-900/40 text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Terminal Output Screen */}
        <div 
          id="terminal-output-viewport"
          className="h-[560px] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed space-y-1 select-text scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
        >
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
              <span>Connecting to JARVIS operational telemetry event bus...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
              <Filter className="w-6 h-6 text-slate-600" />
              <span>No operational log entries matched current filter parameters.</span>
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setSelectedCategory('ALL'); setSelectedLevel('ALL'); }}
                className="text-xs text-cyan-400 hover:underline mt-1 cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogIds.has(log.id);
              const isCopied = copiedId === log.id;

              return (
                <div 
                  key={log.id} 
                  className={`group rounded px-2 py-1 transition-colors border ${
                    log.level === 'ERROR'
                      ? 'bg-rose-950/20 border-rose-900/40 hover:bg-rose-950/30'
                      : log.level === 'WARN'
                      ? 'bg-amber-950/15 border-amber-900/30 hover:bg-amber-950/25'
                      : 'hover:bg-slate-900/60 border-transparent hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-wrap md:flex-nowrap">
                    {/* Timestamp */}
                    <span className="text-slate-500 shrink-0 select-none font-mono">
                      [{formatTimestamp(log.timestamp)}]
                    </span>

                    {/* Level Badge */}
                    <div className="shrink-0">{getLevelBadge(log.level)}</div>

                    {/* Category Tag */}
                    <div className="shrink-0">{getCategoryBadge(log.category)}</div>

                    {/* Source Subsystem */}
                    <span className="text-slate-400 shrink-0 font-mono text-[10px]">
                      ({log.source}):
                    </span>

                    {/* Main Log Message Text */}
                    <span className={`flex-1 break-words ${
                      log.level === 'ERROR'
                        ? 'text-rose-200 font-semibold'
                        : log.level === 'WARN'
                        ? 'text-amber-200'
                        : log.level === 'SUCCESS'
                        ? 'text-emerald-200'
                        : 'text-slate-200'
                    }`}>
                      {log.message}
                    </span>

                    {/* Actions: Metadata Toggle & Copy */}
                    <div className="shrink-0 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      {log.metadata && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(log.id)}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-cyan-300 hover:border-cyan-600/60 transition-colors flex items-center gap-0.5 cursor-pointer"
                          title="Inspect structured metadata payload"
                        >
                          {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                          JSON
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyLog(log)}
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Copy log entry to clipboard"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Metadata JSON Inspector */}
                  {isExpanded && log.metadata && (
                    <div className="mt-1.5 ml-6 p-2.5 rounded bg-[#010307] border border-slate-800 text-[10px] text-slate-300 font-mono overflow-x-auto shadow-inner">
                      <div className="text-slate-500 font-bold mb-1 flex items-center justify-between">
                        <span>// STRUCTURED PAYLOAD [ID: {log.id}]</span>
                        <span className="text-[9px] text-slate-600">{log.iso_time}</span>
                      </div>
                      <pre className="text-cyan-300 leading-tight">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Terminal Command Line Anchor & Blinking Cursor */}
          <div ref={terminalEndRef} className="pt-2 flex items-center gap-2 text-slate-500 font-mono text-[11px] select-none">
            <span className="text-emerald-400 font-bold">jarvis@cognitive-os:~$</span>
            <span className="text-slate-400">tail -f /var/log/operational.log</span>
            <span className="inline-block w-2 h-3.5 bg-cyan-400 animate-pulse ml-0.5"></span>
          </div>
        </div>

        {/* Terminal Footer Status Bar */}
        <div className="bg-[#050912] border-t border-cyan-950/60 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>STREAM:</span>
              <span className="text-emerald-400 font-semibold">{streaming ? 'ACTIVE_LISTENER' : 'IDLE'}</span>
            </span>
            <span>&bull;</span>
            <span>DISPLAYED: <span className="text-slate-300 font-semibold">{filteredLogs.length}</span> / {logs.length}</span>
          </div>

          <div className="flex items-center gap-3">
            <span>MAX RING BUFFER: <span className="text-slate-400">1000 ENTRIES</span></span>
            <span>&bull;</span>
            <span className="text-slate-400">ENCODING: UTF-8</span>
          </div>
        </div>
      </div>
    </div>
  );
};
