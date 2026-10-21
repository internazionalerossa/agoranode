import {
  evaluateGovernanceDecision,
  parseGovernanceDecisionEnvelope,
  type GovernanceDecisionClass,
  type GovernanceNodeMandateVerifier,
  type GovernanceQuorumCertificate,
  type GovernanceSignatureVerifier,
} from "../app/platform/agora-governance-protocol";
import { canonicalKnowledgeJson } from "../app/lib/knowledge-model";
import type { GovernanceAuthorizationVerifier } from "./knowledge-replication-finality";

export type KnowledgeGovernanceAuthorizationMaterial = {
  decision: unknown;
  certificate: GovernanceQuorumCertificate;
};

/**
 * Adapts the political governance protocol to the fail-closed callback used by
 * public replication. Technical 2f+1 finality stays a separate certificate.
 */
export function knowledgeGovernanceAuthorizationVerifier(
  materialForDigest: (
    decisionDigest: string,
  ) =>
    | KnowledgeGovernanceAuthorizationMaterial
    | null
    | Promise<KnowledgeGovernanceAuthorizationMaterial | null>,
  options: {
    now: number;
    verifySignature: GovernanceSignatureVerifier;
    verifyNodeMandate?: GovernanceNodeMandateVerifier;
    allowedDecisionClasses?: readonly GovernanceDecisionClass[];
  },
): GovernanceAuthorizationVerifier {
  const allowed = new Set<GovernanceDecisionClass>(
    options.allowedDecisionClasses ?? ["instance-ordinary"],
  );
  return async ({
    networkId,
    spaceId,
    bundle,
    decisionDigest,
    previousCheckpointId,
  }) => {
    try {
      const material = await materialForDigest(decisionDigest);
      if (!material) return false;
      const decision = parseGovernanceDecisionEnvelope(material.decision);
      if (
        !Number.isSafeInteger(options.now) ||
        options.now < decision.appealClosesAt ||
        decision.networkId !== networkId ||
        decision.scope.kind !== "instance" ||
        decision.scope.id !== spaceId ||
        decision.baseCheckpointId !== previousCheckpointId ||
        decision.proposalSha256 !== `sha256:${bundle.sha256}` ||
        !allowed.has(decision.decisionClass)
      ) {
        return false;
      }
      const derived = await evaluateGovernanceDecision(
        decision,
        material.certificate.ballots,
        {
          now: options.now,
          verifySignature: options.verifySignature,
          verifyNodeMandate: options.verifyNodeMandate,
        },
      );
      return (
        derived.outcome === "approved" &&
        derived.decisionDigest === decisionDigest &&
        canonicalKnowledgeJson(derived) ===
          canonicalKnowledgeJson(material.certificate)
      );
    } catch {
      return false;
    }
  };
}
