import { StatCard } from "@/features/dashboard/components/StatCard";
import { Card, CardBody, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/Card";
import { Users, CheckCircle2, Trophy, Clock } from "lucide-react";
import { useOnboardingDashboard } from "../hooks";

export default function OnboardingDashboardPage() {
  const { data, isLoading } = useOnboardingDashboard();

  if (isLoading || !data) {
    return <div data-testid="onboarding-dashboard-loading" className="dmx-card p-8 animate-pulse h-64" />;
  }

  return (
    <div data-testid="onboarding-dashboard-page" className="max-w-[1400px] mx-auto space-y-7 animate-fade-in">
      <header>
        <span className="dmx-eyebrow text-zinc-500">Admin · First Trade Success</span>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">Onboarding Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1.5">Track first-trade completion across buyers, suppliers, and operators.</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard testId="metric-users-onboarded" label="Users onboarded" value={data.usersOnboarded} icon={Users} tone="accent" />
        <StatCard testId="metric-completed" label="Completed onboarding" value={data.usersCompletedOnboarding} icon={CheckCircle2} tone="success" />
        <StatCard testId="metric-first-trade" label="First trade completed" value={data.firstTradeCompleted} icon={Trophy} tone="warning" />
        <StatCard
          testId="metric-avg-time"
          label="Avg completion (hrs)"
          value={data.averageCompletionHours ?? "—"}
          icon={Clock}
        />
      </section>

      <Card>
        <CardHeader>
          <div>
            <CardEyebrow>Role breakdown</CardEyebrow>
            <CardTitle className="mt-1">Completion by role</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="role-breakdown-table">
              <thead>
                <tr className="text-left text-zinc-500 border-b border-paper-200">
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Completed</th>
                  <th className="pb-2">First trade</th>
                </tr>
              </thead>
              <tbody>
                {(["BUYER", "SUPPLIER", "ADMIN"] as const).map((role) => (
                  <tr key={role} className="border-b border-paper-100" data-testid={`role-row-${role}`}>
                    <td className="py-2 pr-4 font-medium">{role}</td>
                    <td className="py-2 pr-4">{data.roleBreakdown[role].total}</td>
                    <td className="py-2 pr-4">{data.roleBreakdown[role].completed}</td>
                    <td className="py-2">{data.roleBreakdown[role].firstTrade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {(["onboarding-users", "onboarding-progress", "first-trade-success", "role-completion"] as const).map((type) => (
              <a
                key={type}
                href={`/api/onboarding/export/${type}.csv`}
                data-testid={`csv-export-${type}`}
                className="text-sm font-medium text-accent-900 hover:underline"
              >
                Export {type}.csv
              </a>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
