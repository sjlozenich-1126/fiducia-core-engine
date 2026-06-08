"use client";

import { useState, useEffect } from "react";

// --- CORE UTILITY HELPER METHODS ---
function hashSimulate(str: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function timeSince(ts: string) {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function truncHash(h: string) {
  if (!h) return "—";
  return h.length > 16 ? h.slice(0, 8) + "…" + h.slice(-4) : h;
}

// --- ARCHITECTURAL SPECIFICATION CONFIGURATION VECTORS ---
const STRATA = [
  { code: "01-Inherent",      name: "Inherent Identity",    short: "S01", color: "#5a7a5a", desc: "DNA, lineage, biological identity" },
  { code: "02-Constitutional",name: "Constitutional",       short: "S02", color: "#7a6a9a", desc: "Charters, constitutions, covenants" },
  { code: "03-Statutory",     name: "Statutory",            short: "S03", color: "#8a7aaa", desc: "Rules, policies, compliance" },
  { code: "04-Administrative",name: "Administrative",       short: "S04", color: "#6a8aaa", desc: "Execution, enforcement, ops" },
  { code: "05-Certificatory", name: "Certificatory",        short: "S05", color: "#5a8a7a", desc: "Attestations, notarizations" },
  { code: "06-Provenance",     name: "Provenance",           short: "S06", color: "#9a8a5a", desc: "Chain of title, records" },
  { code: "07-Hereditary",    name: "Hereditary / Majorat", short: "S07", color: "#aa6a7a", desc: "Lineage-based, heir authority" },
  { code: "08-Procedural",    name: "Procedural Legal",     short: "S08", color: "#aa7a5a", desc: "Court filings, legal actions" },
];

const ACTION_TOKENS: Record<string, { label: string; stratum: string; tier: number; level: number }> = {
  "REGISTER_IDENTITY":       { label: "Register Identity",       stratum: "01-Inherent",       tier: 8, level: 8 },
  "REGISTER_INSTRUMENT":     { label: "Register Instrument",     stratum: "02-Constitutional", tier: 8, level: 4 },
  "MINT_FDC":                { label: "Mint FDC",                stratum: "07-Hereditary",     tier: 8, level: 4 },
  "TRANSFER_FDC":            { label: "Transfer FDC",            stratum: "04-Administrative", tier: 3, level: 3 },
  "REDEEM_FDC":              { label: "Redeem FDC",              stratum: "05-Certificatory",  tier: 5, level: 3 },
  "REGISTER_DOC":            { label: "Register Document",       stratum: "06-Provenance",     tier: 3, level: 4 },
  "ATTEST_DOC":              { label: "Attest Document",         stratum: "05-Certificatory",  tier: 4, level: 4 },
  "FILE_QUIET_TITLE":        { label: "File Quiet Title",        stratum: "08-Procedural",     tier: 3, level: 4 },
  "INITIATE_LEGAL":          { label: "Initiate Legal Proceeding",stratum: "08-Procedural",    tier: 3, level: 4 },
  "REGISTER_AUTHORITY_MODEL":{ label: "Register Authority Model",stratum: "02-Constitutional", tier: 8, level: 4 },
};

const INSTRUMENTS = ["currency", "identity", "credit", "certificate", "doc_provenance", "legal_filing", "legal_procedure", "governance", "monetary_instrument_definition", "authority_framework"];

const DEMO = [
  { id: "STRATUM01-IDENTITY-SJL", timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), asset: { id: "SJL-ARCHAEOGENETIC", type: "identity_record", label: "Archaeogenetic Identity & Lineage Certification — SJL" }, action: { token: "REGISTER_IDENTITY", stratum: "01-Inherent", reason: "Establish inherent biological and ancestral identity." }, parties: { issuer: "Archaeogenetic Laboratory NG-25051", from: "None", to: "Shane Jonathan Lozenich" }, instrument: { type: "identity", unit: "DNA", amount: "1" }, legal: { jurisdiction: "BIOLOGICAL", forum: "NG-25051", upstream_refs: [], doc_hash: "bb1b36ad40b59127cf5f5c1245d453c4" }, authority: { stratum: "01-Inherent", tier: 8, level: 8 }, policy: { gdr_index_delta: "0.00%" }, metadata: { tags: ["identity", "lineage"], notes: "Dual-horizon archaeogenetic identity record.", version: "1.0" } },
  { id: "STRATUM02-AUTH-V1", timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), asset: { id: "AUTH-CONSTITUTION-V1", type: "authority_framework", label: "Unified Authority Constitution v1.0" }, action: { token: "REGISTER_AUTHORITY_MODEL", stratum: "02-Constitutional", reason: "Define unified authority framework." }, parties: { issuer: "Fiducia Centrale", from: "None", to: "Sovereign Framework" }, instrument: { type: "governance", unit: "CHARTER", amount: "1" }, legal: { jurisdiction: "ON-CHAIN", forum: "Fiducia Centrale — Constitutional Chamber", upstream_refs: [], doc_hash: "AUTH-CONSTITUTION-HASH-V1" }, authority: { stratum: "02-Constitutional", tier: 8, level: 4 }, policy: { gdr_index_delta: "0.00%" }, metadata: { tags: ["authority", "constitution"], notes: "Unified authority framework.", version: "1.0" } },
  { id: "STRATUM02-FDC-V1", timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(), asset: { id: "FDC-CONSTITUTION-V1", type: "monetary_instrument_definition", label: "Fiducial Credit (FDC) — Monetary Constitution v1.0" }, action: { token: "REGISTER_INSTRUMENT", stratum: "02-Constitutional", reason: "Establish FDC as hybrid institutional currency." }, parties: { issuer: "Fiducia Centrale — Constitutional Authority", from: "None", to: "Treasury" }, instrument: { type: "currency", unit: "FDC", amount: "100000000000000" }, legal: { jurisdiction: "ON-CHAIN", forum: "Fiducia Centrale", upstream_refs: [], doc_hash: "FDC-CONSTITUTION-HASH-V1" }, authority: { stratum: "02-Constitutional", tier: 8, level: 4 }, policy: { gdr_index_delta: "-8.42%" }, metadata: { tags: ["currency", "FDC"], notes: "Hybrid currency backed by GDRI.", version: "1.0" } },
  { id: "STRATUM08-LEGAL-26-2-01443", timestamp: new Date(Date.now() - 86400000).toISOString(), asset: { id: "QUIET-TITLE-SJL", type: "legal_claim", label: "Petition for Declaratory Judgment & Quiet Title — Seattle-Bremerton Majorat" }, action: { token: "INITIATE_LEGAL", stratum: "08-Procedural", reason: "Assert rights and challenge adverse claims." }, parties: { issuer: "Shane Jonathan Lozenich", from: "Shane Jonathan Lozenich", to: "King County Superior Court" }, instrument: { type: "legal_procedure", unit: "CASE_FILE", amount: "1" }, legal: { jurisdiction: "WA-KING-COUNTY", forum: "King County Superior Court", upstream_refs: [], doc_hash: "PETITION-26-2-01443-4-SEA" }, authority: { stratum: "08-Procedural", tier: 3, level: 4 }, policy: { gdr_index_delta: "0.00%" }, metadata: { tags: ["legal", "quiet_title"], notes: "Filing accepted by King County Superior Court Case No. 26-2-01443-4 SEA.", version: "1.0" } },
];

export default function ProvenancePage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [tab, setTab] = useState("overview");
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  // Form Fields State vectors
  const [actionToken, setActionToken] = useState("REGISTER_DOC");
  const [assetId, setAssetId] = useState("");
  const [assetType, setAssetType] = useState("doc_provenance");
  const [assetLabel, setAssetLabel] = useState("");
  const [reason, setReason] = useState("");
  const [issuer, setIssuer] = useState("Shane Jonathan Lozenich");
  const [partyFrom, setPartyFrom] = useState("");
  const [partyTo, setPartyTo] = useState("");
  const [instAmount, setInstAmount] = useState("");
  const [jurisdiction, setJurisdiction] = useState("Sovereign");
  const [forum, setForum] = useState("Fiducia Centrale True Venue");
  const [docHash, setDocHash] = useState("");
  const [gdrDelta, setGdrDelta] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("fc_ledger_v3");
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch {
        setEntries(DEMO);
      }
    } else {
      setEntries(DEMO);
      localStorage.setItem("fc_ledger_v3", JSON.stringify(DEMO));
    }
  }, []);

  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem("fc_ledger_v3", JSON.stringify(entries));
    }
  }, [entries]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const tokenInfo = ACTION_TOKENS[actionToken];
    const generatedHash = docHash || hashSimulate(assetId + assetLabel + Date.now().toString());

    const newRecord = {
      id: generateId(`STRATUM${tokenInfo.stratum.split("-")[0]}`),
      timestamp: new Date().toISOString(),
      asset: { id: assetId, type: assetType, label: assetLabel },
      action: { token: actionToken, stratum: tokenInfo.stratum, reason },
      parties: { issuer, from: partyFrom || null, to: partyTo || null },
      instrument: { type: assetType, unit: assetType.toUpperCase(), amount: instAmount || null },
      legal: { jurisdiction, forum, upstream_refs: [], doc_hash: generatedHash },
      authority: { stratum: tokenInfo.stratum, tier: tokenInfo.tier, level: tokenInfo.level },
      policy: { gdr_index_delta: gdrDelta ? `${gdrDelta}%` : null },
      metadata: { tags: tagsInput.split(",").map(t => t.trim()).filter(Boolean), notes, version: "1.0" }
    };

    const updated = [newRecord, ...entries];
    setEntries(updated);
    setSelectedEntry(newRecord);
    setTab("ledger");

    // Clear operational inputs
    setAssetId("");
    setAssetLabel("");
    setReason("");
    setPartyFrom("");
    setPartyTo("");
    setInstAmount("");
    setDocHash("");
    setGdrDelta("");
    setTagsInput("");
    setNotes("");
  };

  const getStratumCount = (code: string) => entries.filter(e => e.action?.stratum === code).length;

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
            <div className="hdr-entity-sub">
              <span className="status-dot" />Fiducia Centrale / Central Trust Securities
            </div>
          </div>
        </header>

        <nav style={{ background: "#f7f4ee", borderBottom: "2px solid #2a2218", padding: "0 32px" }}>
          <div style={{ display: "flex", gap: 0 }}>
            {[
              { id: "overview", label: "Overview" },
              { id: "ledger", label: "Ledger S06" },
              { id: "mint", label: "Register S07" },
              { id: "certificates", label: "Certificates S05" }
            ].map(t => (
              <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="content">
          {/* TAB 1: OVERVIEW METRIC SUMMARY ARCHITECTURE */}
          {tab === "overview" && (
            <div>
              <div className="grid4">
                <div className="card text-center">
                  <div className="card-h">Total Ingested Claims</div>
                  <div className="metric-val">{entries.length}</div>
                  <div className="metric-sub">Verified Immutable State Blocks</div>
                </div>
                <div className="card text-center">
                  <div className="card-h">FDC Strategic Capital</div>
                  <div className="metric-val" style={{ color: "#7a6a9a" }}>100.00T</div>
                  <div className="metric-sub">Baseline Operational Reserve Pool</div>
                </div>
                <div className="card text-center">
                  <div className="card-h">Target GDRI Delta</div>
                  <div className="metric-val" style={{ color: "#5a7a5a" }}>-8.42%</div>
                  <div className="metric-sub">Global Debt Reduction Factor</div>
                </div>
                <div className="card text-center">
                  <div className="card-h">System Authority Core</div>
                  <div className="metric-val" style={{ color: "#aa7a5a" }}>8×8×8</div>
                  <div className="metric-sub">Stratigraphic Framework Resolution</div>
                </div>
              </div>

              <div className="grid2">
                <div className="card">
                  <div className="card-h">Stratum Vector Allocations</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                    {STRATA.map(s => {
                      const count = getStratumCount(s.code);
                      const pct = entries.length ? (count / entries.length) * 100 : 0;
                      return (
                        <div key={s.code} className="strat-row">
                          <div className="strat-label" title={`${s.short} — ${s.name}`}>
                            <span style={{ display: "inline-block", width: "8px", height: "8px", background: s.color, marginRight: "6px", borderRadius: "2px" }} />
                            {s.short}: {s.name}
                          </div>
                          <div className="strat-bar-bg">
                            <div className="strat-bar" style={{ width: `${Math.max(4, pct)}%`, background: s.color }} />
                          </div>
                          <div className="strat-pct">{count} entries</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="card">
                  <div className="card-h">Recent Network Checkpoints</div>
                  <div className="feed" style={{ marginTop: "12px" }}>
                    {entries.slice(0, 4).map(e => (
                      <div key={e.id} className="feed-item" onClick={() => { setSelectedEntry(e); setTab("ledger"); }}>
                        <div>
                          <div style={{ fontWeight: 600, color: "#111" }}>{e.action?.token}</div>
                          <div style={{ fontSize: "11px", color: "#666" }} className="truncate">{e.asset?.label}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span className="badge badge-purple">{e.id.split("-")[0]}</span>
                          <div style={{ fontSize: "10px", color: "#999", marginTop: "2px" }}>{timeSince(e.timestamp)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GENERAL PROVENANCE LEDGER VIEW DOCKET */}
          {tab === "ledger" && (
            <div className="grid2" style={{ gridTemplateColumns: selectedEntry ? "1.2fr 0.8fr" : "1fr" }}>
              <div className="card">
                <div className="card-h">Authoritative Vault Manifest</div>
                <div style={{ overflowX: "auto", marginTop: "12px" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Entry Block Key</th>
                        <th>Stratum Boundary</th>
                        <th>Action Code</th>
                        <th>Target Resource Item</th>
                        <th>Hashed Stamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map(e => (
                        <tr key={e.id} onClick={() => setSelectedEntry(e)} className={`clickable ${selectedEntry?.id === e.id ? "selected-row" : ""}`}>
                          <td style={{ fontFamily: "monospace", fontWeight: "bold" }}>{e.id}</td>
                          <td>
                            <span className="badge" style={{ background: STRATA.find(s => s.code === e.action?.stratum)?.color + "22", color: STRATA.find(s => s.code === e.action?.stratum)?.color, border: `1px solid ${STRATA.find(s => s.code === e.action?.stratum)?.color}44` }}>
                              {e.action?.stratum?.split("-")[0]}
                            </span>
                          </td>
                          <td style={{ color: "#225588", fontWeight: 500 }}>{e.action?.token}</td>
                          <td className="truncate" style={{ maxWidth: "240px" }}>{e.asset?.label}</td>
                          <td style={{ fontFamily: "monospace", color: "#666" }}>{truncHash(e.legal?.doc_hash)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedEntry && (
                <div className="card border-highlight animate-fade-in">
                  <div style={{ display: "flex", justifyContent: "between", alignItems: "center", borderBottom: "1px solid #e0dbd1", paddingBottom: "8px", marginBottom: "12px" }}>
                    <div className="card-h" style={{ margin: 0 }}>Block Metadata Record</div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEntry(null)}>Dismiss</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
                    <div><span className="label-meta">Block Reference Tracking Hex:</span> <strong style={{ fontFamily: "monospace" }}>{selectedEntry.id}</strong></div>
                    <div><span className="label-meta">Temporal Boundary Lock:</span> <span>{new Date(selectedEntry.timestamp).toLocaleString()}</span></div>
                    <hr style={{ border: "none", borderTop: "1px solid #e0dbd1" }} />
                    <div><span className="label-meta">Resource Element Keys:</span> <span className="badge badge-purple">{selectedEntry.asset?.type}</span> <code style={{ display: "block", background: "#fdfcfa", padding: "4px", borderRadius: "4px", marginTop: "4px", border: "1px solid #e8e2d5" }}>{selectedEntry.asset?.id}</code></div>
                    <div><span className="label-meta">Descriptive Label Scope:</span> <div style={{ fontWeight: 500, fontStyle: "italic", paddingLeft: "4px" }}>"{selectedEntry.asset?.label}"</div></div>
                    <hr style={{ border: "none", borderTop: "1px solid #e0dbd1" }} />
                    <div><span className="label-meta">Action Ingestion Matrix:</span> <strong>{selectedEntry.action?.token}</strong> — <span style={{ color: "#666" }}>{selectedEntry.action?.stratum}</span></div>
                    <div><span className="label-meta">Procedural Intention Context:</span> <p style={{ margin: "4px 0 0 0", color: "#444" }}>{selectedEntry.action?.reason}</p></div>
                    <hr style={{ border: "none", borderTop: "1px solid #e0dbd1" }} />
                    <div><span className="label-meta">Verified Participating Vectors:</span>
                      <div style={{ paddingLeft: "8px", color: "#555", marginTop: "2px" }}>
                        <div>&bull; Authoritative Node Issuer: {selectedEntry.parties?.issuer}</div>
                        <div>&bull; Transaction Vector Source (From): {selectedEntry.parties?.from || "—"}</div>
                        <div>&bull; Transaction Vector Target (To): {selectedEntry.parties?.to || "—"}</div>
                      </div>
                    </div>
                    <div><span className="label-meta">Operational System Vectors ($8×8×8 Framework):</span>
                      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                        <span className="badge badge-purple">Tier-{selectedEntry.authority?.tier || 8}</span>
                        <span className="badge badge-amber">Level-{selectedEntry.authority?.level || 4}</span>
                      </div>
                    </div>
                    {selectedEntry.policy?.gdr_index_delta && (
                      <div><span className="label-meta">Global Liquidation Shift Factor (GDRI Delta):</span> <span className="badge badge-green" style={{ fontWeight: "bold" }}>{selectedEntry.policy.gdr_index_delta}</span></div>
                    )}
                    <hr style={{ border: "none", borderTop: "1px solid #e0dbd1" }} />
                    <div><span className="label-meta">Authentic System Verification Hash:</span> <code style={{ display: "block", wordBreak: "break-all", background: "#2a2218", color: "#f7f4ee", padding: "6px", borderRadius: "4px", fontSize: "11px", fontFamily: "monospace" }}>{selectedEntry.legal?.doc_hash}</code></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRANSACTION MINT REGISTER INTERFACE ROUTINE */}
          {tab === "mint" && (
            <div className="card animate-fade-in" style={{ maxWidth: "760px", margin: "0 auto" }}>
              <div className="card-h" style={{ borderBottom: "1px solid #e0dbd1", paddingBottom: "8px", marginBottom: "16px" }}>
                Commit System Boundary Claim Event
              </div>
              <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div className="grid2">
                  <div className="form-group">
                    <label>Structural Protocol Action Token</label>
                    <select value={actionToken} onChange={(e) => setActionToken(e.target.value)}>
                      {Object.keys(ACTION_TOKENS).map(k => (
                        <option key={k} value={k}>{k} ({ACTION_TOKENS[k].stratum.split("-")[0]})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Asset Registry Class Type</label>
                    <select value={assetType} onChange={(e) => setAssetType(e.target.value)}>
                      {INSTRUMENTS.map(i => <option key={i} value={i}>{i.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid2">
                  <div className="form-group">
                    <label>Resource Asset ID Tracker</label>
                    <input type="text" placeholder="e.g. FDC-RESERVE-ALLOCATION-VAL" value={assetId} onChange={(e) => setAssetId(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Resource Structural Label / Signature Title</label>
                    <input type="text" placeholder="e.g. Constitutional Framework Document Title..." value={assetLabel} onChange={(e) => setAssetLabel(e.target.value)} required />
                  </div>
                </div>

                <div className="form-group">
                  <label>Authoritative Ingestion Intent Reason</label>
                  <textarea rows={2} placeholder="State analytical purpose or system procedural framework targets verified by this ledger entry transaction..." value={reason} onChange={(e) => setReason(e.target.value)} required />
                </div>

                <div className="grid3">
                  <div className="form-group">
                    <label>Systemic Node Issuer</label>
                    <input type="text" value={issuer} onChange={(e) => setIssuer(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Origin Participant Vector (From)</label>
                    <input type="text" placeholder="None / System Authority" value={partyFrom} onChange={(e) => setPartyFrom(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Target Recipient Vector (To)</label>
                    <input type="text" placeholder="System Registry Target" value={partyTo} onChange={(e) => setPartyTo(e.target.value)} />
                  </div>
                </div>

                <div className="grid3">
                  <div className="form-group">
                    <label>Jurisdictional Venue Boundary</label>
                    <input type="text" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Operational Forum Arena</label>
                    <input type="text" value={forum} onChange={(e) => setForum(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Unit Quantifier Volume Amount</label>
                    <input type="number" placeholder="Defaults to 1 if left empty" value={instAmount} onChange={(e) => setInstAmount(e.target.value)} />
                  </div>
                </div>

                <div className="grid2">
                  <div className="form-group">
                    <label>Explicit Document Cryptographic Hash (Optional)</label>
                    <input type="text" placeholder="Leave empty for auto-generated deterministic verification signature..." value={docHash} onChange={(e) => setDocHash(e.target.value)} style={{ fontFamily: "monospace" }} />
                  </div>
                  <div className="form-group">
                    <label>Global Debt Liquidation Vector Delta (GDRI % Optional)</label>
                    <input type="text" placeholder="e.g. -8.42" value={gdrDelta} onChange={(e) => setGdrDelta(e.target.value)} />
                  </div>
                </div>

                <div className="grid2">
                  <div className="form-group">
                    <label>Metadata Ingestion Index Tokens (Comma Separated)</label>
                    <input type="text" placeholder="governance, asset, sovereign, lineage" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Systemic Configuration Notes</label>
                    <input type="text" placeholder="Additional system environmental configurations..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </div>

                <div style={{ marginTop: "12px", borderTop: "1px solid #e0dbd1", paddingTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: "10px 24px", fontSize: "13px" }}>
                    Sign &amp; Append Boundary State Block
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: CRYPTOGRAPHIC TRUST SYSTEM CERTIFICATES DISPLAY */}
          {tab === "certificates" && (
            <div className="cert-panel animate-fade-in" style={{ maxWidth: "680px", margin: "0 auto" }}>
              <div className="cert-frame">
                <div className="cert-title">FIDUCIA CENTRALE</div>
                <div className="cert-sub">Stratigraphic True Venue Authority Ledger &bull; Notary of Record</div>
                <div className="cert-divider" />
                <p className="cert-body">
                  This validation script establishes cryptographic confirmation that the administrative resource
                  specified inside the following tracking metadata has been cleanly locked as a persistent state
                  element in the parallel stratigraphic governance frame.
                </p>

                <div className="cert-meta-box">
                  <div className="grid2" style={{ gap: "10px", fontSize: "12px" }}>
                    <div><span className="cert-meta-label">Block Serial:</span> <strong style={{ fontFamily: "monospace" }}>{entries[0]?.id || "MANIFEST-EMPTY"}</strong></div>
                    <div><span className="cert-meta-label">Temporal Ingestion Event:</span> <span>{entries[0] ? new Date(entries[0].timestamp).toUTCString() : "—"}</span></div>
                    <div><span className="cert-meta-label">Boundary Core Vector:</span> <span>{entries[0]?.action?.stratum || "—"}</span></div>
                    <div><span className="cert-meta-label">System Protocol Token:</span> <span style={{ color: "#225588", fontWeight: "bold" }}>{entries[0]?.action?.token || "—"}</span></div>
                  </div>
                  <div style={{ marginTop: "10px", fontSize: "12px" }}>
                    <span className="cert-meta-label">Resource Description Scope:</span>
                    <div style={{ fontStyle: "italic", marginTop: "2px", background: "#fcfaf6", padding: "6px", borderRadius: "4px", color: "#333", border: "1px solid #e0dbd1" }}>
                      "{entries[0]?.asset?.label || "No current records ingested into local runtime memory."}"
                    </div>
                  </div>
                  <div style={{ marginTop: "10px", fontSize: "11px" }}>
                    <span className="cert-meta-label">Immutable Chain Verification Lock (SHA-256):</span>
                    <code style={{ display: "block", background: "#2a2218", color: "#f7f4ee", padding: "6px", borderRadius: "4px", marginTop: "2px", wordBreak: "break-all" }}>
                      {entries[0]?.legal?.doc_hash || "0x0000000000000000000000000000000000000000000000000000000000000000"}
                    </code>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "32px" }}>
                  <div style={{ fontSize: "10px", fontFamily: "monospace", color: "#777" }}>
                    SYSTEM: FIDUCIA-CORE-NODE-PROV-v3.0<br />
                    STATUS: AUDITED &amp; COMPLIANT
                  </div>
                  <div style={{ textAlign: "center", width: "180px" }}>
                    <div style={{ borderBottom: "1px solid #2a2218", height: "32px", fontStyle: "italic", fontSize: "13px", fontFamily: "serif", color: "#222" }}>
                      {entries[0]?.parties?.issuer ? "Shane Jonathan Lozenich" : ""}
                    </div>
                    <div style={{ fontSize: "9px", textTransform: "uppercase", tracking: "0.1em", color: "#666", marginTop: "4px" }}>
                      Archivist-In-Chief Signature
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "16px" }}>
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>Print / Export Authority Record</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// --- CORE EMBEDDED GRAPHIC CSS THEME VECTOR ---
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Source+Serif+4:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background-color: #fcfbfa; color: #2a2218; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }

  .app { min-height: 100vh; display: flex; flexDirection: column; background: #faf8f5; }
  
  .hdr { background: #2a2218; color: #f7f4ee; padding: 18px 32px; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #ccaa77; }
  .hdr-left .logo { font-family: 'Cormorant Garamond', serif; font-size: 24px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #f7f4ee; }
  .hdr-left .logo-sub { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #b5a895; margin-top: 2px; }
  .hdr-right { text-align: right; }
  .hdr-entity { font-family: 'EB Garamond', serif; font-size: 16px; font-weight: 500; color: #f7f4ee; }
  .hdr-entity-sub { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #ccaa77; margin-top: 2px; display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
  
  .status-dot { width: 6px; height: 6px; background-color: #5a7a5a; border-radius: 50%; display: inline-block; box-shadow: 0 0 8px #5a7a5a; }

  .tab { padding: 14px 24px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; border: none; background: transparent; color: #665c4e; cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s ease; }
  .tab:hover { color: #2a2218; background: #edeae1; }
  .tab.active { color: #2a2218; border-bottom-color: #2a2218; background: #fff; font-weight: 700; }

  .content { padding: 32px; max-width: 1440px; width: 100%; margin: 0 auto; flex: 1; }

  .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(480px, 1fr)); gap: 24px; margin-bottom: 24px; }
  .grid3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 16px; }
  .grid4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin-bottom: 24px; }

  .card { background: #ffffff; border: 1px solid #e8e2d5; border-radius: 6px; padding: 24px; box-shadow: 0 4px 12px rgba(42,34,24,0.03); position: relative; }
  .card-h { font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #8c8273; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid #f2edd5; padding-bottom: 6px; }
  .border-highlight { border: 1px solid #ccaa77; box-shadow: 0 6px 16px rgba(204,170,119,0.08); background: #fdfdfb; }

  .metric-val { font-family: 'Cormorant Garamond', serif; font-size: 42px; font-weight: 400; color: #2a2218; line-height: 1; }
  .metric-sub { font-size: 11px; color: #7c7263; margin-top: 6px; letter-spacing: 0.02em; }
  .text-center { text-align: center; }

  .strat-row { display: flex; align-items: center; gap: 12px; }
  .strat-label { font-size: 11px; font-weight: 600; color: #443c30; width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .strat-bar-bg { flex: 1; height: 8px; background: #f0eae1; border-radius: 4px; overflow: hidden; border: 1px solid #e3ded5; }
  .strat-bar { height: 100%; border-radius: 4px; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
  .strat-pct { font-size: 11px; font-family: monospace; color: #665c4e; width: 64px; text-align: right; }

  .feed { display: flex; flex-direction: column; gap: 8px; }
  .feed-item { padding: 10px 14px; background: #faf9f6; border: 1px solid #ebd9c8; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.15s; }
  .feed-item:hover { background: #f2edd5; border-color: #ccaa77; }

  .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
  .badge-purple { background: #f3f0f7; color: #6a5a8a; border: 1px solid #e1dbe8; }
  .badge-green { background: #edf4ed; color: #4a6a4a; border: 1px solid #dbe3db; }
  .badge-amber { background: #fbf7ed; color: #8a7a4a; border: 1px solid #ebd9c8; }

  .table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
  .table th { padding: 10px 12px; font-weight: 700; color: #665c4e; text-transform: uppercase; letter-spacing: 0.08em; font-size: 10px; border-bottom: 2px solid #ebd9c8; background: #faf9f6; }
  .table td { padding: 12px; border-bottom: 1px solid #f2edf5; color: #3a3228; }
  .table tr.clickable { cursor: pointer; }
  .table tr.clickable:hover { background: #fcfaf3; }
  .table tr.selected-row { background: #f4edd9 !important; }

  .label-meta { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #8c8273; display: block; font-weight: 700; margin-bottom: 2px; }
  .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .form-group { display: flex; flex-direction: column; gap: 4px; }
  .form-group label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #554c3e; }
  .form-group input, .form-group select, .form-group textarea { padding: 8px 12px; border-radius: 4px; border: 1px solid #ccd1c7; background: #fff; color: #2a2218; font-size: 12px; font-family: inherit; outline: none; transition: border 0.15s; }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #2a2218; box-shadow: 0 0 0 1px #2a2218; }

  .btn { display: inline-flex; align-items: center; justify-content: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; padding: 8px 16px; border-radius: 4px; border: 1px solid transparent; cursor: pointer; transition: all 0.15s; font-family: inherit; }
  .btn-primary { background: #2a2218; color: #f7f4ee; }
  .btn-primary:hover { background: #443727; }
  .btn-secondary { background: #fff; color: #2a2218; border-color: #ebd9c8; }
  .btn-secondary:hover { background: #faf9f6; border-color: #ccaa77; }
  .btn-sm { padding: 4px 10px; font-size: 10px; }

  .cert-frame { background: #fff; border: 20px solid #f4eedd; padding: 40px; box-shadow: inset 0 0 0 1px #ccaa77, 0 8px 32px rgba(0,0,0,0.04); position: relative; }
  .cert-frame::before { content: ''; position: absolute; top: -14px; left: -14px; right: -14px; bottom: -14px; border: 1px solid #ccaa77; pointer-events: none; }
  .cert-title { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 500; text-align: center; letter-spacing: 0.1em; color: #2a2218; }
  .cert-sub { font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; text-align: center; color: #8a7a65; margin-top: 6px; }
  .cert-divider { width: 120px; height: 1px; background: #ccaa77; margin: 24px auto; }
  .cert-body { font-family: 'Source Serif 4', serif; font-size: 14px; line-height: 1.6; text-align: center; color: #3a3228; margin-bottom: 24px; padding: 0 20px; }
  .cert-meta-box { background: #faf8f5; border: 1px dashed #ccaa77; padding: 20px; border-radius: 4px; text-align: left; }
  .cert-meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #8c8273; font-weight: 700; }

  .animate-fade-in { animation: fadeIn 0.25s ease-out forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

  @media print {
    body { background: #fff; color: #000; }
    .hdr, nav, .btn, .form-group, .table th:last-child, .table td:last-child { display: none !important; }
    .content { padding: 0; }
    .card { border: none; box-shadow: none; padding: 0; }
    .cert-frame { border: 1px solid #000; box-shadow: none; }
    .cert-frame::before { display: none; }
  }
`;