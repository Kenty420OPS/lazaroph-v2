export type PaymentMethodType = "ewallet" | "bank";

export type PaymentMethod = {
  id: string; // Firestore doc id
  type: PaymentMethodType;
  name: string;
  accountName: string;
  accountNumber: string;
  instructions: string | null;
  qrPath: string | null;
  qrUrl: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string; // uid of the superadmin who last wrote
};

export type PaymentMethodInput = {
  type?: unknown;
  name?: unknown;
  accountName?: unknown;
  accountNumber?: unknown;
  instructions?: unknown;
  qrPath?: unknown;
  active?: unknown;
  sortOrder?: unknown;
};

export type ValidationResult =
  | { ok: true; value: {
      type: PaymentMethodType;
      name: string;
      accountName: string;
      accountNumber: string;
      instructions: string | null;
      active: boolean;
      sortOrder: number;
    } }
  | { ok: false; error: string };

const ACCOUNT_NUMBER_RE = /^[0-9 \-]+$/;

function trimStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : "";
}

// Validates + normalizes raw input for create/update.
// All strings are trimmed before validation.
export function validatePaymentMethodInput(input: PaymentMethodInput): ValidationResult {
  const type = input.type;
  if (type !== "ewallet" && type !== "bank") {
    return { ok: false, error: "type must be 'ewallet' or 'bank'" };
  }

  const name = trimStr(input.name);
  if (name === null || name.length < 1 || name.length > 50) {
    return { ok: false, error: "name must be 1-50 characters" };
  }

  const accountName = trimStr(input.accountName);
  if (accountName === null || accountName.length < 1 || accountName.length > 80) {
    return { ok: false, error: "accountName must be 1-80 characters" };
  }

  const accountNumber = trimStr(input.accountNumber);
  if (
    accountNumber === null ||
    accountNumber.length < 4 ||
    accountNumber.length > 40 ||
    !ACCOUNT_NUMBER_RE.test(accountNumber)
  ) {
    return { ok: false, error: "accountNumber must be 4-40 chars (digits, spaces, dashes only)" };
  }

  let instructions: string | null = null;
  if (input.instructions !== undefined && input.instructions !== null) {
    const ins = trimStr(input.instructions);
    if (ins === null) {
      return { ok: false, error: "instructions must be a string" };
    }
    if (ins.length > 300) {
      return { ok: false, error: "instructions must be at most 300 characters" };
    }
    instructions = ins.length > 0 ? ins : null;
  }

  if (typeof input.active !== "boolean") {
    return { ok: false, error: "active must be a boolean" };
  }

  if (
    typeof input.sortOrder !== "number" ||
    !Number.isInteger(input.sortOrder)
  ) {
    return { ok: false, error: "sortOrder must be an integer" };
  }

  return {
    ok: true,
    value: {
      type,
      name,
      accountName,
      accountNumber,
      instructions,
      active: input.active,
      sortOrder: input.sortOrder,
    },
  };
}

// Validates a partial PATCH body: only present fields are checked,
// and at least one updatable field must be present.
export function validatePaymentMethodPatch(input: PaymentMethodInput):
  | { ok: true; value: Partial<{
      type: PaymentMethodType;
      name: string;
      accountName: string;
      accountNumber: string;
      instructions: string | null;
      active: boolean;
      sortOrder: number;
    }> }
  | { ok: false; error: string } {
  const out: Record<string, unknown> = {};

  if (input.type !== undefined) {
    if (input.type !== "ewallet" && input.type !== "bank") {
      return { ok: false, error: "type must be 'ewallet' or 'bank'" };
    }
    out.type = input.type;
  }
  if (input.name !== undefined) {
    const v = trimStr(input.name);
    if (v === null || v.length < 1 || v.length > 50) {
      return { ok: false, error: "name must be 1-50 characters" };
    }
    out.name = v;
  }
  if (input.accountName !== undefined) {
    const v = trimStr(input.accountName);
    if (v === null || v.length < 1 || v.length > 80) {
      return { ok: false, error: "accountName must be 1-80 characters" };
    }
    out.accountName = v;
  }
  if (input.accountNumber !== undefined) {
    const v = trimStr(input.accountNumber);
    if (v === null || v.length < 4 || v.length > 40 || !ACCOUNT_NUMBER_RE.test(v)) {
      return { ok: false, error: "accountNumber must be 4-40 chars (digits, spaces, dashes only)" };
    }
    out.accountNumber = v;
  }
  if (input.instructions !== undefined) {
    if (input.instructions === null) {
      out.instructions = null;
    } else {
      const v = trimStr(input.instructions);
      if (v === null || v.length > 300) {
        return { ok: false, error: "instructions must be at most 300 characters" };
      }
      out.instructions = v.length > 0 ? v : null;
    }
  }
  if (input.active !== undefined) {
    if (typeof input.active !== "boolean") {
      return { ok: false, error: "active must be a boolean" };
    }
    out.active = input.active;
  }
  if (input.sortOrder !== undefined) {
    if (typeof input.sortOrder !== "number" || !Number.isInteger(input.sortOrder)) {
      return { ok: false, error: "sortOrder must be an integer" };
    }
    out.sortOrder = input.sortOrder;
  }

  if (Object.keys(out).length === 0) {
    return { ok: false, error: "No updatable fields provided" };
  }

  return { ok: true, value: out };
}
