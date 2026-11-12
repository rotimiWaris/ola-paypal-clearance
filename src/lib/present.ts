import type { ExhibitStatus, Proposal } from "./types";

export function statusLabel(status: ExhibitStatus): string {
  switch (status) {
    case "refused":
      return "Refused";
    case "cleared":
      return "Cleared, not settled";
    case "awaiting_paypal":
      return "Waiting on PayPal";
    case "captured":
      return "Captured in the PayPal sandbox";
    case "rehearsal":
      return "Rehearsal settlement";
  }
}

export function agentCredit(proposal: Proposal): string {
  if (proposal.modelError) {
    return "The model was unavailable, so the on-desk policy agent wrote this cart. The rules below are the decision.";
  }
  if (proposal.source === "groq") {
    return `Proposed by ${proposal.model ?? "a Groq model"}. The rules below are the decision.`;
  }
  if (proposal.source === "gemini") {
    return `Proposed by ${proposal.model ?? "Gemini"}. The rules below are the decision.`;
  }
  return "Proposed by the on-desk policy agent. The rules below are the decision.";
}
