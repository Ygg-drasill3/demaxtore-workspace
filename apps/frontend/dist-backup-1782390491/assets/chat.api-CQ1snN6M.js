import{f as r,d as s}from"./index-yG1BXbOa.js";/**
 * @license lucide-react v0.439.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=r("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]]),a="/conversations",i={status:()=>s.get(`${a}/status`).then(e=>e.data),listConversations:()=>s.get(a).then(e=>e.data),listAllAdmin:()=>s.get(`${a}/admin/all`).then(e=>e.data),listByRfq:e=>s.get(`${a}/by-rfq`,{params:e}).then(t=>t.data),listWorkspaceConversations:(e,t)=>s.get(`${a}/workspace/${e}/${t}`).then(n=>n.data),ensureRfq:e=>s.post(`${a}/rfq/${e}/ensure`).then(t=>t.data),syncOrderFreight:e=>s.post(`${a}/order/${e}/freight/sync`).then(t=>t.data),ensureOrderFreight:(e,t)=>s.post(`${a}/order/${e}/freight/${t}/ensure`).then(n=>n.data),getConversation:e=>s.get(`${a}/${e}`).then(t=>t.data),sendMessage:(e,t)=>s.post(`${a}/${e}/messages`,{messageText:t}).then(n=>n.data)};export{d as M,i as c};
