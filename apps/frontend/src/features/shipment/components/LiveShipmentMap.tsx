import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, LngLatBounds, NavigationControl } from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import {
  positionOnSeaRoute,
  resolvePortLngLat,
  seaRoutePolyline,
} from "../lib/port-coords";

export interface LiveMapMarker {
  id: string;
  label: string;
  lng: number;
  lat: number;
  kind?: "vessel" | "origin" | "destination" | "port";
  progressPercent?: number;
}

interface Props {
  markers?: LiveMapMarker[];
  origin?: string | null;
  destination?: string | null;
  progressPercent?: number;
  heightClassName?: string;
  className?: string;
  testId?: string;
  eyebrow?: string;
  title?: string;
}

function demoMarkers(): LiveMapMarker[] {
  // Turkey-centric preview routes (avoid defaulting the map to China/US lanes).
  const routes: Array<{ id: string; o: string; d: string; t: number; name: string }> = [
    { id: "demo-1", o: "TRMER", d: "QAHMD", t: 0.35, name: "CMA Anatolia" },
    { id: "demo-2", o: "TRMER", d: "AEJEA", t: 0.58, name: "MSC Levant" },
    { id: "demo-3", o: "TRMER", d: "ITGOA", t: 0.22, name: "Maersk Marmara" },
  ];
  return routes.flatMap((r) => {
    const o = resolvePortLngLat(r.o)!;
    const d = resolvePortLngLat(r.d)!;
    const pos = positionOnSeaRoute(r.o, r.d, r.t)!;
    return [
      { id: `${r.id}-o`, label: r.o, lng: o[0], lat: o[1], kind: "origin" as const },
      { id: `${r.id}-d`, label: r.d, lng: d[0], lat: d[1], kind: "destination" as const },
      {
        id: r.id,
        label: r.name,
        lng: pos[0],
        lat: pos[1],
        kind: "vessel" as const,
        progressPercent: Math.round(r.t * 100),
      },
    ];
  });
}

function buildStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      base: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap · CARTO",
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#dbeafe" } },
      { id: "base", type: "raster", source: "base" },
    ],
  };
}

function createMarkerEl(kind: LiveMapMarker["kind"], label: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "display:flex;flex-direction:column;align-items:center;pointer-events:auto;cursor:default;";

  if (kind === "vessel") {
    el.innerHTML = `
      <div style="
        width:28px;height:28px;border-radius:9999px;
        background:#059669;border:2px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,.35);
        display:flex;align-items:center;justify-content:center;
      " title="${label}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3 L20 19 L12 15 L4 19 Z" fill="#fff"/>
        </svg>
      </div>
      <span style="
        margin-top:2px;padding:1px 6px;border-radius:9999px;
        background:rgba(15,23,42,.85);color:#fff;font:600 10px/1.2 system-ui,sans-serif;
        white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;
      ">${label}</span>
    `;
  } else {
    const color = kind === "origin" ? "#0f766e" : kind === "destination" ? "#1e3a8a" : "#64748b";
    el.innerHTML = `
      <div style="
        width:12px;height:12px;border-radius:9999px;
        background:${color};border:2px solid #fff;
        box-shadow:0 1px 4px rgba(0,0,0,.3);
      " title="${label}"></div>
      <span style="
        margin-top:2px;padding:1px 5px;border-radius:9999px;
        background:rgba(255,255,255,.92);color:#334155;font:600 9px/1.2 system-ui,sans-serif;
        border:1px solid #e2e8f0;white-space:nowrap;
      ">${label}</span>
    `;
  }
  return el;
}

export function LiveShipmentMap({
  markers,
  origin,
  destination,
  progressPercent = 50,
  heightClassName = "h-64",
  className,
  testId = "live-shipment-map",
  eyebrow = "Live map",
  title = "Shipment tracking preview",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerObjsRef = useRef<Marker[]>([]);

  const originKey = origin ?? "";
  const destKey = destination ?? "";
  const markersKey = markers?.map((m) => `${m.id}:${m.lng},${m.lat}`).join("|") ?? "";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      style: buildStyle(),
      center: [35, 25],
      zoom: 1.8,
      minZoom: 1,
      maxZoom: 12,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const clearDomMarkers = () => {
      for (const m of markerObjsRef.current) m.remove();
      markerObjsRef.current = [];
    };

    const placeMarkers = (resolved: LiveMapMarker[]) => {
      clearDomMarkers();
      const bounds = new LngLatBounds();
      for (const m of resolved) {
        const marker = new Marker({ element: createMarkerEl(m.kind, m.label), anchor: "bottom" })
          .setLngLat([m.lng, m.lat])
          .addTo(map);
        markerObjsRef.current.push(marker);
        bounds.extend([m.lng, m.lat]);
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 56, maxZoom: 4.5, duration: 0 });
      }
      requestAnimationFrame(() => map.resize());
    };

    const resolveList = (): LiveMapMarker[] => {
      if (markers && markers.length > 0) return markers;
      const oPt = resolvePortLngLat(originKey || null);
      const dPt = resolvePortLngLat(destKey || null);
      if (oPt && dPt) {
        const cur = positionOnSeaRoute(originKey, destKey, progressPercent / 100) ?? oPt;
        return [
          { id: "origin", label: originKey || "Origin", lng: oPt[0], lat: oPt[1], kind: "origin" },
          { id: "dest", label: destKey || "Destination", lng: dPt[0], lat: dPt[1], kind: "destination" },
          { id: "vessel", label: "In transit", lng: cur[0], lat: cur[1], kind: "vessel", progressPercent },
        ];
      }
      return demoMarkers();
    };

    map.on("load", () => {
      const routeCoords =
        seaRoutePolyline(originKey || null, destKey || null)
        ?? (() => {
          const oPt = resolvePortLngLat(originKey || null);
          const dPt = resolvePortLngLat(destKey || null);
          return oPt && dPt ? [oPt, dPt] : null;
        })();

      if (routeCoords && routeCoords.length >= 2) {
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: routeCoords },
          },
        });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          paint: {
            "line-color": "#1e3a8a",
            "line-width": 3,
            "line-dasharray": [2, 1.5],
            "line-opacity": 0.85,
          },
        });
      }

      const resolved = resolveList();
      placeMarkers(resolved);
      // Second resize after layout settles (card height / flex)
      setTimeout(() => map.resize(), 120);
    });

    map.on("error", (e) => {
      console.warn("[LiveShipmentMap]", e.error?.message ?? e);
    });

    return () => {
      clearDomMarkers();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originKey, destKey, markersKey, progressPercent]);

  const vesselCount =
    markers?.filter((m) => m.kind === "vessel").length
    ?? (originKey && destKey ? 1 : 4);

  return (
    <section
      data-testid={testId}
      data-guide={testId === "buyer-dashboard-live-map" ? "dashboard-live-map" : undefined}
      className={cn("dmx-card overflow-hidden", className)}
    >
      <div className="border-b border-zinc-100 px-5 py-3 bg-zinc-50/80 flex items-center justify-between gap-3">
        <div>
          <span className="dmx-eyebrow text-zinc-500">{eyebrow}</span>
          <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            data-testid={`${testId}-vessel-count`}
            className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800"
          >
            {vesselCount} ship{vesselCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Preview
          </span>
        </div>
      </div>
      <div
        ref={containerRef}
        className={cn("w-full relative [&_.maplibregl-map]:!absolute [&_.maplibregl-map]:inset-0", heightClassName)}
        style={{ minHeight: 220 }}
      />
    </section>
  );
}
