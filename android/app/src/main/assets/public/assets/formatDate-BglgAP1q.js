import{c as s}from"./index-DLxzv8N8.js";import{A as c,a as u}from"./useTransactionDrawer-CooEf5i7.js";/**
 * @license lucide-react v0.474.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=[["path",{d:"M8 3 4 7l4 4",key:"9rb6wj"}],["path",{d:"M4 7h16",key:"6tx8e3"}],["path",{d:"m16 21 4-4-4-4",key:"siv7j2"}],["path",{d:"M20 17H4",key:"h6l3hr"}]],g=s("ArrowLeftRight",m);/**
 * @license lucide-react v0.474.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=[["path",{d:"M13.234 20.252 21 12.3",key:"1cbrk9"}],["path",{d:"m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486",key:"1pkts6"}]],M=s("Paperclip",p),d={INCOME:{label:"Ingreso",icon:u},EXPENSE:{label:"Gasto",icon:c},TRANSFER:{label:"Transferencia",icon:g}};function T(t){return d[t]}const l=new Intl.DateTimeFormat("es-AR",{day:"2-digit",month:"short",year:"numeric"}),f=new Intl.DateTimeFormat("es-AR",{hour:"2-digit",minute:"2-digit"});function D(t){return l.format(new Date(t))}function A(t){return f.format(new Date(t))}function I(t){const e=new Date(t),n=new Date,o=new Date;o.setDate(n.getDate()-1);const a=(r,i)=>r.getFullYear()===i.getFullYear()&&r.getMonth()===i.getMonth()&&r.getDate()===i.getDate();return a(e,n)?"Hoy":a(e,o)?"Ayer":D(t)}function h(t){const e=String(t.getMonth()+1).padStart(2,"0"),n=String(t.getDate()).padStart(2,"0");return`${t.getFullYear()}-${e}-${n}`}function S(t){if(!t)return new Date().toISOString();const[e,n,o]=t.split("-").map(Number),a=new Date;return new Date(e,n-1,o,a.getHours(),a.getMinutes(),a.getSeconds(),0).toISOString()}function k(t){return h(new Date(t))}export{g as A,M as P,S as a,A as b,I as c,h as d,D as f,k as i,T as m};
