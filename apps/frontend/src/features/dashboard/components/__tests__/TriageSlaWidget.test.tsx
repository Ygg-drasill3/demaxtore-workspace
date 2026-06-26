// apps/frontend/src/features/dashboard/components/__tests__/TriageSlaWidget.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TriageSlaWidget } from "../TriageSlaWidget";

describe("<TriageSlaWidget />", () => {
  it("renders all 5 operational cells", () => {
    render(<TriageSlaWidget data={{
      newRfqs: 7, pendingAssignment: 4, avgAssignmentHours: 3.2,
      countOver24h: 0, countOver48h: 0,
    }} />);
    expect(screen.getByTestId("triage-new")).toHaveTextContent("7");
    expect(screen.getByTestId("triage-pending")).toHaveTextContent("4");
    expect(screen.getByTestId("triage-avg")).toHaveTextContent("3.2h");
    expect(screen.getByTestId("triage-over-24")).toHaveTextContent("0");
    expect(screen.getByTestId("triage-over-48")).toHaveTextContent("0");
  });

  it("shows 'All clear' when no pending and no breaches", () => {
    render(<TriageSlaWidget data={{
      newRfqs: 0, pendingAssignment: 0, avgAssignmentHours: 0,
      countOver24h: 0, countOver48h: 0,
    }} />);
    expect(screen.getByTestId("triage-sla-widget")).toHaveTextContent(/all clear/i);
  });

  it("shows 'SLA breach' badge when countOver48h > 0", () => {
    render(<TriageSlaWidget data={{
      newRfqs: 7, pendingAssignment: 4, avgAssignmentHours: 14.0,
      countOver24h: 3, countOver48h: 1,
    }} />);
    expect(screen.getByTestId("triage-sla-widget")).toHaveTextContent(/sla breach/i);
  });
});
