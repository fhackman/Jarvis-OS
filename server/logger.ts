/**
/**
 * JARVIS Cognitive OS - Operational System Logger
 * Real-time event bus, ring buffer, and SSE broadcasting for backend operational events.
 */

export type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
export type LogCategory =
  | 'DISPATCH'
  | 'API'
  | 'AUTH_GATE'
  | 'STATUS_CHANGE'
  | 'PERCEPTION'
  | 'CRYPTO_AUDIT'
  | 'SYSTEM';

export interface SystemLogEvent {
  id: string;
  timestamp: number;
  iso_time: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  source: string;
  metadata?: Record<string, any>;
}

type LogSubscriber = (event: SystemLogEvent) => void;

class SystemLogger {
  private buffer: SystemLogEvent[] = [];
  private maxBufferSize: number = 1000;
  private subscribers: Set<LogSubscriber> = new Set();
  private counter: number = 0;

  constructor() {
    this.seedInitialLogs();
  }

  private seedInitialLogs() {
    const now = Date.now();
    const seedEvents: Array<Omit<SystemLogEvent, 'id' | 'timestamp' | 'iso_time'>> = [
      {
        level: 'INFO',
        category: 'SYSTEM',
        source: 'kernel_init',
        message: 'JARVIS Kernel v2.4.0-cognitive initialized with fail-closed security policy.',
        metadata: { node: process.version, mode: 'production_sandbox', max_workers: 4 },
      },
      {
        level: 'SUCCESS',
        category: 'STATUS_CHANGE',
        source: 'subsystem_supervisor',
        message: 'Cognitive OS Subsystems online: Perception (nominal), Dispatch Gatekeeper (enforcing).',
        metadata: { subsystems: ['perception_vad', 'router_fast_path', 'dispatch_gatekeeper', 'audit_chain'] },
      },
      {
        level: 'SUCCESS',
        category: 'CRYPTO_AUDIT',
        source: 'audit_chain',
        message: 'Genesis block #0 sealed into SHA-256 hash chain with seed hash 0000000000000000.',
        metadata: { block_index: 0, algorithm: 'sha256_merkle' },
      },
      {
        level: 'INFO',
        category: 'PERCEPTION',
        source: 'intel_fusion',
        message: 'Ingested USGS real-time seismic feed: 3 regional sensors operational.',
        metadata: { source: 'usgs_seismic', active_faults: 3, coverage_radius_km: 150 },
      },
      {
        level: 'SUCCESS',
        category: 'DISPATCH',
        source: 'intent_router',
        message: 'Query fast-path dispatched: "show domain manifest" -> executed in 4ms.',
        metadata: { query: 'show domain manifest', decision: 'allow', route: 'fast_path_exact', latency_ms: 4 },
      },
      {
        level: 'WARN',
        category: 'AUTH_GATE',
        source: 'dispatch_predicate',
        message: 'Action escalated to dual-key authorization gate: "disarm defense perimeter".',
        metadata: { domain: 'defense_perimeter', action: 'disarm', required_auth: 'dual_key_biometric' },
      },
      {
        level: 'ERROR',
        category: 'API',
        source: 'http_router',
        message: 'Unauthorized dispatch attempt rejected on sensitive endpoint /api/dispatch/override: Missing authorization certificate.',
        metadata: { path: '/api/dispatch/override', status: 403, ip: '127.0.0.1', error_code: 'ERR_INSUFFICIENT_CLEARANCE' },
      },
      {
        level: 'SUCCESS',
        category: 'DISPATCH',
        source: 'device_store',
        message: 'Device state mutation committed: dev_lights_perimeter -> brightness: 80% (approved by operator_alpha).',
        metadata: { device_id: 'dev_lights_perimeter', changes: { brightness: 80 }, approver: 'operator_alpha' },
      },
    ];

    seedEvents.forEach((ev, idx) => {
      const time = now - (seedEvents.length - idx) * 12000;
      this.buffer.push({
        id: `log_${time}_${++this.counter}`,
        timestamp: time,
        iso_time: new Date(time).toISOString(),
        ...ev,
      });
    });
  }

  public log(
    level: LogLevel,
    category: LogCategory,
    source: string,
    message: string,
    metadata?: Record<string, any>
  ): SystemLogEvent {
    const now = Date.now();
    const event: SystemLogEvent = {
      id: `log_${now}_${++this.counter}`,
      timestamp: now,
      iso_time: new Date(now).toISOString(),
      level,
      category,
      source,
      message,
      metadata,
    };

    this.buffer.push(event);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    // Broadcast immediately to active SSE subscribers
    this.subscribers.forEach((subscriber) => {
      try {
        subscriber(event);
      } catch (err) {
        console.error('Failed to dispatch log event to subscriber:', err);
      }
    });

    return event;
  }

  public info(category: LogCategory, source: string, message: string, metadata?: Record<string, any>) {
    return this.log('INFO', category, source, message, metadata);
  }

  public success(category: LogCategory, source: string, message: string, metadata?: Record<string, any>) {
    return this.log('SUCCESS', category, source, message, metadata);
  }

  public warn(category: LogCategory, source: string, message: string, metadata?: Record<string, any>) {
    return this.log('WARN', category, source, message, metadata);
  }

  public error(category: LogCategory, source: string, message: string, metadata?: Record<string, any>) {
    return this.log('ERROR', category, source, message, metadata);
  }

  public getLogs(filter?: {
    level?: string;
    category?: string;
    search?: string;
    limit?: number;
  }): SystemLogEvent[] {
    let result = [...this.buffer];

    if (filter?.level && filter.level !== 'ALL') {
      result = result.filter((l) => l.level.toUpperCase() === filter.level!.toUpperCase());
    }

    if (filter?.category && filter.category !== 'ALL') {
      result = result.filter((l) => l.category.toUpperCase() === filter.category!.toUpperCase());
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.source.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q) ||
          (l.metadata && JSON.stringify(l.metadata).toLowerCase().includes(q))
      );
    }

    const limit = filter?.limit || 200;
    return result.slice(-limit);
  }

  public subscribe(subscriber: LogSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  public getSubscriberCount(): number {
    return this.subscribers.size;
  }

  public clear(): void {
    this.buffer = [];
    this.log('INFO', 'SYSTEM', 'system_logger', 'Operational terminal logs buffer cleared by operator.');
  }

  public simulateEvent(type: 'dispatch_success' | 'api_error' | 'status_change' | 'auth_gate'): SystemLogEvent {
    const id = Math.floor(Math.random() * 9000 + 1000);
    switch (type) {
      case 'dispatch_success':
        return this.success(
          'DISPATCH',
          'dispatch_pipeline',
          `Automated environmental cycle executed: set_hvac_mode to 'eco_filter' in Sector ${id}.`,
          {
            target: `sector_${id}`,
            action: 'set_hvac_mode',
            latency_ms: Math.floor(Math.random() * 25 + 4),
            decision: 'allow',
            approver_signature: 'sig_autonomous_verified',
          }
        );

      case 'api_error':
        return this.error(
          'API',
          'ingress_guard',
          `HTTP 502 Bad Gateway: Upstream telemetry gateway timeout on sensor_cluster_${id}.`,
          {
            endpoint: `/api/sensors/cluster_${id}/sync`,
            status: 502,
            error_code: 'GATEWAY_TIMEOUT',
            duration_ms: 5012,
            retry_count: 3,
          }
        );

      case 'status_change':
        return this.info(
          'STATUS_CHANGE',
          'device_store',
          `Device 'dev_aux_generator_${id}' state changed from IDLE to ACTIVE_STANDBY.`,
          {
            device_id: `dev_aux_generator_${id}`,
            previous_state: 'IDLE',
            current_state: 'ACTIVE_STANDBY',
            fuel_level_pct: 94.2,
          }
        );

      case 'auth_gate':
        return this.warn(
          'AUTH_GATE',
          'dispatch_gatekeeper',
          `High-privilege escalation enqueued: 'reboot_quantum_node' requires approval from Senior Operator.`,
          {
            domain: 'system_core',
            action: 'reboot_quantum_node',
            ticket_id: `gate_${id}`,
            risk_tier: 'critical',
          }
        );
    }
  }
}

export const systemLogger = new SystemLogger();
