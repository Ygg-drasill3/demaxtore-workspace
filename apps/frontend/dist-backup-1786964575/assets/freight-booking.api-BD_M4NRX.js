import{f as i,d as a}from"./index-Digu1c2v.js";/**
 * @license lucide-react v0.439.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=i("CalendarClock",[["path",{d:"M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5",key:"1osxxc"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M3 10h5",key:"r794hk"}],["path",{d:"M17.5 17.5 16 16.3V14",key:"akvzfd"}],["circle",{cx:"16",cy:"16",r:"6",key:"qoo3c4"}]]),r={list:t=>a.get("/freight-bookings",{params:t}).then(e=>e.data),get:t=>a.get(`/freight-bookings/${t}`).then(e=>e.data),panel:t=>a.get("/freight-bookings/panel",{params:{tradeId:t}}).then(e=>e.data),create:t=>a.post("/freight-bookings",t).then(e=>e.data),select:(t,e)=>a.post(`/freight-bookings/${t}/select`,e).then(o=>o.data),confirm:t=>a.post(`/freight-bookings/${t}/confirm`).then(e=>e.data),kpiSummary:()=>a.get("/freight-bookings/kpi/summary").then(t=>t.data)};export{h as C,r as f};
