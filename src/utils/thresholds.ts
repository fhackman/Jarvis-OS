import { DiagnosticThresholds, ThresholdAlert } from '../types/jarvis';

export const DEFAULT_THRESHOLDS: DiagnosticThresholds = {
  enabled: true,
  cpuThresholdPercent: 75,
  ramThresholdMb: 70,
  toastAlerts: true,
  dashboardWarning: true,
  soundEnabled: false,
  cooldownSeconds: 25,
};

const STORAGE_KEY = 'jarvis_diagnostic_thresholds';

export function loadThresholds(): DiagnosticThresholds {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_THRESHOLDS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_THRESHOLDS,
      ...parsed,
    };
  } catch (e) {
    console.error('Failed to parse diagnostic thresholds from localStorage:', e);
    return DEFAULT_THRESHOLDS;
  }
}

export function saveThresholds(thresholds: DiagnosticThresholds): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
  } catch (e) {
    console.error('Failed to save diagnostic thresholds to localStorage:', e);
  }
}

export function evaluateThresholds(
  currentCpu: number,
  currentMemoryMb: number,
  thresholds: DiagnosticThresholds
): {
  cpuExceeded: boolean;
  ramExceeded: boolean;
  alert: ThresholdAlert | null;
} {
  if (!thresholds.enabled) {
    return { cpuExceeded: false, ramExceeded: false, alert: null };
  }

  const cpuExceeded = currentCpu >= thresholds.cpuThresholdPercent;
  const ramExceeded = currentMemoryMb >= thresholds.ramThresholdMb;

  if (!cpuExceeded && !ramExceeded) {
    return { cpuExceeded: false, ramExceeded: false, alert: null };
  }

  let metric: 'cpu' | 'ram' | 'both' = 'cpu';
  let message = '';
  let label = '';
  const now = Date.now();

  if (cpuExceeded && ramExceeded) {
    metric = 'both';
    label = 'CPU & RAM Thresholds Exceeded';
    message = `CPU at ${currentCpu}% (Limit: ${thresholds.cpuThresholdPercent}%) and RAM at ${currentMemoryMb}MB (Limit: ${thresholds.ramThresholdMb}MB)`;
  } else if (cpuExceeded) {
    metric = 'cpu';
    label = 'CPU Utilization Limit Exceeded';
    message = `Current CPU utilization reached ${currentCpu}%, exceeding limit of ${thresholds.cpuThresholdPercent}%`;
  } else {
    metric = 'ram';
    label = 'Heap Memory Limit Exceeded';
    message = `Current Heap footprint reached ${currentMemoryMb}MB, exceeding limit of ${thresholds.ramThresholdMb}MB`;
  }

  const severity: 'warning' | 'critical' = 
    (cpuExceeded && currentCpu >= 90) || (ramExceeded && currentMemoryMb >= 110)
      ? 'critical'
      : 'warning';

  const alert: ThresholdAlert = {
    id: `alert_${metric}_${now}`,
    metric,
    label,
    currentCpu,
    cpuThreshold: thresholds.cpuThresholdPercent,
    currentRam: currentMemoryMb,
    ramThreshold: thresholds.ramThresholdMb,
    message,
    timestamp: now,
    severity,
  };

  return { cpuExceeded, ramExceeded, alert };
}

/**
 * High-tech soft alert chime for threshold breaches
 */
export function playAlertBeep(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // First tone (480Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(480, ctx.currentTime);
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.12);

    // Second tone (720Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(720, ctx.currentTime + 0.14);
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.14);
    osc2.stop(ctx.currentTime + 0.28);
  } catch {
    // Audio autoplay restrictions or headless environment
  }
}
