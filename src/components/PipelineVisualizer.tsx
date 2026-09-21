import React from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ShieldCheck, 
  Terminal, 
  Cpu, 
  Lock,
  Hash
} from 'lucide-react';
import { ActionProposal, DispatchResult } from '../types/jarvis';

interface PipelineVisualizerProps {
  lastProposal: ActionProposal | null;
  lastResult: DispatchResult | null;
}

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({
  lastProposal,
  lastResult,
}) => {
  if (!lastProposal || !lastResult) {
    return (
      <div className="border border-slate-800/80 bg-slate-950/60 rounded p-4 font-mono text-xs text-slate-500 flex items-center justify-center gap-2">
        <Cpu className="w-4 h-4 text-cyan-600 animate-spin" />
        <span>Awaiting input dispatch stream... Pipeline standing by in Fail-Closed state.</span>
      </div>
    );
  }

  const isAllowed = lastResult.decision === 'allow';
  const isProposed = lastResult.decision === 'propose';
  const isRefused = lastResult.decision === 'refuse';

  return (
    <div className="border border-cyan-950/80 bg-[#090e17] rounded-lg p-4 font-mono">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-200 tracking-wider">
            UNIFIED COGNITION & GATED DISPATCH PIPELINE
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            Latency: {lastResult.latency_ms}ms
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Proposal ID: <span className="text-cyan-400">{lastProposal.id}</span>
        </div>
      </div>

      {/* Visual Pipeline Flow */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
        {/* Step 1: Input & Auth */}
        <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 text-center">
          <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">1. Ingestion & Auth</div>
          <div className="text-xs text-cyan-300 font-medium truncate flex items-center justify-center gap-1">
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span>{lastProposal.caller_id}</span>
          </div>
          <div className="text-[10px] text-emerald-400 mt-1">Origin Verified</div>
        </div>

        {/* Step 2: Intent Router */}
        <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 text-center">
          <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">2. Domain Classifier</div>
          <div className="text-xs text-amber-300 font-medium truncate">
            {lastProposal.domain_id}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Fast-Path Match</div>
        </div>

        {/* Step 3: Action Proposal */}
        <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 text-center">
          <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">3. Proposal Synth</div>
          <div className="text-xs text-cyan-200 font-medium truncate">
            {lastProposal.action}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Tool: {lastProposal.tool_name}</div>
        </div>

        {/* Step 4: Dispatch Predicate */}
        <div className="bg-slate-900/90 border border-cyan-800/60 rounded p-2.5 text-center shadow-[0_0_10px_rgba(6,182,212,0.1)]">
          <div className="text-[10px] text-cyan-400 uppercase font-bold mb-1">4. Dispatch Gate</div>
          <div className="text-xs text-slate-200 font-medium">evaluate_dispatch()</div>
          <div className="text-[10px] text-cyan-300 mt-1">Deterministic OPA</div>
        </div>

        {/* Step 5: Terminal Outcome */}
        <div className={`rounded p-2.5 text-center border ${
          isAllowed
            ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
            : isProposed
            ? 'bg-amber-950/40 border-amber-500/60 text-amber-300'
            : 'bg-rose-950/40 border-rose-500/60 text-rose-300'
        }`}>
          <div className="text-[10px] uppercase font-bold mb-1 flex items-center justify-center gap-1">
            {isAllowed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            {isProposed && <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
            {isRefused && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
            <span>5. {lastResult.decision.toUpperCase()}</span>
          </div>
          <div className="text-[11px] font-semibold">
            {isAllowed && 'Dispatched to Tool'}
            {isProposed && 'Queued for 2FA Sign'}
            {isRefused && 'Hard Refusal Enforced'}
          </div>
          <div className="text-[10px] opacity-80 mt-1">
            {lastResult.block_index !== undefined ? `Block #${lastResult.block_index}` : 'Audit Record Written'}
          </div>
        </div>
      </div>

      {/* Outcome Rationale Banner */}
      <div className={`mt-3 p-3 rounded text-xs border ${
        isAllowed
          ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200'
          : isProposed
          ? 'bg-amber-950/20 border-amber-900/50 text-amber-200'
          : 'bg-rose-950/20 border-rose-900/50 text-rose-200'
      }`}>
        <div className="font-semibold mb-0.5">Policy Gate Evaluation Reason:</div>
        <div>{lastResult.reason}</div>
        {lastResult.alternative && (
          <div className="mt-2 pt-2 border-t border-rose-900/40 text-[11px] text-cyan-300">
            <span className="font-semibold text-rose-300">Safe Alternative Declared:</span> {lastResult.alternative}
          </div>
        )}
      </div>
    </div>
  );
};
