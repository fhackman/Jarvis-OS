/**
 * JARVIS Environmental Automation - In-Memory Device State Store
 * Implements DeviceInterface per Section 5.3 of Specification.
 * Domain: environmental_control (Status: simulated, Tier: approval_required).
 * Strictly in-memory virtual state machine; no physical hardware broker.
 */

import { DeviceState } from '../src/types/jarvis.ts';

class DeviceStateStore {
  private devices: Map<string, DeviceState> = new Map();

  constructor() {
    this.seedInitialDevices();
  }

  private seedInitialDevices() {
    const initialList: DeviceState[] = [
      {
        id: 'estate_main_gate',
        name: 'Malibu Perimeter Access Gate',
        location: 'North Entry Checkpoint',
        type: 'security_gate',
        state: { locked: true, obstruction_detected: false, interlock_status: 'engaged' },
        last_updated: Date.now() - 120000,
        tier: 'approval_required',
      },
      {
        id: 'perimeter_sensor_grid',
        name: 'Perimeter Laser & Acoustic Sentry Grid',
        location: 'Estate Perimeter Boundary',
        type: 'sensor_array',
        state: { armed: true, sensitivity_pct: 88, active_trips: 0 },
        last_updated: Date.now() - 300000,
        tier: 'approval_required',
      },
      {
        id: 'server_lab_hvac',
        name: 'Primary Compute Cluster HVAC',
        location: 'Sub-Level 2 Server Vault',
        type: 'climate',
        state: { target_temp_c: 18, current_temp_c: 18.2, mode: 'cooling', fan_rpm: 2400 },
        last_updated: Date.now() - 60000,
        tier: 'approval_required',
      },
      {
        id: 'reactor_substation_breaker',
        name: 'Secondary Substation Power Breaker',
        location: 'Auxiliary Power Vault',
        type: 'power_grid',
        state: { breaker_closed: true, load_kw: 42.5, voltage_v: 480 },
        last_updated: Date.now() - 900000,
        tier: 'approval_required',
      },
      {
        id: 'holographic_emitter_array',
        name: 'Central Workshop Hologram Projector',
        location: 'Main Lab Console',
        type: 'illumination',
        state: { active: true, brightness_pct: 75, focal_length_m: 2.4 },
        last_updated: Date.now() - 45000,
        tier: 'approval_required',
      },
    ];

    for (const dev of initialList) {
      this.devices.set(dev.id, dev);
    }
  }

  public getAll(): DeviceState[] {
    return Array.from(this.devices.values());
  }

  public get(id: string): DeviceState | undefined {
    return this.devices.get(id);
  }

  public setState(id: string, newState: Record<string, any>): DeviceState {
    const existing = this.devices.get(id);
    if (!existing) {
      throw new Error(`Device ID ${id} not found in virtual state store`);
    }

    const updated: DeviceState = {
      ...existing,
      state: { ...existing.state, ...newState },
      last_updated: Date.now(),
    };

    this.devices.set(id, updated);
    return updated;
  }
}

export const deviceStore = new DeviceStateStore();
