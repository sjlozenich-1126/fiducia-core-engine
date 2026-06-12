/**
 * lib/authority.ts
 * Fiducia Centrale — Canonical Authority Model
 *
 * This is the normative enforcement layer.
 * Every write to the ledger is checked against this model BEFORE being accepted.
 * If it's not authorised here, it doesn't go into the ledger.
 */

export type StratumCode =
  | "01-Inherent"
  | "02-Constitutional"
  | "03-Statutory"
  | "04-Administrative"
  | "05-Certificatory"
  | "06-Provenance"
  | "07-Hereditary"
  | "08-Procedural";

export type ActionToken =
  | "REGISTER_IDENTITY"
  | "REGISTER_INSTRUMENT"
  | "MINT_FDC"
  | "TRANSFER_FDC"
  | "REDEEM_FDC"
  | "REGISTER_DOC"
  | "ATTEST_DOC"
  | "FILE_QUIET_TITLE"
  | "INITIATE_LEGAL"
  | "REGISTER_AUTHORITY_MODEL"
  | "DEFINE_CONSTITUTION"
  | "INTERPRET_CONSTITUTION"
  | "MINT_OBLIGATION"
  | "APPROVE_CREDIT"
  | "REQUEST_CREDIT";

export interface StratumDefinition {
  code: StratumCode;
  name: string;
  weight: number; // 1–100; higher = more authority
  can: ActionToken[];
  minTier: number; // minimum financial tier required for actors in this stratum
}

export interface AuthorityModel {
  version: string;
  strata: StratumDefinition[];
}

// ── Canonical Authority Model ────────────────────────────────────────────────
// This is the single source of institutional truth for permissions.
// To add a new action, add it to ActionToken above AND to the relevant stratum(s) below.

export const AUTHORITY_MODEL: AuthorityModel = {
  version: "1.0.0",
  strata: [
    {
      code: "01-Inherent",
      name: "Inherent Identity",
      weight: 100,
      can: ["REGISTER_IDENTITY"],
      minTier: 8,
    },
    {
      code: "02-Constitutional",
      name: "Constitutional",
      weight: 95,
      can: [
        "DEFINE_CONSTITUTION",
        "REGISTER_AUTHORITY_MODEL",
        "REGISTER_INSTRUMENT",
        "INTERPRET_CONSTITUTION",
      ],
      minTier: 4,
    },
    {
      code: "03-Statutory",
      name: "Statutory",
      weight: 80,
      can: ["REGISTER_DOC", "ATTEST_DOC", "REGISTER_INSTRUMENT"],
      minTier: 3,
    },
    {
      code: "04-Administrative",
      name: "Administrative",
      weight: 65,
      can: ["TRANSFER_FDC", "APPROVE_CREDIT", "REGISTER_DOC"],
      minTier: 3,
    },
    {
      code: "05-Certificatory",
      name: "Certificatory",
      weight: 60,
      can: ["ATTEST_DOC", "REDEEM_FDC", "REGISTER_DOC"],
      minTier: 3,
    },
    {
      code: "06-Provenance",
      name: "Provenance",
      weight: 55,
      can: ["REGISTER_DOC", "ATTEST_DOC", "REQUEST_CREDIT"],
      minTier: 3,
    },
    {
      code: "07-Hereditary",
      name: "Hereditary / Majorat",
      weight: 70,
      can: ["MINT_FDC", "MINT_OBLIGATION", "REGISTER_DOC", "REGISTER_INSTRUMENT"],
      minTier: 4,
    },
    {
      code: "08-Procedural",
      name: "Procedural Legal",
      weight: 50,
      can: ["FILE_QUIET_TITLE", "INITIATE_LEGAL", "REGISTER_DOC"],
      minTier: 3,
    },
  ],
};

// ── Bootstrap Exception ───────────────────────────────────────────────────────
// The very first entry in an empty ledger may be DEFINE_CONSTITUTION from any
// stratum. After that, normal enforcement applies.
// This mirrors a "genesis block" exception — once the constitution exists,
// it defines its own successors.

export const BOOTSTRAP_ACTION: ActionToken = "DEFINE_CONSTITUTION";

// ── Enforcement Functions ─────────────────────────────────────────────────────

export interface AuthorisationResult {
  allowed: boolean;
  reason?: string;
}

export function canPerform(
  stratumCode: StratumCode,
  action: ActionToken,
  isBootstrap = false
): AuthorisationResult {
  // Bootstrap exception: empty ledger genesis
  if (isBootstrap && action === BOOTSTRAP_ACTION) {
    return { allowed: true };
  }

  const stratum = AUTHORITY_MODEL.strata.find((s) => s.code === stratumCode);

  if (!stratum) {
    return {
      allowed: false,
      reason: `Unknown stratum: ${stratumCode}`,
    };
  }

  if (!stratum.can.includes(action)) {
    return {
      allowed: false,
      reason: `Stratum ${stratum.name} (${stratumCode}) is not authorised to perform ${action}. Permitted actions: ${stratum.can.join(", ")}.`,
    };
  }

  return { allowed: true };
}

export function getStratumWeight(stratumCode: StratumCode): number {
  return AUTHORITY_MODEL.strata.find((s) => s.code === stratumCode)?.weight ?? 0;
}