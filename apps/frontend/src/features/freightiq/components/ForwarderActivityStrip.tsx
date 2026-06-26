import type { FreightRequestCommunication } from "@dmx/contracts/freight-communications";
import { Mail, Phone, MessageCircle } from "lucide-react";

const CHANNEL_ICON = {
  EMAIL: Mail,
  PHONE: Phone,
  WHATSAPP: MessageCircle,
  MANUAL: MessageCircle,
} as const;

interface Props {
  communications?: FreightRequestCommunication[];
}

export function ForwarderActivityStrip({ communications = [] }: Props) {
  if (!communications.length) return null;

  const contacted = communications.length;
  const responded = communications.filter((c) => c.status === "RESPONDED" || c.status === "CLOSED").length;
  const pending = communications.filter((c) => c.status === "PENDING" || c.status === "SENT").length;

  return (
    <section data-testid="freightiq-forwarder-strip" className="dmx-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="dmx-eyebrow text-zinc-500">Forwarder sourcing</span>
          <p className="text-sm font-medium mt-0.5">
            {contacted} contacted · {responded} responded · {pending} awaiting
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {communications.slice(0, 5).map((c) => {
            const Icon = CHANNEL_ICON[c.channel] ?? Mail;
            return (
              <span
                key={c.id}
                data-testid={`freightiq-comm-${c.id}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                  c.status === "RESPONDED" || c.status === "CLOSED"
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                    : c.status === "SENT"
                      ? "bg-blue-50 text-blue-800 ring-blue-200"
                      : "bg-paper-100 text-zinc-600 ring-paper-200"
                }`}
              >
                <Icon className="h-3 w-3" />
                {c.forwarderCompanyName ?? "Forwarder"}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
