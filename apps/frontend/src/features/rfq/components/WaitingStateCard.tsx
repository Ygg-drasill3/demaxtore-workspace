// apps/frontend/src/features/rfq/components/WaitingStateCard.tsx
//
// 4-section explanatory card for pure waiting states (Sprint 2.5 §10).
// Renders ONLY for states in WAITING_SCRIPTS. Hidden otherwise.
//
import type { RfqState } from "@dmx/contracts/rfq.fsm";
import { waitingScriptFor, formatScript, type WaitingScript, type WorkspaceScriptRole } from "../lib/rfq.scripts";

interface Props {
  state: RfqState;
  vars:  Record<string, string | number | null | undefined>;
  actorRole?: WorkspaceScriptRole;
}

export function WaitingStateCard({ state, vars, actorRole = "BUYER" }: Props) {
  const script: WaitingScript | undefined = waitingScriptFor(state, actorRole);
  if (!script) return null;

  const happening   = formatScript(script.happening,   vars);
  const responsible = formatScript(script.responsible, vars);
  const when        = formatScript(script.when,        vars);
  const expect      = script.expect.map((t) => formatScript(t, vars));

  return (
    <article
      data-testid="waiting-state-card"
      data-state={state}
      className="dmx-card p-6 sm:p-7 space-y-5 animate-fade-in"
    >
      <Section testId="waiting-now"    eyebrow="What is happening now?"   body={happening} />
      <Section testId="waiting-who"    eyebrow="Who is responsible?"      body={responsible} />
      <Section testId="waiting-expect" eyebrow="What should you expect?"  list={expect} />
      <Section testId="waiting-when"   eyebrow="When should this happen?" body={when} />
    </article>
  );
}

interface SectionProps {
  testId:  string;
  eyebrow: string;
  body?:   string;
  list?:   string[];
}

function Section({ testId, eyebrow, body, list }: SectionProps) {
  return (
    <div data-testid={testId}>
      <div className="dmx-eyebrow">{eyebrow}</div>
      {body && <p className="text-sm text-zinc-700 mt-1.5 leading-relaxed">{body}</p>}
      {list && (
        <ul className="text-sm text-zinc-700 mt-1.5 space-y-1.5">
          {list.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-2 h-1 w-1 rounded-full bg-zinc-400 shrink-0" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
