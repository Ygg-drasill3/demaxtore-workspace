import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import type { PartnerCustomsCaseSummaryDto } from "@dmx/contracts/partner-workspace";
import { MyCustomsCasesQueue } from "./MyCustomsCasesQueue";

const CASE_ID = "16069f9b-d805-4e95-a013-89f450c47d22";
const OTHER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function sample(overrides: Partial<PartnerCustomsCaseSummaryDto> = {}): PartnerCustomsCaseSummaryDto {
  return {
    customsCaseId: CASE_ID,
    shipmentWorkspaceId: "08398029-7440-443a-90bf-6ac64a36abb0",
    shipmentRef: "SHP-UI17B-DEMO",
    importerLabel: "PO-UI17B-DEMO",
    eta: "2026-08-20T00:00:00.000Z",
    readinessStatus: "NOT_READY",
    customsStatus: "DRAFT",
    blockingIssues: 0,
    nextAction: "Start review",
    daysToArrival: 6,
    urgency: "LOW",
    queueGroup: "READY_FOR_REVIEW",
    destinationPort: "TRIST",
    ...overrides,
  };
}

function wrap(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("MyCustomsCasesQueue", () => {
  it("renders assigned case as clickable Open Case without showing UUID as the title", () => {
    wrap(<MyCustomsCasesQueue cases={[sample()]} />);
    expect(screen.getByTestId("my-customs-cases")).toBeInTheDocument();
    expect(screen.getByTestId("customs-case-title")).toHaveTextContent("SHP-UI17B-DEMO");
    expect(screen.getByTestId("customs-case-title")).not.toHaveTextContent(CASE_ID);
    const link = screen.getByTestId("open-customs-case-SHP-UI17B-DEMO");
    expect(link).toHaveAttribute("href", `/partner/customs/${CASE_ID}`);
    expect(link).toHaveTextContent("Open Case");
    expect(screen.getByText(/Start review/)).toBeInTheDocument();
    expect(screen.getByText(/TRIST/)).toBeInTheDocument();
  });

  it("does not render an unassigned case that was never passed in", () => {
    wrap(<MyCustomsCasesQueue cases={[sample()]} />);
    expect(screen.queryByTestId(`open-customs-case-${OTHER_ID}`)).not.toBeInTheDocument();
    expect(screen.queryByText(OTHER_ID)).not.toBeInTheDocument();
  });

  it("shows empty state when broker has no assigned cases", () => {
    wrap(<MyCustomsCasesQueue cases={[]} />);
    expect(screen.getByTestId("my-customs-cases-empty")).toHaveTextContent("No assigned customs cases yet.");
    expect(screen.queryByText("Open Case")).not.toBeInTheDocument();
  });
});
