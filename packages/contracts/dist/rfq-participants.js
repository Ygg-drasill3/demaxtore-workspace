/** Buyer-facing identities stay masked until admin publishes the RFQ. */
const MASKED_PARTICIPANT_STATES = new Set([
    "RFQ_DRAFT",
    "RFQ_SUBMITTED",
    "SUPPLIERS_ASSIGNED",
    "REJECTED_BY_ADMIN",
]);
export function areRfqParticipantIdentitiesRevealed(state) {
    return !MASKED_PARTICIPANT_STATES.has(state);
}
