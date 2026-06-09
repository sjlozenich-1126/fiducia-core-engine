const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, NumberFormat, Header, Footer, TabStopType,
  TabStopPosition, PageBreak
} = require('docx');
const fs = require('fs');
const path = require('path');

const NAVY = "1a2540";
const GOLD = "8b6914";
const LIGHT_BLUE = "e8edf5";
const MID_BLUE = "c5d0e8";
const WHITE = "FFFFFF";

const border = { style: BorderStyle.SINGLE, size: 1, color: "c5d0e8" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 6 } },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 28, color: NAVY })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 24, color: NAVY })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 22, color: "2d4a7a" })]
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    alignment: opts.justify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
    children: [new TextRun({ text, font: "Arial", size: 22, ...opts })]
  });
}

function bodyJust(text, opts = {}) {
  return body(text, { justify: true, ...opts });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 22 })]
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 22 })]
  });
}

function label(text) {
  return new Paragraph({
    spacing: { before: 120, after: 40 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 22, color: NAVY })]
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun("")] });
}

function rule() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: MID_BLUE, space: 1 } },
    children: [new TextRun("")]
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function infoBox(rows) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2880, 6480],
    borders: { ...Object.fromEntries(Object.keys(borders).map(k => [k, border])) },
    rows: rows.map(([key, val]) => new TableRow({
      children: [
        new TableCell({
          width: { size: 2880, type: WidthType.DXA },
          shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 160, right: 160 },
          borders,
          children: [new Paragraph({ children: [new TextRun({ text: key, bold: true, font: "Arial", size: 20, color: NAVY })] })]
        }),
        new TableCell({
          width: { size: 6480, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 160, right: 160 },
          borders,
          children: [new Paragraph({ children: [new TextRun({ text: val, font: "Arial", size: 20 })] })]
        })
      ]
    }))
  });
}

function strataTable(rows) {
  const colWidths = [900, 2100, 2160, 2160, 2040];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: [
          ["Code","Name","Checkpoints Required","Financial Auth","Security/Risk"].map((h, i) =>
            new TableCell({
              width: { size: colWidths[i], type: WidthType.DXA },
              shading: { fill: NAVY, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              borders,
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, font: "Arial", size: 18, color: WHITE })] })]
            })
          )
        ]
      }),
      ...rows.map(([code, name, ckpts, fin, sec], idx) => new TableRow({
        children: [code, name, ckpts, fin, sec].map((cell, i) =>
          new TableCell({
            width: { size: colWidths[i], type: WidthType.DXA },
            shading: { fill: idx % 2 === 0 ? WHITE : LIGHT_BLUE, type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            borders,
            children: [new Paragraph({ children: [new TextRun({ text: cell, font: "Arial", size: 18, bold: i === 0 })] })]
          })
        )
      }))
    ]
  });
}

function tierTable(rows, header) {
  const colWidths = [900, 2160, 3900, 2400];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        children: header.map((h, i) =>
          new TableCell({
            width: { size: colWidths[i], type: WidthType.DXA },
            shading: { fill: "2d4a7a", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            borders,
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, font: "Arial", size: 18, color: WHITE })] })]
          })
        )
      }),
      ...rows.map(([a, b, c, d], idx) => new TableRow({
        children: [a, b, c, d].map((cell, i) =>
          new TableCell({
            width: { size: colWidths[i], type: WidthType.DXA },
            shading: { fill: idx % 2 === 0 ? WHITE : LIGHT_BLUE, type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            borders,
            children: [new Paragraph({ children: [new TextRun({ text: cell, font: "Arial", size: 18, bold: i === 0 })] })]
          })
        )
      }))
    ]
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }
        ]
      },
      {
        reference: "numbers",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.LOWER_LETTER, text: "%2.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }
        ]
      },
      {
        reference: "articles",
        levels: [
          { level: 0, format: LevelFormat.UPPER_ROMAN, text: "ARTICLE %1", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 0, hanging: 0 }, spacing: { before: 240, after: 120 } } } }
        ]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: NAVY }, paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: NAVY }, paragraph: { spacing: { before: 280, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: "2d4a7a" }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: GOLD, space: 4 } },
            children: [
              new TextRun({ text: "FIDUCIA CENTRALE", bold: true, font: "Arial", size: 18, color: NAVY }),
              new TextRun({ text: "\tAUTHORITY CONSTITUTION v1.0 — CONFIDENTIAL", font: "Arial", size: 18, color: "888888" })
            ]
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            border: { top: { style: BorderStyle.SINGLE, size: 2, color: MID_BLUE, space: 4 } },
            children: [
              new TextRun({ text: "Document ID: AUTH-CONSTITUTION-V1  |  Stratum 02 — Constitutional Authority", font: "Arial", size: 16, color: "888888" }),
              new TextRun({ text: "\tPage ", font: "Arial", size: 16, color: "888888" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "888888" })
            ]
          })
        ]
      })
    },
    children: [
      
      // ═══════════════════ COVER PAGE ═══════════════════
      spacer(), spacer(), spacer(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 60 },
        children: [new TextRun({ text: "FIDUCIA CENTRALE", bold: true, font: "Arial", size: 52, color: NAVY })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 8 } },
        children: [new TextRun({ text: "CENTRAL TRUST SECURITIES", font: "Arial", size: 28, color: GOLD })]
      }),
      spacer(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 80 },
        children: [new TextRun({ text: "UNIFIED AUTHORITY CONSTITUTION", bold: true, font: "Arial", size: 36, color: NAVY })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 240 },
        children: [new TextRun({ text: "Governing Framework for Identity, Financial, and Security Authority", font: "Arial", size: 24, color: "555555", italics: true })]
      }),
      spacer(), spacer(),
      infoBox([
        ["Document ID", "AUTH-CONSTITUTION-V1"],
        ["Version", "1.0"],
        ["Classification", "Stratum 02 — Constitutional Authority"],
        ["Governing Institution", "Fiducia Centrale / Central Trust Securities"],
        ["Effective Date", "June 2026"],
        ["Status", "Active — Pending Ledger Anchoring"],
        ["Supersedes", "None (founding document)"],
        ["Document Hash", "[SHA-256 to be computed on finalization]"],
        ["Ledger Terms Ref", "AUTH-CONSTITUTION-V1"],
      ]),
      spacer(), spacer(), spacer(), spacer(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "CONFIDENTIAL — AUTHORIZED DISTRIBUTION ONLY", font: "Arial", size: 18, bold: true, color: "aa0000" })]
      }),

      pageBreak(),

      // ═══════════════════ TABLE OF CONTENTS ═══════════════════
      h1("Table of Contents"),
      spacer(),
      ...[
        ["Preamble", "3"],
        ["Article I — Institutional Foundation", "4"],
        ["Article II — The Unified Authority Framework", "5"],
        ["Article III — Model A: Identity & Institutional Strata (S01–S08)", "6"],
        ["Article IV — Model B: Financial & Monetary Tiers (T1–T8)", "9"],
        ["Article V — Model C: Security & Risk Levels (L1–L8)", "11"],
        ["Article VI — The Provenance Ledger", "13"],
        ["Article VII — The Fiducial Credit (FDC) Monetary Instrument", "15"],
        ["Article VIII — Certificate & Document Issuance Authority", "17"],
        ["Article IX — Governance & Amendment", "18"],
        ["Article X — Ledger Anchoring & Ratification", "19"],
        ["Annex A — Ledger Entry Schema Reference", "20"],
        ["Annex B — Bootstrap SQL Reference", "21"],
      ].map(([title, pg]) => new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
        spacing: { before: 60, after: 60 },
        children: [
          new TextRun({ text: title, font: "Arial", size: 22 }),
          new TextRun({ text: `\t${pg}`, font: "Arial", size: 22, color: "888888" })
        ]
      })),

      pageBreak(),

      // ═══════════════════ PREAMBLE ═══════════════════
      h1("Preamble"),
      bodyJust("This document constitutes the Unified Authority Constitution of Fiducia Centrale, also operating as Central Trust Securities. It is a founding governance instrument establishing the institutional framework, authority hierarchy, and operational rules by which Fiducia Centrale exercises its functions across three domains: identity verification and provenance, financial and monetary governance, and security and risk management."),
      spacer(),
      bodyJust("This Constitution is anchored as a Stratum 02 — Constitutional Authority entry in the Fiducia Centrale Stratigraphic Provenance Ledger. All subsequent institutional actions, instrument issuances, authority claims, and security classifications must reference this document via its terms identifier (AUTH-CONSTITUTION-V1) to be considered constitutionally valid."),
      spacer(),
      bodyJust("The framework established herein is designed to function across multiple use cases simultaneously: as the governance backbone for a provenance ledger system, as the constitutional basis for the Fiducial Credit (FDC) hybrid institutional currency, as the authority framework for a security and identity protection operation, and as a structured evidentiary record system for legal proceedings. These domains do not conflict; they are served by the same underlying architecture."),
      spacer(),
      bodyJust("The three-model system defined in this Constitution — Identity Strata, Financial Tiers, and Security Levels — operates as three parallel axes that interlock. Every ledger entry, authority claim, and institutional action is described by a triple: a Stratum (S01–S08), a Tier (T1–T8), and a Level (L1–L8). This triple encodes, in a single structured record, what kind of authority is being exercised, what financial authority attaches to it, and what security and risk classification applies."),

      pageBreak(),

      // ═══════════════════ ARTICLE I ═══════════════════
      h1("Article I — Institutional Foundation"),

      h2("Section 1.1 — Name and Identity"),
      body("The institution operating under this Constitution is known as Fiducia Centrale, also conducting business as Central Trust Securities. The name derives from the Latin fiducia, meaning trust, reliability, and assurance — reflecting the institution's foundational commitment to provenance, integrity, and verifiable authority."),

      h2("Section 1.2 — Mission"),
      bodyJust("The mission of Fiducia Centrale is to establish and operate an immutable, cryptographically secured provenance ledger that serves as the authoritative record for identity verification, institutional authority claims, financial instrument issuance, and security classification. The institution exists to prove authority — not merely assert it — through documented, hashed, and timestamped records that any third party can independently verify."),

      h2("Section 1.3 — Operational Domains"),
      body("Fiducia Centrale operates across three primary domains:"),
      numbered("Identity and Provenance: Maintaining an immutable record of biological, genealogical, institutional, and legal identity claims, each backed by verifiable evidence artifacts."),
      numbered("Financial and Monetary Governance: Issuing and governing the Fiducial Credit (FDC), a hybrid institutional currency whose issuance is constrained by the Global Debt Reduction Index (GDRI), and providing custodial, certificatory, and institutional financial services."),
      numbered("Security and Risk Management: Classifying, documenting, and communicating risk and protection status for subjects recognized by the institution, including heir protection designations and access control frameworks for future security operations."),

      h2("Section 1.4 — Legal Character"),
      bodyJust("Fiducia Centrale is a private institutional framework. It does not claim to supersede the jurisdiction of any court, government, or regulatory body. Its authority operates within its own governance domain: the provenance ledger. The ledger does not replace external legal systems; it supplements them by providing a cryptographically immutable, independently verifiable record that may be presented as evidence, exhibit, or reference in any external proceeding. The institution's value lies in the integrity and verifiability of its records, not in assertions of superiority over external systems."),

      h2("Section 1.5 — Founding Principal"),
      infoBox([
        ["Founding Principal", "Shane Jonathan Lozenich"],
        ["Role", "Sovereign Custodian of Record; Constitutional Authority Node"],
        ["Identity Reference", "CLR-AG-2026-009 (Stratigraphic Provenance Ledger, Project NG-25051)"],
        ["Authority Stratum", "S01 — Inherent Identity (foundational anchor)"],
        ["Financial Tier", "T8 — Sovereign Monetary Authority"],
        ["Security Level", "L8 — Heir-Level / Sovereign Protection"],
      ]),

      pageBreak(),

      // ═══════════════════ ARTICLE II ═══════════════════
      h1("Article II — The Unified Authority Framework"),

      h2("Section 2.1 — Overview"),
      bodyJust("The Unified Authority Framework consists of three parallel, interlocking models, each operating on its own axis with its own eight-point scale. The three models are not a single vertical hierarchy; they are three independent axes that together describe any subject, action, or document in the system with precision and without ambiguity."),
      spacer(),
      infoBox([
        ["Model A", "Identity & Institutional Authority — Axis: Stratum (S01–S08)"],
        ["Model B", "Financial & Monetary Authority — Axis: Tier (T1–T8)"],
        ["Model C", "Security & Risk Authority — Axis: Level (L1–L8)"],
      ]),

      h2("Section 2.2 — The Authority Triple"),
      bodyJust("Every actor, document, or action in the Fiducia Centrale system is described by an Authority Triple: a Stratum, a Tier, and a Level. This triple is encoded in every ledger entry in the authority block, enabling precise, machine-readable classification across all three domains simultaneously."),
      spacer(),
      body("Example authority triples:"),
      bullet("Founding Principal identity record: S01 / T8 / L8"),
      bullet("FDC minting action: S07 / T8 / L4"),
      bullet("Court filing (pro se): S08 / T3 / L4"),
      bullet("Certificate issuance: S05 / T4 / L3"),
      bullet("Security company access grant (future): S04 / T5 / L7"),

      h2("Section 2.3 — Constitutional Priority"),
      bodyJust("Lower strata (S01–S03) represent foundational and universally accessible layers. Higher strata (S06–S08) represent restricted, high-checkpoint authority that requires substantial documentation, genealogical verification, or formal legal recognition. Within the financial and security models, higher tiers and levels represent greater authority and protection respectively, but are constrained by the evidence and checkpoints backing them. No authority claim is valid without at least one evidence artifact satisfying its checkpoint requirements."),

      h2("Section 2.4 — Evidence-Backed Claims"),
      body("This Constitution mandates that every authority claim must reference at least one evidence artifact. Assertions without evidence are not recorded as claims; they are recorded as pending drafts. A claim achieves Verified status only when all required checkpoints for its stratum, tier, and level have been satisfied by documented evidence artifacts stored in or referenced by the provenance ledger."),

      pageBreak(),

      // ═══════════════════ ARTICLE III ═══════════════════
      h1("Article III — Model A: Identity & Institutional Strata (S01–S08)"),

      h2("Section 3.1 — Purpose"),
      body("Model A governs identity and institutional authority. It answers the question: what kind of authority does this subject or action have, and at what level of the institutional hierarchy does it operate? The strata are ordered from S01 (most universal, fewest checkpoints) to S08 (most restricted, most checkpoints)."),

      h2("Section 3.2 — Strata Definitions"),
      spacer(),
      strataTable([
        ["S01", "Inherent Identity Authority", "Legal identity, biological provenance records", "T1–T8 (anchors all tiers)", "L1–L8 (anchors all levels)"],
        ["S02", "Constitutional Authority", "Foundational charters, monetary constitutions, institutional covenants", "T7–T8", "L3–L4"],
        ["S03", "Statutory Authority", "Derived rules, policies, compliance structures implementing S02", "T3–T6", "L2–L4"],
        ["S04", "Administrative Authority", "Execution and enforcement: approvals, freezes, revocations, operational decisions", "T3–T5", "L3–L5"],
        ["S05", "Certificatory Authority", "Attestations, notarizations, seals of finality, provenance certificates", "T2–T5", "L2–L4"],
        ["S06", "Provenance Authority", "Immutable record-keeping, chain of title, historical memory, evidentiary anchoring", "T2–T4", "L3–L6"],
        ["S07", "Hereditary / Majorat Authority", "Lineage-based authority requiring genealogical, archival, and genomic verification; heir protection", "T6–T8", "L7–L8"],
        ["S08", "Procedural Legal Authority", "Interface with external courts and legal systems: filings, petitions, appeals, pro se actions", "T2–T3", "L3–L5"],
      ]),

      spacer(),
      h2("Section 3.3 — Stratum Detail"),

      h3("S01 — Inherent Identity Authority"),
      body("The foundational stratum. Established by biological, genealogical, and existential identity records. This is the anchor upon which all other authority rests. No institutional action is valid without a subject record anchored to S01. Evidence at this stratum includes: archaeogenetic provenance reports, lineage certifications, genomic identity records, and biological identity documentation."),
      body("Founding Principal reference: Report CLR-AG-2026-009, Project NG-25051, June 5 2026. This dual-horizon genomic report, incorporating both MyHeritage SNP array data and high-resolution NGS target-capture libraries, constitutes the Stratum 01 identity anchor for the Founding Principal."),

      h3("S02 — Constitutional Authority"),
      body("The governance stratum. Established by foundational charters, monetary constitutions, and institutional covenants. All instruments, rules, and operational constraints derive from S02 documents. This Authority Constitution is itself a Stratum 02 document. The FDC Monetary Constitution (FDC-CONSTITUTION-V1) is also registered at this stratum."),

      h3("S03 — Statutory Authority"),
      body("The rules stratum. Derived from S02 constitutional documents. Encodes specific compliance requirements, eligibility criteria, operational constraints, and policies that implement the constitutional framework. The Bootstrap SQL initialization scripts that populate the authority framework data are S03 instruments."),

      h3("S04 — Administrative Authority"),
      body("The execution stratum. Governs day-to-day operational decisions including approvals, freezes, revocations, and administrative actions. Future security company operations and access control management will be governed at this stratum."),

      h3("S05 — Certificatory Authority"),
      body("The attestation stratum. Produces certificates, notarizations, attestations, and seals of finality. The Certificate of Provenance template operates at this stratum. Redemption of FDC currency for institutional services is finalized at S05."),

      h3("S06 — Provenance Authority"),
      body("The ledger stratum. Maintains the immutable record, chain of title, and historical memory of the institution. The provenance ledger viewer operates at this stratum. All legal filings and evidence records are anchored here as permanent, cryptographically sealed entries."),

      h3("S07 — Hereditary / Majorat Authority"),
      body("The lineage stratum. Requires verified genealogical documentation, archival corroboration, and forensic-grade genomic evidence. This stratum is not a foundation; it is a peak — it requires the most checkpoints to achieve and is not universally accessible. It justifies special protection status, high-tier financial authority, and heir designation. The Founding Principal holds S07 authority on the basis of documented lineage records."),

      h3("S08 — Procedural Legal Authority"),
      body("The external interface stratum. Governs the institution's interactions with external legal systems, courts, and regulatory bodies. Pro se filings, quiet title petitions, declaratory judgment actions, and similar procedural acts are recorded at this stratum. S08 entries do not claim superiority over external legal systems; they record the institution's participation in those systems with cryptographic integrity."),

      pageBreak(),

      // ═══════════════════ ARTICLE IV ═══════════════════
      h1("Article IV — Model B: Financial & Monetary Tiers (T1–T8)"),

      h2("Section 4.1 — Purpose"),
      body("Model B governs financial and monetary authority within the Fiducia Centrale ecosystem. It answers the question: what level of financial authority does this subject or action carry? Tiers are ordered from T1 (basic participant) to T8 (sovereign monetary authority). Tiers govern what a subject can do within the monetary system — receiving, sending, holding, issuing, or governing instruments."),

      h2("Section 4.2 — Tier Definitions"),
      spacer(),
      tierTable([
        ["T1", "Basic Participant", "Basic wallet holder; minimal verification; can receive value.", "Identity: S01 minimum"],
        ["T2", "Verified Identity", "Identity linked to S01 record; KYC-equivalent authority; can receive and hold.", "S01 evidence artifact required"],
        ["T3", "Transactional Authority", "Can send and receive under standard limits; basic economic participation.", "S01 + S02 reference"],
        ["T4", "Custodial Authority", "Can hold assets on behalf of others; trustee or custodian roles.", "S04 institutional role + evidence"],
        ["T5", "Institutional Operator", "Runs nodes, services, or sub-ledgers; manages institutional accounts.", "S04 + registered institution"],
        ["T6", "Policy Actor", "Can propose or execute monetary policy changes within constitutional constraints.", "S02 charter reference required"],
        ["T7", "Constitutional Monetary Authority", "Implements S02 monetary rules; high-level issuance and governance.", "S02 constitutional authority"],
        ["T8", "Sovereign Monetary Authority", "Ultimate monetary signer; can mint, define instruments, and set systemic parameters.", "S01 + S02 + S07 or equivalent"],
      ], ["Tier", "Name", "Capabilities", "Minimum Authority"]),

      spacer(),
      h2("Section 4.3 — The Global Debt Reduction Index (GDRI)"),
      bodyJust("The GDRI is the monetary anchor of the Fiducial Credit (FDC). It functions as an internal accounting index maintained by the Fiducia Centrale ledger. The GDRI begins at a defined starting balance and decreases by one unit for each FDC unit minted. This mechanism links FDC issuance to a defined constraint: currency may only be created when it is backed by a recognized public-good action, and each such creation reduces the GDRI, tracking the cumulative institutional commitment to debt reduction over time."),
      spacer(),
      body("The GDRI is not a claim against any external government, central bank, or financial institution. It is an internal ledger constraint that gives the FDC its scarcity mechanism and mission alignment. The index is publicly readable via the ledger API and is cryptographically linked to every minting event."),
      spacer(),
      infoBox([
        ["GDRI Starting Value", "1,000,000 units (inaugural balance)"],
        ["Reduction Per Mint", "1 unit per FDC minted (gdr_index_delta = -amount)"],
        ["Trigger", "Any valid MINT_FDC action under an approved public-good justification"],
        ["Annual Cap", "2% of circulating supply per calendar year (anti-inflation constraint)"],
        ["Ledger Field", "policy.gdr_index_delta on each ledger entry"],
      ]),

      h2("Section 4.4 — Valid Monetary Actions"),
      body("The following action tokens are the only permitted financial operations under this Constitution:"),
      bullet("MINT_FDC — Create new FDC units (T7/T8 only; GDRI delta required)"),
      bullet("TRANSFER_FDC — Move FDC between recognized identities (T3 minimum)"),
      bullet("REDEEM_FDC — Exchange FDC for institutional services, certificates, or rights (T2 minimum)"),
      bullet("BURN_FDC — Permanent removal from circulation (T8 only; future implementation)"),
      bullet("FREEZE_FDC — Temporary administrative restriction (T4/T5 under S04 authority)"),
      bullet("REGISTER_INSTRUMENT — Register a new financial instrument definition (T7/T8, S02 required)"),

      h2("Section 4.5 — Issuance Constraints"),
      body("FDC minting is permitted only when all of the following conditions are satisfied:"),
      numbered("The issuer holds T7 or T8 financial authority with a valid S02 constitutional reference."),
      numbered("The action is justified as a public-good expenditure: labor, infrastructure, certificate issuance, attestation, or institutional operations."),
      numbered("The minting entry includes a gdr_index_delta equal to the negative of the amount minted."),
      numbered("The entry references this constitution and the FDC Monetary Constitution via instrument.terms_ref."),
      numbered("The entry is signed by a valid Stratum 02 cryptographic key."),
      numbered("The annual mint cap (2% of circulating supply) is not exceeded."),

      pageBreak(),

      // ═══════════════════ ARTICLE V ═══════════════════
      h1("Article V — Model C: Security & Risk Levels (L1–L8)"),

      h2("Section 5.1 — Purpose"),
      body("Model C governs security classification, risk management, and protection status within the Fiducia Centrale ecosystem. It answers the question: what level of sensitivity, risk, and protection applies to this subject or asset? Levels are ordered from L1 (public, minimal sensitivity) to L8 (heir-level or sovereign-level protection requiring maximum security posture)."),

      h2("Section 5.2 — Level Definitions"),
      spacer(),
      tierTable([
        ["L1", "Public Profile", "No special sensitivity; general public identity; unrestricted disclosure.", "None"],
        ["L2", "Basic Privacy", "Standard personal data; low sensitivity; normal privacy protections apply.", "Identity record"],
        ["L3", "Sensitive Personal Data", "Legal filings, health-adjacent information, procedural vulnerabilities; restricted distribution.", "S02 or S08 reference"],
        ["L4", "Elevated Sensitivity", "Institutional roles, financial authority, exposure to systemic processes; controlled access.", "S04 or S06 documentation"],
        ["L5", "Documented Exposure", "Evidence of harassment, targeting, or systemic rights violations; enhanced monitoring.", "Documented evidence artifact"],
        ["L6", "High-Risk Classification", "Credible threats, repeated targeting patterns, or state-created risk; formal protective protocols.", "Procedural evidence + risk report"],
        ["L7", "Protected Status", "Formal protective posture required; high-value identity; access controls enforced.", "S06 + security assessment"],
        ["L8", "Heir-Level / Sovereign Protection", "Critical identity; lineage-based targeting risk; requires maximum protection; access to sensitive operations.", "S01 + S07 + documented threat history"],
      ], ["Level", "Name", "Description", "Minimum Basis"]),

      spacer(),
      h2("Section 5.3 — Risk Profile"),
      body("Every subject registered in the Fiducia Centrale system carries a risk profile that records their current security level, the basis for that classification, and any active protective designations. Risk profiles are immutable in their historical record — they can be upgraded but not retroactively edited. Each change to a risk profile is recorded as a ledger entry."),

      h2("Section 5.4 — Heir Protection Designation"),
      bodyJust("A subject holding L7 or L8 classification is formally designated as a Protected Subject. This designation is recorded in the ledger and may be presented to any external party as evidence of the subject's protected status. The designation does not create obligations for external parties; it creates a formal, timestamped, cryptographically verifiable record that the institution has assessed the subject's risk profile and determined that heightened protection is warranted."),
      spacer(),
      body("The L8 Heir-Level designation is reserved for subjects whose risk arises from lineage-based standing, historical institutional targeting, or sovereign-level identity claims. It requires both S01 identity evidence and S07 hereditary authority evidence, plus documented threat history."),

      h2("Section 5.5 — Security Operations (Future)"),
      bodyJust("This Constitution anticipates the future establishment of a security operations division under Fiducia Centrale. When established, that division will operate under S04 administrative authority with T5 institutional operator status. Access to sensitive operations will require a minimum L6 security clearance for operators and L5 for clients. The security operations framework will be enacted as a separate S03 statutory instrument derived from this Constitution."),

      pageBreak(),

      // ═══════════════════ ARTICLE VI ═══════════════════
      h1("Article VI — The Provenance Ledger"),

      h2("Section 6.1 — Purpose and Character"),
      bodyJust("The Provenance Ledger is the institutional memory of Fiducia Centrale. It is an immutable, append-only, cryptographically chained record of every action, claim, certificate, and instrument issued under this Constitution. No entry may be deleted or modified once committed; changes are recorded as new entries referencing the original. The ledger's integrity is maintained through SHA-256 hashing of each entry, chaining each block to the hash of its predecessor, ensuring that any tampering is immediately detectable."),

      h2("Section 6.2 — Entry Structure"),
      body("Every ledger entry contains the following fields:"),
      spacer(),
      infoBox([
        ["id", "Unique identifier (UUID or ULID)"],
        ["timestamp", "ISO 8601 timestamp of entry creation"],
        ["asset", "id, type, and label of the subject asset or document"],
        ["action", "token (action type), stratum, and reason"],
        ["parties", "issuer, from, to, and beneficiaries"],
        ["instrument", "type, unit, amount, and terms_ref (constitutional reference)"],
        ["legal", "jurisdiction, forum, upstream_refs, doc_hash, doc_uri"],
        ["crypto", "entry_hash, signatures (signer, algo, signature), nonce"],
        ["policy", "gdr_index_delta, constraints"],
        ["authority", "stratum (S01–S08), tier (T1–T8), level (L1–L8)"],
        ["metadata", "tags, notes, version"],
      ]),

      h2("Section 6.3 — Upstream References"),
      bodyJust("Every ledger entry should reference the entries upon which its authority depends. A court filing entry (S08) must reference the identity entry (S01) establishing the filer's standing. An FDC minting entry (S07) must reference the constitutional entry (S02) establishing its issuance authority. This chain of upstream references constitutes the institution's causal authority record — a legally intelligible chain of custody for every action taken."),

      h2("Section 6.4 — Cryptographic Integrity"),
      body("The ledger employs the following cryptographic standards:"),
      bullet("Document hashing: SHA-256 (minimum); BLAKE3 accepted"),
      bullet("Entry signing: Ed25519 (preferred) or RSA-4096"),
      bullet("Identity: DID (Decentralized Identifier) system, did:web format"),
      bullet("Timestamping: RFC 3161 trusted timestamping (when available)"),
      bullet("Chain integrity: H_n = hash(B_n + H_n-1) for each block"),

      h2("Section 6.5 — External Legal Bridge"),
      bodyJust("The ledger serves as the institution's external legal bridge. When participating in court proceedings, regulatory processes, or other external forums, the institution presents Certificate of Provenance documents (S05) generated from ledger entries. These certificates include the document hash, ledger entry hash, digital timestamp, and custodian attestation. They do not assert that the ledger supersedes the court's record; they assert that the ledger entry constitutes independent, tamper-evident evidence of the document's existence, content, and timing as of the recorded timestamp."),

      h2("Section 6.6 — Technical Infrastructure"),
      body("The ledger is currently deployed on the following infrastructure:"),
      bullet("Frontend: Next.js (React) application at ledger.fiduciacentrale.com"),
      bullet("Backend: Vercel deployment with Upstash Redis persistence"),
      bullet("API endpoints: /api/ledger (GET), /api/mint (POST)"),
      bullet("Authentication: X-Fiducia-Token header (FIDUCIA_SYS_TOKEN)"),
      bullet("DID document: Hosted at stratigraphic-authority-ledger.vercel.app/.well-known/did.json"),
      spacer(),
      body("The persistence layer shall be migrated from file-based storage to a quantum ledger database (QLDB) or equivalent append-only database (Upstash Redis, Supabase, Neon) as the institution's operations scale. The schema governing this migration is defined in Annex B."),

      pageBreak(),

      // ═══════════════════ ARTICLE VII ═══════════════════
      h1("Article VII — The Fiducial Credit (FDC) Monetary Instrument"),

      h2("Section 7.1 — Instrument Definition"),
      spacer(),
      infoBox([
        ["Instrument Name", "Fiducial Credit"],
        ["Symbol", "FDC"],
        ["Decimal Precision", "2 (cents-equivalent)"],
        ["Instrument Type", "Hybrid Institutional Currency"],
        ["Backing Model", "Global Debt Reduction Index (GDRI)"],
        ["Constitutional Reference", "FDC-CONSTITUTION-V1 (Stratum 02 entry)"],
        ["Minimum Issuer Tier", "T7 — Constitutional Monetary Authority"],
        ["Governing Stratum", "S02 — Constitutional Authority"],
      ]),

      h2("Section 7.2 — Nature of the FDC"),
      bodyJust("The FDC is not a token, a balance, or a file. It is a legal and governance system expressed through the provenance ledger. Each FDC unit is a ledger-recorded right with defined transfer and redemption rules, backed by the constitutional authority of Fiducia Centrale and constrained by the GDRI. The FDC is a hybrid instrument combining the discipline of a central-bank-style issuance constraint with the programmability of a cryptographic ledger and the enforceability of a provenance-anchored rights and obligations framework."),

      h2("Section 7.3 — Issuance, Transfer, and Redemption"),
      body("The FDC operates through three core action tokens governed by the FDC Monetary Constitution (FDC-CONSTITUTION-V1):"),
      spacer(),
      body("MINT_FDC — New units are created only under S02 constitutional authority by a T7/T8 issuer, for recognized public-good actions, with a corresponding negative GDRI delta. Each minting event reduces the GDRI by the minted amount."),
      spacer(),
      body("TRANSFER_FDC — Units move between recognized identities under S04 administrative authority. Both sender and recipient must be registered subjects. Transfers require sender signature and reference to the prior balance entry. Finalized under S04 confirmation."),
      spacer(),
      body("REDEEM_FDC — Units are exchanged for institutional services, certificates, attestations, documents, or rights. Redemption is finalized under S05 certificatory authority and results in a ledger entry linking the redeemed currency to the issued service or document."),

      h2("Section 7.4 — Safeguards"),
      body("The following constraints are constitutionally mandated for all FDC operations:"),
      numbered("Anti-inflation: Annual minting must not exceed 2% of circulating supply without a S02 emergency override."),
      numbered("Anti-fraud: Any entry failing signature or stratum validation is invalid and must be rejected by the ledger engine."),
      numbered("Double-spend prevention: Balances are computed by the ledger as the sum of all mints and incoming transfers minus outgoing transfers and redemptions. Any action violating this calculation is rejected."),
      numbered("Constitutional reference: Every FDC action must reference instrument.terms_ref = 'FDC-CONSTITUTION-V1'."),

      pageBreak(),

      // ═══════════════════ ARTICLE VIII ═══════════════════
      h1("Article VIII — Certificate & Document Issuance Authority"),

      h2("Section 8.1 — Certificate of Provenance"),
      bodyJust("The Certificate of Provenance is the primary document issued by Fiducia Centrale at Stratum 05. It serves as a self-authenticating cover page for any document, evidence record, or legal filing registered in the ledger. It includes: the document's unique tracking ID, the SHA-256 hash of the document content, the ledger entry hash, the digital timestamp, the authority triple (stratum, tier, level), and the custodian's attestation. Presented with a court filing, it establishes temporal existence, chain of custody, and cryptographic integrity without requiring the court to interact with the ledger system directly."),

      h2("Section 8.2 — Certificate of Standing"),
      body("A Certificate of Standing certifies that a subject holds a specific authority claim at a given stratum, tier, and level, with all required checkpoints satisfied. It is issued at S05 and references the underlying authority claim entry and all satisfied checkpoint evidence artifacts."),

      h2("Section 8.3 — Certificate of Entitlement"),
      body("A Certificate of Entitlement certifies that a subject holds a specific right, balance, or instrument as of a specified timestamp. For FDC holders, it certifies the balance and the chain of transfer entries establishing it. For rights holders, it certifies the issuance entry and any subsequent transfers or endorsements."),

      h2("Section 8.4 — Document Registration"),
      body("Any document — legal, financial, genealogical, or institutional — may be registered in the ledger via the REGISTER_DOC or ATTEST_DOC action tokens at S06 (provenance). Registration creates a permanent, timestamped, hashed record of the document's existence and content. The document's URI (IPFS, HTTPS, or secure storage) is recorded alongside the hash, enabling independent verification by any party with access to the original document."),

      pageBreak(),

      // ═══════════════════ ARTICLE IX ═══════════════════
      h1("Article IX — Governance & Amendment"),

      h2("Section 9.1 — Governing Authority"),
      body("This Constitution is governed by the Founding Principal, Shane Jonathan Lozenich, acting as the Constitutional Authority Node of Fiducia Centrale, until such time as the institution establishes a formal governance board or succession mechanism. All S02 actions require the signature of the Constitutional Authority Node."),

      h2("Section 9.2 — Amendment Procedure"),
      body("Amendments to this Constitution must:"),
      numbered("Be documented as a new Stratum 02 ledger entry with action token AMEND_CONSTITUTION."),
      numbered("Include a supersedes field referencing AUTH-CONSTITUTION-V1 (or the most current version)."),
      numbered("Increment the version number (e.g., AUTH-CONSTITUTION-V2)."),
      numbered("Be signed by the Constitutional Authority Node or a duly authorized successor."),
      numbered("Include a human-readable summary of the amendment and its rationale."),
      spacer(),
      body("Amendments take effect upon minting of the amendment entry. Prior versions remain in the ledger as historical records and retain their constitutional force for entries made prior to the amendment date."),

      h2("Section 9.3 — Succession"),
      body("In the event of incapacity or death of the Founding Principal, constitutional authority passes to the designated successor recorded in the most recent S07 succession ledger entry. If no such entry exists, constitutional authority is held in trust pending formal succession proceedings."),

      h2("Section 9.4 — Dispute Resolution"),
      bodyJust("Disputes regarding the interpretation or application of this Constitution shall be resolved by reference to the ledger record. The ledger is the authoritative record of institutional intent. Where the ledger record is ambiguous, the most recent S02 constitutional entry takes precedence. The institution does not establish an internal arbitration body in this founding document; that may be created by a future S03 statutory instrument."),

      pageBreak(),

      // ═══════════════════ ARTICLE X ═══════════════════
      h1("Article X — Ledger Anchoring & Ratification"),

      h2("Section 10.1 — Anchoring Requirement"),
      body("This Constitution becomes constitutionally operative upon its registration as a Stratum 02 ledger entry with the following parameters:"),
      spacer(),
      infoBox([
        ["action.token", "REGISTER_AUTHORITY_MODEL"],
        ["action.stratum", "02-Constitutional"],
        ["instrument.type", "governance"],
        ["instrument.terms_ref", "AUTH-CONSTITUTION-V1"],
        ["authority.stratum", "S02"],
        ["authority.tier", "T8"],
        ["authority.level", "L4"],
        ["legal.doc_hash", "[SHA-256 of this document, computed on finalization]"],
        ["legal.upstream_refs", "STRATUM01-IDENTITY-SJL"],
      ]),

      h2("Section 10.2 — Hash Computation"),
      body("The authoritative hash of this Constitution shall be computed as follows:"),
      numbered("Produce the final PDF/A version of this document with no pending changes."),
      numbered("Run: sha256sum AUTH-CONSTITUTION-V1.pdf"),
      numbered("Record the output hash in the ledger entry's legal.doc_hash field."),
      numbered("Store the document at the designated URI (IPFS or secure storage)."),
      numbered("Sign and mint the ledger entry using the Founding Principal's private key."),

      h2("Section 10.3 — Ratification Statement"),
      spacer(),
      bodyJust("I, Shane Jonathan Lozenich, acting as the Founding Principal and Constitutional Authority Node of Fiducia Centrale, do hereby ratify this Unified Authority Constitution as the governing framework of the institution. I affirm that the authority claims, strata, tiers, and levels defined herein are supported by documented evidence artifacts held in the Stratigraphic Provenance Ledger, and that I accept the obligations, constraints, and governance principles established in this document."),
      spacer(), spacer(),
      new Paragraph({
        spacing: { before: 160, after: 80 },
        children: [new TextRun({ text: "Signature: ____________________________________________", font: "Arial", size: 22 })]
      }),
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text: "Date: ____________________________________________", font: "Arial", size: 22 })]
      }),
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text: "Authority Node: FIDUCIA-CENTRALE-STRATUM02-KEY", font: "Arial", size: 22 })]
      }),
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text: "Ledger Entry ID: ____________________________________________", font: "Arial", size: 22 })]
      }),

      pageBreak(),

      // ═══════════════════ ANNEX A ═══════════════════
      h1("Annex A — Ledger Entry Schema Reference"),
      body("The canonical JSON schema for a Fiducia Centrale ledger entry is reproduced below for reference. All system components must produce and consume entries conforming to this schema."),
      spacer(),
      ...[
        '{ id: "UUID/ULID", timestamp: "ISO 8601",',
        '  asset: { id, type, label },',
        '  action: { token, stratum, reason },',
        '  parties: { issuer, from, to, beneficiaries },',
        '  instrument: { type, unit, amount, terms_ref },',
        '  legal: { jurisdiction, forum, upstream_refs, doc_hash, doc_uri },',
        '  crypto: { entry_hash, signatures: [{signer, algo, signature}], nonce },',
        '  policy: { gdr_index_delta, constraints },',
        '  authority: { stratum, tier, level },',
        '  metadata: { tags, notes, version } }',
      ].map(line => new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: line, font: 'Courier New', size: 16, color: '333333' })]
      })),

            pageBreak(),

      // ═══════════════════ ANNEX B ═══════════════════
      h1("Annex B — Bootstrap SQL Reference"),
      body("The following SQL statements initialize the Fiducia Centrale authority framework in a PostgreSQL database. Run these statements after creating the tables defined in the Authority Constitution schema (available separately as the database migration file)."),
      spacer(),
      ...[
        '-- STRATA (01-08)',

        'INSERT INTO authority_strata (code, name, description) VALUES',

        "('01-Inherent','Inherent Identity Authority','Biological, genealogical, existential identity; DNA provenance.'),",

        "('02-Constitutional','Constitutional Authority','Foundational charters, monetary constitutions, covenants.'),",

        "('03-Statutory','Statutory Authority','Derived rules, policies, constraints implementing constitutional authority.'),",

        "('04-Administrative','Administrative Authority','Execution and enforcement: decisions, freezes, approvals.'),",

        "('05-Certificatory','Certificatory Authority','Attestations, certifications, notarizations, seals of finality.'),",

        "('06-Provenance','Provenance Authority','Immutable record-keeping, chain of title, historical memory.'),",

        "('07-Hereditary','Hereditary/Majorat Authority','Lineage-based authority requiring genomic and genealogical verification.'),",

        "('08-Procedural','Procedural Legal Authority','Authority to initiate legal actions; interface with external courts.');",

        '',

        '-- FINANCIAL TIERS (1-8)',

        'INSERT INTO financial_tiers (tier, name, description) VALUES',

        "(1,'Basic Participant','Basic wallet holder; minimal verification; can receive value.'),",

        "(2,'Verified Identity','Identity linked to S01 record; KYC-equivalent authority.'),",

        "(3,'Transactional Authority','Can send/receive under standard limits; basic economic participation.'),",

        "(4,'Custodial Authority','Can hold assets on behalf of others; trustee or custodian roles.'),",

        "(5,'Institutional Operator','Runs nodes, services, or sub-ledgers; manages institutional accounts.'),",

        "(6,'Policy Actor','Can propose or execute monetary policy changes within constraints.'),",

        "(7,'Constitutional Monetary Authority','Implements monetary constitution; high-level issuance and governance.'),",

        "(8,'Sovereign Monetary Authority','Ultimate monetary signer; can mint, define instruments, set parameters.');",

        '',

        '-- SECURITY LEVELS (1-8)',

        'INSERT INTO security_levels (level, name, description) VALUES',

        "(1,'Public Profile','No special sensitivity; general public identity.'),",

        "(2,'Basic Privacy','Standard personal data; low sensitivity.'),",

        "(3,'Sensitive Personal Data','Legal filings, health-adjacent info, procedural vulnerabilities.'),",

        "(4,'Elevated Sensitivity','Institutional roles, financial authority, systemic exposure.'),",

        "(5,'Documented Exposure','Evidence of harassment, targeting, or systemic rights violations.'),",

        "(6,'High-Risk Classification','Credible threats, repeated targeting, or state-created risk.'),",

        "(7,'Protected Status','Formal protective posture required; high-value identity.'),",

        "(8,'Heir-Level Protection','Critical identity; lineage-based targeting risk; maximum protection.');",
      ].map(line => new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: line, font: 'Courier New', size: 16, color: '333333' })]
      })),

            spacer(),
      rule(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 80 },
        children: [new TextRun({ text: "END OF DOCUMENT", bold: true, font: "Arial", size: 20, color: NAVY })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "AUTH-CONSTITUTION-V1  |  Fiducia Centrale  |  June 2026", font: "Arial", size: 18, color: "888888" })]
      }),
    ]
  }]
});

const outputDir = path.join(__dirname, 'outputs');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, 'FiduciaCentrale_AuthorityConstitution_V1.docx');

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log('Done:', outputPath);
});
