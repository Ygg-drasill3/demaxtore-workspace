import React from "react";
import {
  FileText, Gavel, ClipboardList, Ship, ShieldCheck, MapPin,
} from "lucide-react";
import DashboardPreview from "./DashboardPreview";
import GlobeGraphic from "./GlobeGraphic";

const features = [
  { icon: FileText, title: "RFQ\u2122", desc: "Create and manage requests", color: "bg-blue-600" },
  { icon: Gavel, title: "CommodityBid\u2122", desc: "Reverse auctions, best offers", color: "bg-violet-600" },
  { icon: ClipboardList, title: "Purchase Orders", desc: "Confirm and manage orders", color: "bg-orange-500" },
  { icon: Ship, title: "FreightIQ\u2122", desc: "Freight rates and booking", color: "bg-teal-500" },
  { icon: ShieldCheck, title: "Inspection\u2122", desc: "Quality control, pre-shipment", color: "bg-rose-500" },
  { icon: MapPin, title: "Live Shipment Tracking", desc: "Real-time visibility, ETA alerts", color: "bg-emerald-500" },
];

export default function LeftPanel() {
  return (
    <div className="relative w-full lg:w-[58%] bg-[#050a17] text-white overflow-hidden">
      <div className="absolute inset-0 bg-grid-dark opacity-70" />
      <div className="absolute -top-40 right-0 w-[700px] h-[700px] globe-glow pointer-events-none" />

      {/* Globe + tilted dashboard, positioned on the right, cut off by overflow-hidden */}
      <div className="hidden lg:block absolute top-[250px] left-[45%] z-[5] pointer-events-none">
        <GlobeGraphic className="absolute -top-36 left-8 w-[520px] h-[260px] opacity-90" />
        <div className="dashboard-tilt">
          <DashboardPreview />
        </div>
      </div>

      <div className="relative z-10 px-8 lg:px-14 pt-6 lg:pt-8 pb-8">
        <div className="mb-14">
          <img
            src={`${process.env.PUBLIC_URL}/demaxtore-logo.png`}
            alt="DeMaxtore Workspace"
            className="h-14 w-auto max-w-[280px] object-contain object-left"
            draggable={false}
          />
        </div>

        <div className="relative max-w-md lg:max-w-[480px]">
          <h1 className="font-tiempos-headline hero-headline">
            <span className="block">The Import Operating</span>
            <span className="block">System for Companies</span>
            <span className="block hero-headline-accent">Sourcing From Turkey.</span>
          </h1>
          <p className="mt-6 text-slate-400 text-[15px] leading-[1.7] max-w-[460px]">
            Manage RFQs, supplier quotations, CommodityBid™<br />
            purchase orders, inspections, freight and shipment<br />
            tracking in one intelligent workspace.
          </p>
        </div>

        <div className="mt-10 relative pl-2 max-w-md lg:max-w-[440px]">
          <div className="feature-line" />
          <ul className="space-y-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="relative flex items-center gap-4 group">
                  <span className="absolute -left-[3px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-white transition-colors" />
                  <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center shadow-md shadow-black/40 ml-5`}>
                    <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-white">{f.title}</div>
                    <div className="text-[13px] text-slate-400">{f.desc}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

      </div>
    </div>
  );
}
