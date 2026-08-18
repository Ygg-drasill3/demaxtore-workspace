export declare function areRfqParticipantIdentitiesRevealed(state: string): boolean;
export interface RfqParticipantDTO {
    userId: string;
    participantRole: string;
    name: string;
    email?: string;
    identityRevealed: boolean;
}
