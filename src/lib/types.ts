export type Category = string;

export type Product = {
  sku: string;
  name: string;
  category: Category;
  unitPriceCents: number;
  subscription: boolean;
  note: string;
};

export type Mandate = {
  id: string;
  buyerName: string;
  buyerRole: string;
  buyerOrg: string;
  merchantName: string;
  merchantPlace: string;
  signedAt: string;
  expiresAt: string;
  currency: "USD";
  categories: Category[];
  maxUnitPriceCents: number;
  maxBasketCents: number;
  maxQtyPerSku: number;
  allowSubscriptions: boolean;
};

export type ProposedLine = {
  sku: string;
  qty: number;
  because: string;
};

export type AgentSource = "policy" | "groq" | "gemini";

export type Proposal = {
  rationale: string;
  lines: ProposedLine[];
  source: AgentSource;
  model?: string;
  modelError?: string;
};

export type RuleId =
  | "shelf"
  | "category"
  | "unit-price"
  | "quantity"
  | "subscription"
  | "basket"
  | "expiry"
  | "nonempty";

export type Violation = {
  rule: RuleId;
  detail: string;
  sku?: string;
};

export type LineVerdict = {
  sku: string;
  name: string;
  category: Category | "unknown";
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
  because: string;
  subscription: boolean;
  passed: boolean;
  violations: Violation[];
};

export type RuleResult = {
  id: RuleId;
  label: string;
  passed: boolean;
  detail: string;
};

export type Verdict = {
  passed: boolean;
  lines: LineVerdict[];
  basketCents: number;
  rules: RuleResult[];
};

export type ExhibitStatus =
  | "refused"
  | "cleared"
  | "awaiting_paypal"
  | "captured"
  | "rehearsal";

export type Exhibit = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ExhibitStatus;
  prompt: string;
  mandateId: string;
  mandateHash: string;
  letter: Mandate;
  proposal: Proposal;
  verdict: Verdict;
  paypal?: {
    orderId: string;
    captureId?: string;
    approveUrl?: string;
    status?: string;
  };
};
