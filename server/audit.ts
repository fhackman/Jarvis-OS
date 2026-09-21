/**
 * JARVIS Cryptographic Audit & Governance Layer
 * Append-Only Hash Chain with SHA-256 verification and Merkle Anchor exfiltration.
 * Section 6 of JARVIS Architecture Specification.
 */

import crypto from 'crypto';
import { AuditBlock, AuditVerificationResult } from '../src/types/jarvis.ts';

class AuditHashChain {
  private chain: AuditBlock[] = [];
  private originalCopies: Map<number, AuditBlock> = new Map();
  private lastAnchorTimestamp: number = Date.now();

  constructor() {
    this.createGenesisBlock();
  }

  private calculateHash(
    index: number,
    timestamp: number,
    eventType: string,
    payload: Record<string, any>,
    prevHash: string
  ): string {
    const rawData = `${index}:${timestamp}:${eventType}:${JSON.stringify(payload)}:${prevHash}`;
    return crypto.createHash('sha256').update(rawData).digest('hex');
  }

  private createGenesisBlock() {
    const timestamp = Date.now() - 3600000;
    const eventType = 'GENESIS_ANCHOR';
    const payload = {
      system: 'JARVIS-COGNITIVE-OS',
      version: '1.0.0-PROD',
      policy: 'FAIL_CLOSED_DETERMINISTIC_GATING',
      root_authority: 'OPERATOR_LOCAL_SEAL',
    };
    const prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    const hash = this.calculateHash(0, timestamp, eventType, payload, prevHash);

    const genesisBlock: AuditBlock = {
      index: 0,
      timestamp,
      event_type: eventType,
      actor: 'system_core',
      domain: 'system_proactivity',
      payload,
      prev_hash: prevHash,
      hash,
    };

    this.chain.push(genesisBlock);
    this.seedInitialEvents();
  }

  private seedInitialEvents() {
    this.recordEvent(
      'SYSTEM_BOOT_INITIALIZED',
      'system_watchdog',
      'system_proactivity',
      { status: 'healthy', subsystem_count: 8, policy_engine: 'enforcing' }
    );
    this.recordEvent(
      'INTELLIGENCE_FEEDS_SYNCED',
      'intel_daemon',
      'incident_intelligence',
      { sources: ['USGS', 'NASA_FIRMS', 'ADSB'], feed_status: 'nominal' }
    );
  }

  public recordEvent(
    eventType: string,
    actor: string,
    domain: string,
    payload: Record<string, any>
  ): AuditBlock {
    const index = this.chain.length;
    const timestamp = Date.now();
    const prevBlock = this.chain[index - 1];
    const prevHash = prevBlock.hash;

    const hash = this.calculateHash(index, timestamp, eventType, payload, prevHash);

    const block: AuditBlock = {
      index,
      timestamp,
      event_type: eventType,
      actor,
      domain,
      payload,
      prev_hash: prevHash,
      hash,
    };

    this.chain.push(block);
    this.lastAnchorTimestamp = Date.now();
    return block;
  }

  public getChain(): AuditBlock[] {
    return [...this.chain];
  }

  public verifyChain(): AuditVerificationResult {
    const merkleRoot = this.computeMerkleRoot();

    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      // 1. Verify previous hash pointer integrity
      if (current.prev_hash !== previous.hash) {
        return {
          valid: false,
          block_count: this.chain.length,
          failed_at_index: i,
          error_message: `Pointer Mismatch: Block ${i} prev_hash (${current.prev_hash.slice(0, 10)}...) does not match Block ${i - 1} hash (${previous.hash.slice(0, 10)}...)`,
          merkle_root: merkleRoot,
          last_anchor_timestamp: this.lastAnchorTimestamp,
        };
      }

      // 2. Re-verify SHA-256 computation
      const recalculatedHash = this.calculateHash(
        current.index,
        current.timestamp,
        current.event_type,
        current.payload,
        current.prev_hash
      );

      if (current.hash !== recalculatedHash) {
        return {
          valid: false,
          block_count: this.chain.length,
          failed_at_index: i,
          error_message: `Hash Invalidation: Block ${i} payload or metadata has been altered. Stored: ${current.hash.slice(0, 10)}... vs Computed: ${recalculatedHash.slice(0, 10)}...`,
          merkle_root: merkleRoot,
          last_anchor_timestamp: this.lastAnchorTimestamp,
        };
      }
    }

    return {
      valid: true,
      block_count: this.chain.length,
      merkle_root: merkleRoot,
      last_anchor_timestamp: this.lastAnchorTimestamp,
    };
  }

  public computeMerkleRoot(): string {
    if (this.chain.length === 0) return '';
    let hashes = this.chain.map(b => b.hash);
    
    while (hashes.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < hashes.length; i += 2) {
        if (i + 1 < hashes.length) {
          nextLevel.push(
            crypto.createHash('sha256').update(hashes[i] + hashes[i + 1]).digest('hex')
          );
        } else {
          nextLevel.push(hashes[i]);
        }
      }
      hashes = nextLevel;
    }
    return hashes[0];
  }

  public simulateTamper(blockIndex: number): { success: boolean; message: string } {
    if (blockIndex <= 0 || blockIndex >= this.chain.length) {
      return { success: false, message: `Cannot tamper block index ${blockIndex}` };
    }

    if (!this.originalCopies.has(blockIndex)) {
      this.originalCopies.set(blockIndex, JSON.parse(JSON.stringify(this.chain[blockIndex])));
    }

    // Mutate the payload without recalculating subsequent block hashes
    const block = this.chain[blockIndex];
    block.payload = {
      ...block.payload,
      _tampered_flag: true,
      decision: 'allow_UNAUTHORIZED_OVERRIDE',
      injected_payload: 'MALICIOUS_STATE_MUTATION',
    };
    block.tampered = true;

    return {
      success: true,
      message: `Simulated unauthorized tamper at Block #${blockIndex}. Run chain verification to test cryptographic fail-closed detection.`,
    };
  }

  public restoreChain(): { success: boolean; message: string } {
    this.originalCopies.forEach((origBlock, index) => {
      this.chain[index] = JSON.parse(JSON.stringify(origBlock));
    });
    this.originalCopies.clear();
    return { success: true, message: 'Cryptographic hash chain restored to pristine verified state.' };
  }
}

export const auditChain = new AuditHashChain();
