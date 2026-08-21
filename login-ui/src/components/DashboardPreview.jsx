import React from "react";
import {
  Home, FileText, Gavel, ClipboardList, Ship, ShieldCheck,
  MapPin, FolderClosed, Bell, TrendingUp,
} from "lucide-react";
import WorldMapVisual from "./WorldMapVisual";

const navItems = [
  { icon: Home, label: "Overview", active: true },
  { icon: FileText, label: "RFQs" },
  { icon: Gavel, label: "Commodity Bids" },
  { icon: ClipboardList, label: "Purchase Orders" },
  { icon: Ship, label: "Freight" },
  { icon: ShieldCheck, label: "Inspection" },
  { icon: MapPin, label: "Tracking" },
  { icon: FolderClosed, label: "Documents" },
  { icon: Bell, label: "Alerts" },
];

const activities = [
  { icon: FileText, color: "bg-blue-500/20 text-blue-400", title: "RFQ-7862", sub: "New RFQ Created", time: "2h ago" },
  { icon: ClipboardList, color: "bg-orange-500/20 text-orange-400", title: "PO-2452", sub: "Confirmed by supplier", time: "5h ago" },
  { icon: Ship, color: "bg-teal-500/20 text-teal-400", title: "Shipment SHP-7852", sub: "Departed from Istanbul", time: "1d ago" },
  { icon: ShieldCheck, color: "bg-emerald-500/20 text-emerald-400", title: "Inspection INS-543", sub: "Inspection completed", time: "1d ago" },
];

export default function DashboardPreview() {
  return (
    <div className="dashboard-tablet w-[560px]">
      <div className="dashboard-tablet-screen">
        <div className="flex">
          <div className="w-[168px] shrink-0 border-r border-white/[0.06] bg-[#080e1f]">
          <div className="flex items-center px-3 py-3 border-b border-white/[0.06]">
            <img
              src={`${process.env.PUBLIC_URL}/demaxtore-logo.png`}
              alt="DeMaxtore Workspace"
              className="h-7 w-auto max-w-[140px] object-contain object-left"
              draggable={false}
            />
          </div>

          <nav className="p-2.5 space-y-0.5">
            {navItems.map((n) => {
              const Icon = n.icon;
              return (
                <div
                  key={n.label}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] transition-colors ${
                    n.active
                      ? "bg-white/[0.08] text-white border border-white/10 shadow-sm"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                  <span className="leading-none">{n.label}</span>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 p-5 space-y-4 bg-[#0a1024]">
          <div>
            <div className="font-serif-display text-[22px] text-white leading-tight">
              Good morning, Ali
            </div>
            <div className="text-slate-500 text-[11px] mt-1">
              Here&apos;s what&apos;s happening with your operations today.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <StatCard label="Active RFQs" value="24" delta="18%" color="text-emerald-400" />
            <StatCard label="Purchase Orders" value="12" delta="15%" color="text-emerald-400" />
          </div>

          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-slate-300 text-[11px]">Shipments In Transit</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <div className="text-white text-[28px] font-semibold leading-none">7</div>
                  <span className="text-blue-400 text-[11px] flex items-center gap-0.5 font-medium">
                    <TrendingUp className="w-3 h-3" /> 12%
                  </span>
                </div>
              </div>
              <WorldMapVisual className="w-[190px] h-[80px]" />
            </div>
          </div>

          <div>
            <div className="text-white text-[12px] font-semibold mb-2">Recent Activity</div>
            <div className="space-y-2">
              {activities.map((a) => {
                const Icon = a.icon;
                return (
                  <div key={a.title} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.color}`}>
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-[12px] font-medium truncate">{a.title}</div>
                      <div className="text-slate-500 text-[10px] truncate">{a.sub}</div>
                    </div>
                    <div className="text-slate-500 text-[10px] shrink-0">{a.time}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, delta, color, compact = false }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
      <div className="text-slate-400 text-[10px] leading-tight">{label}</div>
      <div className="flex items-baseline gap-1.5 mt-1.5">
        <div className={`text-white font-semibold leading-none ${compact ? "text-xl" : "text-2xl"}`}>
          {value}
        </div>
        <span className={`text-[10px] flex items-center gap-0.5 font-medium ${color}`}>
          <TrendingUp className="w-3 h-3" /> {delta}
        </span>
      </div>
    </div>
  );
}
