import React, { useState } from 'react';
import { 
  Hash, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  AlertTriangle, 
  ArrowDown, 
  CheckCircle2, 
  XCircle,
  FileCode,
  Layers,
  Database
} from 'lucide-react';
import { AuditBlock, AuditVerificationResult } from '../types/jarvis';

interface AuditTrailExplorerProps {
  chain: AuditBlock[];
  merkleRoot: string;
  onVerify: () => Promise<AuditVerificationResult>;
  onTamper: (blockIndex: number) => Promise<void>;
  onRestore: () => Promise<void>;
  onRefresh: () => void;
  loading: boolean;
}

export const AuditTrailExplorer: React.FC<AuditTrailExplorerProps> = ({
  chain,
  merkleRoot,
  onVerify,
  onTamper,
  onRestore,
  onRefresh,
  loading,
}) => {
  const [verification, setVerification] = useState<AuditVerificationResult | null>(null);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleVerifyClick = async () => {
    const res = await onVerify();
    setVerification(res);
    setActionMessage(
      res.valid
        ? `Cryptographic Verification PASSED: All ${res.block_count} blocks mathematically sound.`
        : `CRYPTOGRAPHIC INTEGRITY FAILURE: ${res.error_message}`
    );
  };

  const handleTamperClick = async (index: number) => {
    await onTamper(index);
    setActionMessage(`Simulated unauthorized mutation in Block #${index}. Re-verify chain to observe fail-closed detection.`);
    // Re-verify immediately to show detection
    const res = await onVerify();
    setVerification(res);
  };

  const handleRestoreClick = async () => {
    await onRestore();
    setActionMessage('Chain restored to pristine cryptographic anchor state.');
    const res = await onVerify();
    setVerification(res);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="border border-cyan-900/60 bg-[#090e18] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-cyan-400" />
            <h2 className="font-['Rajdhani'] font-bold text-lg text-slate-100 tracking-wider">
              CRYPTOGRAPHIC APPEND-ONLY HASH CHAIN & MERKLE LEDGER
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-600/60 text-cyan-300">
              SHA-256 CHAINED
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Section 6 Tenet: All gated evaluations, security overrides, tool dispatches, and operator approvals are written to an immutable cryptographic hash chain.
          </p>
        </div>

        {/* Verification Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="verify-chain-btn"
            onClick={handleVerifyClick}
            disabled={loading}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-colors shadow-[0_0_12px_rgba(6,182,212,0.25)]"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>VERIFY CHAIN INTEGRITY</span>
          </button>

          <button
            type="button"
            id="restore-chain-btn"
            onClick={handleRestoreClick}
            disabled={loading}
            className="px-3 py-1.5 rounded text-xs border border-slate-700 bg-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RESTORE</span>
          </button>
        </div>
      </div>

      {/* Merkle Root & Verification Result Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded p-3">
          <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Total Chain Length</div>
          <div className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <span>{chain.length} Blocks</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Genesis anchored at Block #0</div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded p-3 md:col-span-2">
          <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center justify-between">
            <span>Current Merkle Root Anchor:</span>
            <span className="text-emerald-400 text-[10px]">Synced to Remote Sink</span>
          </div>
          <div className="text-xs text-cyan-300 font-mono break-all font-semibold bg-black/40 p-1.5 rounded border border-slate-800">
            {merkleRoot || 'Computing Merkle Root...'}
          </div>
        </div>
      </div>

      {/* Action / Warning Notice */}
      {actionMessage && (
        <div className={`p-3 rounded text-xs border flex items-center justify-between gap-2 ${
          verification?.valid === false
            ? 'bg-rose-950/40 border-rose-800 text-rose-200'
            : 'bg-cyan-950/40 border-cyan-800 text-cyan-200'
        }`}>
          <div className="flex items-center gap-2">
            {verification?.valid === false ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
            <span>{actionMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-[10px] text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Block Chain Visualizer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>APPEND-ONLY CHRONOLOGICAL BLOCKS:</span>
          <span className="text-[10px]">Click any block to inspect payload or simulate tamper</span>
        </div>

        <div className="space-y-2">
          {chain.slice().reverse().map((block) => {
            const isGenesis = block.index === 0;
            const isTampered = block.tampered;
            const isExpanded = selectedBlockIndex === block.index;

            return (
              <div
                key={block.index}
                id={`audit-block-${block.index}`}
                className={`border rounded-lg transition-all ${
                  isTampered
                    ? 'border-rose-600 bg-rose-950/30'
                    : isGenesis
                    ? 'border-purple-800/60 bg-purple-950/20'
                    : 'border-slate-800/90 bg-[#090d16] hover:border-cyan-800/60'
                }`}
              >
                <div
                  onClick={() => setSelectedBlockIndex(isExpanded ? null : block.index)}
                  className="p-3 cursor-pointer flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded text-xs font-bold font-mono ${
                      isGenesis
                        ? 'bg-purple-900/60 text-purple-300 border border-purple-600/50'
                        : isTampered
                        ? 'bg-rose-900 text-rose-200 animate-pulse'
                        : 'bg-cyan-950 text-cyan-300 border border-cyan-800/50'
                    }`}>
                      #{block.index}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">{block.event_type}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                          {block.domain}
                        </span>
                        {isTampered && (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-950 px-1.5 py-0.2 rounded border border-rose-800">
                            [MUTATED - TAMPERED]
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Actor: <span className="text-cyan-400">{block.actor}</span> &bull; {new Date(block.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {/* Hash Previews */}
                  <div className="text-right text-[11px] text-slate-400 font-mono">
                    <div>
                      Hash: <span className="text-cyan-300 font-bold">{block.hash.slice(0, 16)}...</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Prev: {block.prev_hash.slice(0, 12)}...
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 p-3 bg-black/40 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Complete SHA-256 Hash:</div>
                        <div className="text-cyan-300 bg-black/60 p-1.5 rounded border border-slate-800 break-all select-all font-mono text-[11px]">
                          {block.hash}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Previous Block Pointer (Prev Hash):</div>
                        <div className="text-slate-400 bg-black/60 p-1.5 rounded border border-slate-800 break-all select-all font-mono text-[11px]">
                          {block.prev_hash}
                        </div>
                      </div>
                    </div>

                    {/* Payload Inspector */}
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Payload JSON:</div>
                      <pre className="text-[11px] text-emerald-300/90 bg-black/70 p-2.5 rounded border border-slate-800 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                        {JSON.stringify(block.payload, null, 2)}
                      </pre>
                    </div>

                    {/* Block Action Controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <div className="text-[10px] text-slate-400">
                        {isGenesis ? 'Genesis Block cannot be mutated.' : 'Simulate unauthorized alteration to test fail-closed integrity:'}
                      </div>
                      {!isGenesis && (
                        <button
                          type="button"
                          id={`tamper-btn-${block.index}`}
                          onClick={() => handleTamperClick(block.index)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded transition-colors"
                        >
                          Simulate Payload Tamper
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
