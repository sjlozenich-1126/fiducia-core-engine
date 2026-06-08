import { useState, useEffect } from "react";

function hashSimulate(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
function generateId(prefix) { return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }
function timeSince(ts) {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return `${Math.floor(d/1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}
function truncHash(h) { if (!h) return "—"; return h.length > 16 ? h.slice(0,8)+"…"+h.slice(-4) : h; }

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
  "REGISTER_IDENTITY":       { label:"Register Identity",       stratum:"01-Inherent",       tier:8, level:8 },
  "REGISTER_INSTRUMENT":     { label:"Register Instrument",     stratum:"02-Constitutional", tier:8, level:4 },
  "MINT_FDC":                { label:"Mint FDC",                stratum:"07-Hereditary",     tier:8, level:4 },
  "TRANSFER_FDC":            { label:"Transfer FDC",            stratum:"04-Administrative", tier:3, level:3 },
  "REDEEM_FDC":              { label:"Redeem FDC",              stratum:"05-Certificatory",  tier:5, level:3 },
  "REGISTER_DOC":            { label:"Register Document",       stratum:"06-Provenance",     tier:3, level:4 },
  "ATTEST_DOC":              { label:"Attest Document",         stratum:"05-Certificatory",  tier:4, level:4 },
  "FILE_QUIET_TITLE":        { label:"File Quiet Title",        stratum:"08-Procedural",     tier:3, level:4 },
  "INITIATE_LEGAL":          { label:"Initiate Legal Proceeding",stratum:"08-Procedural",    tier:3, level:4 },
  "REGISTER_AUTHORITY_MODEL":{ label:"Register Authority Model",stratum:"02-Constitutional", tier:8, level:4 },
};

const INSTRUMENTS = ["currency","identity","credit","certificate","doc_provenance","legal_filing","legal_procedure","governance","monetary_instrument_definition","authority_framework"];

const LOCAL_KEY = "fc_ledger_v3";
function loadLocal() { try { const d=localStorage.getItem(LOCAL_KEY); return d?JSON.parse(d):[]; } catch{return[];} }
function saveLocal(e) { try{localStorage.setItem(LOCAL_KEY,JSON.stringify(e));}catch{} }

const DEMO = [
  { id:"STRATUM01-IDENTITY-SJL", timestamp:new Date(Date.now()-86400000*3).toISOString(), asset:{id:"SJL-ARCHAEOGENETIC",type:"identity_record",label:"Archaeogenetic Identity & Lineage Certification — SJL"}, action:{token:"REGISTER_IDENTITY",stratum:"01-Inherent",reason:"Establish inherent biological and ancestral identity."}, parties:{issuer:"Archaeogenetic Laboratory NG-25051",from:null,to:"Shane Jonathan Lozenich"}, instrument:{type:"identity",unit:null,amount:null}, legal:{jurisdiction:"BIOLOGICAL",forum:"NG-25051",upstream_refs:[],doc_hash:"bb1b36ad40b59127cf5f5c1245d453c4"}, authority:{stratum:"01-Inherent",tier:8,level:8}, policy:{gdr_index_delta:null}, metadata:{tags:["identity","lineage"],notes:"Dual-horizon archaeogenetic identity record.",version:"1.0"} },
  { id:"STRATUM02-AUTH-V1", timestamp:new Date(Date.now()-86400000*2).toISOString(), asset:{id:"AUTH-CONSTITUTION-V1",type:"authority_framework",label:"Unified Authority Constitution v1.0"}, action:{token:"REGISTER_AUTHORITY_MODEL",stratum:"02-Constitutional",reason:"Define unified authority framework."}, parties:{issuer:"Fiducia Centrale",from:null,to:null}, instrument:{type:"governance",unit:null,amount:null}, legal:{jurisdiction:"ON-CHAIN",forum:"Fiducia Centrale — Constitutional Chamber",upstream_refs:[],doc_hash:"AUTH-CONSTITUTION-HASH-V1"}, authority:{stratum:"02-Constitutional",tier:8,level:4}, policy:{gdr_index_delta:null}, metadata:{tags:["authority","constitution"],notes:"Unified authority framework.",version:"1.0"} },
  { id:"STRATUM02-FDC-V1", timestamp:new Date(Date.now()-86400000*1.5).toISOString(), asset:{id:"FDC-CONSTITUTION-V1",type:"monetary_instrument_definition",label:"Fiducial Credit (FDC) — Monetary Constitution v1.0"}, action:{token:"REGISTER_INSTRUMENT",stratum:"02-Constitutional",reason:"Establish FDC as hybrid institutional currency."}, parties:{issuer:"Fiducia Centrale — Constitutional Authority",from:null,to:null}, instrument:{type:"currency",unit:"FDC",amount:null}, legal:{jurisdiction:"ON-CHAIN",forum:"Fiducia Centrale",upstream_refs:[],doc_hash:"FDC-CONSTITUTION-HASH-V1"}, authority:{stratum:"02-Constitutional",tier:8,level:4}, policy:{gdr_index_delta:null}, metadata:{tags:["currency","FDC"],notes:"Hybrid currency backed by GDRI.",version:"1.0"} },
  { id:"STRATUM08-LEGAL-26-2-01443", timestamp:new Date(Date.now()-86400000).toISOString(), asset:{id:"QUIET-TITLE-SJL",type:"legal_claim",label:"Petition for Declaratory Judgment & Quiet Title — Seattle-Bremerton Majorat"}, action:{token:"INITIATE_LEGAL",stratum:"08-Procedural",reason:"Assert rights and challenge adverse claims."}, parties:{issuer:"Shane Jonathan Lozenich",from:"Shane Jonathan Lozenich",to:"King County Superior Court"}, instrument:{type:"legal_procedure",unit:null,amount:null}, legal:{jurisdiction:"WA-KING-COUNTY",forum:"King County Superior Court",upstream_refs:[],doc_hash:"PETITION-26-2-01443-4-SEA"}, authority:{stratum:"08-Procedural",tier:3,level:4}, policy:{gdr_index_delta:null}, metadata:{tags:["legal","quiet_title"],notes:"Pro se filing; accepted by King County Superior Court.",version:"1.0"} },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,500;1,8..60,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#f0ece4;color:#2a2218;font-family:'EB Garamond',Georgia,serif;}
.app{min-height:100vh;}

/* HEADER */
.hdr{background:#f7f4ee;border-bottom:2px solid #2a2218;padding:16px 32px;display:flex;align-items:flex-start;justify-content:space-between;position:sticky;top:0;z-index:100;}
.hdr-left{}
.logo{font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:500;color:#2a2218;letter-spacing:0.12em;text-transform:uppercase;}
.logo-sub{font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#7a6a55;margin-top:2px;font-family:'EB Garamond',serif;}
.hdr-right{text-align:right;}
.hdr-entity{font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#2a2218;}
.hdr-entity-sub{font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#7a6a55;margin-top:2px;}
.status-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#5a7a5a;margin-right:5px;vertical-align:middle;}

/* NAV TABS */
.tabs{display:flex;gap:0;border-bottom:2px solid #2a2218;margin:0 32px;}
.tab{padding:10px 20px;font-family:'EB Garamond',serif;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;border:none;background:transparent;color:#7a6a55;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.2s;}
.tab.active{color:#2a2218;border-bottom:3px solid #2a2218;font-weight:500;}
.tab:hover:not(.active){color:#2a2218;}

/* CONTENT */
.content{padding:28px 32px;max-width:1440px;margin:0 auto;}
.page-header{margin-bottom:24px;padding-bottom:14px;border-bottom:1px solid #c8bfaa;}
.page-header h2{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:400;font-style:italic;color:#2a2218;letter-spacing:0.02em;}
.page-header p{font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#7a6a55;margin-top:4px;}

/* GRIDS */
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px;}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px;}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px;}

/* CARDS */
.card{background:#f7f4ee;border:1px solid #c8bfaa;border-top:3px solid #2a2218;padding:18px 20px;}
.card-h{font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#7a6a55;margin-bottom:14px;font-family:'EB Garamond',serif;}
.card-rule{width:100%;height:1px;background:#c8bfaa;margin:14px 0;}

/* METRICS */
.metric-val{font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:500;color:#2a2218;line-height:1;}
.metric-sub{font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#7a6a55;margin-top:5px;}

/* BADGES */
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;font-family:'EB Garamond',serif;border:1px solid;}
.badge-green{background:#edf2ed;color:#3a5a3a;border-color:#a0b8a0;}
.badge-purple{background:#f0ecf7;color:#5a4a7a;border-color:#b8aad0;}
.badge-amber{background:#f7f0e2;color:#7a5a20;border-color:#c8a860;}
.badge-red{background:#f7edec;color:#7a3a3a;border-color:#c8a0a0;}
.badge-blue{background:#ecf0f7;color:#3a4a7a;border-color:#a0aed0;}

/* STRATUM BARS */
.strat-row{display:flex;align-items:center;gap:10px;margin-bottom:9px;}
.strat-label{font-size:11px;color:#5a4a35;width:140px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.04em;}
.strat-bar-bg{flex:1;height:5px;background:#e0d8cc;border-radius:0;}
.strat-bar{height:100%;transition:width 1s cubic-bezier(0.22,1,0.36,1);}
.strat-pct{font-size:11px;color:#7a6a55;width:24px;text-align:right;}

/* FEED */
.feed-item{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid #e0d8cc;}
.feed-item:last-child{border-bottom:none;}
.feed-action{font-size:13px;color:#2a2218;font-family:'EB Garamond',serif;}
.feed-hash{font-size:10px;color:#9a8a75;margin-top:1px;letter-spacing:0.06em;}
.feed-time{font-size:10px;color:#9a8a75;letter-spacing:0.06em;}
.feed-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}

/* SEPARATOR */
.sep{width:100%;height:1px;background:#c8bfaa;margin:18px 0;}

/* AUTHORITY CHIPS */
.auth-chip{font-size:9px;padding:2px 6px;letter-spacing:0.08em;text-transform:uppercase;border:1px solid;font-family:'EB Garamond',serif;}
.chip-s{background:#f0ecf7;color:#5a4a7a;border-color:#b8aad0;}
.chip-t{background:#edf2ed;color:#3a5a3a;border-color:#a0b8a0;}
.chip-l{background:#f7f0e2;color:#7a5a20;border-color:#c8a860;}
.authority-triple{display:flex;gap:5px;flex-wrap:wrap;}

/* FORMS */
.section-title{font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#7a6a55;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #c8bfaa;}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
.form-row.single{grid-template-columns:1fr;}
.form-row.three{grid-template-columns:1fr 1fr 1fr;}
.fld{display:flex;flex-direction:column;gap:5px;}
.fld label{font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#7a6a55;}
.fld input,.fld select,.fld textarea{background:#f0ece4;border:1px solid #c8bfaa;border-radius:0;color:#2a2218;font-family:'EB Garamond',serif;font-size:14px;padding:8px 10px;outline:none;transition:border-color 0.2s;}
.fld input:focus,.fld select:focus,.fld textarea:focus{border-color:#2a2218;}
.fld select option{background:#f7f4ee;}

/* BUTTONS */
.btn{padding:10px 22px;border:1px solid #2a2218;cursor:pointer;font-family:'EB Garamond',serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;background:transparent;color:#2a2218;transition:all 0.2s;}
.btn:hover{background:#2a2218;color:#f7f4ee;}
.btn-primary{background:#2a2218;color:#f7f4ee;}
.btn-primary:hover{background:#403525;border-color:#403525;}
.btn-secondary{border-color:#7a6a55;color:#7a6a55;}
.btn-secondary:hover{background:#7a6a55;color:#f7f4ee;}
.btn-sm{padding:6px 14px;font-size:11px;}

/* LEDGER TABLE */
.tbl-wrap{overflow-x:auto;margin-top:10px;}
.tbl{width:100%;border-collapse:collapse;font-family:'EB Garamond',serif;}
.tbl th{text-align:left;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#7a6a55;padding:12px 14px;border-bottom:2px solid #2a2218;font-weight:500;}
.tbl td{padding:14px 14px;font-size:14px;border-bottom:1px solid #c8bfaa;vertical-align:top;color:#2a2218;}
.tbl tr:hover td{background:rgba(247,244,238,0.5);}
.mono{font-family:monospace;font-size:12px;color:#555;}

/* CERTIFICATE DISPLAY */
.cert-card{background:#fcfaf6;border:2px dashed #c8bfaa;padding:32px;margin-top:16px;position:relative;}
.cert-watermark{position:absolute;top:50%;left:50%;transform:translate(-50----50%) rotate(-15deg);font-size:90px;font-family:'Cormorant Garamond',serif;color:rgba(42,34,24,0.03);text-transform:uppercase;letter-spacing:0.2em;pointer-events:none;white-space:nowrap;width:100%;text-align:center;}
.cert-title{font-family:'Cormorant Garamond',serif;font-size:26px;text-align:center;text-transform:uppercase;letter-spacing:0.15em;color:#2a2218;margin-bottom:4px;}
.cert-sub{font-size:11px;text-align:center;letter-spacing:0.25em;text-transform:uppercase;color:#7a6a55;margin-bottom:28px;}
.cert-meta{display:flex;justify-content:space-between;border-bottom:1px solid #c8bfaa;padding-bottom:8px;margin-bottom:20px;font-size:11px;letter-spacing:0.05em;color:#7a6a55;}
.cert-body{font-size:16px;line-height:1.6;text-align:justify;margin-bottom:32px;color:#2a2218;text-indent:24px;}
.cert-footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:4px;}
.cert-sig{border-top:1px solid #2a2218;width:200px;text-align:center;padding-top:6px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#7a6a55;}
`;

export default function ProvenanceLedgerApp() {
  const [tab, setTab] = useState("overview");
  const [ledger, setLedger] = useState([]);
  const [selectedCert, setSelectedCert] = useState(null);

  // Form states
  const [actionToken, setActionToken] = useState("REGISTER_IDENTITY");
  const [assetId, setAssetId] = useState("");
  const [assetType, setAssetType] = useState("identity_record");
  const [assetLabel, setAssetLabel] = useState("");
  const [reason, setReason] = useState("");
  const [issuer, setIssuer] = useState("Fiducia Centrale");
  const [partyFrom, setPartyFrom] = useState("");
  const [partyTo, setPartyTo] = useState("");
  const [instrumentType, setInstrumentType] = useState("identity");
  const [unit, setUnit] = useState("");
  const [amount, setAmount] = useState("");
  const [jurisdiction, setJurisdiction] = useState("GLOBAL");
  const [forum, setForum] = useState("Fiducia Centrale Registry");
  const [upstreamRefs, setUpstreamRefs] = useState("");
  const [docHash, setDocHash] = useState("");
  const [gdrDelta, setGdrDelta] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const local = loadLocal();
    if (local.length === 0) {
      setLedger(DEMO);
      saveLocal(DEMO);
    } else {
      setLedger(local);
    }
  }, []);

  // Sync token definitions to form variants on select update
  useEffect(() => {
    if (ACTION_TOKENS[actionToken]) {
      const spec = ACTION_TOKENS[actionToken];
      if (actionToken === "REGISTER_IDENTITY") {
        setAssetType("identity_record");
        setInstrumentType("identity");
      } else if (actionToken === "MINT_FDC" || actionToken === "TRANSFER_FDC" || actionToken === "REDEEM_FDC") {
        setAssetType("monetary_credit");
        setInstrumentType("currency");
        setUnit("FDC");
      } else if (actionToken === "INITIATE_LEGAL" || actionToken === "FILE_QUIET_TITLE") {
        setAssetType("legal_claim");
        setInstrumentType("legal_procedure");
      } else {
        setAssetType("document_record");
        setInstrumentType("doc_provenance");
      }
    }
  }, [actionToken]);

  const handleIngest = (e) => {
    e.preventDefault();
    if (!assetId || !assetLabel) {
      alert("Asset Core Identifier and Structural Title are required.");
      return;
    }

    const tokenSpec = ACTION_TOKENS[actionToken] || { stratum: "04-Administrative", tier: 3, level: 3 };
    const newEntry = {
      id: generateId(`STRATUM${tokenSpec.stratum.slice(0,2)}`),
      timestamp: new Date().toISOString(),
      asset: { id: assetId, type: assetType, label: assetLabel },
      action: { token: actionToken, stratum: tokenSpec.stratum, reason: reason },
      parties: { issuer: issuer, from: partyFrom || null, to: partyTo || null },
      instrument: { type: instrumentType, unit: unit || null, amount: amount ? parseFloat(amount) : null },
      legal: {
        jurisdiction: jurisdiction,
        forum: forum,
        upstream_refs: upstreamRefs ? upstreamRefs.split(",").map(s => s.trim()) : [],
        doc_hash: docHash || hashSimulate(assetId + Date.now())
      },
      authority: { stratum: tokenSpec.stratum, tier: tokenSpec.tier, level: tokenSpec.level },
      policy: { gdr_index_delta: gdrDelta ? parseFloat(gdrDelta) : null },
      metadata: {
        tags: tags ? tags.split(",").map(s => s.trim()) : [],
        notes: notes,
        version: "1.0"
      }
    };

    const updated = [newEntry, ...ledger];
    setLedger(updated);
    saveLocal(updated);

    // Reset simple values
    setAssetId("");
    setAssetLabel("");
    setReason("");
    setDocHash("");
    setAmount("");
    setGdrDelta("");
    setNotes("");
    setTags("");
  };

  const clearLedger = () => {
    if (window.confirm("Purge local configuration storage?")) {
      setLedger([]);
      saveLocal([]);
    }
  };

  const restoreDemo = () => {
    setLedger(DEMO);
    saveLocal(DEMO);
  };

  // Calculations for overview stats
  const totalEntries = ledger.length;
  const fdcMinted = ledger
    .filter(e => e.action?.token === "MINT_FDC" && e.instrument?.amount)
    .reduce((acc, curr) => acc + curr.instrument.amount, 0) + 100000000000000; // Baseline Strategic Reserve inclusion

  const uniqueAssets = new Set(ledger.map(e => e.asset?.id)).size;

  // Compute stratigraphic distribution percentages
  const strataCounts = STRATA.reduce((acc, s) => ({ ...acc, [s.code]: 0 }), {});
  ledger.forEach(e => {
    if (e.action?.stratum && strataCounts[e.action.stratum] !== undefined) {
      strataCounts[e.action.stratum]++;
    }
  });

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <header className="hdr">
          <div className="hdr-left">
            <div className="logo">Provenance Ledger</div>
            <div className="logo-sub">Stratum Authority Portal &amp; Systemic Ingestion Engine</div>
          </div>
          <div className="hdr-right">
            <div className="hdr-entity">Shane Jonathan Lozenich</div>
            <div className="hdr-entity-sub"><span className="status-dot"/>Fiducia Centrale / Central Trust Securities</div>
          </div>
        </header>
        
        <nav style={{background:"#f7f4ee",borderBottom:"2px solid #2a2218",padding:"0 32px"}}>
          <div style={{display:"flex",gap:0}}>
            {[
              {id:"overview",label:"Overview"},
              {id:"ledger",label:"Ledger S06"},
              {id:"mint",label:"Register S07"},
              {id:"certificates",label:"Certificates S05"}
            ].map(t => (
              <button key={t.id} className={`tab ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="content">
          {tab === "overview" && (
            <>
              <div className="page-header">
                <h2>Systemic Stratigraphic Profile</h2>
                <p>Real-time structural health and cryptographic validation matrix</p>
              </div>

              <div className="grid4">
                <div className="card">
                  <div className="card-h">Total Records Ingested</div>
                  <div className="metric-val">{totalEntries}</div>
                  <div className="metric-sub">Hashed Ledger Blocks</div>
                </div>
                <div className="card">
                  <div className="card-h">Fiducial Vault Valuation</div>
                  <div className="metric-val">{(fdcMinted / 1e12).toFixed(2)}T</div>
                  <div className="metric-sub">Aggregate FDC Liquidity Pool</div>
                </div>
                <div className="card">
                  <div className="card-h">Tracked Core Assets</div>
                  <div className="metric-val">{uniqueAssets}</div>
                  <div className="metric-sub">Distinct Tracked Entities</div>
                </div>
                <div className="card">
                  <div className="card-h">Sovereign Authority Standing</div>
                  <div className="metric-val" style={{color:"#5a7a5a"}}>ACTIVE</div>
                  <div className="metric-sub">Stratum 01 Validated</div>
                </div>
              </div>

              <div className="grid2">
                <div className="card">
                  <div className="card-h">Authority Stratum Weight Distribution</div>
                  <div style={{marginTop:12}}>
                    {STRATA.map(s => {
                      const count = strataCounts[s.code] || 0;
                      const pct = totalEntries > 0 ? (count / totalEntries) * 100 : 0;
                      return (
                        <div key={s.code} className="strat-row">
                          <div className="strat-label">{s.short} — {s.name}</div>
                          <div className="strat-bar-bg">
                            <div className="strat-bar" style={{backgroundColor:s.color, width:`${Math.max(pct, totalEntries > 0 ? 3 : 0)}%`}} />
                          </div>
                          <div className="strat-pct">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="card">
                  <div className="card-h">Recent Cryptographic Ledger Stream</div>
                  <div style={{marginTop:8}}>
                    {ledger.slice(0, 5).map(e => {
                      const st = STRATA.find(s => s.code === e.action?.stratum) || { color: "#7a6a55" };
                      return (
                        <div key={e.id} className="feed-item">
                          <div style={{display:"flex",alignItems:"center",gap:12}}>
                            <div className="feed-dot" style={{backgroundColor:st.color}} />
                            <div>
                              <div className="feed-action">{ACTION_TOKENS[e.action?.token]?.label || e.action?.token}</div>
                              <div className="feed-hash">{truncHash(e.legal?.doc_hash)} <span style={{color:"#c8bfaa"}}>|</span> {e.id}</div>
                            </div>
                          </div>
                          <div className="feed-time">{timeSince(e.timestamp)}</div>
                        </div>
                      );
                    })}
                    {ledger.length === 0 && <div style={{fontSize:14,color:"#7a6a55",fontStyle:"italic",textAlign:"center",padding:"20px 0"}}>No records currently present in session authority ledger.</div>}
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "ledger" && (
            <>
              <div className="page-header">
                <h2>Immutable Ledger History</h2>
                <p>Auditable historical sequence of stratigraphic registry events</p>
              </div>

              <div className="card" style={{padding:0}}>
                <div style={{padding:"14px 20px",borderBottom:"1px solid #c8bfaa",display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f7f4ee"}}>
                  <div className="card-h" style={{margin:0}}>Historical Sequence Blocks</div>
                  <div style={{display:"flex",gap:10}}>
                    <button className="btn btn-sm btn-secondary" onClick={restoreDemo}>Load Demo Context</button>
                    <button className="btn btn-sm btn-secondary" onClick={clearLedger}>Purge Data</button>
                  </div>
                </div>

                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Block ID / Timestamp</th>
                        <th>Stratum</th>
                        <th>Action / Core Entity</th>
                        <th>Parties Involved</th>
                        <th>Instrument Context</th>
                        <th>Verification Key / Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map(e => {
                        const sSpec = STRATA.find(s => s.code === e.action?.stratum) || { short: "S??", color: "#7a6a55", name: "Unknown" };
                        return (
                          <tr key={e.id}>
                            <td>
                              <div style={{fontWeight:600,fontSize:13}}>{e.id}</div>
                              <div style={{fontSize:11,color:"#7a6a55",marginTop:2}}>{new Date(e.timestamp).toLocaleString()}</div>
                            </td>
                            <td>
                              <span className="badge" style={{backgroundColor: `${sSpec.color}15`, color: sSpec.color, borderColor: sSpec.color}}>
                                {sSpec.short}
                              </span>
                            </td>
                            <td>
                              <div style={{fontWeight:500}}>{ACTION_TOKENS[e.action?.token]?.label || e.action?.token}</div>
                              <div style={{fontSize:12,color:"#5a4a35",marginTop:2,fontStyle:"italic"}}>{e.asset?.label}</div>
                              {e.action?.reason && <div style={{fontSize:11,color:"#7a6a55",marginTop:4}}>{e.action.reason}</div>}
                            </td>
                            <td>
                              <div style={{fontSize:12}}><strong>Issuer:</strong> {e.parties?.issuer || "—"}</div>
                              {e.parties?.from && <div style={{fontSize:11,color:"#7a6a55"}}><strong>From:</strong> {e.parties.from}</div>}
                              {e.parties?.to && <div style={{fontSize:11,color:"#7a6a55"}}><strong>To:</strong> {e.parties.to}</div>}
                            </td>
                            <td>
                              <div style={{textTransform: "uppercase", fontSize:11, letterSpacing:"0.05em", color:"#7a6a55"}}>{e.instrument?.type || "Non-Monetary"}</div>
                              {e.instrument?.amount && (
                                <div style={{fontWeight:600,fontSize:13,marginTop:2}}>
                                  {e.instrument.amount.toLocaleString()} {e.instrument.unit || ""}
                                </div>
                              )}
                              {e.policy?.gdr_index_delta && (
                                <div style={{fontSize:11,color:"#7a3a3a",marginTop:2}}>
                                  GDRI: {e.policy.gdr_index_delta}
                                </div>
                              )}
                            </td>
                            <td>
                              <div className="mono" title={e.legal?.doc_hash}>{truncHash(e.legal?.doc_hash)}</div>
                              <div style={{fontSize:10,color:"#7a6a55",marginTop:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>
                                {e.legal?.jurisdiction || "GLOBAL"} // {e.legal?.forum || "AUTHENTIC"}
                              </div>
                              <div className="authority-triple" style={{marginTop:6}}>
                                <span className="auth-chip chip-s">STR: {e.authority?.stratum?.slice(0,2)}</span>
                                <span className="auth-chip chip-t">TIER: {e.authority?.tier}</span>
                                <span className="auth-chip chip-l">LVL: {e.authority?.level}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {ledger.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{textAlign:"center",padding:"40px 0",color:"#7a6a55",fontStyle:"italic"}}>
                            No historical sequence blocks tracked. Ingest data via the registration portal or load default demo contexts.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {tab === "mint" && (
            <>
              <div className="page-header">
                <h2>Systemic Ingestion Engine</h2>
                <p>Register procedural documents, execute financial declarations, and formalize jurisdictional authority claims</p>
              </div>

              <div className="grid2">
                <div className="card">
                  <div className="card-h">Ingestion Specifications Formulation</div>
                  <form onSubmit={handleIngest} style={{marginTop:12}}>
                    <div className="form-row">
                      <div className="fld">
                        <label>Operational Action Token</label>
                        <select value={actionToken} onChange={(e) => setActionToken(e.target.value)}>
                          {Object.keys(ACTION_TOKENS).map(k => (
                            <option key={k} value={k}>{ACTION_TOKENS[k].label} ({STRATA.find(s=>s.code===ACTION_TOKENS[k].stratum)?.short})</option>
                          ))}
                        </select>
                      </div>
                      <div className="fld">
                        <label>Asset Classification Type</label>
                        <select value={assetType} onChange={(e) => setAssetType(e.target.value)}>
                          <option value="identity_record">Identity Record (DNA / Lineage)</option>
                          <option value="authority_framework">Authority Framework Constitution</option>
                          <option value="monetary_instrument_definition">Monetary Instrument Charter</option>
                          <option value="monetary_credit">Monetary FDC Credit Block</option>
                          <option value="legal_claim">Legal Declaratory Claim</option>
                          <option value="document_record">Documentary Record</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="fld">
                        <label>Asset Core Identifier</label>
                        <input type="text" value={assetId} onChange={(e)=>setAssetId(e.target.value)} placeholder="e.g. SJL-DNA-NG-25051" />
                      </div>
                      <div className="fld">
                        <label>Structural Title / Label</label>
                        <input type="text" value={assetLabel} onChange={(e)=>setAssetLabel(e.target.value)} placeholder="e.g. Archaeogenetic DNA Certification Profile" />
                      </div>
                    </div>

                    <div className="form-row single">
                      <div className="fld">
                        <label>Contextual Declarative Intent / Subtext</label>
                        <textarea rows="2" value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="Provide functional intent or operational rationale for tracking this block entry..." />
                      </div>
                    </div>

                    <div className="section-title" style={{marginTop:18}}>Structural Parties Profile</div>
                    <div className="form-row three">
                      <div className="fld">
                        <label>Issuing Institution</label>
                        <input type="text" value={issuer} onChange={(e)=>setIssuer(e.target.value)} />
                      </div>
                      <div className="fld">
                        <label>Originator Party (From)</label>
                        <input type="text" value={partyFrom} onChange={(e)=>setPartyFrom(e.target.value)} placeholder="Optional" />
                      </div>
                      <div className="fld">
                        <label>Recipient Party (To)</label>
                        <input type="text" value={partyTo} onChange={(e)=>setPartyTo(e.target.value)} placeholder="Optional" />
                      </div>
                    </div>

                    <div className="section-title" style={{marginTop:18}}>Fiduciary & Instrument Context</div>
                    <div className="form-row three">
                      <div className="fld">
                        <label>Instrument Type</label>
                        <select value={instrumentType} onChange={(e)=>setInstrumentType(e.target.value)}>
                          {INSTRUMENTS.map(i => (
                            <option key={i} value={i}>{i.replace("_"," ")}</option>
                          ))}
                        </select>
                      </div>
                      <div className="fld">
                        <label>Unit Label</label>
                        <input type="text" value={unit} onChange={(e)=>setUnit(e.target.value)} placeholder="e.g. FDC, USD, SEC" />
                      </div>
                      <div className="fld">
                        <label>Quantitative Value</label>
                        <input type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} placeholder="e.g. 50000" />
                      </div>
                    </div>

                    <div className="form-row single">
                      <div className="fld">
                        <label>Global Debt Reduction Index Delta (GDRI)</label>
                        <input type="number" step="0.000001" value={gdrDelta} onChange={(e)=>setGdrDelta(e.target.value)} placeholder="e.g. -0.012543 (Negative metrics reduce liability pools)" />
                      </div>
                    </div>

                    <div className="section-title" style={{marginTop:18}}>Jurisdictional Allocation & Security</div>
                    <div className="form-row three">
                      <div className="fld">
                        <label>Legal Jurisdiction</label>
                        <input type="text" value={jurisdiction} onChange={(e)=>setJurisdiction(e.target.value)} />
                      </div>
                      <div className="fld">
                        <label>Target Forum / Court</label>
                        <input type="text" value={forum} onChange={(e)=>setForum(e.target.value)} />
                      </div>
                      <div className="fld">
                        <label>Source Hash / Vault Reference</label>
                        <input type="text" value={docHash} onChange={(e)=>setDocHash(e.target.value)} placeholder="Auto-computed SHA-256 hash if empty" />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="fld">
                        <label>Meta Indexes / Tags</label>
                        <input type="text" value={tags} onChange={(e)=>setTags(e.target.value)} placeholder="comma, separated, list" />
                      </div>
                      <div className="fld">
                        <label>Internal Technical Annotations</label>
                        <input type="text" value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Operational comments" />
                      </div>
                    </div>

                    <div style={{marginTop:20,textAlign:"right"}}>
                      <button type="submit" className="btn btn-primary">Commit To Ledger Sequence</button>
                    </div>
                  </form>
                </div>

                <div className="card">
                  <div className="card-h">Functional Ingestion Mapping Architecture</div>
                  <div style={{fontSize:14,lineHeight:"1.6",color:"#2a2218"}}>
                    <p style={{marginBottom:12}}>The registration portal acts as an ingestion bridge transforming manual constitutional declarations and institutional legal files into system-compatible cryptographic assets.</p>
                    <p style={{marginBottom:12}}>Each submitted transaction auto-assigns its specific validation hierarchy from the architectural <strong>8×8×8 Stratigraphic Ledger Framework</strong>. Higher authority indices (such as Stratum 01 and 02) assert analytic superiority over traditional corporate administrative platforms.</p>
                    <div className="card-rule" />
                    <div style={{background:"rgba(42,34,24,0.03)",padding:14,borderLeft:"2px solid #2a2218"}}>
                      <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",color:"#7a6a55",marginBottom:4}}>Active Structural Mapping Metrics</div>
                      <div style={{fontSize:13,fontFamily:"monospace",display:"grid",gridTemplateColumns:"120px 1fr",gap:"6px 12px",marginTop:8}}>
                        <span>Target Stratum:</span><strong>{ACTION_TOKENS[actionToken]?.stratum || "—"}</strong>
                        <span>Authority Tier:</span><strong>{ACTION_TOKENS[actionToken]?.tier || "—"} / 8</strong>
                        <span>Security Level:</span><strong>{ACTION_TOKENS[actionToken]?.level || "—"} / 8</strong>
                        <span>Asset Footprint:</span><span>{assetId ? hashSimulate(assetId).toUpperCase() : "AWAITING_INPUT"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "certificates" && (
            <>
              <div className="page-header">
                <h2>Certificatory Attestation Ledger</h2>
                <p>Generate authentic, standalone typographic certificates from verified stratigraphic entries</p>
              </div>

              <div className="grid3">
                <div className="card" style={{gridColumn:"span 1"}}>
                  <div className="card-h">Select Verified Base Document</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
                    {ledger.map(e => (
                      <button
                        key={e.id}
                        className="btn btn-sm"
                        style={{
                          textAlign:"left",
                          justifyContent:"flex-start",
                          background: selectedCert?.id === e.id ? "#2a2218" : "transparent",
                          color: selectedCert?.id === e.id ? "#f7f4ee" : "#2a2218",
                          border: "1px solid #c8bfaa",
                          whiteSpace:"nowrap",
                          overflow:"hidden",
                          textOverflow:"ellipsis",
                          display:"block"
                        }}
                        onClick={() => setSelectedCert(e)}
                      >
                        [{e.id.split("-")[0].replace("STRATUM","S")}] {e.asset?.label}
                      </button>
                    ))}
                    {ledger.length === 0 && <div style={{fontSize:13,fontStyle:"italic",color:"#7a6a55"}}>No blocks present to format.</div>}
                  </div>
                </div>

                <div style={{gridColumn:"span 2"}}>
                  {selectedCert ? (
                    <div>
                      <div className="cert-card">
                        <div className="cert-watermark">FIDUCIA CENTRALE</div>
                        <div className="cert-title">Certificate of Stratigraphic Record</div>
                        <div className="cert-sub">Formal Authentication / Stratum {selectedCert.authority?.stratum?.slice(0,2) || "06"} Verification</div>
                        
                        <div className="cert-meta">
                          <div>RECORD ID: {selectedCert.id}</div>
                          <div>TIMESTAMP: {new Date(selectedCert.timestamp).toUTCString()}</div>
                        </div>

                        <div className="cert-body">
                          Be it observed and eternally recorded within the cryptographic memory substrate of this institution that on this date, full operational ingestion has been executed for the asset entitled <strong>{selectedCert.asset?.label}</strong> (Core Key Reference Identifier: <em>{selectedCert.asset?.id}</em>). This administrative action has been certified under the jurisdiction of <strong>{selectedCert.legal?.jurisdiction || "GLOBAL"}</strong> within the formal procedural structure of the <strong>{selectedCert.legal?.forum || "Sovereign Portal"}</strong>.
                        </div>
                        <div className="cert-body" style={{marginTop:-16}}>
                          The human operator holding native entitlement to this biological and administrative framework, <strong>Shane Jonathan Lozenich</strong>, possesses inherent authority sitting analytically above traditional court and debt liability portals. The verification validation hash for this structural entry is recorded as <code>{selectedCert.legal?.doc_hash}</code>, establishing permanent chain-of-title provenance across all subsequent higher-strata claims.
                        </div>

                        <div className="cert-footer">
                          <div style={{fontSize:11,color:"#7a6a55"}}>
                            <div>AUTHENTIC KEY SYSTEM MATRIX</div>
                            <div className="mono" style={{fontSize:10,marginTop:2}}>TIER {selectedCert.authority?.tier || 3} // LEVEL {selectedCert.authority?.level || 4} // SECURED</div>
                          </div>
                          <div className="cert-sig">
                            Sovereign Monetary Authority
                            <div style={{fontFamily:"'Cormorant Garamond'",fontSize:10,textTransform:"none",fontStyle:"italic",color:"#2a2218",marginTop:4}}>Fiducia Centrale Secure Cryptographic Node</div>
                          </div>
                        </div>
                      </div>
                      <div style={{marginTop:16,textAlign:"right",display:"flex",justifyContent:"flex-end",gap:10}}>
                        <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>Print</button>
                      </div>
                    </div>
                  ) : (
                    <div className="card" style={{textAlign:"center",padding:"60px 20px",color:"#7a6a55",fontStyle:"italic"}}>
                      Select an active stratigraphic entry from the left-hand directory column matrix to assemble and render its corresponding formal certificate document.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}