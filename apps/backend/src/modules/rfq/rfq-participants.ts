import {
  areRfqParticipantIdentitiesRevealed,
  type RfqParticipantDTO,
} from "@dmx/contracts/rfq-participants";

type ParticipantRow = { userId: string; participantRole: string };
type UserRow = {
  displayName: string;
  email: string;
  organisation?: { name: string } | null;
};

export function mapRfqParticipantsForViewer(opts: {
  state: string;
  participants: ParticipantRow[];
  users: Map<string, UserRow>;
  viewerRole?: string;
  viewerId?: string;
}): RfqParticipantDTO[] {
  const revealed =
    areRfqParticipantIdentitiesRevealed(opts.state) || opts.viewerRole === "ADMIN";

  const counterparty = opts.participants
    .filter((p) => p.participantRole === "COUNTERPARTY")
    .sort((a, b) => a.userId.localeCompare(b.userId));
  const counterpartyIndex = new Map(counterparty.map((p, i) => [p.userId, i + 1]));

  return opts.participants.map((p) => {
    const user = opts.users.get(p.userId);
    const isSelf = !!opts.viewerId && p.userId === opts.viewerId;
    const showIdentity =
      revealed || isSelf || p.participantRole === "OWNER" || opts.viewerRole === "ADMIN";

    if (showIdentity) {
      return {
        userId: p.userId,
        participantRole: p.participantRole,
        name: user?.organisation?.name ?? user?.displayName ?? "Participant",
        email: opts.viewerRole === "ADMIN" ? user?.email : undefined,
        identityRevealed: true,
      };
    }

    const anonymousLabel =
      p.participantRole === "COUNTERPARTY"
        ? `Supplier ${counterpartyIndex.get(p.userId) ?? ""}`.trim()
        : p.participantRole === "OPERATOR"
          ? "DeMaxtore"
          : "Participant";

    return {
      userId: p.userId,
      participantRole: p.participantRole,
      name: anonymousLabel,
      identityRevealed: false,
    };
  });
}
