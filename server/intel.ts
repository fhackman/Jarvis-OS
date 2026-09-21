/**
 * JARVIS Incident Intelligence & Situational Fusion Center
 * Subsystem: Perception & External Intelligence Feeds (USGS, NASA FIRMS, ADSB)
 * Section 5.1 & Phase 4 Threshold Hooks & Alert Hysteresis
 */

import { SeismicEvent, WildfireEvent, AircraftTelemetry, ProactiveAlert } from '../src/types/jarvis.ts';

class IncidentIntelligenceFusion {
  private seismicEvents: SeismicEvent[] = [];
  private wildfireEvents: WildfireEvent[] = [];
  private aircraftTelemetry: AircraftTelemetry[] = [];
  private activeAlerts: ProactiveAlert[] = [];
  private alertHysteresisCache: Map<string, { lastAlerted: number; count: number }> = new Map();

  constructor() {
    this.seedInitialTelemetry();
  }

  private seedInitialTelemetry() {
    const now = Date.now();

    // 1. USGS Seismic Events (Southern California / Pacific Rim Focus)
    this.seismicEvents = [
      {
        source: 'usgs_seismic',
        event_id: 'us7000m8ab',
        severity: 4.8,
        coordinates: [-118.4085, 34.0195], // Near Malibu / Santa Monica fault
        depth_km: 11.4,
        place: '14km WSW of Malibu, CA',
        confidence: 0.98,
        timestamp: now - 180000,
        alert_level: 'yellow',
      },
      {
        source: 'usgs_seismic',
        event_id: 'us7000m9cd',
        severity: 3.1,
        coordinates: [-117.8921, 33.7455],
        depth_km: 8.2,
        place: '7km N of Newport Beach, CA',
        confidence: 0.95,
        timestamp: now - 920000,
        alert_level: 'green',
      },
      {
        source: 'usgs_seismic',
        event_id: 'us7000m9ef',
        severity: 2.2,
        coordinates: [-116.5412, 33.8303],
        depth_km: 5.6,
        place: 'Palm Springs Fault Segment',
        confidence: 0.92,
        timestamp: now - 1800000,
        alert_level: 'green',
      },
    ];

    // 2. NASA FIRMS Wildfire Hotspots
    this.wildfireEvents = [
      {
        source: 'nasa_firms',
        event_id: 'modis_c6_ca_401',
        frp: 74.2, // MW
        coordinates: [-118.6124, 34.0952], // Topanga Canyon / Santa Monica Mtns
        confidence: 0.89,
        place: 'Topanga Canyon Ridge, CA',
        timestamp: now - 360000,
      },
      {
        source: 'nasa_firms',
        event_id: 'viirs_snpp_ca_892',
        frp: 38.6,
        coordinates: [-117.4819, 34.2581], // San Bernardino National Forest
        confidence: 0.84,
        place: 'Cajon Pass North Ridge, CA',
        timestamp: now - 1200000,
      },
    ];

    // 3. ADS-B Airspace Radar Telemetry
    this.aircraftTelemetry = [
      {
        source: 'adsb_airspace',
        callsign: 'MEDEVAC1',
        squawk: '1200',
        altitude_ft: 2800,
        speed_kts: 145,
        heading_deg: 240,
        coordinates: [-118.482, 34.025],
        timestamp: now - 15000,
        emergency: false,
      },
      {
        source: 'adsb_airspace',
        callsign: 'UAL842',
        squawk: '4217',
        altitude_ft: 18400,
        speed_kts: 420,
        heading_deg: 85,
        coordinates: [-118.891, 33.912],
        timestamp: now - 10000,
        emergency: false,
      },
      {
        source: 'adsb_airspace',
        callsign: 'N728TK',
        squawk: '7700', // General Emergency Transponder!
        altitude_ft: 4500,
        speed_kts: 210,
        heading_deg: 180,
        coordinates: [-118.721, 34.011],
        timestamp: now - 20000,
        emergency: true,
      },
    ];

    this.evaluateThresholds();
  }

  public getTelemetryData() {
    this.cleanExpiredAlerts();
    return {
      seismic: this.seismicEvents,
      wildfire: this.wildfireEvents,
      aircraft: this.aircraftTelemetry,
      active_alerts: this.activeAlerts,
      hysteresis_status: {
        active_entries: this.alertHysteresisCache.size,
        suppression_window_sec: 3600,
      },
    };
  }

  /**
   * Section 5.1 & Phase 4 Threshold Hooks:
   * Seismic > 4.5 or Aircraft Emergency (Squawk 7700) or Wildfire FRP > 60MW.
   * Emits alert subject to 1-hour hysteresis window.
   */
  public evaluateThresholds(): ProactiveAlert[] {
    const newAlerts: ProactiveAlert[] = [];
    const now = Date.now();
    const ONE_HOUR = 3600 * 1000;

    // Check Seismic Threshold (> 4.5)
    for (const event of this.seismicEvents) {
      if (event.severity >= 4.5) {
        const key = `seismic_${event.event_id}`;
        const existing = this.alertHysteresisCache.get(key);

        if (!existing || now - existing.lastAlerted >= ONE_HOUR) {
          const alert: ProactiveAlert = {
            id: `alert_seismic_${event.event_id}_${now}`,
            source: 'usgs_seismic',
            severity: event.severity >= 5.0 ? 'critical' : 'warning',
            title: `SEISMIC HAZARD ALERT: M${event.severity.toFixed(1)} Detect`,
            message: `USGS sensor network registered M${event.severity} event at ${event.place} (Depth: ${event.depth_km}km). Confidence: ${(event.confidence * 100).toFixed(0)}%.`,
            timestamp: now,
            suppressed_duplicates: existing ? existing.count : 0,
            hysteresis_active: true,
            expires_at: now + 1800000,
          };
          this.activeAlerts.unshift(alert);
          newAlerts.push(alert);
          this.alertHysteresisCache.set(key, { lastAlerted: now, count: 0 });
        } else {
          // Increment duplicate counter under hysteresis
          existing.count += 1;
        }
      }
    }

    // Check Wildfire Threshold (FRP >= 60 MW)
    for (const fire of this.wildfireEvents) {
      if (fire.frp >= 60) {
        const key = `wildfire_${fire.event_id}`;
        const existing = this.alertHysteresisCache.get(key);

        if (!existing || now - existing.lastAlerted >= ONE_HOUR) {
          const alert: ProactiveAlert = {
            id: `alert_fire_${fire.event_id}_${now}`,
            source: 'nasa_firms',
            severity: 'warning',
            title: `THERMAL ANOMALY: NASA FIRMS Hotspot (${fire.frp} MW)`,
            message: `Active thermal radiative cluster detected at ${fire.place}. Ground proximity alert logged to situational cache.`,
            timestamp: now,
            suppressed_duplicates: existing ? existing.count : 0,
            hysteresis_active: true,
            expires_at: now + 1800000,
          };
          this.activeAlerts.unshift(alert);
          newAlerts.push(alert);
          this.alertHysteresisCache.set(key, { lastAlerted: now, count: 0 });
        } else {
          existing.count += 1;
        }
      }
    }

    // Check Aircraft Emergency Squawk (7700, 7600)
    for (const plane of this.aircraftTelemetry) {
      if (plane.emergency || plane.squawk === '7700' || plane.squawk === '7600') {
        const key = `adsb_emergency_${plane.callsign}`;
        const existing = this.alertHysteresisCache.get(key);

        if (!existing || now - existing.lastAlerted >= ONE_HOUR) {
          const alert: ProactiveAlert = {
            id: `alert_air_${plane.callsign}_${now}`,
            source: 'adsb_airspace',
            severity: 'critical',
            title: `AIRSPACE INCIDENT: Transponder Squawk ${plane.squawk}`,
            message: `Aircraft ${plane.callsign} transponder squawking emergency ${plane.squawk} at ${plane.altitude_ft}ft / ${plane.speed_kts}kts heading ${plane.heading_deg}°.`,
            timestamp: now,
            suppressed_duplicates: existing ? existing.count : 0,
            hysteresis_active: true,
            expires_at: now + 1800000,
          };
          this.activeAlerts.unshift(alert);
          newAlerts.push(alert);
          this.alertHysteresisCache.set(key, { lastAlerted: now, count: 0 });
        } else {
          existing.count += 1;
        }
      }
    }

    return newAlerts;
  }

  public injectHazardEvent(type: 'seismic' | 'wildfire' | 'airspace', severityVal: number): ProactiveAlert | null {
    const now = Date.now();
    if (type === 'seismic') {
      const id = `us_inj_${Math.floor(Math.random() * 9000 + 1000)}`;
      const event: SeismicEvent = {
        source: 'usgs_seismic',
        event_id: id,
        severity: severityVal,
        coordinates: [-118.5200, 34.0400],
        depth_km: 7.8,
        place: 'Simulated Injected Fault Zone, Malibu Sector',
        confidence: 0.99,
        timestamp: now,
        alert_level: severityVal >= 5.0 ? 'red' : 'yellow',
      };
      this.seismicEvents.unshift(event);
      // Force hysteresis reset for injection demonstration
      this.alertHysteresisCache.delete(`seismic_${id}`);
    } else if (type === 'airspace') {
      const plane: AircraftTelemetry = {
        source: 'adsb_airspace',
        callsign: `TEST${Math.floor(Math.random() * 900 + 100)}`,
        squawk: '7700',
        altitude_ft: 3200,
        speed_kts: 195,
        heading_deg: 215,
        coordinates: [-118.650, 34.020],
        timestamp: now,
        emergency: true,
      };
      this.aircraftTelemetry.unshift(plane);
      this.alertHysteresisCache.delete(`adsb_emergency_${plane.callsign}`);
    }

    const newAlerts = this.evaluateThresholds();
    return newAlerts[0] || null;
  }

  private cleanExpiredAlerts() {
    const now = Date.now();
    this.activeAlerts = this.activeAlerts.filter(a => a.expires_at > now);
  }
}

export const incidentFusion = new IncidentIntelligenceFusion();
