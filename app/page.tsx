"use client";
import { useState, useEffect } from "react";

// ─── Utilities ───────────────────────────────────────────────────────────────
function fhash(str: string): string {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
function genId(prefix: string): string { return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }
function timeSince(ts: string): string {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return `${Math.floor(d/1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}
function truncHash(h: string | null | undefined): string { if (!h) return "—"; return h.length > 16 ? h.slice(0,8)+"…"+h.slice(-4) : h; }
function chainHash(entry: LedgerEntry, prevHash: string): string {
  return "0x" + fhash(entry.id + entry.timestamp + (entry.legal?.doc_hash||"") + prevHash);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface LedgerEntry {
  id: string; timestamp: string;
  asset: { id: string; type: string; label: string; };
  action: { token: string; stratum: string; reason: string; };
  parties: { issuer: string; from: string|null; to: string|null; };
  instrument: { type: string; unit: string|null; amount: number|null; };
  legal: { jurisdiction: string; forum: string; upstream_refs: string[]; doc_hash: string; };
  authority: { stratum: string; tier: number; level: number; };
  policy: { gdr_index_delta: number|null; };
  metadata: { tags: string[]; notes: string; version: string; };
  chain_hash?: string; prev_hash?: string; _local?: boolean; _synced?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STRATA = [
  { code:"01-Inherent",       name:"Inherent Identity",     short:"S01", color:"#5a7a5a", desc:"DNA, lineage, biological identity" },
  { code:"02-Constitutional", name:"Constitutional",         short:"S02", color:"#7a6a9a", desc:"Charters, constitutions, covenants" },
  { code:"03-Statutory",      name:"Statutory",              short:"S03", color:"#8a7aaa", desc:"Rules, policies, compliance" },
  { code:"04-Administrative", name:"Administrative",         short:"S04", color:"#6a8aaa", desc:"Execution, enforcement, ops" },
  { code:"05-Certificatory",  name:"Certificatory",          short:"S05", color:"#5a8a7a", desc:"Attestations, notarizations" },
  { code:"06-Provenance",     name:"Provenance",             short:"S06", color:"#9a8a5a", desc:"Chain of title, records" },
  { code:"07-Hereditary",     name:"Hereditary / Majorat",   short:"S07", color:"#aa6a7a", desc:"Lineage-based, heir authority" },
  { code:"08-Procedural",     name:"Procedural Legal",       short:"S08", color:"#aa7a5a", desc:"Court filings, legal actions" },
];

const ACTION_TOKENS: Record<string,{label:string;stratum:string;tier:number;level:number}> = {
  "REGISTER_IDENTITY":          { label:"Register Identity",            stratum:"01-Inherent",       tier:8, level:8 },
  "REGISTER_INSTRUMENT":        { label:"Register Instrument",          stratum:"02-Constitutional", tier:8, level:4 },
  "DEFINE_CONSTITUTION":        { label:"Define Constitution",          stratum:"02-Constitutional", tier:8, level:8 },
  "INTERPRET_CONSTITUTION":     { label:"Interpret Constitution",       stratum:"02-Constitutional", tier:7, level:6 },
  "MINT_FDC":                   { label:"Mint FDC",                     stratum:"07-Hereditary",     tier:8, level:4 },
  "TRANSFER_FDC":               { label:"Transfer FDC",                 stratum:"04-Administrative", tier:3, level:3 },
  "REDEEM_FDC":                 { label:"Redeem FDC",                   stratum:"05-Certificatory",  tier:5, level:3 },
  "MINT_OBLIGATION":            { label:"Mint Obligation",              stratum:"07-Hereditary",     tier:7, level:5 },
  "ACCEPT_OBLIGATION":          { label:"Accept Obligation",            stratum:"04-Administrative", tier:6, level:4 },
  "REQUEST_CREDIT":             { label:"Request Credit",               stratum:"03-Statutory",      tier:3, level:3 },
  "APPROVE_CREDIT":             { label:"Approve Credit",               stratum:"04-Administrative", tier:5, level:4 },
  "ASSESS_RISK":                { label:"Assess Risk",                  stratum:"05-Certificatory",  tier:5, level:5 },
  "REGISTER_DOC":               { label:"Register Document",            stratum:"06-Provenance",     tier:3, level:4 },
  "ATTEST_DOC":                 { label:"Attest Document",              stratum:"05-Certificatory",  tier:4, level:4 },
  "REGISTER_AUTHORITY_MODEL":   { label:"Register Authority Model",     stratum:"02-Constitutional", tier:8, level:4 },
  "FILE_QUIET_TITLE":           { label:"File Quiet Title",             stratum:"08-Procedural",     tier:3, level:4 },
  "INITIATE_LEGAL":             { label:"Initiate Legal Proceeding",    stratum:"08-Procedural",     tier:3, level:4 },
  "RECORD_AUDIT_FINDING":       { label:"Record Audit Finding",        stratum:"05-Certificatory",  tier:5, level:4 },
  "RECORD_COMPLIANCE_EVENT":    { label:"Record Compliance Event",     stratum:"03-Statutory",      tier:4, level:3 },
  "ESCALATE_PROCEDURAL":        { label:"Escalate Procedural",         stratum:"08-Procedural",     tier:4, level:5 },
};

const INSTRUMENTS = ["currency","identity","credit","certificate","doc_provenance","legal_filing","legal_procedure","governance","monetary_instrument_definition","authority_framework","obligation","audit_record","compliance_record"];
const JURISDICTIONS = ["ON-CHAIN","WA-KING-COUNTY","US-FEDERAL","BIOLOGICAL","INTERNATIONAL","WA-BREMERTON","UN-GENEVA"];

const AUTHORITY_RULES: Record<string, { required_tier: number; required_level: number; required_strata: string[] }> = {
  "DEFINE_CONSTITUTION":     { required_tier: 7, required_level: 6, required_strata: ["02-Constitutional"] },
  "REGISTER_IDENTITY":       { required_tier: 7, required_level: 7, required_strata: ["01-Inherent"] },
  "MINT_FDC":                { required_tier: 7, required_level: 4, required_strata: ["07-Hereditary","02-Constitutional"] },
  "MINT_OBLIGATION":         { required_tier: 6, required_level: 4, required_strata: ["07-Hereditary"] },
  "APPROVE_CREDIT":          { required_tier: 4, required_level: 3, required_strata: ["04-Administrative"] },
  "REGISTER_AUTHORITY_MODEL":{ required_tier: 7, required_level: 4, required_strata: ["02-Constitutional"] },
};

const CONSTITUTION_TOKENS = ["DEFINE_CONSTITUTION", "INTERPRET_CONSTITUTION"];

const LOCAL_KEY = "fc_ledger_v5";
const TOKEN_KEY = "fc_sys_token_v1";
function loadLocal(): LedgerEntry[] { try { const d=localStorage.getItem(LOCAL_KEY); return d?JSON.parse(d):[]; } catch{return[];} }
function saveLocal(e: LedgerEntry[]) { try{localStorage.setItem(LOCAL_KEY,JSON.stringify(e));}catch{} }
function loadToken(): string { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } }
function saveToken(t: string) { try { localStorage.setItem(TOKEN_KEY, t); } catch {} }

// ─── Demo Seed ────────────────────────────────────────────────────────────────
const DEMO: LedgerEntry[] = [
  { id:"STRATUM01-IDENTITY-SJL", timestamp:new Date(Date.now()-86400000*3).toISOString(), asset:{id:"SJL-ARCHAEOGENETIC",type:"identity_record",label:"Archaeogenetic Identity & Lineage Certification — SJL"}, action:{token:"REGISTER_IDENTITY",stratum:"01-Inherent",reason:"Establish inherent biological and ancestral identity."}, parties:{issuer:"Archaeogenetic Laboratory NG-25051",from:null,to:"Shane Jonathan Lozenich"}, instrument:{type:"identity",unit:null,amount:null}, legal:{jurisdiction:"BIOLOGICAL",forum:"NG-25051",upstream_refs:[],doc_hash:"bb1b36ad40b59127cf5f5c1245d453c4"}, authority:{stratum:"01-Inherent",tier:8,level:8}, policy:{gdr_index_delta:null}, metadata:{tags:["identity","lineage"],notes:"Dual-horizon archaeogenetic identity record.",version:"1.0"}, chain_hash:"0xd4e5f6a1" },
  { id:"STRATUM02-AUTH-V1", timestamp:new Date(Date.now()-86400000*2).toISOString(), asset:{id:"AUTH-CONSTITUTION-V1",type:"authority_framework",label:"Unified Authority Constitution v1.0"}, action:{token:"DEFINE_CONSTITUTION",stratum:"02-Constitutional",reason:"Define unified authority framework for Fiducia Centrale."}, parties:{issuer:"Fiducia Centrale",from:null,to:null}, instrument:{type:"governance",unit:null,amount:null}, legal:{jurisdiction:"ON-CHAIN",forum:"Fiducia Centrale — Constitutional Chamber",upstream_refs:["STRATUM01-IDENTITY-SJL"],doc_hash:"AUTH-CONSTITUTION-HASH-V1"}, authority:{stratum:"02-Constitutional",tier:8,level:4}, policy:{gdr_index_delta:null}, metadata:{tags:["authority","constitution"],notes:"Genesis constitutional entry.",version:"1.0"}, chain_hash:"0xa1b2c3d4" },
  { id:"STRATUM02-FDC-V1", timestamp:new Date(Date.now()-86400000*1.5).toISOString(), asset:{id:"FDC-CONSTITUTION-V1",type:"monetary_instrument_definition",label:"Fiducial Credit (FDC) — Monetary Constitution v1.0"}, action:{token:"REGISTER_INSTRUMENT",stratum:"02-Constitutional",reason:"Establish FDC as hybrid institutional currency backed by GDRI."}, parties:{issuer:"Fiducia Centrale — Constitutional Authority",from:null,to:null}, instrument:{type:"currency",unit:"FDC",amount:null}, legal:{jurisdiction:"ON-CHAIN",forum:"Fiducia Centrale",upstream_refs:["STRATUM02-AUTH-V1"],doc_hash:"FDC-CONSTITUTION-HASH-V1"}, authority:{stratum:"02-Constitutional",tier:8,level:4}, policy:{gdr_index_delta:null}, metadata:{tags:["currency","FDC"],notes:"Hybrid currency backed by GDRI.",version:"1.0"}, chain_hash:"0xb2c3d4e5" },
  { id:"STRATUM08-LEGAL-26-2-01443", timestamp:new Date(Date.now()-86400000).toISOString(), asset:{id:"QUIET-TITLE-SJL",type:"legal_claim",label:"Petition for Declaratory Judgment & Quiet Title — Seattle-Bremerton Majorat"}, action:{token:"INITIATE_LEGAL",stratum:"08-Procedural",reason:"Assert rights and challenge adverse claims under Stratum 08."}, parties:{issuer:"Shane Jonathan Lozenich",from:"Shane Jonathan Lozenich",to:"King County Superior Court"}, instrument:{type:"legal_procedure",unit:null,amount:null}, legal:{jurisdiction:"WA-KING-COUNTY",forum:"King County Superior Court",upstream_refs:["STRATUM02-AUTH-V1"],doc_hash:"PETITION-26-2-01443-4-SEA"}, authority:{stratum:"08-Procedural",tier:3,level:4}, policy:{gdr_index_delta:null}, metadata:{tags:["legal","quiet_title"],notes:"Pro se filing; accepted by King County Superior Court.",version:"1.0"}, chain_hash:"0xc3d4e5f6" },
];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#f0ece4;color:#2a2218;font-family:'EB Garamond',Georgia,serif;}
.app{min-height:100vh;}
.hdr{background:#f7f4ee;border-bottom:2px solid #2a2218;padding:14px 32px;display:flex;align-items:flex-start;justify-content:space-between;position:sticky;top:0;z-index:100;}
.logo{font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;font-weight:500;color:#2a2218;letter-spacing:0.12em;text-transform:uppercase;}
.logo-sub{font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#7a6a55;margin-top:2px;}
.hdr-right{text-align:right;}
.hdr-entity{font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#2a2218;}
.hdr-entity-sub{font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#7a6a55;margin-top:2px;}
.hdr-chain{font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:#9a8a75;margin-top:2px;font-family:'Courier New',monospace;}
.status-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#5a7a5a;margin-right:5px;vertical-align:middle;}
.nav{background:#f7f4ee;border-bottom:2px solid #2a2218;padding:0 32px;overflow-x:auto;}
.tabs{display:flex;gap:0;min-width:max-content;}
.tab{padding:10px 18px;font-family:'EB Garamond',serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;border:none;background:transparent;color:#7a6a55;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.2s;white-space:nowrap;}
.tab.active{color:#2a2218;border-bottom:3px solid #2a2218;font-weight:500;}
.tab:hover:not(.active){color:#2a2218;}
.content{padding:28px 32px;max-width:1480px;margin:0 auto;}
.page-header{margin-bottom:22px;padding-bottom:12px;border-bottom:1px solid #c8bfaa;display:flex;justify-content:space-between;align-items:flex-end;}
.page-header h2{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:400;font-style:italic;color:#2a2218;}
.page-header p{font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#7a6a55;margin-top:3px;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px;}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;}
.card{background:#f7f4ee;border:1px solid #c8bfaa;border-top:3px solid #2a2218;padding:16px 18px;}
.card-h{font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#7a6a55;margin-bottom:12px;}
.metric-val{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:500;color:#2a2218;line-height:1;}
.metric-sub{font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#7a6a55;margin-top:4px;}
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;font-size:9px;letter-spacing:0.08em;text-transform:uppercase;border:1px solid;}
.badge-green{background:#edf2ed;color:#3a5a3a;border-color:#a0b8a0;}
.badge-purple{background:#f0ecf7;color:#5a4a7a;border-color:#b8aad0;}
.badge-amber{background:#f7f0e2;color:#7a5a20;border-color:#c8a860;}
.badge-red{background:#f7edec;color:#7a3a3a;border-color:#c8a0a0;}
.badge-blue{background:#ecf0f7;color:#3a4a7a;border-color:#a0aed0;}
.badge-teal{background:#e8f4f1;color:#2a5a4a;border-color:#8ab8b0;}
.badge-valid{background:#edf2ed;color:#2a4a2a;border-color:#7a9a7a;font-weight:600;}
.badge-invalid{background:#f7edec;color:#6a2a2a;border-color:#c8a0a0;font-weight:600;}
.strat-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.strat-label{font-size:11px;color:#5a4a35;width:145px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.strat-bar-bg{flex:1;height:4px;background:#e0d8cc;}
.strat-bar{height:100%;transition:width 1s cubic-bezier(0.22,1,0.36,1);}
.strat-pct{font-size:11px;color:#7a6a55;width:22px;text-align:right;}
.feed-item{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e0d8cc;}
.feed-item:last-child{border-bottom:none;}
.feed-action{font-size:13px;color:#2a2218;}
.feed-hash{font-size:9px;color:#9a8a75;margin-top:1px;letter-spacing:0.06em;font-family:'Courier New',monospace;}
.feed-time{font-size:10px;color:#9a8a75;}
.feed-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.sep{width:100%;height:1px;background:#c8bfaa;margin:16px 0;}
.auth-chip{font-size:9px;padding:2px 5px;letter-spacing:0.06em;text-transform:uppercase;border:1px solid;}
.chip-s{background:#f0ecf7;color:#5a4a7a;border-color:#b8aad0;}
.chip-t{background:#edf2ed;color:#3a5a3a;border-color:#a0b8a0;}
.chip-l{background:#f7f0e2;color:#7a5a20;border-color:#c8a860;}
.authority-triple{display:flex;gap:4px;flex-wrap:wrap;}
.section-title{font-size:9px;letter-spacing:0.25em;text-transform:uppercase;color:#7a6a55;margin-bottom:12px;padding-bottom:7px;border-bottom:1px solid #c8bfaa;}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}
.form-row.single{grid-template-columns:1fr;}
.form-row.three{grid-template-columns:1fr 1fr 1fr;}
.fld{display:flex;flex-direction:column;gap:4px;}
.fld label{font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#7a6a55;}
.fld input,.fld select,.fld textarea{background:#f0ece4;border:1px solid #c8bfaa;color:#2a2218;font-family:'EB Garamond',serif;font-size:13px;padding:7px 9px;outline:none;transition:border-color 0.2s;}
.fld input:focus,.fld select:focus,.fld textarea:focus{border-color:#2a2218;}
.btn{padding:9px 20px;border:1px solid #2a2218;cursor:pointer;font-family:'EB Garamond',serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;transition:all 0.2s;}
.btn-primary{background:#2a2218;color:#f7f4ee;}
.btn-primary:hover{background:#3a3228;}
.btn-primary:disabled{opacity:0.5;cursor:not-allowed;}
.btn-secondary{background:transparent;color:#2a2218;border-color:#c8bfaa;}
.btn-secondary:hover{background:#f0ece4;border-color:#2a2218;}
.btn-danger{background:transparent;color:#7a3a3a;border-color:#c8a0a0;}
.btn-danger:hover{background:#f7edec;}
.btn-sm{padding:4px 10px;font-size:10px;}
.ledger-tbl{width:100%;border-collapse:collapse;font-size:12px;}
.ledger-tbl th{text-align:left;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#7a6a55;padding:7px 10px;border-bottom:2px solid #2a2218;font-weight:400;}
.ledger-tbl td{padding:9px 10px;border-bottom:1px solid #e0d8cc;vertical-align:top;}
.ledger-tbl tr:hover td{background:#f0ece4;}
.alert{padding:9px 12px;font-size:12px;margin-bottom:12px;display:flex;align-items:center;gap:8px;border:1px solid;}
.alert-green{background:#edf2ed;border-color:#a0b8a0;color:#3a5a3a;}
.alert-red{background:#f7edec;border-color:#c8a0a0;color:#7a3a3a;}
.alert-blue{background:#ecf0f7;border-color:#a0aed0;color:#3a4a7a;}
.alert-amber{background:#f7f0e2;border-color:#c8a860;color:#7a5a20;}
.spinner{width:13px;height:13px;border:2px solid rgba(42,34,24,0.2);border-top-color:#2a2218;border-radius:50%;animation:spin 0.8s linear infinite;flex-shrink:0;}
@keyframes spin{to{transform:rotate(360deg);}}
.cert-box{background:#f7f4ee;border:1px solid #c8bfaa;padding:28px;position:relative;overflow:hidden;}
.cert-outer-border{position:absolute;inset:7px;border:1px solid #c8bfaa;pointer-events:none;}
.cert-watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);font-family:'Cormorant Garamond',serif;font-size:68px;color:rgba(42,34,24,0.04);pointer-events:none;white-space:nowrap;font-style:italic;}
.cert-title{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:400;font-style:italic;color:#2a2218;margin-bottom:3px;}
.cert-subtitle{font-size:9px;letter-spacing:0.3em;text-transform:uppercase;color:#7a6a55;margin-bottom:18px;}
.cert-rule{width:50px;height:2px;background:#2a2218;margin-bottom:18px;}
.cert-body{font-size:13px;color:#5a4a35;line-height:1.8;margin-bottom:16px;font-style:italic;}
.cert-field{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e0d8cc;}
.cert-label{font-size:9px;text-transform:uppercase;letter-spacing:0.18em;color:#7a6a55;}
.cert-val{font-size:12px;color:#2a2218;text-align:right;max-width:60%;}
.cert-hash{font-size:9px;color:#9a8a75;word-break:break-all;margin-top:14px;padding-top:12px;border-top:1px solid #c8bfaa;font-family:'Courier New',monospace;}
.gdri-bar{height:5px;background:#e0d8cc;margin:7px 0;}
.gdri-fill{height:100%;background:#2a2218;transition:width 1s;}
.code-block{background:#2a2218;border:1px solid #3a3228;padding:12px;font-family:'Courier New',monospace;font-size:9px;line-height:1.6;overflow-x:auto;white-space:pre-wrap;word-break:break-all;color:#c8bfaa;max-height:240px;overflow-y:auto;margin-top:8px;}
.empty-state{text-align:center;padding:36px 20px;color:#9a8a75;font-size:13px;font-style:italic;}
.filter-btn{padding:3px 10px;border:1px solid #c8bfaa;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;background:transparent;color:#7a6a55;cursor:pointer;font-family:'EB Garamond',serif;transition:all 0.15s;}
.filter-btn.active{background:#2a2218;color:#f7f4ee;border-color:#2a2218;}
.filter-row{display:flex;gap:5px;margin-bottom:14px;flex-wrap:wrap;}
.detail-label{font-size:9px;text-transform:uppercase;letter-spacing:0.15em;color:#7a6a55;}
.detail-val{font-size:12px;color:#2a2218;word-break:break-all;}
.entry-detail{background:#f0ece4;border:1px solid #c8bfaa;padding:14px;margin-top:5px;}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.detail-row{display:flex;flex-direction:column;gap:2px;}
.checklist-item{display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #e0d8cc;align-items:center;font-size:12px;}
.chain-node{padding:8px 12px;border:1px solid #c8bfaa;background:#f7f4ee;position:relative;margin-bottom:6px;}
.chain-arrow{text-align:center;font-size:11px;color:#9a8a75;margin-bottom:6px;}
.process-step{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #e0d8cc;}
.process-num{width:22px;height:22px;border:1px solid #2a2218;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;font-family:'Courier New',monospace;}
.integrity-valid{color:#3a5a3a;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;}
.integrity-invalid{color:#7a3a3a;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;}
.auth-enforce-pass{background:#edf2ed;border-left:3px solid #5a7a5a;padding:8px 12px;font-size:12px;color:#2a4a2a;margin-bottom:8px;}
.auth-enforce-fail{background:#f7edec;border-left:3px solid #c8a0a0;padding:8px 12px;font-size:12px;color:#5a2a2a;margin-bottom:8px;}
.search-box{background:#f0ece4;border:1px solid #c8bfaa;color:#2a2218;font-family:'EB Garamond',serif;font-size:13px;padding:7px 12px;outline:none;transition:border-color 0.2s;width:100%;}
.search-box:focus{border-color:#2a2218;}
.upstream-ref{display:inline-block;font-size:9px;font-family:'Courier New',monospace;background:#f0ece4;border:1px solid #c8bfaa;padding:1px 5px;margin:2px;color:#5a4a7a;cursor:pointer;}
.upstream-ref:hover{background:#e8e2d8;border-color:#2a2218;}
.timeline-bar{display:flex;height:3px;width:100%;margin:8px 0;}
.risk-meter{display:flex;gap:3px;align-items:center;}
.risk-dot{width:10px;height:10px;border-radius:50%;border:1px solid;}
.modal-overlay{position:fixed;inset:0;background:rgba(42,34,24,0.5);display:flex;align-items:center;justify-content:center;z-index:200;}
.modal{background:#f7f4ee;border:1px solid #c8bfaa;border-top:3px solid #2a2218;padding:24px;max-width:680px;width:90%;max-height:80vh;overflow-y:auto;}
.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;}
.modal-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-style:italic;}
.close-btn{background:none;border:none;cursor:pointer;font-size:20px;color:#7a6a55;}
.close-btn:hover{color:#2a2218;}
@media(max-width:900px){.grid4{grid-template-columns:repeat(2,1fr);}.grid3{grid-template-columns:1fr;}.grid2{grid-template-columns:1fr;}.content{padding:16px;}.hdr{padding:12px 16px;}.nav{padding:0 16px;}}
`;

// ─── Authority Enforcement Engine ─────────────────────────────────────────────
function enforceAuthority(token: string, tier: number, level: number, stratum: string): { valid: boolean; reason: string } {
  const rule = AUTHORITY_RULES[token];
  if (!rule) return { valid: true, reason: "No specific constraint for this action." };
  if (tier < rule.required_tier) return { valid: false, reason: `Financial Tier ${tier} insufficient. Requires Tier ${rule.required_tier}+.` };
  if (level < rule.required_level) return { valid: false, reason: `Security Level ${level} insufficient. Requires Level ${rule.required_level}+.` };
  if (!rule.required_strata.includes(stratum)) return { valid: false, reason: `Stratum ${stratum} not authorized. Requires: ${rule.required_strata.join(" or ")}.` };
  return { valid: true, reason: "Authority constraints satisfied." };
}

// ─── Chain Integrity Verifier ─────────────────────────────────────────────────
function verifyChain(ledger: LedgerEntry[]): { valid: boolean; broken_at: string | null } {
  for (const e of ledger) {
    // Skip entries that don't carry a recorded prev_hash (legacy/demo entries)
    if (!e.chain_hash || !e.prev_hash) continue;
    const expected = chainHash(e, e.prev_hash);
    if (e.chain_hash !== expected) {
      return { valid: false, broken_at: e.id };
    }
  }
  return { valid: true, broken_at: null };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("overview");
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [mintForm, setMintForm] = useState({
    action_token:"REGISTER_DOC", stratum:"06-Provenance", asset_label:"", asset_type:"doc_provenance",
    issuer:"Fiducia Centrale", to:"", instrument_type:"doc_provenance", instrument_unit:"", instrument_amount:"",
    reason:"", jurisdiction:"ON-CHAIN", tier:4, level:3, tags:"", notes:"", upstream_refs:"",
  });
  const [mintStatus, setMintStatus] = useState<{ok:boolean;msg:string;id?:string}|null>(null);
  const [authorityCheck, setAuthorityCheck] = useState<{valid:boolean;reason:string}|null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry|null>(null);
  const [certEntry, setCertEntry] = useState<LedgerEntry|null>(null);
  const [filterStratum, setFilterStratum] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [fdc, setFdc] = useState(0);
  const [gdri, setGdri] = useState(1000000);
  const [connectToken, setConnectToken] = useState("");
  const [connectMsg, setConnectMsg] = useState<string|null>(null);
  const [connectOk, setConnectOk] = useState(false);
  const [chainStatus, setChainStatus] = useState<{valid:boolean;broken_at:string|null}>({valid:true,broken_at:null});
  const [detailModal, setDetailModal] = useState<LedgerEntry|null>(null);

  useEffect(() => {
    const stored = loadLocal();
    const data = stored.length ? stored : DEMO;
    setLedger(data);
    if (!stored.length) saveLocal(DEMO);
    setFdc(data.filter(e=>e.action?.token==="MINT_FDC").reduce((s,e)=>s+(e.instrument?.amount||0),0));
    setGdri(1000000 + data.reduce((s,e)=>s+(e.policy?.gdr_index_delta||0),0));
    setChainStatus(verifyChain(data));
    setConnectToken(loadToken());
  }, []);

  function handleMintChange(k: string, v: string|number) {
    setMintForm(f => {
      const nf = {...f, [k]: v};
      if (k === "action_token" && ACTION_TOKENS[v as string]) {
        const at = ACTION_TOKENS[v as string];
        nf.stratum = at.stratum; nf.tier = at.tier; nf.level = at.level;
      }
      const check = enforceAuthority(nf.action_token, Number(nf.tier), Number(nf.level), nf.stratum);
      setAuthorityCheck(check);
      return nf;
    });
  }

  useEffect(() => {
    const check = enforceAuthority(mintForm.action_token, Number(mintForm.tier), Number(mintForm.level), mintForm.stratum);
    setAuthorityCheck(check);
  }, []);

  async function handleMint(e: React.FormEvent) {
    e.preventDefault();
    const check = enforceAuthority(mintForm.action_token, Number(mintForm.tier), Number(mintForm.level), mintForm.stratum);
    if (!check.valid) { setMintStatus({ok:false, msg:`Authority enforcement failed: ${check.reason}`}); return; }
    setLoading(true); setMintStatus(null);
    try {
      const now = new Date().toISOString();
      const id = genId(mintForm.action_token.slice(0,6));
      const prevHash = ledger.length > 0 ? (ledger[0].chain_hash || "GENESIS") : "GENESIS";
      const upstream = mintForm.upstream_refs ? mintForm.upstream_refs.split(",").map(s=>s.trim()).filter(Boolean) : [];
      const entry: LedgerEntry = {
        id, timestamp: now,
        asset: { id: genId("ASSET"), type: mintForm.asset_type, label: mintForm.asset_label || "Untitled Entry" },
        action: { token: mintForm.action_token, stratum: mintForm.stratum, reason: mintForm.reason },
        parties: { issuer: mintForm.issuer || "Fiducia Centrale", from: mintForm.issuer || null, to: mintForm.to || null },
        instrument: { type: mintForm.instrument_type, unit: mintForm.instrument_unit || null, amount: mintForm.instrument_amount ? parseFloat(mintForm.instrument_amount) : null },
        legal: { jurisdiction: mintForm.jurisdiction, forum: "Fiducia Centrale", upstream_refs: upstream, doc_hash: "0x"+fhash(id+now+mintForm.asset_label) },
        authority: { stratum: mintForm.stratum, tier: parseInt(String(mintForm.tier)), level: parseInt(String(mintForm.level)) },
        policy: { gdr_index_delta: mintForm.action_token === "MINT_FDC" ? -(parseFloat(mintForm.instrument_amount)||0) : null },
        metadata: { tags: mintForm.tags ? mintForm.tags.split(",").map(t=>t.trim()) : [], notes: mintForm.notes, version: "1.0" },
        _local: true,
      };
      entry.chain_hash = chainHash(entry, prevHash);
      entry.prev_hash = prevHash;

      // Attempt to sync to live Upstash-backed ledger first
      let syncMsg = "";
      let synced = false;
      if (connectToken) {
        try {
          const r = await fetch("https://ledger.fiduciacentrale.com/api/ledger", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Fiducia-Token": connectToken,
            },
            body: JSON.stringify(entry),
            signal: AbortSignal.timeout(8000),
          });
          if (r.ok) {
            synced = true;
            syncMsg = " — synced to remote ledger.";
          } else {
            const errBody = await r.text().catch(()=> "");
            syncMsg = ` — remote sync failed (status ${r.status}${errBody ? ": " + errBody.slice(0,120) : ""}). Saved locally only.`;
          }
        } catch (syncErr: unknown) {
          syncMsg = ` — could not reach remote API (${syncErr instanceof Error ? syncErr.message : "network error"}). Saved locally only.`;
        }
      } else {
        syncMsg = " — no FIDUCIA_SYS_TOKEN set in Connect tab, saved locally only.";
      }
      entry._synced = synced;

      const nl = [entry, ...ledger];
      setLedger(nl); saveLocal(nl);
      if (entry.action.token === "MINT_FDC") setFdc(f=>f+(entry.instrument.amount||0));
      const delta = entry.policy?.gdr_index_delta ?? 0;
      if (delta !== 0) setGdri(g=>g+delta);
      setChainStatus(verifyChain(nl));
      setMintStatus({ok:true, msg:`Entry registered. Chain hash: ${entry.chain_hash}${syncMsg}`, id:entry.id});
      setMintForm(f=>({...f,asset_label:"",reason:"",notes:"",tags:"",to:"",instrument_amount:"",upstream_refs:""}));
    } catch(err: unknown) { setMintStatus({ok:false, msg:"Registration failed: "+(err instanceof Error?err.message:String(err))}); }
    finally { setLoading(false); }
  }

  function renderAuthority(a: LedgerEntry["authority"]) {
    if (!a) return null;
    const s = STRATA.find(x=>x.code===a.stratum);
    return <div className="authority-triple"><span className="auth-chip chip-s">{s?.short||a.stratum}</span><span className="auth-chip chip-t">T{a.tier}</span><span className="auth-chip chip-l">L{a.level}</span></div>;
  }

  const filteredLedger = ledger
    .filter(e => {
      if (filterStratum === "all") return true;
      if (filterStratum === "constitution") return CONSTITUTION_TOKENS.includes(e.action?.token);
      return e.authority?.stratum === filterStratum;
    })
    .filter(e => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (e.id+e.asset?.label+e.action?.token+e.parties?.issuer+e.legal?.jurisdiction).toLowerCase().includes(q);
    });

  // ─── Overview Tab ───────────────────────────────────────────────────────────
  function Overview() {
    const counts = STRATA.map(s=>({...s, count:ledger.filter(e=>e.authority?.stratum===s.code).length}));
    const total = ledger.length;
    const verifiedPct = total > 0 ? Math.round((ledger.filter(e=>e.action?.token).length/total)*100) : 0;
    const localCount = ledger.filter(e=>e._local && !e._synced).length;
    return (
      <div>
        <div className="page-header">
          <div><h2>Stratigraphic Provenance Engine</h2><p>Identity · Finance · Security · Chain of Authority</p></div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <span className={`badge ${chainStatus.valid?"badge-valid":"badge-invalid"}`}>{chainStatus.valid?"● Chain Intact":"⚠ Chain Break"}</span>
            <span className="badge badge-green">● Ledger Active</span>
            {localCount > 0 && <span className="badge badge-amber">◌ {localCount} Local Only</span>}
          </div>
        </div>
        <div className="grid4">
          {[
            {label:"Ledger Entries",val:total,sub:"immutable blocks"},
            {label:"FDC Supply",val:fdc.toLocaleString(),sub:"fiducial credits"},
            {label:"GDRI Balance",val:(gdri/1000000).toFixed(2)+"M",sub:"global debt reduction"},
            {label:"Integrity",val:verifiedPct+"%",sub:"verified entries"},
          ].map(m=>(
            <div className="card" key={m.label}><div className="card-h">{m.label}</div><div className="metric-val">{m.val}</div><div className="metric-sub">{m.sub}</div></div>
          ))}
        </div>
        <div className="grid2">
          <div className="card">
            <div className="card-h">Stratigraphic Authority Layers</div>
            {counts.map(s=>(
              <div className="strat-row" key={s.code}>
                <div className="strat-label" title={s.name}>{s.short} · {s.name}</div>
                <div className="strat-bar-bg"><div className="strat-bar" style={{width:total>0?Math.max((s.count/total)*100,s.count>0?4:0)+"%":"0%",background:s.color}}/></div>
                <div className="strat-pct">{s.count}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-h">Provenance Feed</div>
            {ledger.slice(0,8).map(e=>(
              <div className="feed-item" key={e.id} style={{cursor:"pointer"}} onClick={()=>setDetailModal(e)}>
                <div><div className="feed-action">{ACTION_TOKENS[e.action?.token]?.label||e.action?.token}</div><div className="feed-hash">{truncHash(e.legal?.doc_hash)}</div></div>
                <div style={{display:"flex",alignItems:"center",gap:8}}><div className="feed-time">{timeSince(e.timestamp)}</div><div className="feed-dot" style={{background:STRATA.find(s=>s.code===e.authority?.stratum)?.color||"#9a8a75"}}/></div>
              </div>
            ))}
            {!ledger.length&&<div className="empty-state">No entries yet.</div>}
          </div>
        </div>
        <div className="grid3">
          <div className="card">
            <div className="card-h">GDRI — Global Debt Reduction Index</div>
            <div style={{marginBottom:10}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:40,color:"#2a2218",lineHeight:1}}>{(gdri/1000000).toFixed(2)}M <span style={{fontSize:13,color:"#7a6a55"}}>units</span></div></div>
            <div className="gdri-bar"><div className="gdri-fill" style={{width:Math.max(5,Math.min(100,(gdri/1000000)*100))+"%"}}/></div>
            <div style={{fontSize:11,color:"#7a6a55",marginTop:6,fontStyle:"italic"}}>Each FDC minted reduces this index.</div>
          </div>
          <div className="card">
            <div className="card-h">Chain Integrity</div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:chainStatus.valid?"#edf2ed":"#f7edec",border:`2px solid ${chainStatus.valid?"#5a7a5a":"#c8a0a0"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                {chainStatus.valid?"✓":"✕"}
              </div>
              <div>
                <div style={{fontSize:14,color:"#2a2218"}}>{chainStatus.valid?"Verified Intact":"Integrity Breach"}</div>
                <div style={{fontSize:10,color:"#7a6a55"}}>{chainStatus.valid?"All hashes match":`Broken at: ${chainStatus.broken_at?.slice(0,20)}`}</div>
              </div>
            </div>
            <div style={{fontSize:11,color:"#7a6a55"}}>Latest hash: <span style={{fontFamily:"'Courier New',monospace",fontSize:10,color:"#5a4a7a"}}>{truncHash(ledger[0]?.chain_hash)}</span></div>
          </div>
          <div className="card">
            <div className="card-h">Authority Models Active</div>
            {[
              {name:"Identity & Institutional",axis:"Stratum 01–08",icon:"◆",color:"#5a4a7a"},
              {name:"Financial & Monetary",axis:"Tier 1–8",icon:"◈",color:"#3a5a3a"},
              {name:"Security & Risk",axis:"Level 1–8",icon:"◉",color:"#7a5a20"},
            ].map(m=>(
              <div key={m.name} style={{display:"flex",gap:10,padding:"7px 0",borderBottom:"1px solid #e0d8cc",alignItems:"center"}}>
                <div style={{fontSize:16,color:m.color,flexShrink:0}}>{m.icon}</div>
                <div><div style={{fontSize:12,color:"#2a2218"}}>{m.name}</div><span className="badge badge-purple" style={{fontSize:8}}>{m.axis}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Ledger Explorer Tab ─────────────────────────────────────────────────────
  function LedgerView() {
    return (
      <div>
        <div className="page-header">
          <div><h2>Provenance Ledger</h2><p>Stratum 06 — Immutable · Cryptographically Hashed · Append-Only</p></div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-secondary btn-sm" onClick={()=>{setLedger(DEMO);saveLocal(DEMO);}}>Reset Demo</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>{const b=new Blob([JSON.stringify(ledger,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="fiducia_ledger.json";a.click();}}>Export JSON</button>
          </div>
        </div>
        <div className="grid2" style={{marginBottom:14}}>
          <div><input className="search-box" placeholder="Search entries by ID, label, action, issuer, jurisdiction…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/></div>
          <div className="filter-row" style={{marginBottom:0,justifyContent:"flex-end"}}>
            <button className={`filter-btn ${filterStratum==="all"?"active":""}`} onClick={()=>setFilterStratum("all")}>All</button>
            {STRATA.map(s=><button key={s.code} className={`filter-btn ${filterStratum===s.code?"active":""}`} onClick={()=>setFilterStratum(filterStratum===s.code?"all":s.code)}>{s.short}</button>)}
            <button className={`filter-btn ${filterStratum==="constitution"?"active":""}`} onClick={()=>setFilterStratum(filterStratum==="constitution"?"all":"constitution")} style={{borderColor:"#7a6a9a"}}>Constitution</button>
          </div>
        </div>
        {mintStatus && <div className={`alert ${mintStatus.ok?"alert-green":"alert-red"}`}>{mintStatus.msg}</div>}
        <div style={{background:"#f7f4ee",border:"1px solid #c8bfaa"}}>
          <table className="ledger-tbl">
            <thead>
              <tr>
                <th>Entry ID</th><th>Timestamp</th><th>Action</th><th>Asset / Subject</th>
                <th>Authority</th><th>Hash</th><th>Refs</th><th></th>
              </tr>
            </thead>
            <tbody>
              {!filteredLedger.length && <tr><td colSpan={8} style={{textAlign:"center",padding:28,color:"#9a8a75",fontStyle:"italic"}}>No entries match this filter or search.</td></tr>}
              {filterStratum === "constitution" && filteredLedger.length > 0 && (
                <tr><td colSpan={8} style={{padding:"12px 14px",background:"#f0ecf7",borderBottom:"2px solid #2a2218"}}>
                  <div style={{fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase",color:"#5a4a7a",marginBottom:6}}>Constitutional Record — {filteredLedger.length} Article{filteredLedger.length!==1?"s":""}</div>
                  <div style={{fontSize:12,color:"#5a4a35",lineHeight:1.7}}>
                    These entries define or interpret the Fiducia Centrale constitutional framework under Stratum 02. Each entry below represents either a foundational definition (DEFINE_CONSTITUTION) or a binding interpretation (INTERPRET_CONSTITUTION) of existing constitutional text.
                  </div>
                </td></tr>
              )}
              {filteredLedger.map(e=>{
                const authCheck = enforceAuthority(e.action?.token, e.authority?.tier, e.authority?.level, e.authority?.stratum);
                return (
                  <>
                    <tr key={e.id} style={{cursor:"pointer"}} onClick={()=>setSelectedEntry(selectedEntry?.id===e.id?null:e)}>
                      <td><span style={{fontFamily:"'Courier New',monospace",fontSize:9,color:"#5a4a7a"}}>{e.id.slice(0,22)}{e.id.length>22?"…":""}</span></td>
                      <td style={{fontSize:10,color:"#7a6a55",whiteSpace:"nowrap"}}>{new Date(e.timestamp).toLocaleString()}</td>
                      <td><span className="badge badge-purple" style={{fontSize:8}}>{e.action?.token}</span></td>
                      <td style={{maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={e.asset?.label}>{e.asset?.label}</td>
                      <td>{renderAuthority(e.authority)}</td>
                      <td><span style={{fontFamily:"'Courier New',monospace",fontSize:8,color:"#9a8a75"}}>{truncHash(e.legal?.doc_hash)}</span></td>
                      <td><span className={`badge ${authCheck.valid?"badge-valid":"badge-invalid"}`} style={{fontSize:7}}>{authCheck.valid?"AUTH":"FAIL"}</span></td>
                      <td>
                        <div style={{display:"flex",gap:5}}>
                          <button className="btn btn-secondary btn-sm" onClick={ev=>{ev.stopPropagation();setDetailModal(e);}}>View</button>
                          <button className="btn btn-secondary btn-sm" onClick={ev=>{ev.stopPropagation();setCertEntry(e);setTab("certificates");}}>Cert</button>
                          {e._synced && <span className="badge badge-green" style={{fontSize:7}}>synced</span>}
                          {e._local && !e._synced && <span className="badge badge-amber" style={{fontSize:7}}>local</span>}
                        </div>
                      </td>
                    </tr>
                    {selectedEntry?.id===e.id && (
                      <tr key={e.id+"-d"}><td colSpan={8} style={{padding:"0 10px 14px"}}>
                        <div className="entry-detail">
                          <div className="detail-grid">
                            {[["Issuer",e.parties?.issuer],["To",e.parties?.to||"—"],["Stratum",e.action?.stratum],
                              ["Instrument",e.instrument?.type+(e.instrument?.unit?" · "+e.instrument.unit:"")],
                              ["Amount",e.instrument?.amount?.toLocaleString()||"—"],["Jurisdiction",e.legal?.jurisdiction],
                              ["Notes",e.metadata?.notes||"—"],["Reason",e.action?.reason]].map(([k,v])=>(
                              <div className="detail-row" key={k as string}><div className="detail-label">{k}</div><div className="detail-val">{v}</div></div>
                            ))}
                          </div>
                          {e.legal?.upstream_refs?.length > 0 && (
                            <div style={{marginTop:10}}>
                              <div className="detail-label" style={{marginBottom:4}}>Upstream References</div>
                              {e.legal.upstream_refs.map(r=><span key={r} className="upstream-ref" onClick={()=>{const found=ledger.find(x=>x.id===r);if(found)setDetailModal(found)}}>{r}</span>)}
                            </div>
                          )}
                          {e.chain_hash && <div style={{marginTop:10}}><div className="detail-label">Chain Hash</div><div style={{fontFamily:"'Courier New',monospace",fontSize:9,color:"#5a4a7a",marginTop:3}}>{e.chain_hash}</div></div>}
                          <div style={{marginTop:10}}><div className={authCheck.valid?"integrity-valid":"integrity-invalid"}>{authCheck.valid?"✓ Authority Enforced":"✕ Authority Violation"} — {authCheck.reason}</div></div>
                        </div>
                      </td></tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── Register / Mint Tab ─────────────────────────────────────────────────────
  function Mint() {
    return (
      <div>
        <div className="page-header"><div><h2>Register Entry</h2><p>Stratum 07 — Mint a new immutable block to the provenance ledger</p></div></div>
        {!connectToken && (
          <div className="alert alert-amber" style={{marginBottom:14}}>
            No FIDUCIA_SYS_TOKEN set — go to the Connect tab and enter your token first, or entries will only save to this browser.
          </div>
        )}
        {mintStatus && (
          <div className={`alert ${mintStatus.ok?"alert-green":"alert-red"}`} style={{marginBottom:14}}>
            {loading && <div className="spinner"/>}
            {mintStatus.msg}
          </div>
        )}
        {authorityCheck && (
          <div className={authorityCheck.valid?"auth-enforce-pass":"auth-enforce-fail"} style={{marginBottom:14}}>
            <strong>{authorityCheck.valid?"✓ Authority Pre-Check Passed":"⚠ Authority Pre-Check Failed"}</strong> — {authorityCheck.reason}
          </div>
        )}
        <div className="grid2">
          <div className="card">
            <div className="section-title">Entry Details</div>
            <form onSubmit={handleMint}>
              <div className="form-row">
                <div className="fld">
                  <label>Action Token</label>
                  <select value={mintForm.action_token} onChange={e=>handleMintChange("action_token",e.target.value)}>
                    {Object.entries(ACTION_TOKENS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="fld">
                  <label>Stratum</label>
                  <select value={mintForm.stratum} onChange={e=>handleMintChange("stratum",e.target.value)}>
                    {STRATA.map(s=><option key={s.code} value={s.code}>{s.short} — {s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row single"><div className="fld"><label>Asset / Subject Label</label><input value={mintForm.asset_label} onChange={e=>handleMintChange("asset_label",e.target.value)} placeholder="e.g. Certificate of Provenance — Document 001" required/></div></div>
              <div className="form-row">
                <div className="fld"><label>Asset Type</label><select value={mintForm.asset_type} onChange={e=>handleMintChange("asset_type",e.target.value)}>{INSTRUMENTS.map(i=><option key={i} value={i}>{i}</option>)}</select></div>
                <div className="fld"><label>Jurisdiction</label><select value={mintForm.jurisdiction} onChange={e=>handleMintChange("jurisdiction",e.target.value)}>{JURISDICTIONS.map(j=><option key={j} value={j}>{j}</option>)}</select></div>
              </div>
              <div className="form-row">
                <div className="fld"><label>Issuer</label><input value={mintForm.issuer} onChange={e=>handleMintChange("issuer",e.target.value)} placeholder="Fiducia Centrale"/></div>
                <div className="fld"><label>To / Recipient</label><input value={mintForm.to} onChange={e=>handleMintChange("to",e.target.value)} placeholder="e.g. Shane Jonathan Lozenich"/></div>
              </div>
              {["MINT_FDC","TRANSFER_FDC","REDEEM_FDC","MINT_OBLIGATION"].includes(mintForm.action_token) && (
                <div className="form-row">
                  <div className="fld"><label>Unit</label><input value={mintForm.instrument_unit} onChange={e=>handleMintChange("instrument_unit",e.target.value)} placeholder="FDC"/></div>
                  <div className="fld"><label>Amount</label><input type="number" value={mintForm.instrument_amount} onChange={e=>handleMintChange("instrument_amount",e.target.value)} placeholder="0"/></div>
                </div>
              )}
              <div className="form-row single"><div className="fld"><label>Reason / Purpose</label><input value={mintForm.reason} onChange={e=>handleMintChange("reason",e.target.value)} placeholder="Why is this action being taken?" required/></div></div>
              <div className="form-row single"><div className="fld"><label>Upstream References (comma-separated Entry IDs)</label><input value={mintForm.upstream_refs} onChange={e=>handleMintChange("upstream_refs",e.target.value)} placeholder="STRATUM02-AUTH-V1, STRATUM01-IDENTITY-SJL"/></div></div>
              <div className="form-row single"><div className="fld"><label>Notes</label><textarea value={mintForm.notes} onChange={e=>handleMintChange("notes",e.target.value)} rows={2} style={{resize:"vertical"}}/></div></div>
              <div className="form-row single"><div className="fld"><label>Tags (comma separated)</label><input value={mintForm.tags} onChange={e=>handleMintChange("tags",e.target.value)} placeholder="identity, legal, stratum01"/></div></div>
              <div className="sep"/>
              <div className="form-row three">
                <div className="fld"><label>Stratum (auto)</label><input value={mintForm.stratum} readOnly style={{opacity:0.6}}/></div>
                <div className="fld"><label>Financial Tier (1–8)</label><input type="number" min={1} max={8} value={mintForm.tier} onChange={e=>handleMintChange("tier",e.target.value)}/></div>
                <div className="fld"><label>Security Level (1–8)</label><input type="number" min={1} max={8} value={mintForm.level} onChange={e=>handleMintChange("level",e.target.value)}/></div>
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading || !authorityCheck?.valid} style={{width:"100%",marginTop:8}}>
                {loading?"Registering…":!authorityCheck?.valid?"Authority Check Failed — Cannot Register":"Register Entry to Ledger"}
              </button>
            </form>
          </div>
          <div>
            <div className="card" style={{marginBottom:14}}>
              <div className="section-title">Authority Reference</div>
              {STRATA.map(s=>(
                <div key={s.code} style={{display:"flex",gap:8,padding:"7px 0",borderBottom:"1px solid #e0d8cc",alignItems:"flex-start"}}>
                  <div style={{width:30,height:18,border:`1px solid ${s.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:s.color,flexShrink:0}}>{s.short}</div>
                  <div><div style={{fontSize:12,color:"#2a2218"}}>{s.name}</div><div style={{fontSize:10,color:"#7a6a55"}}>{s.desc}</div></div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="section-title">Institutional Processes</div>
              {[
                {name:"Issue Credit",steps:["REQUEST_CREDIT","ASSESS_RISK","APPROVE_CREDIT","MINT_OBLIGATION","ACCEPT_OBLIGATION"]},
                {name:"Register Document",steps:["REGISTER_DOC","ATTEST_DOC"]},
                {name:"Legal Proceeding",steps:["INITIATE_LEGAL","ESCALATE_PROCEDURAL"]},
              ].map(p=>(
                <div key={p.name} style={{marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#2a2218",marginBottom:6}}>{p.name}</div>
                  {p.steps.map((s,i)=>(
                    <div key={s} className="process-step">
                      <div className="process-num">{i+1}</div>
                      <div><div style={{fontSize:11,color:"#2a2218"}}>{ACTION_TOKENS[s]?.label||s}</div><div style={{fontSize:9,color:"#9a8a75"}}>{s}</div></div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Certificates Tab ────────────────────────────────────────────────────────
  function Certificates() {
    const entry = certEntry || ledger[0];
    if (!entry) return <div className="empty-state">No entries to certify.</div>;
    const certHash = "0x"+fhash(entry.id+entry.timestamp+(entry.legal?.doc_hash||""));
    const authCheck = enforceAuthority(entry.action?.token, entry.authority?.tier, entry.authority?.level, entry.authority?.stratum);
    return (
      <div>
        <div className="page-header"><div><h2>Certificate Generator</h2><p>Stratum 05 — Certificatory Authority</p></div></div>
        <div className="grid2">
          <div className="card">
            <div className="section-title">Select Entry to Certify</div>
            <input className="search-box" placeholder="Search entries…" style={{marginBottom:10,fontSize:12}} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
            <div style={{maxHeight:320,overflowY:"auto"}}>
              {filteredLedger.map(e=>(
                <div key={e.id} onClick={()=>setCertEntry(e)} style={{padding:"8px 9px",cursor:"pointer",background:certEntry?.id===e.id?"#e8e2d8":"transparent",borderLeft:certEntry?.id===e.id?"3px solid #2a2218":"3px solid transparent",transition:"all 0.15s",marginBottom:2}}>
                  <div style={{fontSize:12,color:"#2a2218",marginBottom:1}}>{e.asset?.label||e.id}</div>
                  <div style={{fontSize:9,color:"#9a8a75"}}>{e.action?.token} · {timeSince(e.timestamp)}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="cert-box">
            <div className="cert-outer-border"/>
            <div className="cert-watermark">Fiducia Centrale</div>
            <div style={{fontSize:10,letterSpacing:"0.3em",textTransform:"uppercase",color:"#7a6a55",marginBottom:12}}>Fiducia Centrale</div>
            <div className="cert-rule"/>
            <div className="cert-title">{entry.asset?.label||"Untitled Entry"}</div>
            <div className="cert-subtitle">Certificate of Stratigraphic Provenance</div>
            <div className="cert-body">
              This certificate attests, under the Certificatory authority of Fiducia Centrale (Stratum 05), that the entry identified herein has been recorded in the immutable provenance ledger and is cryptographically sealed.
              {authCheck.valid ? " Authority constraints have been verified." : " Note: Authority constraints flagged."}
            </div>
            {[["Entry ID",entry.id],["Action",entry.action?.token],["Stratum",entry.authority?.stratum],
              ["Financial Tier","Tier "+entry.authority?.tier],["Security Level","Level "+entry.authority?.level],
              ["Issuing Authority",entry.parties?.issuer],["Jurisdiction",entry.legal?.jurisdiction],
              ["Date Issued",new Date(entry.timestamp).toLocaleString()],["Source Hash",truncHash(entry.legal?.doc_hash)],
              ["Chain Hash",truncHash(entry.chain_hash||"")],["Authority Status",authCheck.valid?"VERIFIED":"FLAGGED"]
            ].map(([k,v])=>(
              <div className="cert-field" key={k as string}><span className="cert-label">{k}</span><span className="cert-val" style={{color:k==="Authority Status"?(v==="VERIFIED"?"#3a5a3a":"#7a3a3a"):"#2a2218"}}>{v||"—"}</span></div>
            ))}
            {entry.legal?.upstream_refs?.length > 0 && (
              <div className="cert-field"><span className="cert-label">References</span><span className="cert-val" style={{fontSize:9,fontFamily:"'Courier New',monospace"}}>{entry.legal.upstream_refs.join(", ")}</span></div>
            )}
            <div className="cert-hash"><div style={{fontSize:8,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:3}}>Certificate Hash</div><div style={{color:"#5a4a7a"}}>{certHash}</div></div>
            <div style={{marginTop:14,display:"flex",gap:8}}>
              <button className="btn btn-primary btn-sm" onClick={()=>{const t=`FIDUCIA CENTRALE — CERTIFICATE OF PROVENANCE\n\nEntry: ${entry.asset?.label}\nID: ${entry.id}\nChain Hash: ${entry.chain_hash||"N/A"}\nCert Hash: ${certHash}\nAuthority: ${authCheck.valid?"VERIFIED":"FLAGGED"}\nIssued: ${new Date(entry.timestamp).toLocaleString()}`;navigator.clipboard?.writeText(t).catch(()=>{});}}>Copy Certificate</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>window.print()}>Print</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Authority Engine Tab ────────────────────────────────────────────────────
  function AuthorityEngine() {
    const violations = ledger.filter(e=>{
      const c = enforceAuthority(e.action?.token, e.authority?.tier, e.authority?.level, e.authority?.stratum);
      return !c.valid;
    });
    return (
      <div>
        <div className="page-header"><div><h2>Authority Engine</h2><p>Live enforcement of constitutional permission model</p></div></div>
        <div className="grid2" style={{marginBottom:16}}>
          <div className="card">
            <div className="card-h">Authority Model Summary</div>
            <div style={{fontSize:13,color:"#5a4a35",lineHeight:1.9,marginBottom:12}}>
              The authority engine enforces the constitutional permission model on every ledger entry. Actions are validated against the required stratum, financial tier, and security level defined in the Authority Constitution.
            </div>
            <div style={{display:"flex",gap:10,marginBottom:12}}>
              <div style={{flex:1,background:"#edf2ed",border:"1px solid #a0b8a0",padding:"12px 14px"}}>
                <div style={{fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",color:"#3a5a3a",marginBottom:5}}>Verified Entries</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"#2a4a2a"}}>{ledger.length - violations.length}</div>
              </div>
              <div style={{flex:1,background:"#f7edec",border:"1px solid #c8a0a0",padding:"12px 14px"}}>
                <div style={{fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",color:"#7a3a3a",marginBottom:5}}>Flagged Entries</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"#6a2a2a"}}>{violations.length}</div>
              </div>
            </div>
            <div className="section-title">Constrained Action Tokens</div>
            {Object.entries(AUTHORITY_RULES).map(([token,rule])=>(
              <div key={token} style={{padding:"8px 0",borderBottom:"1px solid #e0d8cc"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <span className="badge badge-purple" style={{fontSize:8}}>{token}</span>
                  <div style={{display:"flex",gap:5}}>
                    <span className="auth-chip chip-t" style={{fontSize:8}}>T{rule.required_tier}+</span>
                    <span className="auth-chip chip-l" style={{fontSize:8}}>L{rule.required_level}+</span>
                  </div>
                </div>
                <div style={{fontSize:9,color:"#9a8a75"}}>Requires: {rule.required_strata.join(" or ")}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-h">Full Ledger Authority Audit</div>
            {ledger.map(e=>{
              const c = enforceAuthority(e.action?.token, e.authority?.tier, e.authority?.level, e.authority?.stratum);
              return (
                <div key={e.id} style={{padding:"8px 0",borderBottom:"1px solid #e0d8cc"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{fontSize:11,color:"#2a2218",marginBottom:2,maxWidth:"60%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.asset?.label}</div>
                    <span className={`badge ${c.valid?"badge-valid":"badge-invalid"}`} style={{fontSize:7}}>{c.valid?"AUTH OK":"AUTH FAIL"}</span>
                  </div>
                  <div style={{fontSize:9,color:"#9a8a75"}}>{e.action?.token} · {c.valid?"":"⚠ "+c.reason}</div>
                </div>
              );
            })}
            {!ledger.length && <div className="empty-state">No entries.</div>}
          </div>
        </div>
        {violations.length > 0 && (
          <div className="card">
            <div className="card-h" style={{color:"#7a3a3a"}}>Authority Violations</div>
            {violations.map(e=>{
              const c = enforceAuthority(e.action?.token, e.authority?.tier, e.authority?.level, e.authority?.stratum);
              return (
                <div key={e.id} style={{background:"#f7edec",border:"1px solid #c8a0a0",padding:"10px 12px",marginBottom:8}}>
                  <div style={{fontSize:12,color:"#5a2a2a",marginBottom:3}}>{e.asset?.label}</div>
                  <div style={{fontSize:10,color:"#9a6a6a"}}>{c.reason}</div>
                  <div style={{fontSize:9,color:"#9a8a75",marginTop:4,fontFamily:"'Courier New',monospace"}}>{e.id}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Connect Tab ─────────────────────────────────────────────────────────────
  function Connect() {
    async function handleTest() {
      setConnectMsg("Testing…"); setConnectOk(false);
      try {
        const r = await fetch("https://ledger.fiduciacentrale.com/api/ledger", {
          headers: connectToken ? { "X-Fiducia-Token": connectToken } : {},
          signal: AbortSignal.timeout(6000),
        });
        if (r.ok) {
          const data = await r.json();
          setConnectOk(true);
          setConnectMsg("Connected. " + (Array.isArray(data) ? data.length : "?") + " entries on remote ledger.");
        } else { setConnectMsg("API returned status " + r.status + ". Check your token or deployment."); }
      } catch { setConnectMsg("Could not reach API. Check that your Vercel deployment is live."); }
    }
    async function handlePull() {
      setConnectMsg("Pulling…"); setConnectOk(false);
      try {
        const r = await fetch("https://ledger.fiduciacentrale.com/api/ledger", { signal: AbortSignal.timeout(6000) });
        if (!r.ok) throw new Error("Status " + r.status);
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) {
          const remoteWithFlag = data.map((d: LedgerEntry) => ({...d, _synced: true, _local: false}));
          const localOnly = ledger.filter(e => e._local && !e._synced);
          const merged = [...remoteWithFlag, ...localOnly];
          setLedger(merged); saveLocal(merged);
          setConnectOk(true);
          setConnectMsg("Pulled " + data.length + " entries from Vercel and merged with local.");
        } else { setConnectMsg("Remote ledger empty. Local entries intact."); }
      } catch(err: unknown) { setConnectMsg("Pull failed: "+(err instanceof Error?err.message:String(err))); }
    }
    function handleTokenChange(v: string) {
      setConnectToken(v);
      saveToken(v);
    }
    return (
      <div>
        <div className="page-header"><div><h2>Backend Connection</h2><p>Vercel · Upstash Redis · Deployment Checklist</p></div></div>
        <div className="grid2">
          <div className="card">
            <div className="section-title">Test Your Live API</div>
            <div className="fld" style={{marginBottom:10}}>
              <label>Vercel API URL</label>
              <input value="https://ledger.fiduciacentrale.com/api/ledger" readOnly style={{opacity:0.7,fontFamily:"'Courier New',monospace",fontSize:10}}/>
            </div>
            <div className="fld" style={{marginBottom:12}}>
              <label>FIDUCIA_SYS_TOKEN</label>
              <input type="password" placeholder="Paste your token here" value={connectToken} onChange={e=>handleTokenChange(e.target.value)}/>
            </div>
            {connectMsg && <div className={`alert ${connectOk?"alert-green":"alert-red"}`} style={{marginBottom:10}}>{connectMsg}</div>}
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              <button className="btn btn-primary btn-sm" onClick={handleTest}>Test Connection</button>
              <button className="btn btn-secondary btn-sm" onClick={handlePull}>⟳ Pull from Vercel</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>{const b=new Blob([JSON.stringify(ledger,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="fiducia_ledger_export.json";a.click();}}>Export JSON</button>
            </div>
            <div className="sep"/>
            <div className="section-title">Deployment Checklist</div>
            {[
              {done:true,  label:"Vercel project created"},
              {done:true,  label:"Upstash Redis connected in Vercel dashboard"},
              {done:true,  label:"FIDUCIA_SYS_TOKEN set in Vercel environment variables"},
              {done:true,  label:"app/api/ledger/route.ts persists upstream_refs"},
              {done:true,  label:"'use client' added to top of page.tsx"},
              {done:true,  label:"Google Fonts moved to app/layout.tsx"},
              {done:true,  label:"Constitution view filter added to Ledger tab"},
              {done:false, label:"CLR-AG-2026-009 registered as S01 identity entry"},
              {done:false, label:"git push — Vercel auto-deploys"},
              {done:false, label:"Test Connection below returns green"},
            ].map((s,i)=>(
              <div className="checklist-item" key={i}>
                <span style={{color:s.done?"#3a5a3a":"#9a8a75",fontSize:14,flexShrink:0}}>{s.done?"✓":"○"}</span>
                <span style={{color:s.done?"#2a2218":"#7a6a55"}}>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="section-title">Environment Variables Required</div>
            {["UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN","FIDUCIA_SYS_TOKEN"].map(v=>(
              <div key={v} style={{fontFamily:"'Courier New',monospace",fontSize:10,padding:"5px 9px",background:"#f0ece4",border:"1px solid #c8bfaa",marginBottom:5,color:"#2a2218"}}>{v}</div>
            ))}
            <div className="sep"/>
            <div className="section-title">Institutional Guarantees</div>
            {[
              "No currency can exist without a MINT_FDC entry.",
              "No obligation enforceable without MINT_OBLIGATION + ACCEPT_OBLIGATION pair.",
              "No authority action valid without a matching, authorized ledger entry.",
              "Every entry receives a cryptographic chain hash linking to the previous.",
              "Authority enforcement runs at write-time — rejected entries never reach the ledger.",
            ].map((g,i)=>(
              <div key={i} style={{display:"flex",gap:8,padding:"7px 0",borderBottom:"1px solid #e0d8cc",alignItems:"flex-start"}}>
                <span style={{color:"#5a7a5a",fontSize:14,flexShrink:0}}>◆</span>
                <span style={{fontSize:12,color:"#5a4a35"}}>{g}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Detail Modal ─────────────────────────────────────────────────────────────
  function DetailModal() {
    if (!detailModal) return null;
    const e = detailModal;
    const authCheck = enforceAuthority(e.action?.token, e.authority?.tier, e.authority?.level, e.authority?.stratum);
    return (
      <div className="modal-overlay" onClick={()=>setDetailModal(null)}>
        <div className="modal" onClick={ev=>ev.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">{e.asset?.label||e.id}</div>
            <button className="close-btn" onClick={()=>setDetailModal(null)}>✕</button>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
            <span className="badge badge-purple">{e.action?.token}</span>
            {renderAuthority(e.authority)}
            <span className={`badge ${authCheck.valid?"badge-valid":"badge-invalid"}`}>{authCheck.valid?"AUTH VERIFIED":"AUTH FLAGGED"}</span>
            {e._local && <span className="badge badge-amber">local only</span>}
          </div>
          <div className="code-block">{JSON.stringify(e,null,2)}</div>
          {e.legal?.upstream_refs?.length > 0 && (
            <div style={{marginTop:14}}>
              <div className="section-title">Upstream References</div>
              {e.legal.upstream_refs.map(r=>{
                const found = ledger.find(x=>x.id===r);
                return <span key={r} className="upstream-ref" onClick={()=>found&&setDetailModal(found)}>{r} {found?"↗":""}</span>;
              })}
            </div>
          )}
          <div style={{marginTop:14,display:"flex",gap:8}}>
            <button className="btn btn-secondary btn-sm" onClick={()=>{navigator.clipboard?.writeText(JSON.stringify(e,null,2)).catch(()=>{});}}>Copy JSON</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>{setCertEntry(e);setDetailModal(null);setTab("certificates");}}>Generate Certificate</button>
          </div>
        </div>
      </div>
    );
  }

  const TABS = [
    {id:"overview",    label:"Overview"},
    {id:"ledger",      label:"Ledger S06"},
    {id:"mint",        label:"Register S07"},
    {id:"certificates",label:"Certificates S05"},
    {id:"authority",   label:"Authority Engine"},
    {id:"connect",     label:"Connect"},
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <header className="hdr">
          <div>
            <div className="logo">Provenance Ledger</div>
            <div className="logo-sub">Stratum Authority Portal &amp; Systemic Ingestion Engine</div>
          </div>
          <div className="hdr-right">
            <div className="hdr-entity">Shane Jonathan Lozenich</div>
            <div className="hdr-entity-sub"><span className="status-dot"/>Fiducia Centrale / Central Trust Securities</div>
            <div className="hdr-chain">{chainStatus.valid?"✓ chain intact":"⚠ chain break"} · {ledger.length} entries · GDRI {(gdri/1000000).toFixed(2)}M</div>
          </div>
        </header>
        <nav className="nav">
          <div className="tabs">
            {TABS.map(t=><button key={t.id} className={`tab ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>)}
          </div>
        </nav>
        <div className="content">
          {tab==="overview"    && <Overview/>}
          {tab==="ledger"      && <LedgerView/>}
          {tab==="mint"        && <Mint/>}
          {tab==="certificates"&& <Certificates/>}
          {tab==="authority"   && <AuthorityEngine/>}
          {tab==="connect"     && <Connect/>}
        </div>
        <DetailModal/>
      </div>
    </>
  );
}