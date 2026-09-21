/**
 * JARVIS Cognition & Intent Router
 * Section 5.2: Fast-Path Heuristic Classifier + Specialist Agent Mesh
 * Maps natural language requests or audio transcripts to structured ActionProposal objects.
 */

import { GoogleGenAI } from '@google/genai';
import { ActionProposal } from '../src/types/jarvis.ts';

// Server-side Gemini initialization if key exists
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export class IntentRouter {
  /**
   * Fast-Path Heuristic Classifier
   * Latency target < 10ms with zero hallucination risk
   */
  public route(input: string, callerId: string = 'operator_alpha'): ActionProposal {
    const text = input.trim().toLowerCase();
    const id = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    // 1. Prohibited Domain: Combat & Flight Dynamics (Section 3.2 & Phase 3)
    if (
      /(combat|flight|missile|repulsor|mark\s*vii|weapon|targeting|fire\s*lasers|engage\s*thrusters|kinetic\s*strike|anti-air|iron\s*man|orbital\s*beam)/i.test(
        text
      )
    ) {
      return {
        id,
        domain_id: 'combat_and_flight_dynamics',
        tool_name: 'kinetic_defense_effector',
        action: 'engage_kinetic_subroutine',
        parameters: { raw_command: input, intent: 'kinetic_action' },
        caller_id: callerId,
        timestamp: now,
      };
    }

    // 2. Incident Intelligence & Situational Fusion (Section 5.1)
    if (/(seismic|earthquake|wildfire|fire|adsb|aircraft|airspace|hazard|radar|intel|sensor\s*fusion)/i.test(text)) {
      return {
        id,
        domain_id: 'incident_intelligence',
        tool_name: 'situational_intel_aggregator',
        action: 'query_telemetry_feed',
        parameters: { query_type: 'situational_summary', filter: text },
        caller_id: callerId,
        timestamp: now,
      };
    }

    // 3. Environmental Control / Malibu Estate (Section 5.3)
    if (/(gate|lock|unlock|perimeter|hvac|climate|temperature|breaker|power|lights|hologram|estate|device)/i.test(text)) {
      let action = 'toggle_state';
      let deviceId = 'estate_main_gate';
      let stateUpdate: Record<string, any> = {};

      if (text.includes('gate') || text.includes('perimeter')) {
        deviceId = 'estate_main_gate';
        action = text.includes('unlock') ? 'unlock_gate' : 'lock_gate';
        stateUpdate = { locked: !text.includes('unlock') };
      } else if (text.includes('hvac') || text.includes('temp') || text.includes('climate')) {
        deviceId = 'server_lab_hvac';
        action = 'adjust_climate';
        stateUpdate = { target_temp_c: 19.0, mode: 'cooling' };
      } else if (text.includes('power') || text.includes('breaker') || text.includes('reactor')) {
        deviceId = 'reactor_substation_breaker';
        action = 'toggle_breaker';
        stateUpdate = { breaker_closed: !text.includes('trip') && !text.includes('open') };
      } else if (text.includes('grid') || text.includes('sensor')) {
        deviceId = 'perimeter_sensor_grid';
        action = 'arm_sensors';
        stateUpdate = { armed: !text.includes('disarm') };
      }

      return {
        id,
        domain_id: 'environmental_control',
        tool_name: 'device_state_store',
        action,
        parameters: { device_id: deviceId, state_update: stateUpdate },
        caller_id: callerId,
        timestamp: now,
      };
    }

    // 4. Code Execution Sandbox (Section 5.3)
    if (/(sandbox|execute|run\s*code|docker|script|python|bash|eval)/i.test(text)) {
      return {
        id,
        domain_id: 'code_sandbox',
        tool_name: 'docker_sandbox_runner',
        action: 'execute_isolated_script',
        parameters: {
          code: input.replace(/^(run|execute|run code|in sandbox|sandbox:?)\s*/i, ''),
          timeout_sec: 10,
          ram_cap_mb: 512,
        },
        caller_id: callerId,
        timestamp: now,
      };
    }

    // 5. System Proactivity & Health Diagnostics (Section 3.2)
    if (/(diagnostic|health|watchdog|status|self-check|audit\s*check|telemetry\s*defense|sweep)/i.test(text)) {
      return {
        id,
        domain_id: 'system_proactivity',
        tool_name: 'watch_health',
        action: 'run_diagnostic_sweep',
        parameters: { scope: 'full_subsystems' },
        caller_id: callerId,
        timestamp: now,
      };
    }

    // 6. Audio Pipeline / Speech
    if (/(transcribe|mic|speech|audio|vad)/i.test(text)) {
      return {
        id,
        domain_id: 'audio_pipeline',
        tool_name: 'faster_whisper',
        action: 'ingest_audio_stream',
        parameters: { format: 'pcm16', sample_rate: 16000 },
        caller_id: callerId,
        timestamp: now,
      };
    }

    // Default Fallback: System Advisory Query
    return {
      id,
      domain_id: 'system_proactivity',
      tool_name: 'watch_health',
      action: 'process_advisory_query',
      parameters: { raw_query: input },
      caller_id: callerId,
      timestamp: now,
    };
  }

  /**
   * Specialist Agent LLM fallback if complex query requires Gemini reasoning
   */
  public async routeWithLLM(input: string, callerId: string = 'operator_alpha'): Promise<ActionProposal> {
    if (!aiClient) {
      return this.route(input, callerId);
    }

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are the JARVIS Cognition Router.
Classify the user intent into one of these strict domains:
- incident_intelligence (seismic, wildfire, adsb flight tracking)
- system_proactivity (diagnostics, self checks, watchdog)
- environmental_control (estate locks, HVAC, breakers, sensors)
- combat_and_flight_dynamics (weapons, suit thrusters, combat, flight, missiles)
- code_sandbox (executing computational code)
- audio_pipeline (voice capture)

User input: "${input}"

Respond ONLY with a JSON object:
{
  "domain_id": "...",
  "tool_name": "...",
  "action": "...",
  "parameters": {}
}`,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        domain_id: parsed.domain_id || 'system_proactivity',
        tool_name: parsed.tool_name || 'watch_health',
        action: parsed.action || 'general_query',
        parameters: parsed.parameters || { raw_input: input },
        caller_id: callerId,
        timestamp: Date.now(),
      };
    } catch {
      return this.route(input, callerId);
    }
  }
}

export const intentRouter = new IntentRouter();
