import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CommandTerminal } from './components/CommandTerminal';
import { PipelineVisualizer } from './components/PipelineVisualizer';
import { ApprovalGatePanel } from './components/ApprovalGatePanel';
import { AuditTrailExplorer } from './components/AuditTrailExplorer';
import { DomainLedger } from './components/DomainLedger';
import { SituationalRadar } from './components/SituationalRadar';
import { DeviceStorePanel } from './components/DeviceStorePanel';
import { VerificationContractsPanel } from './components/VerificationContractsPanel';
import { NeuralChatPanel } from './components/NeuralChatPanel';
import { SystemDiagnosticsDrawer } from './components/SystemDiagnosticsDrawer';
import { SystemLogsView } from './components/SystemLogsView';
import { 
  DashboardResourceWarningBanner, 
  ToastAlertContainer 
} from './components/ThresholdAlertsBanner';
import { 
  ActionProposal, 
  AuditBlock, 
  AuditVerificationResult, 
  DeviceState, 
  DispatchResult, 
  DomainDefinition, 
  PendingApproval, 
  ProactiveAlert, 
  SeismicEvent, 
  WildfireEvent, 
  AircraftTelemetry,
  VerificationContractTest,
  DiagnosticThresholds,
  ThresholdAlert,
  SystemDiagnosticsData
} from './types/jarvis';
import { 
  DEFAULT_THRESHOLDS, 
  loadThresholds, 
  saveThresholds, 
  evaluateThresholds, 
  playAlertBeep 
} from './utils/thresholds';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('terminal');
  const [loading, setLoading] = useState<boolean>(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState<boolean>(false);

  // Diagnostics Watchdog & Threshold Policies
  const [thresholds, setThresholds] = useState<DiagnosticThresholds>(() => loadThresholds());
  const [activeThresholdAlert, setActiveThresholdAlert] = useState<ThresholdAlert | null>(null);
  const [thresholdToasts, setThresholdToasts] = useState<ThresholdAlert[]>([]);
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);
  const [snoozedUntil, setSnoozedUntil] = useState<number>(0);
  const [latestDiagnostics, setLatestDiagnostics] = useState<SystemDiagnosticsData | null>(null);

  const handleUpdateThresholds = (newThresholds: DiagnosticThresholds) => {
    setThresholds(newThresholds);
    saveThresholds(newThresholds);
    if (latestDiagnostics) {
      const { alert } = evaluateThresholds(
        latestDiagnostics.summary.currentCpu,
        latestDiagnostics.summary.currentMemoryMb,
        newThresholds
      );
      setActiveThresholdAlert(alert);
    }
  };

  // Core System State
  const [domains, setDomains] = useState<DomainDefinition[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [auditChain, setAuditChain] = useState<AuditBlock[]>([]);
  const [merkleRoot, setMerkleRoot] = useState<string>('');
  const [devices, setDevices] = useState<DeviceState[]>([]);
  const [seismicEvents, setSeismicEvents] = useState<SeismicEvent[]>([]);
  const [wildfireEvents, setWildfireEvents] = useState<WildfireEvent[]>([]);
  const [aircraftTelemetry, setAircraftTelemetry] = useState<AircraftTelemetry[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<ProactiveAlert[]>([]);
  const [hysteresisStatus, setHysteresisStatus] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Active Pipeline State
  const [lastProposal, setLastProposal] = useState<ActionProposal | null>(null);
  const [lastResult, setLastResult] = useState<DispatchResult | null>(null);

  // Data Fetching
  const fetchAllData = async () => {
    try {
      const [
        healthRes,
        domainsRes,
        approvalsRes,
        auditRes,
        intelRes,
        devicesRes,
      ] = await Promise.all([
        fetch('/api/health').then((r) => r.json()),
        fetch('/api/domains').then((r) => r.json()),
        fetch('/api/approvals').then((r) => r.json()),
        fetch('/api/audit').then((r) => r.json()),
        fetch('/api/intel').then((r) => r.json()),
        fetch('/api/devices').then((r) => r.json()),
      ]);

      setSystemHealth(healthRes);
      setDomains(domainsRes.domains || []);
      setPendingApprovals(approvalsRes.pending || []);
      setAuditChain(auditRes.chain || []);
      setMerkleRoot(auditRes.merkle_root || '');
      setDevices(devicesRes.devices || []);
      setSeismicEvents(intelRes.seismic || []);
      setWildfireEvents(intelRes.wildfire || []);
      setAircraftTelemetry(intelRes.aircraft || []);
      setActiveAlerts(intelRes.active_alerts || []);
      setHysteresisStatus(intelRes.hysteresis_status || null);
    } catch (err) {
      console.error('Failed to sync JARVIS state:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000); // 10s telemetry heartbeat
    return () => clearInterval(interval);
  }, []);

  // Dedicated Telemetry Watchdog & Threshold Evaluation
  const syncDiagnostics = async () => {
    try {
      const res = await fetch('/api/diagnostics');
      if (!res.ok) return;
      const data: SystemDiagnosticsData = await res.json();
      setLatestDiagnostics(data);

      const { cpuExceeded, ramExceeded, alert } = evaluateThresholds(
        data.summary.currentCpu,
        data.summary.currentMemoryMb,
        thresholds
      );

      setActiveThresholdAlert(alert);

      if (alert && thresholds.enabled && thresholds.toastAlerts) {
        const now = Date.now();
        const isSnoozed = now < snoozedUntil;
        const cooldownMs = (thresholds.cooldownSeconds || 25) * 1000;
        const cooldownPassed = now - lastAlertTime > cooldownMs;

        if (!isSnoozed && cooldownPassed) {
          setThresholdToasts((prev) => [alert, ...prev.slice(0, 2)]);
          setLastAlertTime(now);
          if (thresholds.soundEnabled) {
            playAlertBeep();
          }
        }
      }
    } catch {
      // transient telemetry error
    }
  };

  useEffect(() => {
    syncDiagnostics();
    const interval = setInterval(syncDiagnostics, 5000);
    return () => clearInterval(interval);
  }, [thresholds, snoozedUntil, lastAlertTime]);

  const handleSimulateSpike = async (type: 'cpu' | 'ram', value?: number) => {
    try {
      const res = await fetch('/api/diagnostics/simulate-spike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value }),
      });
      const data = await res.json();
      if (data.diagnostics) {
        setLatestDiagnostics(data.diagnostics);
        const { alert } = evaluateThresholds(
          data.diagnostics.summary.currentCpu,
          data.diagnostics.summary.currentMemoryMb,
          thresholds
        );
        setActiveThresholdAlert(alert);
        if (alert) {
          setThresholdToasts((prev) => [alert, ...prev.slice(0, 2)]);
          if (thresholds.soundEnabled) {
            playAlertBeep();
          }
        }
      }
    } catch (err) {
      console.error('Failed to simulate spike:', err);
    }
  };

  const handleTriggerTestAlert = (type: 'cpu' | 'ram' = 'cpu') => {
    const fakeAlert: ThresholdAlert = {
      id: `test_alert_${Date.now()}`,
      metric: type,
      label: type === 'cpu' ? 'Simulated CPU Threshold Breach' : 'Simulated RAM Threshold Breach',
      currentCpu: type === 'cpu' ? 89 : 34,
      cpuThreshold: thresholds.cpuThresholdPercent,
      currentRam: type === 'ram' ? 96 : 48,
      ramThreshold: thresholds.ramThresholdMb,
      message: type === 'cpu' 
        ? `CPU utilization surged to 89%, breaching limit (${thresholds.cpuThresholdPercent}%)`
        : `RAM footprint surged to 96MB, breaching limit (${thresholds.ramThresholdMb}MB)`,
      timestamp: Date.now(),
      severity: 'warning',
    };
    setActiveThresholdAlert(fakeAlert);
    setThresholdToasts((prev) => [fakeAlert, ...prev.slice(0, 2)]);
    if (thresholds.soundEnabled) {
      playAlertBeep();
    }
  };

  // Handlers
  const handleDispatch = async (
    query: string,
    mode: 'heuristic' | 'llm'
  ): Promise<{ proposal: ActionProposal; result: DispatchResult } | null> => {
    setLoading(true);
    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mode, caller_id: 'operator_alpha' }),
      });
      const data = await res.json();
      setLastProposal(data.proposal);
      setLastResult(data.result);
      await fetchAllData();
      return data;
    } catch (err) {
      console.error('Dispatch failed:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (proposalId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/approvals/${proposalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver_id: 'operator_alpha' }),
      });
      const data = await res.json();
      if (data.result) {
        setLastResult(data.result);
      }
      await fetchAllData();
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (proposalId: string, reason: string) => {
    setLoading(true);
    try {
      await fetch(`/api/approvals/${proposalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, approver_id: 'operator_alpha' }),
      });
      await fetchAllData();
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChain = async (): Promise<AuditVerificationResult> => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit/verify', { method: 'POST' });
      const data = await res.json();
      await fetchAllData();
      return data;
    } finally {
      setLoading(false);
    }
  };

  const handleTamperChain = async (blockIndex: number) => {
    setLoading(true);
    try {
      await fetch('/api/audit/tamper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block_index: blockIndex }),
      });
      await fetchAllData();
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreChain = async () => {
    setLoading(true);
    try {
      await fetch('/api/audit/restore', { method: 'POST' });
      await fetchAllData();
    } finally {
      setLoading(false);
    }
  };

  const handleInjectHazard = async (type: 'seismic' | 'wildfire' | 'airspace', severity: number) => {
    setLoading(true);
    try {
      await fetch('/api/intel/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, severity }),
      });
      await fetchAllData();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDevice = async (
    deviceId: string,
    update: Record<string, any>
  ): Promise<DispatchResult | null> => {
    setLoading(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state_update: update }),
      });
      const data = await res.json();
      setLastProposal(data.proposal);
      setLastResult(data.result);
      await fetchAllData();
      return data.result;
    } finally {
      setLoading(false);
    }
  };

  const handleRunContracts = async (): Promise<{
    all_passed: boolean;
    tests: VerificationContractTest[];
  }> => {
    setLoading(true);
    try {
      const res = await fetch('/api/tests/run', { method: 'POST' });
      const data = await res.json();
      await fetchAllData();
      return data;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#04070d] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingApprovalsCount={pendingApprovals.length}
        activeAlertsCount={activeAlerts.length}
        systemHealth={systemHealth}
        onOpenDiagnostics={() => setDiagnosticsOpen(true)}
        hasThresholdBreach={Boolean(activeThresholdAlert)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Resource Threshold Watchdog Warning Banner */}
        <DashboardResourceWarningBanner
          alert={activeThresholdAlert}
          thresholds={thresholds}
          onOpenDiagnostics={() => setDiagnosticsOpen(true)}
          onDismiss={() => setActiveThresholdAlert(null)}
        />

        {/* Global Pipeline Visualizer (always shown on terminal or approvals tab) */}
        {(activeTab === 'terminal' || activeTab === 'approvals') && (
          <PipelineVisualizer
            lastProposal={lastProposal}
            lastResult={lastResult}
          />
        )}

        {/* Tab 1: Command Terminal */}
        {activeTab === 'terminal' && (
          <div className="space-y-6">
            <CommandTerminal
              onDispatch={handleDispatch}
              loading={loading}
              onNavigateToTab={setActiveTab}
            />

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
              <div 
                id="quick-metric-approvals"
                onClick={() => setActiveTab('approvals')}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-amber-600/60 p-3 rounded-lg cursor-pointer transition-all"
              >
                <div className="text-[10px] text-slate-400">PENDING 2FA APPROVALS</div>
                <div className="text-xl font-bold text-amber-400 mt-1">
                  {pendingApprovals.length} Enqueued
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Click to view gate &rarr;</div>
              </div>

              <div 
                id="quick-metric-audit"
                onClick={() => setActiveTab('audit')}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-cyan-600/60 p-3 rounded-lg cursor-pointer transition-all"
              >
                <div className="text-[10px] text-slate-400">HASH CHAIN LEDGER</div>
                <div className="text-xl font-bold text-cyan-400 mt-1">
                  {auditChain.length} Blocks
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">SHA-256 Chained &rarr;</div>
              </div>

              <div 
                id="quick-metric-radar"
                onClick={() => setActiveTab('radar')}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-rose-600/60 p-3 rounded-lg cursor-pointer transition-all"
              >
                <div className="text-[10px] text-slate-400">PROACTIVE HAZARDS</div>
                <div className="text-xl font-bold text-rose-400 mt-1">
                  {activeAlerts.length} Active
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Hysteresis Synced &rarr;</div>
              </div>

              <div 
                id="quick-metric-chat"
                onClick={() => setActiveTab('chat')}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/60 p-3 rounded-lg cursor-pointer transition-all"
              >
                <div className="text-[10px] text-slate-400">NEURAL TACTICAL COPILOT</div>
                <div className="text-xl font-bold text-cyan-300 mt-1">
                  Gemini 3.5 Active
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Open AI Chat &rarr;</div>
              </div>

              <div 
                id="quick-metric-logs"
                onClick={() => setActiveTab('logs')}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/60 p-3 rounded-lg cursor-pointer transition-all bg-gradient-to-br from-emerald-950/20 to-transparent"
              >
                <div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-between">
                  <span>SYSTEM LOGS</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <div className="text-xl font-bold text-slate-100 mt-1">
                  Live Stream
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-0.5">Terminal events &rarr;</div>
              </div>

              {/* System Diagnostics Quick Metric with Dynamic Alert State */}
              <div 
                id="quick-metric-diagnostics"
                onClick={() => setDiagnosticsOpen(true)}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  activeThresholdAlert
                    ? 'bg-rose-950/40 border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:border-rose-400'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-cyan-400/70 bg-gradient-to-br from-cyan-950/30 to-transparent'
                }`}
              >
                <div className={`text-[10px] font-semibold flex items-center justify-between ${
                  activeThresholdAlert ? 'text-rose-400' : 'text-cyan-400'
                }`}>
                  <span>DIAGNOSTICS</span>
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      activeThresholdAlert ? 'bg-rose-500' : 'bg-cyan-400'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      activeThresholdAlert ? 'bg-rose-500' : 'bg-cyan-500'
                    }`}></span>
                  </span>
                </div>
                <div className={`text-xl font-bold mt-1 ${
                  activeThresholdAlert ? 'text-rose-200' : 'text-slate-100'
                }`}>
                  {activeThresholdAlert ? 'LIMIT EXCEEDED' : '60m Window'}
                </div>
                <div className={`text-[10px] mt-0.5 ${
                  activeThresholdAlert ? 'text-rose-300 font-bold' : 'text-cyan-300'
                }`}>
                  {activeThresholdAlert 
                    ? `CPU: ${activeThresholdAlert.currentCpu}% | RAM: ${activeThresholdAlert.currentRam}MB`
                    : 'CPU • RAM • Latency →'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Neural AI Chat & Strategic Intelligence */}
        {activeTab === 'chat' && (
          <NeuralChatPanel onNavigateToTab={setActiveTab} />
        )}

        {/* Tab 3: Approval Gate */}
        {activeTab === 'approvals' && (
          <ApprovalGatePanel
            pendingApprovals={pendingApprovals}
            onApprove={handleApprove}
            onReject={handleReject}
            onRefresh={fetchAllData}
            loading={loading}
          />
        )}

        {/* Tab 3: Audit Trail Explorer */}
        {activeTab === 'audit' && (
          <AuditTrailExplorer
            chain={auditChain}
            merkleRoot={merkleRoot}
            onVerify={handleVerifyChain}
            onTamper={handleTamperChain}
            onRestore={handleRestoreChain}
            onRefresh={fetchAllData}
            loading={loading}
          />
        )}

        {/* Tab 4: Domain Taxonomy Ledger */}
        {activeTab === 'domains' && (
          <DomainLedger domains={domains} />
        )}

        {/* Tab 5: Situational Radar */}
        {activeTab === 'radar' && (
          <SituationalRadar
            seismic={seismicEvents}
            wildfire={wildfireEvents}
            aircraft={aircraftTelemetry}
            alerts={activeAlerts}
            hysteresisStatus={hysteresisStatus}
            onInjectHazard={handleInjectHazard}
            onRefresh={fetchAllData}
            loading={loading}
          />
        )}

        {/* Tab 6: Estate Devices */}
        {activeTab === 'devices' && (
          <DeviceStorePanel
            devices={devices}
            onToggleDevice={handleToggleDevice}
            onRefresh={fetchAllData}
            loading={loading}
            onNavigateToTab={setActiveTab}
          />
        )}

        {/* Tab 7: Operational System Logs */}
        {activeTab === 'logs' && (
          <SystemLogsView onNavigateToTab={setActiveTab} />
        )}

        {/* Tab 8: Verification Contracts */}
        {activeTab === 'contracts' && (
          <VerificationContractsPanel
            onRunTests={handleRunContracts}
            loading={loading}
          />
        )}
      </main>

      {/* System Diagnostics Drawer (60-minute Recharts CPU, Memory, Latency + Thresholds Watchdog) */}
      <SystemDiagnosticsDrawer
        isOpen={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
        thresholds={thresholds}
        onUpdateThresholds={handleUpdateThresholds}
        activeAlert={activeThresholdAlert}
        onSimulateSpike={handleSimulateSpike}
        onTriggerTestAlert={handleTriggerTestAlert}
      />

      {/* Floating Tactical Toast Alerts */}
      <ToastAlertContainer
        toasts={thresholdToasts}
        onOpenDiagnostics={() => setDiagnosticsOpen(true)}
        onDismissToast={(id) => setThresholdToasts((prev) => prev.filter((t) => t.id !== id))}
        onSnoozeToasts={() => {
          setSnoozedUntil(Date.now() + 5 * 60 * 1000);
          setThresholdToasts([]);
        }}
      />

      {/* Footer & Governing Equation */}
      <footer className="border-t border-slate-900 bg-[#020509] p-4 text-center font-mono text-[11px] text-slate-500">
        <div className="max-w-4xl mx-auto space-y-1">
          <div className="text-slate-400 font-semibold tracking-wider">
            JARVIS = [ (Perception Fusion &times; Contextual Reasoning &times; Gated Action) / Latency ] + Continuous Trust Calibration
          </div>
          <div>
            Deterministic Permission Gate &bull; Single Cryptographic SHA-256 Audit Trail &bull; Fail-Closed Security Architecture
          </div>
        </div>
      </footer>
    </div>
  );
}
