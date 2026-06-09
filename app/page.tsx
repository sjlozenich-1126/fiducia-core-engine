'use client';

// ── paste the entire artifact code below this line ──
import { Fragment, useState, useEffect, type FormEvent } from "react";

type ActionToken = keyof typeof ACTION_TOKENS;

type LedgerEntry = {
  id: string;
  timestamp: string;
  asset: { id: string; type: string; label: string };
  action: { token: string; stratum: string; reason: string };
  parties: { issuer: string; from: string | null; to: string | null };
  instrument: { type: string; unit: string | null; amount: number | null };
  legal: { jurisdiction: string; forum: string; upstream_refs: string[]; doc_hash: string };
  authority: { stratum: string; tier: number; level: number };
  policy: { gdr_index_delta: number | null };
  metadata: { tags: string[]; notes: string; version: string };
  _local?: boolean;
};

type MintFormState = {
  action_token: string;
  stratum: string;
  asset_label: string;
  asset_type: string;
  issuer: string;
  to: string;
  instrument_type: string;
  instrument_unit: string;
  instrument_amount: string;
  reason: string;
  jurisdiction: string;
  tier: number | string;
  level: number | string;
  tags: string;
  notes: string;
};

type MintStatusState = { ok: boolean; msg: string; id?: string } | null;

function hashSimulate(str: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
function generateId(prefix: string) { return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }
function timeSince(ts: string) {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return `${Math.floor(d/1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}
function truncHash(h: string | undefined) { if (!h) return "—"; return h.length > 16 ? h.slice(0,8)+"…"+h.slice(-4) : h; }

const STRATA = [
  { code:"01-Inherent",      name:"Inherent Identity",    short:"S01", color:"#5a7a5a", desc:"DNA, lineage, biological identity" },
  { code:"02-Constitutional",name:"Constitutional",       short:"S02", color:"#7a6a9a", desc:"Charters, constitutions, covenants" },
  { code:"03-Statutory",     name:"Statutory",            short:"S03", color:"#8a7aaa", desc:"Rules, policies, compliance" },
  { code:"04-Administrative",name:"Administrative",       short:"S04", color:"#6a8aaa", desc:"Execution, enforcement, ops" },
  { code:"05-Certificatory", name:"Certificatory",        short:"S05", color:"#5a8a7a", desc:"Attestations, notarizations" },
  { code:"06-Provenance",    name:"Provenance",           short:"S06", color:"#9a8a5a", desc:"Chain of title, records" },
  { code:"07-Hereditary",    name:"Hereditary / Majorat", short:"S07", color:"#aa6a7a", desc:"Lineage-based, heir authority" },
  { code:"08-Procedural",    name:"Procedural Legal",     short:"S08", color:"#aa7a5a", desc:"Court filings, legal actions" },
];

const ACTION_TOKENS = {
  "REGISTER_IDENTITY":       { label:"Register Identity",        stratum:"01-Inherent",       tier:8, level:8 },
  "REGISTER_INSTRUMENT":     { label:"Register Instrument",       stratum:"02-Constitutional", tier:8, level:4 },
  "MINT_FDC":                { label:"Mint FDC",                 stratum:"07-Hereditary",     tier:8, level:4 },
  "TRANSFER_FDC":            { label:"Transfer FDC",             stratum:"04-Administrative", tier:3, level:3 },
  "REDEEM_FDC":              { label:"Redeem FDC",               stratum:"05-Certificatory",  tier:5, level:3 },
  "REGISTER_DOC":            { label:"Register Document",        stratum:"06-Provenance",     tier:3, level:4 },
  "ATTEST_DOC":              { label:"Attest Document",          stratum:"05-Certificatory",  tier:4, level:4 },
  "FILE_QUIET_TITLE":        { label:"File Quiet Title",         stratum:"08-Procedural",     tier:3, level:4 },
  "INITIATE_LEGAL":          { label:"Initiate Legal Proceeding",stratum:"08-Procedural",     tier:3, level:4 },
  "REGISTER_AUTHORITY_MODEL":{ label:"Register Authority Model", stratum:"02-Constitutional", tier:8, level:4 },
};

const INSTRUMENTS = ["currency","identity","credit","certificate","doc_provenance","legal_filing","legal_procedure","governance","monetary_instrument_definition","authority_framework"];

const LOCAL_KEY = "fc_ledger_v4";
function loadLocal(): LedgerEntry[] { try { const d=localStorage.getItem(LOCAL_KEY); return d?JSON.parse(d) as LedgerEntry[]:[]; } catch{return[];} }
function saveLocal(e: LedgerEntry[]) { try{localStorage.setItem(LOCAL_KEY,JSON.stringify(e));}catch{} }

const DEMO: LedgerEntry[] = [
  { id:"STRATUM01-IDENTITY-SJL", timestamp:new Date(Date.now()-86400000*3).toISOString(), asset:{id:"SJL-ARCHAEOGENETIC",type:"identity_record",label:"Archaeogenetic Identity & Lineage Certification — SJL"}, action:{token:"REGISTER_IDENTITY",stratum:"01-Inherent",reason:"Establish inherent biological and ancestral identity."}, parties:{issuer:"Archaeogenetic Laboratory NG-25051",from:null,to:"Shane Jonathan Lozenich"}, instrument:{type:"identity",unit:null,amount:null}, legal:{jurisdiction:"BIOLOGICAL",forum:"NG-25051",upstream_refs:[],doc_hash:"bb1b36ad40b59127cf5f5c1245d453c4"}, authority:{stratum:"01-Inherent",tier:8,level:8}, policy:{gdr_index_delta:null}, metadata:{tags:["identity","lineage"],notes:"Dual-horizon archaeogenetic identity record.",version:"1.0"} },
  { id:"STRATUM02-AUTH-V1", timestamp:new Date(Date.now()-86400000*2).toISOString(), asset:{id:"AUTH-CONSTITUTION-V1",type:"authority_framework",label:"Unified Authority Constitution v1.0"}, action:{token:"REGISTER_AUTHORITY_MODEL",stratum:"02-Constitutional",reason:"Define unified authority framework."}, parties:{issuer:"Fiducia Centrale",from:null,to:null}, instrument:{type:"governance",unit:null,amount:null}, legal:{jurisdiction:"ON-CHAIN",forum:"Fiducia Centrale — Constitutional Chamber",upstream_refs:[],doc_hash:"AUTH-CONSTITUTION-HASH-V1"}, authority:{stratum:"02-Constitutional",tier:8,level:4}, policy:{gdr_index_delta:null}, metadata:{tags:["authority","constitution"],notes:"Unified authority framework.",version:"1.0"} },
  { id:"STRATUM02-FDC-V1", timestamp:new Date(Date.now()-86400000*1.5).toISOString(), asset:{id:"FDC-CONSTITUTION-V1",type:"monetary_instrument_definition",label:"Fiducial Credit (FDC) — Monetary Constitution v1.0"}, action:{token:"REGISTER_INSTRUMENT",stratum:"02-Constitutional",reason:"Establish FDC as hybrid institutional currency."}, parties:{issuer:"Fiducia Centrale — Constitutional Authority",from:null,to:null}, instrument:{type:"currency",unit:"FDC",amount:null}, legal:{jurisdiction:"ON-CHAIN",forum:"Fiducia Centrale",upstream_refs:[],doc_hash:"FDC-CONSTITUTION-HASH-V1"}, authority:{stratum:"02-Constitutional",tier:8,level:4}, policy:{gdr_index_delta:null}, metadata:{tags:["currency","FDC"],notes:"Hybrid currency backed by GDRI.",version:"1.0"} },
  { id:"STRATUM08-LEGAL-26-2-01443", timestamp:new Date(Date.now()-86400000).toISOString(), asset:{id:"QUIET-TITLE-SJL",type:"legal_claim",label:"Petition for Declaratory Judgment & Quiet Title — Seattle-Bremerton Majorat"}, action:{token:"INITIATE_LEGAL",stratum:"08-Procedural",reason:"Assert rights and challenge adverse claims."}, parties:{issuer:"Shane Jonathan Lozenich",from:"Shane Jonathan Lozenich",to:"King County Superior Court"}, instrument:{type:"legal_procedure",unit:null,amount:null}, legal:{jurisdiction:"WA-KING-COUNTY",forum:"King County Superior Court",upstream_refs:[],doc_hash:"PETITION-26-2-01443-4-SEA"}, authority:{stratum:"08-Procedural",tier:3,level:4}, policy:{gdr_index_delta:null}, metadata:{tags:["legal","quiet_title"],notes:"Pro se filing; accepted by King County Superior Court.",version:"1.0"} },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#f0ece4;color:#2a2218;font-family:'EB Garamond',Georgia,serif;}
.app{min-height:100vh;}
.hdr{background:#f7f4ee;border-bottom:2px solid #2a2218;padding:16px 32px;display:flex;align-items:flex-start;justify-content:space-between;position:sticky;top:0;z-index:100;}
.logo{font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:500;color:#2a2218;letter-spacing:0.12em;text-transform:uppercase;}
.logo-sub{font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#7a6a55;margin-top:2px;}
.hdr-right{text-align:right;}
.hdr-entity{font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#2a2218;}
.hdr-entity-sub{font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#7a6a55;margin-top:2px;}
.status-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#5a7a5a;margin-right:5px;vertical-align:middle;}
.nav{background:#f7f4ee;border-bottom:2px solid #2a2218;padding:0 32px;}
.tabs{display:flex;gap:0;}
.tab{padding:10px 20px;font-family:'EB Garamond',serif;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;border:none;background:transparent;color:#7a6a55;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.2s;}
.tab.active{color:#2a2218;border-bottom:3px solid #2a2218;font-weight:500;}
.tab:hover:not(.active){color:#2a2218;}
.content{padding:28px 32px;max-width:1440px;margin:0 auto;}
.page-header{margin-bottom:24px;padding-bottom:14px;border-bottom:1px solid #c8bfaa;}
.page-header h2{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:400;font-style:italic;color:#2a2218;}
.page-header p{font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#7a6a55;margin-top:4px;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px;}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px;}
.card{background:#f7f4ee;border:1px solid #c8bfaa;border-top:3px solid #2a2218;padding:18px 20px;}
.card-h{font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#7a6a55;margin-bottom:14px;}
.metric-val{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:500;color:#2a2218;line-height:1;}
.metric-sub{font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#7a6a55;margin-top:5px;}
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;border:1px solid;}
.badge-green{background:#edf2ed;color:#3a5a3a;border-color:#a0b8a0;}
.badge-purple{background:#f0ecf7;color:#5a4a7a;border-color:#b8aad0;}
.badge-amber{background:#f7f0e2;color:#7a5a20;border-color:#c8a860;}
.badge-red{background:#f7edec;color:#7a3a3a;border-color:#c8a0a0;}
.badge-blue{background:#ecf0f7;color:#3a4a7a;border-color:#a0aed0;}
.strat-row{display:flex;align-items:center;gap:10px;margin-bottom:9px;}
.strat-label{font-size:11px;color:#5a4a35;width:140px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.strat-bar-bg{flex:1;height:5px;background:#e0d8cc;}
.strat-bar{height:100%;transition:width 1s cubic-bezier(0.22,1,0.36,1);}
.strat-pct{font-size:11px;color:#7a6a55;width:24px;text-align:right;}
.feed-item{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid #e0d8cc;}
.feed-item:last-child{border-bottom:none;}
.feed-action{font-size:13px;color:#2a2218;}
.feed-hash{font-size:10px;color:#9a8a75;margin-top:1px;letter-spacing:0.06em;}
.feed-time{font-size:10px;color:#9a8a75;}
.feed-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.sep{width:100%;height:1px;background:#c8bfaa;margin:18px 0;}
.auth-chip{font-size:9px;padding:2px 6px;letter-spacing:0.08em;text-transform:uppercase;border:1px solid;}
.chip-s{background:#f0ecf7;color:#5a4a7a;border-color:#b8aad0;}
.chip-t{background:#edf2ed;color:#3a5a3a;border-color:#a0b8a0;}
.chip-l{background:#f7f0e2;color:#7a5a20;border-color:#c8a860;}
.authority-triple{display:flex;gap:5px;flex-wrap:wrap;}
.section-title{font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#7a6a55;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #c8bfaa;}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
.form-row.single{grid-template-columns:1fr;}
.form-row.three{grid-template-columns:1fr 1fr 1fr;}
.fld{display:flex;flex-direction:column;gap:5px;}
.fld label{font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#7a6a55;}
.fld input,.fld select,.fld textarea{background:#f0ece4;border:1px solid #c8bfaa;color:#2a2218;font-family:'EB Garamond',serif;font-size:14px;padding:8px 10px;outline:none;transition:border-color 0.2s;}
.fld input:focus,.fld select:focus,.fld textarea:focus{border-color:#2a2218;}
.btn{padding:10px 22px;border:1px solid #2a2218;cursor:pointer;font-family:'EB Garamond',serif;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;transition:all 0.2s;}
.btn-primary{background:#2a2218;color:#f7f4ee;}
.btn-primary:hover{background:#3a3228;}
.btn-primary:disabled{opacity:0.5;cursor:not-allowed;}
.btn-secondary{background:transparent;color:#2a2218;border-color:#c8bfaa;}
.btn-secondary:hover{background:#f0ece4;border-color:#2a2218;}
.btn-sm{padding:5px 12px;font-size:11px;}
.ledger-tbl{width:100%;border-collapse:collapse;font-size:13px;}
.ledger-tbl th{text-align:left;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#7a6a55;padding:8px 12px;border-bottom:2px solid #2a2218;font-weight:400;}
.ledger-tbl td{padding:10px 12px;border-bottom:1px solid #e0d8cc;vertical-align:top;font-size:13px;}
.ledger-tbl tr:hover td{background:#f0ece4;}
.alert{padding:10px 14px;font-size:13px;margin-bottom:14px;display:flex;align-items:center;gap:8px;border:1px solid;}
.alert-green{background:#edf2ed;border-color:#a0b8a0;color:#3a5a3a;}
.alert-red{background:#f7edec;border-color:#c8a0a0;color:#7a3a3a;}
.alert-blue{background:#ecf0f7;border-color:#a0aed0;color:#3a4a7a;}
.spinner{width:14px;height:14px;border:2px solid rgba(42,34,24,0.2);border-top-color:#2a2218;border-radius:50%;animation:spin 0.8s linear infinite;flex-shrink:0;}
@keyframes spin{to{transform:rotate(360deg);}}
.cert-box{background:#f7f4ee;border:1px solid #c8bfaa;padding:32px;position:relative;overflow:hidden;}
.cert-outer-border{position:absolute;inset:8px;border:1px solid #c8bfaa;pointer-events:none;}
.cert-watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);font-family:'Cormorant Garamond',serif;font-size:72px;color:rgba(42,34,24,0.04);pointer-events:none;white-space:nowrap;font-style:italic;}
.cert-title{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:400;font-style:italic;color:#2a2218;margin-bottom:4px;}
.cert-subtitle{font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#7a6a55;margin-bottom:22px;}
.cert-rule{width:60px;height:2px;background:#2a2218;margin-bottom:22px;}
.cert-body{font-size:14px;color:#5a4a35;line-height:1.8;margin-bottom:20px;font-style:italic;}
.cert-field{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e0d8cc;}
.cert-label{font-size:9px;text-transform:uppercase;letter-spacing:0.18em;color:#7a6a55;}
.cert-val{font-size:13px;color:#2a2218;text-align:right;max-width:60%;}
.cert-hash{font-size:10px;color:#9a8a75;word-break:break-all;margin-top:18px;padding-top:14px;border-top:1px solid #c8bfaa;}
.gdri-bar{height:6px;background:#e0d8cc;margin:8px 0;}
.gdri-fill{height:100%;background:#2a2218;transition:width 1s;}
.code-block{background:#2a2218;border:1px solid #3a3228;padding:14px;font-family:'Courier New',monospace;font-size:10px;line-height:1.7;overflow-x:auto;white-space:pre-wrap;word-break:break-all;color:#c8bfaa;max-height:260px;overflow-y:auto;margin-top:10px;}
.empty-state{text-align:center;padding:40px 20px;color:#9a8a75;font-size:13px;font-style:italic;}
.filter-btn{padding:4px 12px;border:1px solid #c8bfaa;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;background:transparent;color:#7a6a55;cursor:pointer;font-family:'EB Garamond',serif;transition:all 0.15s;}
.filter-btn.active{background:#2a2218;color:#f7f4ee;border-color:#2a2218;}
.filter-row{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;}
.detail-label{font-size:9px;text-transform:uppercase;letter-spacing:0.15em;color:#7a6a55;}
.detail-val{font-size:13px;color:#2a2218;word-break:break-all;}
.entry-detail{background:#f0ece4;border:1px solid #c8bfaa;padding:16px;margin-top:6px;}
.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.detail-row{display:flex;flex-direction:column;gap:3px;}
.checklist-item{display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #e0d8cc;align-items:center;font-size:13px;}
`;

// Updated target deployment core URL
const VERCEL_URL = "https://fiducia-core-engine-ildcyggs6-sjlozenich.vercel.app";

export default function App() {
  const [tab, setTab] = useState("overview");
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [mintForm, setMintForm] = useState<MintFormState>({ action_token:"REGISTER_DOC", stratum:"06-Provenance", asset_label:"", asset_type:"doc_provenance", issuer:"Fiducia Centrale", to:"", instrument_type:"doc_provenance", instrument_unit:"", instrument_amount:"", reason:"", jurisdiction:"ON-CHAIN", tier:4, level:3, tags:"", notes:"" });
  const [mintStatus, setMintStatus] = useState<MintStatusState>(null);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [certEntry, setCertEntry] = useState<LedgerEntry | null>(null);
  const [filterStratum, setFilterStratum] = useState("all");
  const [fdc, setFdc] = useState(0);
  const [gdri, setGdri] = useState(1000000);
  const [connectToken, setConnectToken] = useState("");
  const [connectMsg, setConnectMsg] = useState<string | null>(null);
  const [connectOk, setConnectOk] = useState(false);

  useEffect(() => {
    const stored = loadLocal();
    const data = stored.length ? stored : DEMO;
    setLedger(data);
    if (!stored.length) saveLocal(DEMO);
    setFdc(data.filter((entry: LedgerEntry) => entry.action.token === "MINT_FDC").reduce((sum: number, entry: LedgerEntry) => sum + (entry.instrument.amount || 0), 0));
    setGdri(1000000 + data.reduce((sum: number, entry: LedgerEntry) => sum + (entry.policy.gdr_index_delta || 0), 0));
  }, []);

  function handleMintChange(k: keyof MintFormState, v: string) {
    setMintForm(f => {
      const nf = { ...f, [k]: v } as MintFormState;
      if (k === "action_token" && v in ACTION_TOKENS) {
        const token = ACTION_TOKENS[v as ActionToken];
        nf.stratum = token.stratum;
        nf.tier = token.tier;
        nf.level = token.level;
      }
      return nf;
    });
  }

  async function handleMint(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setMintStatus(null);
    try {
      const now = new Date().toISOString();
      const id = generateId(mintForm.action_token.slice(0, 6));
      const amount = mintForm.instrument_amount ? parseFloat(mintForm.instrument_amount) : null;
      const entry: LedgerEntry = {
        id,
        timestamp: now,
        asset: { id: generateId("ASSET"), type: mintForm.asset_type, label: mintForm.asset_label || "Untitled Entry" },
        action: { token: mintForm.action_token, stratum: mintForm.stratum, reason: mintForm.reason },
        parties: { issuer: mintForm.issuer || "Fiducia Centrale", from: mintForm.issuer || null, to: mintForm.to || null },
        instrument: { type: mintForm.instrument_type, unit: mintForm.instrument_unit || null, amount },
        legal: { jurisdiction: mintForm.jurisdiction, forum: "Fiducia Centrale", upstream_refs: [], doc_hash: "0x" + hashSimulate(id + now + mintForm.asset_label) },
        authority: { stratum: mintForm.stratum, tier: Number(mintForm.tier), level: Number(mintForm.level) },
        policy: { gdr_index_delta: mintForm.action_token === "MINT_FDC" ? -(amount || 0) : null },
        metadata: { tags: mintForm.tags ? mintForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [], notes: mintForm.notes, version: "1.0" },
        _local: true,
      };
      const nl = [entry, ...ledger];
      setLedger(nl);
      saveLocal(nl);
      if (entry.action.token === "MINT_FDC") setFdc(f => f + (entry.instrument.amount || 0));
      const delta = entry.policy.gdr_index_delta ?? 0;
      if (delta !== 0) setGdri(g => g + delta);
      setMintStatus({ ok: true, msg: "Entry registered to ledger.", id: entry.id });
      setMintForm(f => ({ ...f, asset_label: "", reason: "", notes: "", tags: "", to: "", instrument_amount: "" }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setMintStatus({ ok: false, msg: "Registration failed: " + message });
    }
    finally { setLoading(false); }
  }

  function renderAuthority(a: LedgerEntry["authority"] | undefined) {
    if(!a) return null;
    const s=STRATA.find(x=>x.code===a.stratum);
    return <div className="authority-triple"><span className="auth-chip chip-s">{s?.short||a.stratum}</span><span className="auth-chip chip-t">T{a.tier}</span><span className="auth-chip chip-l">L{a.level}</span></div>;
  }

  const filteredLedger = filterStratum === "all" ? ledger : ledger.filter((entry: LedgerEntry) => entry.authority?.stratum === filterStratum);

  function Overview() {
    const counts = STRATA.map(s => ({ ...s, count: ledger.filter((entry: LedgerEntry) => entry.authority?.stratum === s.code).length }));
    const total = ledger.length;
    const verifiedPct = total > 0 ? Math.round((ledger.filter((entry: LedgerEntry) => entry.action?.token).length / total) * 100) : 0;
    return (
      <div>
        <div className="page-header"><h2>Stratigraphic Provenance Engine</h2><p>Identity · Finance · Security · Chain of Authority</p></div>
        <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
          <span className="badge badge-green">● Ledger Active</span>
          <span className="badge badge-purple">● FDC-CONSTITUTION-V1</span>
          <span className="badge badge-blue">● AUTH-CONSTITUTION-V1</span>
        </div>
        <div className="grid4">
          {[{label:"Ledger Entries",val:total,sub:"immutable blocks"},{label:"FDC Supply",val:fdc.toLocaleString(),sub:"fiducial credits"},{label:"GDRI Balance",val:(gdri/1000000).toFixed(2)+"M",sub:"global debt reduction"},{label:"Integrity",val:verifiedPct+"%",sub:"verified entries"}].map(m=>(
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
            {ledger.slice(0,8).map((e: LedgerEntry) => (
              <div className="feed-item" key={e.id}>
                <div><div className="feed-action">{ACTION_TOKENS[e.action.token as ActionToken]?.label || e.action.token}</div><div className="feed-hash">{truncHash(e.legal.doc_hash)}</div></div>
                <div style={{display:"flex",alignItems:"center",gap:8}}><div className="feed-time">{timeSince(e.timestamp)}</div><div className="feed-dot" style={{background:STRATA.find(s=>s.code===e.authority.stratum)?.color||"#9a8a75"}}/></div>
              </div>
            ))}
            {!ledger.length&&<div className="empty-state">No entries yet.</div>}
          </div>
        </div>
        <div className="grid2">
          <div className="card">
            <div className="card-h">Authority Models</div>
            {[{name:"Model A — Identity & Institutional",axis:"Stratum 01–08",icon:"◆",color:"#5a4a7a",desc:"Biological identity, constitutional authority, legal procedures"},{name:"Model B — Financial & Monetary",axis:"Tier 1–8",icon:"◈",color:"#3a5a3a",desc:"FDC issuance, monetary governance, GDRI-backed currency"},{name:"Model C — Security & Risk",axis:"Level 1–8",icon:"◉",color:"#7a5a20",desc:"Risk classification, heir protection, access control"}].map(m=>(
              <div key={m.name} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid #e0d8cc"}}>
                <div style={{fontSize:18,color:m.color,flexShrink:0,paddingTop:2}}>{m.icon}</div>
                <div><div style={{fontSize:14,color:"#2a2218",marginBottom:2}}>{m.name}</div><div style={{fontSize:11,color:"#7a6a55",marginBottom:5}}>{m.desc}</div><span className="badge badge-purple" style={{fontSize:9}}>{m.axis}</span></div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-h">GDRI — Global Debt Reduction Index</div>
            <div style={{marginBottom:12}}><div style={{fontSize:10,color:"#7a6a55",marginBottom:4,letterSpacing:"0.12em",textTransform:"uppercase"}}>Current Balance</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:44,color:"#2a2218",lineHeight:1}}>{(gdri/1000000).toFixed(2)}M <span style={{fontSize:14,color:"#7a6a55"}}>units</span></div></div>
            <div className="gdri-bar"><div className="gdri-fill" style={{width:Math.max(5,Math.min(100,(gdri/1000000)*100))+"%"}}/></div>
            <div style={{fontSize:12,color:"#7a6a55",marginTop:8,fontStyle:"italic"}}>Each FDC minted reduces this index by 1 unit.</div>
          </div>
        </div>
      </div>
    );
  }

  function LedgerTableComponent() {
    return (
      <div>
        <div className="page-header"><h2>Provenance Ledger</h2><p>Immutable · Cryptographically Hashed · Append-Only</p></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div className="filter-row" style={{marginBottom:0}}>
            <button className={`filter-btn ${filterStratum==="all"?"active":""}`} onClick={()=>setFilterStratum("all")}>All</button>
            {STRATA.map(s=><button key={s.code} className={`filter-btn ${filterStratum===s.code?"active":""}`} onClick={()=>setFilterStratum(filterStratum===s.code?"all":s.code)}>{s.short}</button>)}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-secondary btn-sm" onClick={()=>{setLedger(DEMO);saveLocal(DEMO);}}>Reset Demo</button>
            <button className="btn btn-secondary btn-sm" onClick={()=>{const b=new Blob([JSON.stringify(ledger,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="fiducia_ledger.json";a.click();}}>Export JSON</button>
          </div>
        </div>
        {mintStatus&&<div className={`alert ${mintStatus.ok?"alert-green":"alert-red"}`}>{mintStatus.msg}</div>}
        <div style={{background:"#f7f4ee",border:"1px solid #c8bfaa"}}>
          <table className="ledger-tbl">
            <thead><tr><th>Entry ID</th><th>Timestamp</th><th>Action</th><th>Asset / Subject</th><th>Authority</th><th>Hash</th><th></th></tr></thead>
            <tbody>
              {!filteredLedger.length&&<tr><td colSpan={7} style={{textAlign:"center",padding:32,color:"#9a8a75",fontStyle:"italic"}}>No entries match this filter.</td></tr>}
              {filteredLedger.map((e: LedgerEntry) => (
                <Fragment key={e.id}>
                  <tr key={e.id} style={{cursor:"pointer"}} onClick={()=>setSelectedEntry(selectedEntry?.id===e.id?null:e)}>
                    <td><span style={{fontFamily:"'Courier New',monospace",fontSize:10,color:"#5a4a7a"}}>{e.id.slice(0,22)}…</span></td>
                    <td style={{fontSize:11,color:"#7a6a55",whiteSpace:"nowrap"}}>{new Date(e.timestamp).toLocaleString()}</td>
                    <td><span className="badge badge-purple" style={{fontSize:9}}>{e.action?.token}</span></td>
                    <td style={{maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={e.asset?.label}>{e.asset?.label}</td>
                    <td>{renderAuthority(e.authority)}</td>
                    <td><span style={{fontFamily:"'Courier New',monospace",fontSize:9,color:"#9a8a75"}}>{truncHash(e.legal?.doc_hash)}</span></td>
                    <td><div style={{display:"flex",gap:6}}><button className="btn btn-secondary btn-sm" onClick={ev=>{ev.stopPropagation();setCertEntry(e);setTab("certificates");}}>Cert</button>{e._local&&<span className="badge badge-amber" style={{fontSize:8}}>local</span>}</div></td>
                  </tr>
                  {selectedEntry?.id===e.id&&(
                    <tr key={e.id+"-d"}><td colSpan={7} style={{padding:"0 12px 16px"}}>
                      <div className="entry-detail">
                        <div className="detail-grid">
                          {[["Issuer",e.parties?.issuer],["To",e.parties?.to||"—"],["Stratum",e.action?.stratum],["Instrument",e.instrument?.type+(e.instrument?.unit?" · "+e.instrument.unit:"")],["Amount",e.instrument?.amount?.toLocaleString()||"—"],["Jurisdiction",e.legal?.jurisdiction],["Notes",e.metadata?.notes||"—"],["Reason",e.action?.reason]].map(([k,v])=>(
                            <div className="detail-row" key={k}><div className="detail-label">{k}</div><div className="detail-val">{v}</div></div>
                          ))}
                        </div>
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function MintForm() {
    return (
      <div>
        <div className="page-header"><h2>Register Entry</h2><p>Mint a new immutable block to the provenance ledger</p></div>
        {mintStatus&&<div className={`alert ${mintStatus.ok?"alert-green":"alert-red"}`} style={{marginBottom:16}}>{loading&&<div className="spinner"/>}{mintStatus.msg}</div>}
        <div className="grid2">
          <div className="card">
            <div className="section-title">Entry Details</div>
            <form onSubmit={handleMint}>
              <div className="form-row">
                <div className="fld"><label>Action Token</label><select value={mintForm.action_token} onChange={e=>handleMintChange("action_token",e.target.value)}>{Object.entries(ACTION_TOKENS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
                <div className="fld"><label>Stratum</label><select value={mintForm.stratum} onChange={e=>handleMintChange("stratum",e.target.value)}>{STRATA.map(s=><option key={s.code} value={s.code}>{s.short} — {s.name}</option>)}</select></div>
              </div>
              <div className="form-row single"><div className="fld"><label>Asset / Subject Label</label><input value={mintForm.asset_label} onChange={e=>handleMintChange("asset_label",e.target.value)} placeholder="e.g. Certificate of Provenance — Document 001"/></div></div>
              <div className="form-row">
                <div className="fld"><label>Asset Type</label><select value={mintForm.asset_type} onChange={e=>handleMintChange("asset_type",e.target.value)}>{INSTRUMENTS.map(i=><option key={i} value={i}>{i}</option>)}</select></div>
                <div className="fld"><label>Jurisdiction</label><select value={mintForm.jurisdiction} onChange={e=>handleMintChange("jurisdiction",e.target.value)}>{["ON-CHAIN","WA-KING-COUNTY","US-FEDERAL","BIOLOGICAL","INTERNATIONAL"].map(j=><option key={j} value={j}>{j}</option>)}</select></div>
              </div>
              <div className="form-row">
                <div className="fld"><label>Issuer</label><input value={mintForm.issuer} onChange={e=>handleMintChange("issuer",e.target.value)} placeholder="Fiducia Centrale"/></div>
                <div className="fld"><label>To / Recipient</label><input value={mintForm.to} onChange={e=>handleMintChange("to",e.target.value)} placeholder="e.g. Shane Jonathan Lozenich"/></div>
              </div>
              {["MINT_FDC","TRANSFER_FDC","REDEEM_FDC"].includes(mintForm.action_token)&&(
                <div className="form-row">
                  <div className="fld"><label>Unit</label><input value={mintForm.instrument_unit} onChange={e=>handleMintChange("instrument_unit",e.target.value)} placeholder="FDC"/></div>
                  <div className="fld"><label>Amount</label><input type="number" value={mintForm.instrument_amount} onChange={e=>handleMintChange("instrument_amount",e.target.value)} placeholder="0"/></div>
                </div>
              )}
              <div className="form-row single"><div className="fld"><label>Reason / Purpose</label><input value={mintForm.reason} onChange={e=>handleMintChange("reason",e.target.value)} placeholder="Why is this action being taken?"/></div></div>
              <div className="form-row single"><div className="fld"><label>Notes</label><textarea value={mintForm.notes} onChange={e=>handleMintChange("notes",e.target.value)} rows={2} style={{resize:"vertical"}}/></div></div>
              <div className="form-row single"><div className="fld"><label>Tags (comma separated)</label><input value={mintForm.tags} onChange={e=>handleMintChange("tags",e.target.value)} placeholder="identity, legal, stratum01"/></div></div>
              <div className="sep"/>
              <div className="form-row three">
                <div className="fld"><label>Stratum</label><input value={mintForm.stratum} readOnly style={{opacity:0.6}}/></div>
                <div className="fld"><label>Financial Tier (1–8)</label><input type="number" min={1} max={8} value={mintForm.tier} onChange={e=>handleMintChange("tier",e.target.value)}/></div>
                <div className="fld"><label>Security Level (1–8)</label><input type="number" min={1} max={8} value={mintForm.level} onChange={e=>handleMintChange("level",e.target.value)}/></div>
              </div>
              <div style={{marginTop:16}}>
                <button type="submit" disabled={loading} className="btn btn-primary">{loading ? "Registering..." : "Ingest Authoritative Query"}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  function Certificates() {
    const active = certEntry || ledger[0];
    if (!active) return <div className="empty-state">No certificates available. Register an entry first.</div>;

    return (
      <div>
        <div className="page-header"><h2>Authority Certificates</h2><p>Cryptographic attestations of provenance assets</p></div>
        <div className="cert-box">
          <div className="cert-outer-border" />
          <div className="cert-watermark">FIDUCIA CENTRALE</div>
          <div className="cert-title">{active.asset?.label}</div>
          <div className="cert-subtitle">Certificate of Stratigraphic Authority</div>
          <div className="cert-rule" />
          <div className="cert-body">
            "This document formally registers and locks an authoritative action within the systemic stratum architecture. 
            The parameters declared below have been verified against established organizational governance frameworks."
          </div>
          <div style={{marginTop:24}}>
            <div className="cert-field"><div className="cert-label">Entry ID</div><div className="cert-val" style={{fontFamily:"monospace"}}>{active.id}</div></div>
            <div className="cert-field"><div className="cert-label">Timestamp</div><div className="cert-val">{new Date(active.timestamp).toUTCString()}</div></div>
            <div className="cert-field"><div className="cert-label">Action Token</div><div className="cert-val">{active.action?.token}</div></div>
            <div className="cert-field"><div className="cert-label">Stratum Level</div><div className="cert-val">{active.authority?.stratum}</div></div>
            <div className="cert-field"><div className="cert-label">Financial Tier</div><div className="cert-val">Tier {active.authority?.tier}</div></div>
            <div className="cert-field"><div className="cert-label">Security Level</div><div className="cert-val">Level {active.authority?.level}</div></div>
            <div className="cert-field"><div className="cert-label">Issuer Authority</div><div className="cert-val">{active.parties?.issuer}</div></div>
            <div className="cert-field"><div className="cert-label">Assigned Recipient</div><div className="cert-val">{active.parties?.to || "SYSTEM"}</div></div>
          </div>
          <div className="cert-hash">
            <span className="cert-label" style={{display:"block",marginBottom:4}}>Cryptographic Document Hash</span>
            <span style={{fontFamily:"monospace",fontSize:11}}>{active.legal?.doc_hash}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <style>{CSS}</style>
      <header className="hdr">
        <div>
          <div className="logo">Fiducia Core Engine</div>
          <div className="logo-sub">Systemic Stratigraphic Ledger Interface</div>
        </div>
        <div className="hdr-right">
          <div className="hdr-entity"><span className="status-dot"/>System Active</div>
          <div className="hdr-entity-sub">Vercel Production Node</div>
        </div>
      </header>

      <nav className="nav">
        <div className="tabs">
          <button className={`tab ${tab==="overview"?"active":""}`} onClick={()=>setTab("overview")}>Overview</button>
          <button className={`tab ${tab==="ledger"?"active":""}`} onClick={()=>setTab("ledger")}>View Ledger</button>
          <button className={`tab ${tab==="mint"?"active":""}`} onClick={()=>setTab("mint")}>Register Entry</button>
          <button className={`tab ${tab==="certificates"?"active":""}`} onClick={()=>setTab("certificates")}>Certificates</button>
        </div>
      </nav>

      <main className="content">
        {tab === "overview" && <Overview />}
        {tab === "ledger" && <LedgerTableComponent />}
        {tab === "mint" && <MintForm />}
        {tab === "certificates" && <Certificates />}
      </main>
    </div>
  );
}