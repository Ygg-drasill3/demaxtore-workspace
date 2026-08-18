import{f as u}from"./index-Dqb-JvKF.js";import{h as f,r as p}from"./vendor-DqkjOYAJ.js";import{f as m,a as n}from"./focus-communication-JjftF1Y3.js";/**
 * @license lucide-react v0.439.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=u("CloudUpload",[["path",{d:"M12 13v8",key:"1l5pq0"}],["path",{d:"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242",key:"1pljnt"}],["path",{d:"m8 17 4-4 4 4",key:"1quai1"}]]);function k({communicationTestId:e,documentsTestId:a}){const[s,r]=f();p.useEffect(()=>{const o=s.get("focus");if(!o)return;const c=window.setTimeout(()=>{o==="messages"&&e?m(e):o==="documents"&&a&&n(a);const t=new URLSearchParams(s);t.delete("focus"),r(t,{replace:!0})},400);return()=>window.clearTimeout(c)},[s,r,e,a])}export{d as C,k as u};
