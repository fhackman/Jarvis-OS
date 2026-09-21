/**
 * JARVIS Cognitive OS - Core Types & Domain Specifications
 * Adheres strictly to the JARVIS System Design & Architecture Specification
 */

export type CapabilityStatus = 
  | 'live' 
  | 'limited' 
  | 'simulated' 
  | 'unavailable' 
  | 'no_deployment_surface';

export type PermissionTier = 
  | 'advisory' 
  | 'autonomous' 
  | 'approval_required' 
  | 'refuse';

export type DispatchDecision = 
  | 'allow' 
  | 'propose' 
  | 'refuse';

export interface DomainDefinition {
  id: string;
  label: string;
  archetype: string;
  status: CapabilityStatus;
  tier: PermissionTier;
  backing: string[];
  detectors: string[];
  note: string;
  gap: string;
  alternative: string;
}

export interface ActionProposal {
  id: string;
  domain_id: string;
  tool_name: string;
  action: string;
  parameters: Record<string, any>;
  caller_id: string;
  timestamp: number;
  approver_signature?: string | null;
}

export interface DispatchResult {
  decision: DispatchDecision;
  proposal: ActionProposal;
  reason: string;
  alternative?: string;
  execution_result?: any;
  block_index?: number;
  latency_ms: number;
}

export interface AuditBlock {
  index: number;
  timestamp: number;
  event_type: string;
  actor: string;
  domain: string;
  payload: Record<string, any>;
  prev_hash: string;
  hash: string;
  tampered?: boolean;
}

export interface AuditVerificationResult {
  valid: boolean;
  block_count: number;
  failed_at_index?: number;
  error_message?: string;
  merkle_root: string;
  last_anchor_timestamp: number;
}

export interface PendingApproval {
  id: string;
  proposal: ActionProposal;
  created_at: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
}

export interface DeviceState {
  id: string;
  name: string;
  location: string;
  type: 'security_gate' | 'climate' | 'power_grid' | 'sensor_array' | 'illumination';
  state: Record<string, any>;
  last_updated: number;
  tier: PermissionTier;
}

export interface SeismicEvent {
  source: 'usgs_seismic';
  event_id: string;
  severity: number;
  coordinates: [number, number]; // [lon, lat]
  depth_km: number;
  place: string;
  confidence: number;
  timestamp: number;
  alert_level: 'green' | 'yellow' | 'red';
}

export interface WildfireEvent {
  source: 'nasa_firms';
  event_id: string;
  frp: number; // Fire Radiative Power (MW)
  coordinates: [number, number];
  confidence: number;
  place: string;
  timestamp: number;
}

export interface AircraftTelemetry {
  source: 'adsb_airspace';
  callsign: string;
  squawk: string;
  altitude_ft: number;
  speed_kts: number;
  heading_deg: number;
  coordinates: [number, number];
  timestamp: number;
  emergency: boolean;
}

export interface ProactiveAlert {
  id: string;
  source: 'usgs_seismic' | 'nasa_firms' | 'adsb_airspace' | 'system_telemetry';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  suppressed_duplicates: number;
  hysteresis_active: boolean;
  expires_at: number;
}

export interface VerificationContractTest {
  id: string;
  name: string;
  layer: 'Perception' | 'Routing' | 'Gating Engine' | 'Audit Chain' | 'Refusal Verification';
  target_metric: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  latency_ms?: number;
  metric_value?: string;
  details?: string;
}
