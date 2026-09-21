import React, { useState } from 'react';
import { 
  Layers, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  HelpCircle, 
  Slash,
  Search,
  Filter
} from 'lucide-react';
import { CapabilityStatus, DomainDefinition, PermissionTier } from '../types/jarvis';

interface DomainLedgerProps {
  domains: DomainDefinition[];
}

export const DomainLedger: React.FC<DomainLedgerProps> = ({ domains }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getStatusBadge = (status: CapabilityStatus) => {
    switch (status) {
      case 'live':
        return {
          label: 'LIVE',
          badgeClass: 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300',
          dotClass: 'bg-emerald-400',
        };
      case 'limited':
        return {
          label: 'LIMITED',
          badgeClass: 'bg-amber-950/80 border-amber-600/60 text-amber-300',
          dotClass: 'bg-amber-400',
        };
      case 'simulated':
        return {
          label: 'SIMULATED',
          badgeClass: 'bg-cyan-950/80 border-cyan-600/60 text-cyan-300',
          dotClass: 'bg-cyan-400',
        };
      case 'unavailable':
        return {
          label: 'UNAVAILABLE',
          badgeClass: 'bg-slate-900 border-slate-700 text-slate-400',
          dotClass: 'bg-slate-500',
        };
      case 'no_deployment_surface':
        return {
          label: 'NO DEPLOYMENT SURFACE',
          badgeClass: 'bg-rose-950/80 border-rose-600/60 text-rose-300',
          dotClass: 'bg-rose-400',
        };
    }
  };

  const getTierBadge = (tier: PermissionTier) => {
    switch (tier) {
      case 'advisory':
        return 'border-cyan-800 text-cyan-300 bg-cyan-950/40';
      case 'autonomous':
        return 'border-emerald-800 text-emerald-300 bg-emerald-950/40';
      case 'approval_required':
        return 'border-amber-800 text-amber-300 bg-amber-950/40';
      case 'refuse':
        return 'border-rose-800 text-rose-300 bg-rose-950/40';
    }
  };

  const filteredDomains = domains.filter((d) => {
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchesSearch =
      d.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.archetype.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4 font-mono">
      {/* Header Banner */}
      <div className="border border-cyan-900/60 bg-[#090e18] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="font-['Rajdhani'] font-bold text-lg text-slate-100 tracking-wider">
              CANONICAL DOMAIN MANIFEST & CAPABILITY STATE MACHINE
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-600/60 text-cyan-300">
              core/data/domains.json
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Section 3 Tenet: Every capability must explicitly state its operational tier. If an effector does not reach physical hardware, the system must declare simulation or refusal rather than hallucinating action.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search domains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black/50 border border-slate-700 rounded pl-8 pr-3 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-black/50 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Operational Tiers</option>
            <option value="live">live</option>
            <option value="limited">limited</option>
            <option value="simulated">simulated</option>
            <option value="unavailable">unavailable</option>
            <option value="no_deployment_surface">no_deployment_surface</option>
          </select>
        </div>
      </div>

      {/* Domain Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredDomains.map((d) => {
          const statusMeta = getStatusBadge(d.status);

          return (
            <div
              key={d.id}
              id={`domain-card-${d.id}`}
              className="border border-slate-800/80 bg-[#090d16] rounded-lg p-4 flex flex-col justify-between hover:border-cyan-800/50 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 font-['Rajdhani'] tracking-wide">
                      {d.label}
                    </h3>
                    <div className="text-[11px] text-cyan-400 font-mono">
                      Archetype: {d.archetype}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1.5 ${statusMeta.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                      {statusMeta.label}
                    </span>
                    <span className={`px-2 py-0.2 rounded text-[9px] font-bold border uppercase ${getTierBadge(d.tier)}`}>
                      Tier: {d.tier}
                    </span>
                  </div>
                </div>

                {/* Note / Description */}
                <p className="text-xs text-slate-300 bg-black/40 p-2 rounded border border-slate-800/60 mb-3">
                  {d.note}
                </p>

                {/* Backing Modules & Detectors */}
                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-500 font-semibold">Backing Classes:</span>{' '}
                    {d.backing.length > 0 ? (
                      <span className="text-slate-300">{d.backing.join(', ')}</span>
                    ) : (
                      <span className="text-rose-400 font-semibold">Zero hardware or software effectors</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">Fast-Path Detectors:</span>{' '}
                    <span className="text-cyan-300">{d.detectors.join(', ')}</span>
                  </div>
                </div>
              </div>

              {/* Capability Gap & Declared Alternative */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] space-y-1.5 bg-slate-950/40 -mx-4 -mb-4 p-3 rounded-b-lg">
                <div>
                  <span className="text-amber-400 font-bold">Operational Ceiling / Gap:</span>{' '}
                  <span className="text-slate-300">{d.gap}</span>
                </div>
                <div>
                  <span className="text-cyan-400 font-bold">Safe Real-World Alternative:</span>{' '}
                  <span className="text-slate-200">{d.alternative}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
