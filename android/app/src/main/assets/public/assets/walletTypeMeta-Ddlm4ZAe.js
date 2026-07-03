import{u as a}from"./plus-5rglWf_X.js";import{c as t,b as o}from"./index-DLxzv8N8.js";import{P as r,C as i,W as l}from"./wallet-D2SGhTfJ.js";import{L as n}from"./landmark-CBllMPHV.js";/**
 * @license lucide-react v0.474.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["circle",{cx:"8",cy:"8",r:"6",key:"3yglwk"}],["path",{d:"M18.09 10.37A6 6 0 1 1 10.34 18",key:"t5s6rm"}],["path",{d:"M7 6h1v4",key:"1obek4"}],["path",{d:"m16.71 13.88.7.71-2.82 2.82",key:"1rbuyh"}]],s=t("Coins",c);function d(){return a({queryKey:["wallet-types"],staleTime:1/0,queryFn:async()=>{const{data:e}=await o.get("/wallet-types");return e}})}const y={CASH:{label:"Efectivo",icon:s},BANK_ACCOUNT:{label:"Banco",icon:n},CREDIT_CARD:{label:"Tarjeta",icon:i},SAVINGS:{label:"Ahorro",icon:r}};function b(e){return e&&y[e]||{label:e??"Billetera",icon:l}}export{d as u,b as w};
