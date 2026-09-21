import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  Key, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  AlertTriangle,
  RefreshCw,
  Hash
} from 'lucide-react';
import { PendingApproval } from '../types/jarvis';

interface ApprovalGatePanelProps {
  pendingApprovals: PendingApproval[];
  onApprove: (proposalId: string) => Promise<void>;
  onReject: (proposalId: string, reason: string) => Promise<void>;
  onRefresh: () => void;
  loading: boolean;
}

export const ApprovalGatePanel: React.FC<ApprovalGatePanelProps> = ({
  pendingApprovals,
  onApprove,
  onReject,
  onRefresh,
  loading,
}) => {
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [signingId, setSigningId] = useState<string | null>(null);

  const handleApproveClick = async (id: string) => {
    setSigningId(id);
    try {
      await onApprove(id);
    } finally {
      setSigningId(null);
    }
  };

  const handleRejectConfirm = async (id: string) => {
    const reason = rejectReason[id] || 'Operator declined state mutation in Approval Gate';
    await onReject(id, reason);
    setActiveRejectId(null);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="border border-amber-900/60 bg-[#0d0f18] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="font-['Rajdhani'] font-bold text-lg text-slate-100 tracking-wider">
              OPERATOR APPROVAL GATE // 2FA ESCALATION PANEL
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
              TIER: APPROVAL_REQUIRED
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic Dispatch Gate blocks all state mutations until a cryptographic HMAC-SHA256 signature is provided.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            id="refresh-approvals-btn"
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-1.5 rounded text-xs border border-slate-700 bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Queue List */}
      {pendingApprovals.length === 0 ? (
        <div className="border border-slate-800/80 bg-slate-950/40 rounded-lg p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-300">Queue Nominal &bull; Zero Pending Actions</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            All proposed state-changing actions in Tier 3 (approval_required) or rate-exceeded Tier 2 actions will appear here for cryptographic review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingApprovals.map((item) => {
            const prop = item.proposal;
            const isSigning = signingId === prop.id;
            const isRejecting = activeRejectId === prop.id;

            return (
              <div
                key={prop.id}
                id={`approval-item-${prop.id}`}
                className="border border-amber-800/60 bg-[#0e121d] rounded-lg p-4 shadow-[0_4px_16px_rgba(245,158,11,0.05)] transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 border border-amber-600/60 text-amber-300">
                        {prop.domain_id}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">
                        Tool: <span className="text-cyan-400">{prop.tool_name}</span>
                      </span>
                      <span className="text-slate-600">|</span>
                      <span className="text-xs text-slate-400">
                        Action: <span className="text-slate-100">{prop.action}</span>
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Origin: <span className="text-cyan-300">{prop.caller_id}</span> &bull; Enqueued: {new Date(item.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id={`approve-btn-${prop.id}`}
                      onClick={() => handleApproveClick(prop.id)}
                      disabled={isSigning}
                      className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>{isSigning ? 'SIGNING HMAC...' : 'SIGN & EXECUTE'}</span>
                    </button>

                    <button
                      type="button"
                      id={`reject-toggle-btn-${prop.id}`}
                      onClick={() => setActiveRejectId(isRejecting ? null : prop.id)}
                      className="px-3 py-1.5 rounded text-xs font-semibold bg-rose-900/50 hover:bg-rose-800/70 border border-rose-700/60 text-rose-200 flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>REJECT</span>
                    </button>
                  </div>
                </div>

                {/* Parameters Inspector */}
                <div className="bg-black/50 border border-slate-800 rounded p-2.5 text-xs text-slate-300">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                    Proposed Parameters & Targeted State:
                  </div>
                  <pre className="text-[11px] text-cyan-300/90 whitespace-pre-wrap font-mono">
                    {JSON.stringify(prop.parameters, null, 2)}
                  </pre>
                </div>

                {/* Rejection input box if active */}
                {isRejecting && (
                  <div className="mt-3 p-3 bg-rose-950/30 border border-rose-900/60 rounded flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter justification for audit log (e.g. Unauthorized parameter)..."
                      value={rejectReason[prop.id] || ''}
                      onChange={(e) =>
                        setRejectReason({ ...rejectReason, [prop.id]: e.target.value })
                      }
                      className="w-full bg-black/60 border border-rose-800/60 rounded px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      id={`confirm-reject-btn-${prop.id}`}
                      onClick={() => handleRejectConfirm(prop.id)}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold whitespace-nowrap"
                    >
                      CONFIRM REJECT
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
