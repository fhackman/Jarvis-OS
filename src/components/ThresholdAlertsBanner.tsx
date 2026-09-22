import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Cpu, 
  HardDrive, 
  X, 
  Activity, 
  ChevronRight, 
  BellOff, 
  Sliders,
  ShieldAlert,
  Flame
} from 'lucide-react';
import { ThresholdAlert, DiagnosticThresholds } from '../types/jarvis';

interface DashboardResourceWarningBannerProps {
  alert: ThresholdAlert | null;
  thresholds: DiagnosticThresholds;
  onOpenDiagnostics: () => void;
  onDismiss: () => void;
}

export const DashboardResourceWarningBanner: React.FC<DashboardResourceWarningBannerProps> = ({
  alert,
  thresholds,
  onOpenDiagnostics,
  onDismiss,
}) => {
  if (!alert || !thresholds.enabled || !thresholds.dashboardWarning) {
    return null;
  }

  const isCritical = alert.severity === 'critical';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -15, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -15, height: 0 }}
        transition={{ duration: 0.25 }}
        id="dashboard-resource-warning-banner"
        className="mb-4 overflow-hidden"
      >
        <div className={`p-3.5 rounded-xl border backdrop-blur-md font-mono flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg ${
          isCritical
            ? 'bg-rose-950/70 border-rose-600/70 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.2)]'
            : 'bg-amber-950/70 border-amber-600/70 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
        }`}>
          {/* Left: Icon & Alert Message */}
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2 rounded-lg shrink-0 border ${
              isCritical 
                ? 'bg-rose-900/60 border-rose-500 text-rose-300 animate-pulse' 
                : 'bg-amber-900/60 border-amber-500 text-amber-300'
            }`}>
              {alert.metric === 'cpu' ? (
                <Cpu className="w-5 h-5" />
              ) : alert.metric === 'ram' ? (
                <HardDrive className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  isCritical
                    ? 'bg-rose-900 border-rose-500 text-rose-100'
                    : 'bg-amber-900 border-amber-500 text-amber-100'
                }`}>
                  {isCritical ? 'CRITICAL RESOURCE BREACH' : 'TELEMETRY THRESHOLD EXCEEDED'}
                </span>
                <span className="text-xs font-bold text-slate-100">
                  {alert.label}
                </span>
              </div>

              <div className="text-xs mt-1 text-slate-200 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{alert.message}</span>
                <span className="text-[11px] opacity-75">
                  &bull; Thresholds: CPU &ge; {thresholds.cpuThresholdPercent}% | RAM &ge; {thresholds.ramThresholdMb}MB
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              type="button"
              id="btn-banner-open-diagnostics"
              onClick={onOpenDiagnostics}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                isCritical
                  ? 'bg-rose-900 hover:bg-rose-800 border-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                  : 'bg-amber-900 hover:bg-amber-800 border-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.25)]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Inspect Telemetry</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              id="btn-banner-dismiss"
              onClick={onDismiss}
              className="p-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Acknowledge and dismiss warning banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

interface ToastAlertContainerProps {
  toasts: ThresholdAlert[];
  onOpenDiagnostics: () => void;
  onDismissToast: (id: string) => void;
  onSnoozeToasts?: () => void;
}

export const ToastAlertContainer: React.FC<ToastAlertContainerProps> = ({
  toasts,
  onOpenDiagnostics,
  onDismissToast,
  onSnoozeToasts,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div 
      id="threshold-toast-container"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const isCritical = toast.severity === 'critical';
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.22 }}
              className={`pointer-events-auto rounded-xl border p-3.5 shadow-2xl backdrop-blur-md font-mono ${
                isCritical
                  ? 'bg-[#150407]/95 border-rose-600/90 text-rose-100 shadow-[0_10px_30px_rgba(244,63,94,0.35)]'
                  : 'bg-[#160b03]/95 border-amber-500/90 text-amber-100 shadow-[0_10px_30px_rgba(245,158,11,0.3)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md ${
                    isCritical ? 'bg-rose-950 text-rose-400 animate-pulse' : 'bg-amber-950 text-amber-400'
                  }`}>
                    {toast.metric === 'cpu' ? (
                      <Cpu className="w-4 h-4" />
                    ) : toast.metric === 'ram' ? (
                      <HardDrive className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                      <span>{toast.label}</span>
                    </div>
                    <span className="text-[9px] text-slate-400">
                      {new Date(toast.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDismissToast(toast.id)}
                  className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                  title="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-xs text-slate-200 mt-2 leading-snug">
                {toast.message}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={onOpenDiagnostics}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                    isCritical
                      ? 'bg-rose-900/80 hover:bg-rose-800 border-rose-500/80 text-rose-100'
                      : 'bg-amber-900/80 hover:bg-amber-800 border-amber-500/80 text-amber-100'
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  <span>Open Drawer</span>
                  <ChevronRight className="w-3 h-3" />
                </button>

                {onSnoozeToasts && (
                  <button
                    type="button"
                    onClick={onSnoozeToasts}
                    className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    title="Mute toast popups for 5 minutes"
                  >
                    <BellOff className="w-3 h-3" />
                    <span>Mute 5m</span>
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
