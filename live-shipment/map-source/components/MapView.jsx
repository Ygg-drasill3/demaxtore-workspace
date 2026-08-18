import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import { useAppStore, MAP_STYLES } from "@/store/useAppStore";
import { VESSEL_TYPES, TYPE_COLOR } from "@/lib/vesselMeta";
import { AisApi } from "@/lib/api";
import { APP } from "@/constants/testIds";
import { useVesselStream, sendBounds } from "@/hooks/useVesselStream";

// Build a rotated ship-arrow icon per vessel type as a canvas image.
function buildArrowIcon(color, size = 34) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const c = size / 2;
  // Ship arrow pointing UP (heading 0 = north).
  ctx.beginPath();
  ctx.moveTo(c, 3);
  ctx.lineTo(size - 5, size - 5);
  ctx.lineTo(c, size - 10);
  ctx.lineTo(5, size - 5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 1.4;
  ctx.fill();
  ctx.stroke();
  // subtle inner highlight for contrast on light backgrounds
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 0.6;
  ctx.stroke();
  return { data: ctx.getImageData(0, 0, size, size).data, width: size, height: size };
}

function buildAnchorIcon(color, size = 24) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const c = size / 2;
  ctx.beginPath();
  ctx.arc(c, c, size / 2 - 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 0.6;
  ctx.stroke();
  return { data: ctx.getImageData(0, 0, size, size).data, width: size, height: size };
}

function styleSpec(styleId, theme) {
  const s = MAP_STYLES.find((m) => m.id === styleId) || MAP_STYLES[1];
  const overlay = MAP_STYLES.find((m) => m.id === "nautical");
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      base: {
        type: "raster",
        tiles: [s.tiles],
        tileSize: 256,
        attribution: '© OpenStreetMap · CARTO',
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": theme === "dark" ? "#020617" : "#e2e8f0" } },
      { id: "base", type: "raster", source: "base" },
    ],
  };
}

export default function MapView({ mapRef, onMove }) {
  const containerRef = useRef(null);
  const wsRef = useVesselStream();
  const rafRef = useRef(null);
  const styleId = useAppStore((s) => s.mapStyle);
  const theme = useAppStore((s) => s.theme);
  const activeLayers = useAppStore((s) => s.activeLayers);
  const typeFilter = useAppStore((s) => s.typeFilter);
  const speedRange = useAppStore((s) => s.speedRange);
  const countryFilter = useAppStore((s) => s.countryFilter);
  const selectVessel = useAppStore((s) => s.selectVessel);
  const selectPort = useAppStore((s) => s.selectPort);
  const selectedId = useAppStore((s) => s.selectedVesselId);
  const followVessel = useAppStore((s) => s.followVessel);
  const livePlaying = useAppStore((s) => s.livePlaying);
  const routesLayerRef = useRef(false);

  // --- initial map setup -------------------------------------------------
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleSpec(styleId, theme),
      center: [10, 30],
      zoom: 2.2,
      minZoom: 1.4,
      maxZoom: 16,
      attributionControl: { compact: true },
      renderWorldCopies: true,
    });
    mapRef.current = map;
    map.on("load", () => {
      // Build icons per type
      for (const t of VESSEL_TYPES) {
        const arrow = buildArrowIcon(t.color, 24);
        const arr = new ImageData(new Uint8ClampedArray(arrow.data), arrow.width, arrow.height);
        if (!map.hasImage(`arrow-${t.code}`)) {
          map.addImage(`arrow-${t.code}`, arr, { pixelRatio: 2 });
        }
        const anch = buildAnchorIcon(t.color, 20);
        const arr2 = new ImageData(new Uint8ClampedArray(anch.data), anch.width, anch.height);
        if (!map.hasImage(`dot-${t.code}`)) {
          map.addImage(`dot-${t.code}`, arr2, { pixelRatio: 2 });
        }
      }
      // Port anchor icon
      const portIcon = buildAnchorIcon("#0ea5e9", 18);
      const portArr = new ImageData(new Uint8ClampedArray(portIcon.data), portIcon.width, portIcon.height);
      map.addImage("port-icon", portArr, { pixelRatio: 2 });

      // Vessels source (cluster-enabled)
      map.addSource("vessels", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 44,
        clusterMaxZoom: 6,
      });

      // Cluster circles
      map.addLayer({
        id: "vessels-clusters",
        type: "circle",
        source: "vessels",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#0ea5e9",
            50, "#22c55e",
            200, "#f59e0b",
            600, "#f43f5e",
          ],
          "circle-opacity": 0.85,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(255,255,255,0.6)",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            14,
            50, 18,
            200, 22,
            600, 28,
            2000, 34,
          ],
        },
      });
      map.addLayer({
        id: "vessels-cluster-count",
        type: "symbol",
        source: "vessels",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 11,
          "text-font": ["Noto Sans Regular"],
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#ffffff" },
      });
      // Individual vessels
      map.addLayer({
        id: "vessels-points",
        type: "symbol",
        source: "vessels",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": [
            "case",
            ["==", ["get", "moored"], true],
            ["concat", "dot-", ["get", "type"]],
            ["concat", "arrow-", ["get", "type"]],
          ],
          "icon-size": [
            "interpolate", ["linear"], ["zoom"],
            2, 0.5,
            5, 0.7,
            10, 1.0,
            14, 1.3,
          ],
          "icon-rotate": ["get", "heading"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      // Selection ring
      map.addSource("selection", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "selection-ring",
        type: "circle",
        source: "selection",
        paint: {
          "circle-radius": 18,
          "circle-color": "rgba(14,165,233,0.15)",
          "circle-stroke-color": "#0ea5e9",
          "circle-stroke-width": 2,
        },
      });

      // Track (past)
      map.addSource("track", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "track-line",
        type: "line",
        source: "track",
        paint: {
          "line-color": "#94a3b8",
          "line-width": 2,
          "line-dasharray": [1, 1.5],
        },
      });
      // Forecast (dashed animated)
      map.addSource("forecast", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "forecast-line",
        type: "line",
        source: "forecast",
        paint: {
          "line-color": "#0ea5e9",
          "line-width": 2.5,
        },
      });

      // Ports
      map.addSource("ports", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "ports-layer",
        type: "symbol",
        source: "ports",
        layout: {
          "icon-image": "port-icon",
          "icon-size": 0.8,
          "icon-allow-overlap": true,
          "text-field": ["step", ["zoom"], "", 4, ["get", "name"]],
          "text-size": 10,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
          "text-font": ["Noto Sans Regular"],
        },
        paint: {
          "text-color": theme === "dark" ? "#e2e8f0" : "#0f172a",
          "text-halo-color": theme === "dark" ? "#020617" : "#ffffff",
          "text-halo-width": 1.2,
        },
      });

      // Shipping lanes source
      map.addSource("shipping-lanes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "shipping-lanes-layer",
        type: "line",
        source: "shipping-lanes",
        layout: { visibility: activeLayers.has("shipping_lanes") ? "visible" : "none" },
        paint: {
          "line-color": "#0ea5e9",
          "line-width": 1.2,
          "line-opacity": 0.4,
          "line-dasharray": [2, 2],
        },
      });

      // Traffic heatmap
      map.addLayer({
        id: "traffic-heatmap",
        type: "heatmap",
        source: "vessels",
        maxzoom: 6,
        layout: { visibility: activeLayers.has("traffic") ? "visible" : "none" },
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": 1.2,
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 8, 6, 40],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "rgba(56,189,248,0.35)",
            0.5, "rgba(34,197,94,0.55)",
            0.8, "rgba(245,158,11,0.7)",
            1, "rgba(244,63,94,0.85)",
          ],
          "heatmap-opacity": 0.75,
        },
      }, "vessels-clusters");

      // Overlay: nautical seamarks
      map.addSource("nautical", {
        type: "raster",
        tiles: ["https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"],
        tileSize: 256,
      });
      map.addLayer({
        id: "nautical-layer",
        type: "raster",
        source: "nautical",
        layout: { visibility: styleId === "nautical" ? "visible" : "none" },
      });

      // Weather-ish mocked overlays (color washes)
      const weatherOverlays = [
        { id: "wind", color: "rgba(56,189,248,0.20)" },
        { id: "wave", color: "rgba(34,211,238,0.18)" },
        { id: "temp", color: "rgba(249,115,22,0.18)" },
        { id: "rain", color: "rgba(129,140,248,0.20)" },
        { id: "clouds", color: "rgba(148,163,184,0.25)" },
        { id: "currents", color: "rgba(167,139,250,0.20)" },
      ];
      for (const w of weatherOverlays) {
        map.addLayer({
          id: `weather-${w.id}`,
          type: "background",
          layout: { visibility: activeLayers.has(w.id) ? "visible" : "none" },
          paint: { "background-color": w.color },
        }, "vessels-clusters");
      }

      // Load port catalogue once
      AisApi.ports().then((ports) => {
        const fc = {
          type: "FeatureCollection",
          features: ports.map((p) => ({
            type: "Feature",
            properties: { ...p },
            geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          })),
        };
        map.getSource("ports")?.setData(fc);
      });

      // Load shipping lanes once
      AisApi.routes().then((routes) => {
        const fc = {
          type: "FeatureCollection",
          features: routes.map((r) => ({
            type: "Feature",
            properties: { id: r.id, vessels: r.vessels },
            geometry: { type: "LineString", coordinates: r.waypoints.map((w) => [w.lng, w.lat]) },
          })),
        };
        map.getSource("shipping-lanes")?.setData(fc);
      });

      routesLayerRef.current = true;
      pushBounds();
    });

    map.on("moveend", () => {
      pushBounds();
      if (onMove) {
        const c = map.getCenter();
        onMove({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
      }
    });
    map.on("move", () => {
      if (onMove) {
        const c = map.getCenter();
        onMove({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
      }
    });

    // Click vessels
    map.on("click", "vessels-points", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const id = f.properties.id;
      AisApi.vessel(id).then((v) => selectVessel(v));
    });
    map.on("click", "vessels-clusters", (e) => {
      const f = e.features?.[0];
      const clusterId = f.properties.cluster_id;
      const src = map.getSource("vessels");
      src.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        map.easeTo({ center: f.geometry.coordinates, zoom });
      });
    });
    map.on("click", "ports-layer", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      AisApi.port(f.properties.id).then((p) => selectPort(p));
    });
    map.on("mouseenter", "vessels-points", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "vessels-points", () => (map.getCanvas().style.cursor = ""));
    map.on("mouseenter", "ports-layer", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "ports-layer", () => (map.getCanvas().style.cursor = ""));

    function pushBounds() {
      const b = map.getBounds();
      const arr = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      sendBounds(wsRef.current, arr, []);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line
  }, []);

  // --- react to style change --------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const s = MAP_STYLES.find((m) => m.id === styleId) || MAP_STYLES[1];
    const src = map.getSource("base");
    if (src && src.tiles?.[0] !== s.tiles) {
      // MapLibre raster source: rebuild by setting new tiles
      map.removeLayer("base");
      map.removeSource("base");
      map.addSource("base", { type: "raster", tiles: [s.tiles], tileSize: 256 });
      map.addLayer({ id: "base", type: "raster", source: "base" }, "vessels-clusters");
    }
    // Nautical overlay
    if (map.getLayer("nautical-layer")) {
      map.setLayoutProperty(
        "nautical-layer",
        "visibility",
        styleId === "nautical" ? "visible" : "none",
      );
    }
  }, [styleId]); // eslint-disable-line

  // --- react to layer toggles ------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const setVis = (id, on) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    };
    setVis("shipping-lanes-layer", activeLayers.has("shipping_lanes"));
    setVis("traffic-heatmap", activeLayers.has("traffic"));
    ["wind", "wave", "temp", "rain", "clouds", "currents"].forEach((k) =>
      setVis(`weather-${k}`, activeLayers.has(k)),
    );
  }, [activeLayers]);

  // --- interpolation RAF --------------------------------------------
  useEffect(() => {
    let lastPush = 0;
    const tick = (t) => {
      const map = mapRef.current;
      if (map && map.isStyleLoaded()) {
        const state = useAppStore.getState();
        const src = map.getSource("vessels");
        if (src) {
          const now = performance.now();
          const features = [];
          const types = state.typeFilter;
          const speedR = state.speedRange;
          const country = (state.countryFilter || "").toLowerCase();
          for (const v of state.vessels.values()) {
            if (types.size && !types.has(v.type)) continue;
            if (v.speed != null && (v.speed < speedR[0] || v.speed > speedR[1])) continue;
            if (country && !(v.flag_country || "").toLowerCase().includes(country)) continue;
            let lat = v.target_lat;
            let lng = v.target_lng;
            if (state.livePlaying) {
              const dt = Math.min(1, (now - v.tsBase) / 2000);
              lat = v.prev_lat + (v.target_lat - v.prev_lat) * dt;
              lng = v.prev_lng + (v.target_lng - v.prev_lng) * dt;
            }
            features.push({
              type: "Feature",
              properties: {
                id: v.id,
                type: v.type,
                heading: v.heading || 0,
                moored: v.nav_status === "At Anchor" || v.nav_status === "Moored",
              },
              geometry: { type: "Point", coordinates: [lng, lat] },
            });
          }
          src.setData({ type: "FeatureCollection", features });

          // Selection ring
          if (state.selectedVesselId) {
            const cur = state.vessels.get(state.selectedVesselId);
            if (cur) {
              const now2 = performance.now();
              const dt = Math.min(1, (now2 - cur.tsBase) / 2000);
              const lat = cur.prev_lat + (cur.target_lat - cur.prev_lat) * dt;
              const lng = cur.prev_lng + (cur.target_lng - cur.prev_lng) * dt;
              map.getSource("selection")?.setData({
                type: "FeatureCollection",
                features: [{ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] } }],
              });
              if (state.followVessel && now - lastPush > 1500) {
                map.easeTo({ center: [lng, lat], duration: 800 });
                lastPush = now;
              }
            }
          } else {
            map.getSource("selection")?.setData({ type: "FeatureCollection", features: [] });
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // eslint-disable-line

  // --- theme change: update port label colors --------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("ports-layer")) return;
    map.setPaintProperty("ports-layer", "text-color", theme === "dark" ? "#e2e8f0" : "#0f172a");
    map.setPaintProperty("ports-layer", "text-halo-color", theme === "dark" ? "#020617" : "#ffffff");
    if (map.getLayer("bg")) {
      map.setPaintProperty("bg", "background-color", theme === "dark" ? "#020617" : "#e2e8f0");
    }
  }, [theme]);

  return <div data-testid={APP.mapContainer} ref={containerRef} className="absolute inset-0" />;
}
