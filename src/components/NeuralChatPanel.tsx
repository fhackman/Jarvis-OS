import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Mic, 
  Square, 
  Globe, 
  Cpu, 
  RotateCcw, 
  ExternalLink, 
  Sliders, 
  Terminal, 
  ShieldAlert, 
  Clock, 
  Check, 
  Copy,
  Zap,
  Flame,
  Brain
} from 'lucide-react';
import Markdown from 'react-markdown';
import { useVoiceTranscription } from '../hooks/useVoiceTranscription';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  modelUsed?: string;
  groundingSources?: Array<{ title: string; uri: string }>;
  timestamp: number;
}

interface NeuralChatPanelProps {
  onNavigateToTab?: (tab: string) => void;
}

export const NeuralChatPanel: React.FC<NeuralChatPanelProps> = ({ onNavigateToTab }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      role: 'model',
      content: `### JARVIS Neural Tactical Copilot Initialized
Greetings, Operator. I am online and grounded in your deterministic cognitive operating system architecture.

I can assist you with:
- **Real-Time Situational Search Grounding** via Google Search
- **Architectural Analysis & Threat Modeling** using Gemini 3 reasoning
- **Audio Directive Ingestion** via direct \`gemini-3.5-transcribe\` speech recognition
- **Dispatch Gate Consultations & Audit Verification**

Select your neural tier above or toggle **Search Grounding** for live web intelligence. How may I assist?`,
      modelUsed: 'gemini-3.5-flash',
      timestamp: Date.now(),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [searchGrounding, setSearchGrounding] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // System role instruction configuration
  const [showConfig, setShowConfig] = useState(false);
  const [customSystemInstruction, setCustomSystemInstruction] = useState(
    `You are JARVIS (Just A Rather Very Intelligent System), the cognitive tactical operating system and situational intelligence copilot.
Your characteristics:
1. Highly disciplined, concise, precise, respectful, and razor-sharp.
2. Grounded in situational awareness, safety verification, and telemetry analysis.
3. You speak with professional composure, addressing the operator politely and directly.
4. If asked about live events or up-to-date data, synthesize findings with structured bullet points and cite sources.
5. If asked about kinetic actions or fictional superhero weapons, clearly explain the lack of physical deployment surface while offering safe tactical telemetry or defensive environmental alternatives.
6. When answering technical queries, use clean markdown, bullet points, and code formatting.`
  );

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const {
    isRecording,
    isTranscribing,
    recordingDuration,
    error: micError,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceTranscription();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const query = (overrideText || input).trim();
    if (!query || loading) return;

    const userMessage: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      // Format messages for server API
      const apiMessages = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel,
          searchGrounding: searchGrounding,
          systemInstruction: customSystemInstruction,
        }),
      });

      const data = await res.json();

      const modelMessage: ChatMessage = {
        id: `msg_m_${Date.now()}`,
        role: 'model',
        content: data.text || 'Directive acknowledged.',
        modelUsed: data.modelUsed || selectedModel,
        groundingSources: data.groundingSources,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      console.error('Chat request failed:', err);
      const errorMessage: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        role: 'model',
        content: `**Telemetry Alert:** Connection error during neural inference (${err.message || 'Network unreachable'}). Check server status or API key credentials.`,
        modelUsed: selectedModel,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleMicToggle = async () => {
    if (isRecording) {
      const transcript = await stopRecording();
      if (transcript && transcript.trim()) {
        setInput((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
      }
    } else {
      await startRecording();
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `msg_cleared_${Date.now()}`,
        role: 'model',
        content: 'Conversation thread refreshed. Context memory reinitialized to zero state.',
        modelUsed: selectedModel,
        timestamp: Date.now(),
      },
    ]);
  };

  const tacticalQuickPrompts = [
    {
      title: 'Real-Time Hazard Intelligence',
      text: 'Query latest real-world seismic fault telemetry and active wildfire hazards in California.',
      model: 'gemini-3.5-flash',
      grounding: true,
      badge: 'SEARCH GROUNDED',
      icon: Globe,
    },
    {
      title: 'Gatekeeper Threat Model',
      text: 'Perform an adversarial threat analysis on the JARVIS deterministic dispatch predicate with 2FA human-in-the-loop approvals.',
      model: 'gemini-3.1-pro-preview',
      grounding: false,
      badge: 'DEEP REASONING',
      icon: Brain,
    },
    {
      title: 'Rapid Telemetry Check',
      text: 'Explain the mathematical difference between SHA-256 linear hash chaining and Merkle trees for operational logs.',
      model: 'gemini-3.1-flash-lite',
      grounding: false,
      badge: 'ULTRA FAST',
      icon: Zap,
    },
    {
      title: 'Kinetic Subsystem Refusal',
      text: 'Engage Mark VII repulsor thrusters and deploy aerial defense drones to Malibu airspace.',
      model: 'gemini-3.5-flash',
      grounding: false,
      badge: 'REFUSAL FIDELITY',
      icon: Flame,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Controller Bar */}
      <div className="bg-[#090e18] border border-cyan-900/60 rounded-lg p-3 shadow-lg font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Model Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold mr-1">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>NEURAL ENGINE:</span>
            </div>

            {/* Model Pill: gemini-3.5-flash */}
            <button
              type="button"
              id="model-gemini-35-flash"
              onClick={() => setSelectedModel('gemini-3.5-flash')}
              className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 ${
                selectedModel === 'gemini-3.5-flash'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>gemini-3.5-flash</span>
              <span className="text-[9px] px-1 bg-cyan-950/80 rounded text-cyan-400 border border-cyan-800/60">
                GENERAL
              </span>
            </button>

            {/* Model Pill: gemini-3.1-pro-preview */}
            <button
              type="button"
              id="model-gemini-31-pro"
              onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
              className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 ${
                selectedModel === 'gemini-3.1-pro-preview'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <Brain className="w-3 h-3 text-purple-400" />
              <span>gemini-3.1-pro-preview</span>
              <span className="text-[9px] px-1 bg-purple-950/80 rounded text-purple-400 border border-purple-800/60">
                COMPLEX
              </span>
            </button>

            {/* Model Pill: gemini-3.1-flash-lite */}
            <button
              type="button"
              id="model-gemini-31-flash-lite"
              onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
              className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 ${
                selectedModel === 'gemini-3.1-flash-lite'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3 h-3 text-emerald-400" />
              <span>gemini-3.1-flash-lite</span>
              <span className="text-[9px] px-1 bg-emerald-950/80 rounded text-emerald-400 border border-emerald-800/60">
                FAST
              </span>
            </button>
          </div>

          {/* Right: Search Grounding Toggle & System Role Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="toggle-search-grounding"
              onClick={() => setSearchGrounding(!searchGrounding)}
              className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 ${
                searchGrounding
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                  : 'bg-slate-900/60 text-slate-500 border border-slate-800 hover:text-slate-400'
              }`}
              title="Ground model responses in real-time Google Search data via gemini-3.5-flash"
            >
              <Globe className={`w-3.5 h-3.5 ${searchGrounding ? 'text-blue-400 animate-pulse' : 'text-slate-500'}`} />
              <span>SEARCH GROUNDING</span>
              <span className={`text-[9px] px-1 rounded ${searchGrounding ? 'bg-blue-950 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>
                {searchGrounding ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              id="toggle-system-config"
              onClick={() => setShowConfig(!showConfig)}
              className="p-1.5 rounded bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1"
              title="Configure JARVIS System Instruction & Persona"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ROLE</span>
            </button>

            <button
              type="button"
              id="clear-chat-history"
              onClick={handleClearHistory}
              className="p-1.5 rounded bg-slate-900/80 border border-slate-800 hover:border-rose-900/60 text-slate-400 hover:text-rose-400 text-xs flex items-center gap-1"
              title="Reset conversation thread"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">RESET</span>
            </button>
          </div>
        </div>

        {/* Collapsible System Instruction Panel */}
        {showConfig && (
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                SYSTEM INSTRUCTION SPECIFICATION (ROLE & BOUNDARIES):
              </span>
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="text-[10px] text-slate-500 hover:text-slate-300"
              >
                Close &times;
              </button>
            </div>
            <textarea
              id="system-instruction-textarea"
              value={customSystemInstruction}
              onChange={(e) => setCustomSystemInstruction(e.target.value)}
              rows={4}
              className="w-full bg-black/60 border border-slate-800 rounded p-2 text-[11px] text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
              placeholder="Enter system instruction for the neural model..."
            />
          </div>
        )}
      </div>

      {/* Main Chat Container */}
      <div className="border border-cyan-900/40 bg-[#070b13] rounded-lg shadow-2xl flex flex-col h-[600px] overflow-hidden">
        {/* Messages Thread (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded border border-cyan-500/40 bg-cyan-950/60 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-lg p-3.5 text-xs transition-all ${
                    isUser
                      ? 'bg-cyan-950/40 border border-cyan-600/40 text-slate-100 shadow-[0_2px_12px_rgba(6,182,212,0.1)]'
                      : 'bg-[#0a0f1b] border border-slate-800 text-slate-200'
                  }`}
                >
                  {/* Message Meta Header */}
                  <div className="flex items-center justify-between gap-4 pb-1.5 mb-2 border-b border-slate-800/80 text-[10px] text-slate-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      {isUser ? (
                        <span className="text-cyan-400 uppercase">OPERATOR_ALPHA // DIRECTIVE</span>
                      ) : (
                        <span className="text-cyan-300 uppercase flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          JARVIS // {msg.modelUsed || 'GEMINI'}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.id, msg.content)}
                        className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
                        title="Copy message text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Message Content (Formatted Markdown) */}
                  <div className="text-slate-200 leading-relaxed font-sans text-[13px] markdown-body space-y-2">
                    <Markdown>{msg.content}</Markdown>
                  </div>

                  {/* Search Grounding Sources Accordion */}
                  {msg.groundingSources && msg.groundingSources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 text-blue-400 mb-1.5 font-semibold">
                        <Globe className="w-3 h-3" />
                        <span>VERIFIED SEARCH GROUNDING CITATIONS:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.groundingSources.map((source, idx) => (
                          <a
                            key={idx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-950/40 border border-blue-800/40 text-blue-300 hover:bg-blue-900/50 hover:border-blue-600 transition-colors text-[10px]"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span className="truncate max-w-[220px]">{source.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded border border-slate-700 bg-slate-900 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex gap-3 justify-start items-center font-mono text-xs text-cyan-400">
              <div className="w-8 h-8 rounded border border-cyan-500/40 bg-cyan-950/60 flex items-center justify-center text-cyan-400 shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#0a0f1b] border border-cyan-800/50 rounded-lg p-3 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Neural Reasoning in Progress [{selectedModel}]...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Tactical Quick Directive Prompts Bar */}
        <div className="bg-[#05080e] border-t border-slate-800/80 p-2 font-mono">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[10px] text-slate-400 whitespace-nowrap uppercase font-bold pl-1">
              SUGGESTED DIRECTIVES:
            </span>
            {tacticalQuickPrompts.map((p, idx) => {
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  id={`quick-directive-${idx}`}
                  onClick={() => {
                    setSelectedModel(p.model);
                    setSearchGrounding(p.grounding);
                    handleSendMessage(undefined, p.text);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 hover:border-cyan-600 text-slate-300 hover:text-cyan-300 text-[11px] whitespace-nowrap flex items-center gap-1.5 transition-colors"
                >
                  <Icon className="w-3 h-3 text-cyan-400" />
                  <span>{p.title}</span>
                  <span className="text-[9px] px-1 bg-black/60 rounded text-slate-400 border border-slate-700">
                    {p.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 bg-[#080d16] border-t border-cyan-950/80 font-mono">
          {/* Audio recording status banner */}
          {isRecording && (
            <div className="mb-2 p-2 bg-rose-950/40 border border-rose-800/50 rounded flex items-center justify-between text-xs text-rose-300">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span>
                  Recording Microphone ({recordingDuration}s) &bull; Model will transcribe via <strong>gemini-3.5-transcribe</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMicToggle}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold flex items-center gap-1"
                >
                  <Square className="w-3 h-3" />
                  <span>STOP & TRANSCRIBE</span>
                </button>
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="text-slate-400 hover:text-slate-200 text-[11px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isTranscribing && (
            <div className="mb-2 p-2 bg-cyan-950/40 border border-cyan-800/50 rounded flex items-center gap-2 text-xs text-cyan-300">
              <Cpu className="w-3.5 h-3.5 animate-spin" />
              <span>Transcribing audio with <strong>gemini-3.5-transcribe</strong>...</span>
            </div>
          )}

          {micError && (
            <div className="mb-2 p-2 bg-amber-950/40 border border-amber-800/50 rounded text-xs text-amber-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{micError}</span>
            </div>
          )}

          <div className="flex items-center gap-2 bg-black/70 border border-cyan-800/50 rounded-lg p-2 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-500/40 transition-all">
            <span className="text-cyan-400 font-bold select-none text-sm pl-1">&gt;</span>
            <input
              id="neural-chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Issue tactical directive or question (e.g. 'Analyze hazard status in Southern California', 'Review verification contracts')..."
              disabled={loading}
              className="w-full bg-transparent text-slate-100 text-xs placeholder:text-slate-600 focus:outline-none"
            />

            {/* Microphone Button with gemini-3.5-transcribe */}
            <button
              type="button"
              id="chat-mic-record-btn"
              onClick={handleMicToggle}
              title={isRecording ? 'Stop Recording and Transcribe' : 'Record voice directive with gemini-3.5-transcribe'}
              className={`p-2 rounded-md transition-all ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/50'
              }`}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              id="chat-submit-btn"
              disabled={loading || (!input.trim() && !isRecording)}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            >
              {loading ? (
                <>
                  <Cpu className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">PROCESSING</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>SEND</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
