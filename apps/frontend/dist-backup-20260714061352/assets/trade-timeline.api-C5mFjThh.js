import{c as e}from"./index-2H_3snr9.js";const m={get:t=>e.get(`/trade-timeline/${t}`).then(a=>a.data),kpiSummary:()=>e.get("/trade-timeline/kpi/summary").then(t=>t.data)};export{m as t};
