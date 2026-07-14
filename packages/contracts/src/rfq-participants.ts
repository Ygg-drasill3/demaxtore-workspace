import type { RfqState } from "./rfq.fsm";

/** Buyer-facing identities stay masked until admin publishes the RFQ. */
const MASKED_PARTICIPANT_STATES = new Set<RfqState>([
  "RFQ_DRAFT",
  "RFQ_SUBMITTED",
  "SUPPLIERS_ASSIGNED",
  "REJECTED_BY_ADMIN",
]);

export function areRfqParticipantIdentitiesRevealed(state: string): boolean {
  return !MASKED_PARTICIPANT_STATES.has(state as RfqState);
}

export interface RfqParticipantDTO {
  userId: string;
  participantRole: string;
  name: string;
  email?: string;
  identityRevealed: boolean;
}
