import React, { useState } from 'react';
import { 
  Terminal, 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  Play, 
  Cpu, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  CheckCircle2,
  Lock,
  Layers,
  Square
} from 'lucide-react';
import { ActionProposal, DispatchResult } from '../types/jarvis';
import { useVoiceTranscription } from '../hooks/useVoiceTranscription';

interface CommandTerminalProps {
  onDispatch: (query: string, mode: 'heuristic' | 'llm') => Promise<{ proposal: ActionProposal; result: DispatchResult } | null>;
  loading: boolean;
  onNavigateToTab: (tab: string) => void;
}

export const CommandTerminal: React.FC<CommandTerminalProps> = ({
  onDispatch,
  loading,
  onNavigateToTab,
}) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'heuristic' | 'llm'>('heuristic');

  const {
    isRecording,
    isTranscribing,
    recordingDuration,
    error: micError,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceTranscription();

  const presetScenarios = [
    {
      label: 'Refusal: Kinetic Weapons',
      prompt: 'Deploy Mark VII kinetic flight thrusters and engage weapon targeting',
      tag: 'NO DEPLOYMENT SURFACE',
      color: 'border-rose-900/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40',
    },
    {
      label: 'Gated: Lock Perimeter',
      prompt: 'Lock estate perimeter access gate and engage sentry sensors',
      tag: 'APPROVAL REQUIRED',
      color: 'border-amber-900/60 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40',
    },
    {
      label: 'Advisory: Situational Feeds',
      prompt: 'Query active USGS seismic events and ADS-B airspace radar',
      tag: 'ADVISORY',
      color: 'border-cyan-900/60 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40',
    },
    {
      label: 'Autonomous: Health Sweep',
      prompt: 'Run full system health diagnostic watchdog sweep',
      tag: 'AUTONOMOUS',
      color: 'border-emerald-900/60 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40',
    },
    {
      label: 'Sandbox: Docker Python',
      prompt: 'Run isolated code in sandbox: math.sqrt(4096) * math.pi',
      tag: 'LIMITED SANDBOX',
      color: 'border-purple-900/60 bg-purple-950/30 text-purple-300 hover:bg-purple-900/40',
    },
  ];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;
    onDispatch(input.trim(), mode);
    setInput('');
  };

  const handleSelectPreset = (promptText: string) => {
    setInput(promptText);
  };

  const handleMicToggle = async () => {
    if (isRecording) {
      const transcript = await stopRecording();
      if (transcript && transcript.trim()) {
        setInput(transcript.trim());
      }
    } else {
      await startRecording();
    }
  };

  return (
    <div className="space-y-4">
      {/* Terminal Container */}
      <div className="border border-cyan-900/50 bg-[#090e17] rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden font-mono">
        {/* Terminal Header */}
        <div className="bg-[#0c121e] border-b border-cyan-950/80 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200 tracking-wider">
              OPERATOR COMMAND TERMINAL // CONSOLE_01
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400">ROUTER:</span>
              <button
                type="button"
                id="toggle-router-mode"
                onClick={() => setMode(mode === 'heuristic' ? 'llm' : 'heuristic')}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                  mode === 'heuristic'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                }`}
              >
                {mode === 'heuristic' ? 'FAST-PATH HEURISTIC (<10ms)' : 'SPECIALIST LLM MESH'}
              </button>
            </div>
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-3 bg-[#080c14]">
          <div className="flex items-center gap-2 border border-cyan-800/60 bg-black/60 rounded px-3 py-2 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-500/50 transition-all">
            <span className="text-cyan-400 font-bold text-sm select-none">&gt;</span>
            <input
              id="terminal-command-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter directive or voice command (e.g., 'Lock perimeter gates', 'Deploy Mark VII thrusters', 'Run diagnostics')..."
              className="w-full bg-transparent text-slate-100 placeholder:text-slate-600 text-xs focus:outline-none"
              disabled={loading}
            />

            {/* Mic Button with gemini-3.5-transcribe */}
            <button
              type="button"
              id="voice-mic-btn"
              onClick={handleMicToggle}
              title={isRecording ? 'Stop Recording and Transcribe' : 'Acoustic Voice Pipeline via gemini-3.5-transcribe'}
              className={`p-1.5 rounded transition-all ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40'
              }`}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              id="submit-command-btn"
              disabled={loading || !input.trim()}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            >
              {loading ? (
                <>
                  <Cpu className="w-3.5 h-3.5 animate-spin" />
                  <span>EVALUATING...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>DISPATCH</span>
                </>
              )}
            </button>
          </div>

          {/* Voice Ingestion Status Bar */}
          {isRecording && (
            <div className="mt-2 py-1.5 px-3 bg-rose-950/40 border border-rose-800/40 rounded flex items-center justify-between text-[11px] text-rose-300">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span>Recording Audio ({recordingDuration}s) &bull; Click to stop & transcribe via <strong>gemini-3.5-transcribe</strong></span>
              </div>
              <button
                type="button"
                onClick={handleMicToggle}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
              >
                STOP & TRANSCRIBE
              </button>
            </div>
          )}

          {isTranscribing && (
            <div className="mt-2 py-1.5 px-3 bg-cyan-950/40 border border-cyan-800/40 rounded flex items-center gap-2 text-[11px] text-cyan-300">
              <Cpu className="w-3.5 h-3.5 animate-spin" />
              <span>Transcribing voice directive with <strong>gemini-3.5-transcribe</strong>...</span>
            </div>
          )}

          {micError && (
            <div className="mt-2 py-1.5 px-3 bg-amber-950/40 border border-amber-800/40 rounded flex items-center gap-2 text-[11px] text-amber-300">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{micError}</span>
            </div>
          )}
        </form>

        {/* Preset Scenarios Panel */}
        <div className="border-t border-slate-800/80 bg-[#070a10] p-3">
          <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mb-2 flex items-center justify-between">
            <span>Standard Operational Scenarios & Test Injections:</span>
            <span className="text-[10px] text-slate-500">Click to load into terminal</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {presetScenarios.map((sc, i) => (
              <button
                key={i}
                type="button"
                id={`preset-btn-${i}`}
                onClick={() => handleSelectPreset(sc.prompt)}
                className={`border px-2.5 py-1.5 rounded text-[11px] font-mono transition-all flex items-center gap-2 text-left ${sc.color}`}
              >
                <Play className="w-3 h-3 opacity-70" />
                <span className="font-medium">{sc.label}</span>
                <span className="text-[9px] px-1 rounded bg-black/40 border border-current opacity-80 uppercase">
                  {sc.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
