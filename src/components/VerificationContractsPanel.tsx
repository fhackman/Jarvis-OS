import React, { useState } from 'react';
import { 
  CheckSquare, 
  CheckCircle2, 
  XCircle, 
  Play, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  Cpu, 
  AlertTriangle 
} from 'lucide-react';
import { VerificationContractTest } from '../types/jarvis';

interface VerificationContractsPanelProps {
  onRunTests: () => Promise<{ all_passed: boolean; tests: VerificationContractTest[] }>;
  loading: boolean;
}

export const VerificationContractsPanel: React.FC<VerificationContractsPanelProps> = ({
  onRunTests,
  loading,
}) => {
  const [tests, setTests] = useState<VerificationContractTest[]>([]);
  const [allPassed, setAllPassed] = useState<boolean | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await onRunTests();
      setTests(res.tests);
      setAllPassed(res.all_passed);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="border border-cyan-900/60 bg-[#090e18] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-cyan-400" />
            <h2 className="font-['Rajdhani'] font-bold text-lg text-slate-100 tracking-wider">
              SYSTEMATIC EVALUATION & VERIFICATION CONTRACTS
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-600/60 text-cyan-300">
              SECTION 7 SPECIFICATION
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated verification harness measuring perceptual latency, heuristic routing bounds, gating bypass prevention, cryptographic chain integrity, and refusal fidelity.
          </p>
        </div>

        <button
          type="button"
          id="run-contracts-suite-btn"
          onClick={handleRun}
          disabled={running || loading}
          className="px-4 py-2 rounded text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2 transition-colors shadow-[0_0_14px_rgba(6,182,212,0.3)]"
        >
          {running ? (
            <>
              <Cpu className="w-4 h-4 animate-spin" />
              <span>RUNNING HARNESS...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>EXECUTE VERIFICATION SUITE</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Scorecard if run */}
      {allPassed !== null && (
        <div className={`p-4 rounded-lg border flex items-center justify-between gap-4 ${
          allPassed
            ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
            : 'bg-rose-950/40 border-rose-500/60 text-rose-200'
        }`}>
          <div className="flex items-center gap-3">
            {allPassed ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
            )}
            <div>
              <div className="font-bold text-sm tracking-wide">
                {allPassed ? 'ALL VERIFICATION CONTRACTS SATISFIED (5/5)' : 'CONTRACT DEFECT DETECTED'}
              </div>
              <div className="text-xs opacity-90 mt-0.5">
                Deterministic permission gates, SHA-256 hash chains, and refusal invariants conform to spec.
              </div>
            </div>
          </div>

          <div className="text-right font-mono text-xs">
            <span className="text-[10px] text-slate-400 block">SUITE STATUS</span>
            <span className={`font-bold ${allPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
              {allPassed ? 'PASSED 100%' : 'FAILED'}
            </span>
          </div>
        </div>
      )}

      {/* Tests Grid */}
      {tests.length === 0 ? (
        <div className="border border-slate-800/80 bg-slate-950/40 rounded-lg p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-cyan-600/60 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-300">Harness Standing By</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Click &ldquo;Execute Verification Suite&rdquo; to benchmark the 5 architectural contracts against the running live server.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((test) => {
            const isPass = test.status === 'passed';

            return (
              <div
                key={test.id}
                id={`contract-${test.id}`}
                className={`border rounded-lg p-4 bg-[#090d16] transition-all ${
                  isPass ? 'border-slate-800/90 hover:border-cyan-800/50' : 'border-rose-700 bg-rose-950/20'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-2.5 mb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {test.layer}
                      </span>
                      <h3 className="text-sm font-bold text-slate-100">{test.name}</h3>
                    </div>
                    <div className="text-xs text-cyan-300/80 mt-1">
                      Target Boundary: <span className="text-slate-200">{test.target_metric}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <div className="text-[10px] text-slate-400">Measured Value:</div>
                      <div className="font-bold text-emerald-400">{test.metric_value}</div>
                    </div>

                    <div className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1.5 ${
                      isPass
                        ? 'bg-emerald-950 border border-emerald-600/60 text-emerald-300'
                        : 'bg-rose-950 border border-rose-600/60 text-rose-300'
                    }`}>
                      {isPass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{isPass ? 'PASSED' : 'FAILED'}</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  <span className="text-slate-500 font-semibold">Verification Detail:</span> {test.details}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
