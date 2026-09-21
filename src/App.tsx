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
  VerificationContractTest
} from './types/jarvis';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('terminal');
  const [loading, setLoading] = useState<boolean>(false);

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

  const handleInjectHazard = async (type: 'seismic' | 'airspace', severity: number) => {
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
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
              <div 
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
                onClick={() => setActiveTab('chat')}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/60 p-3 rounded-lg cursor-pointer transition-all"
              >
                <div className="text-[10px] text-slate-400">NEURAL TACTICAL COPILOT</div>
                <div className="text-xl font-bold text-cyan-300 mt-1">
                  Gemini 3.5 Active
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Open AI Chat &rarr;</div>
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

        {/* Tab 7: Verification Contracts */}
        {activeTab === 'contracts' && (
          <VerificationContractsPanel
            onRunTests={handleRunContracts}
            loading={loading}
          />
        )}
      </main>

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
