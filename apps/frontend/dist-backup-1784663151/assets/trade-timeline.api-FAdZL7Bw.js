import{d as e}from"./index-BSc_e-9o.js";const m={get:t=>e.get(`/trade-timeline/${t}`).then(a=>a.data),kpiSummary:()=>e.get("/trade-timeline/kpi/summary").then(t=>t.data)};export{m as t};
