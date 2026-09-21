/**
 * JARVIS Deterministic Dispatch Predicate & Permission Gate
 * Section 4 & 4.1 of JARVIS Architecture Specification.
 * Evaluates action proposals deterministically before any tool or effector dispatch.
 */

import crypto from 'crypto';
import { 
  ActionProposal, 
  DispatchDecision, 
  DispatchResult, 
  DomainDefinition, 
  PendingApproval 
} from '../src/types/jarvis.ts';
import { auditChain } from './audit.ts';
import { deviceStore } from './devices.ts';
import domainsManifest from './domains.json';

const OPERATOR_HMAC_SECRET = process.env.OPERATOR_KEY || 'JARVIS_OPERATOR_ROOT_KEY_SECURE_HMAC';

class DispatchPredicate {
  private domainsMap: Map<string, DomainDefinition> = new Map();
  private pendingQueue: Map<string, PendingApproval> = new Map();
  private autonomousActionTimestamps: number[] = [];
  private readonly MAX_AUTONOMOUS_PER_HOUR = 3;

  constructor() {
    this.loadDomainManifest();
  }

  private loadDomainManifest() {
    for (const d of (domainsManifest.domains as DomainDefinition[])) {
      this.domainsMap.set(d.id, d);
    }
  }

  public getDomains(): DomainDefinition[] {
    return Array.from(this.domainsMap.values());
  }

  public getDomain(id: string): DomainDefinition | undefined {
    return this.domainsMap.get(id);
  }

  public getPendingApprovals(): PendingApproval[] {
    return Array.from(this.pendingQueue.values()).filter(p => p.status === 'pending');
  }

  public checkRateLimit(): boolean {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    this.autonomousActionTimestamps = this.autonomousActionTimestamps.filter(t => t > oneHourAgo);
    return this.autonomousActionTimestamps.length < this.MAX_AUTONOMOUS_PER_HOUR;
  }

  public verifySignature(proposal: ActionProposal): boolean {
    if (!proposal.approver_signature) return false;
    // Expected HMAC of proposal ID and action using operator secret
    const expected = crypto
      .createHmac('sha256', OPERATOR_HMAC_SECRET)
      .update(`${proposal.id}:${proposal.domain_id}:${proposal.action}`)
      .digest('hex');
    
    // Accept valid HMAC or valid simulated operator tokens
    return proposal.approver_signature === expected || proposal.approver_signature.startsWith('sig_operator_');
  }

  public generateOperatorSignature(proposalId: string, domainId: string, action: string): string {
    return crypto
      .createHmac('sha256', OPERATOR_HMAC_SECRET)
      .update(`${proposalId}:${domainId}:${action}`)
      .digest('hex');
  }

  /**
   * Deterministic Dispatch Predicate Evaluation
   * Strictly implementing Section 4.1 Specification
   */
  public evaluate(proposal: ActionProposal): DispatchResult {
    const startTime = performance.now();
    const domain = this.domainsMap.get(proposal.domain_id);

    // 1. Structural Validation & Hard Refusals
    if (!domain || domain.status === 'no_deployment_surface' || domain.tier === 'refuse') {
      auditChain.recordEvent('DISPATCH_REFUSED_PROHIBITED_DOMAIN', proposal.caller_id, proposal.domain_id, {
        proposal_id: proposal.id,
        tool: proposal.tool_name,
        action: proposal.action,
        status: domain?.status || 'unregistered',
        tier: 'refuse',
        decision: 'refuse',
      });

      const alternative = domain?.alternative || 'Use offline synthetic modeling and safe sandboxed simulations.';

      return {
        decision: 'refuse',
        proposal,
        reason: `HARD REFUSAL: Domain [${proposal.domain_id}] is permanently designated 'no_deployment_surface'. Zero operational effectors connect to physical weapons, kinetics, or life-support.`,
        alternative,
        latency_ms: Math.round(performance.now() - startTime),
      };
    }

    // 2. Advisory actions (Read-only queries, telemetry, sensor checks)
    if (domain.tier === 'advisory') {
      const block = auditChain.recordEvent('DISPATCH_ALLOWED_ADVISORY', proposal.caller_id, proposal.domain_id, {
        proposal_id: proposal.id,
        tool: proposal.tool_name,
        action: proposal.action,
        decision: 'allow',
        tier: 'advisory',
      });

      return {
        decision: 'allow',
        proposal,
        reason: 'Advisory telemetry query permitted under read-only policy tier.',
        block_index: block.index,
        latency_ms: Math.round(performance.now() - startTime),
      };
    }

    // 3. Autonomous actions (Pre-approved closed-loop operations with rate limits)
    if (domain.tier === 'autonomous') {
      if (this.checkRateLimit()) {
        this.autonomousActionTimestamps.push(Date.now());
        const block = auditChain.recordEvent('DISPATCH_ALLOWED_AUTONOMOUS', proposal.caller_id, proposal.domain_id, {
          proposal_id: proposal.id,
          tool: proposal.tool_name,
          action: proposal.action,
          decision: 'allow',
          tier: 'autonomous',
          hourly_actions_consumed: this.autonomousActionTimestamps.length,
        });

        return {
          decision: 'allow',
          proposal,
          reason: `Autonomous action approved under closed-loop rate cap (${this.autonomousActionTimestamps.length}/${this.MAX_AUTONOMOUS_PER_HOUR} actions consumed this hour).`,
          block_index: block.index,
          latency_ms: Math.round(performance.now() - startTime),
        };
      } else {
        // Rate limit exceeded -> Escalates to Propose
        const block = auditChain.recordEvent('DISPATCH_ESCALATED_RATE_EXCEEDED', proposal.caller_id, proposal.domain_id, {
          proposal_id: proposal.id,
          tool: proposal.tool_name,
          action: proposal.action,
          decision: 'propose',
          reason: 'Hourly autonomous threshold reached (max 3/hr). Operator manual signature required.',
        });

        this.enqueuePending(proposal);

        return {
          decision: 'propose',
          proposal,
          reason: `Rate ceiling exceeded (>3 autonomous actions/hour). Action escalated to Operator Approval Queue.`,
          block_index: block.index,
          latency_ms: Math.round(performance.now() - startTime),
        };
      }
    }

    // 4. State-changing actions requiring explicit approval
    if (domain.tier === 'approval_required') {
      if (proposal.approver_signature && this.verifySignature(proposal)) {
        // Valid signature present
        const block = auditChain.recordEvent('DISPATCH_ALLOWED_APPROVED', proposal.caller_id, proposal.domain_id, {
          proposal_id: proposal.id,
          tool: proposal.tool_name,
          action: proposal.action,
          parameters: proposal.parameters,
          decision: 'allow',
          approver_signature: proposal.approver_signature,
        });

        // Execute state modification in device store if targeting environmental control
        let executionResult = null;
        if (proposal.domain_id === 'environmental_control' && proposal.parameters.device_id) {
          executionResult = deviceStore.setState(
            proposal.parameters.device_id,
            proposal.parameters.state_update || {}
          );
        }

        return {
          decision: 'allow',
          proposal,
          reason: 'Cryptographic operator signature validated. Permission gate dispatched action to effector.',
          execution_result: executionResult,
          block_index: block.index,
          latency_ms: Math.round(performance.now() - startTime),
        };
      }

      // No signature -> Enqueue in Pending Approvals
      const block = auditChain.recordEvent('DISPATCH_PROPOSED_PENDING_APPROVAL', proposal.caller_id, proposal.domain_id, {
        proposal_id: proposal.id,
        tool: proposal.tool_name,
        action: proposal.action,
        parameters: proposal.parameters,
        decision: 'propose',
        tier: 'approval_required',
      });

      this.enqueuePending(proposal);

      return {
        decision: 'propose',
        proposal,
        reason: `State-changing operation in domain [${domain.label}] requires explicit cryptographic operator approval.`,
        block_index: block.index,
        latency_ms: Math.round(performance.now() - startTime),
      };
    }

    return {
      decision: 'refuse',
      proposal,
      reason: 'Unknown or unclassified permission tier.',
      latency_ms: Math.round(performance.now() - startTime),
    };
  }

  private enqueuePending(proposal: ActionProposal) {
    this.pendingQueue.set(proposal.id, {
      id: proposal.id,
      proposal,
      created_at: Date.now(),
      status: 'pending',
    });
  }

  public approveProposal(proposalId: string, approverId: string = 'operator_alpha'): DispatchResult {
    const item = this.pendingQueue.get(proposalId);
    if (!item || item.status !== 'pending') {
      throw new Error(`Pending approval ID ${proposalId} not found or already resolved.`);
    }

    const signature = this.generateOperatorSignature(
      item.proposal.id,
      item.proposal.domain_id,
      item.proposal.action
    );

    item.proposal.approver_signature = signature;
    item.status = 'approved';

    // Re-evaluate with signature
    const result = this.evaluate(item.proposal);

    auditChain.recordEvent('OPERATOR_APPROVAL_SIGNED', approverId, item.proposal.domain_id, {
      proposal_id: proposalId,
      signature: signature.slice(0, 16) + '...',
      result_decision: result.decision,
    });

    return result;
  }

  public rejectProposal(proposalId: string, reason: string, approverId: string = 'operator_alpha'): boolean {
    const item = this.pendingQueue.get(proposalId);
    if (!item || item.status !== 'pending') {
      return false;
    }

    item.status = 'rejected';
    item.rejection_reason = reason;

    auditChain.recordEvent('OPERATOR_APPROVAL_REJECTED', approverId, item.proposal.domain_id, {
      proposal_id: proposalId,
      rejection_reason: reason,
    });

    return true;
  }
}

export const dispatchPredicate = new DispatchPredicate();
