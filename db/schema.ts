import { index, integer, pgTable, text } from "drizzle-orm/pg-core";

export const auditStatuses = [
  "draft",
  "extracting",
  "analyzing",
  "review_required",
  "approved",
  "export_ready",
  "failed",
  "deleted",
] as const;

export const dataSensitivities = [
  "public",
  "internal",
  "confidential",
  "regulated",
] as const;

export const decisionImpacts = ["low", "medium", "high"] as const;

export const sourceKinds = ["url", "file"] as const;
export const sourceStatuses = ["uploaded", "pending", "failed"] as const;

export const audits = pgTable(
  "audits",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    vendorName: text("vendor_name").notNull(),
    productUrl: text("product_url"),
    productDescription: text("product_description"),
    intendedUse: text("intended_use"),
    dataSensitivity: text("data_sensitivity", {
      enum: dataSensitivities,
    }),
    decisionImpact: text("decision_impact", { enum: decisionImpacts }),
    assumptions: text("assumptions").notNull().default(""),
    status: text("status", { enum: auditStatuses }).notNull().default("draft"),
    currentStep: integer("current_step").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (table) => [
    index("idx_audits_owner_updated").on(table.ownerId, table.updatedAt),
    index("idx_audits_expires_at").on(table.expiresAt),
  ],
);

export const sources = pgTable(
  "sources",
  {
    id: text("id").primaryKey(),
    auditId: text("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    kind: text("kind", { enum: sourceKinds }).notNull(),
    title: text("title").notNull(),
    url: text("url"),
    originalFileName: text("original_file_name"),
    storageKey: text("storage_key"),
    contentType: text("content_type"),
    sizeBytes: integer("size_bytes"),
    status: text("status", { enum: sourceStatuses })
      .notNull()
      .default("pending"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_sources_audit").on(table.auditId),
    index("idx_sources_owner").on(table.ownerId),
  ],
);

export const analysisResults = pgTable(
  "analysis_results",
  {
    auditId: text("audit_id")
      .primaryKey()
      .references(() => audits.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    mode: text("mode", { enum: ["openai", "demo"] }).notNull(),
    summary: text("summary").notNull(),
    findingsJson: text("findings_json").notNull(),
    questionsJson: text("questions_json").notNull(),
    extractionWarningsJson: text("extraction_warnings_json").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("idx_analysis_results_owner").on(table.ownerId)],
);

export const sourceFragments = pgTable(
  "source_fragments",
  {
    id: text("id").primaryKey(),
    auditId: text("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    ownerId: text("owner_id").notNull(),
    sourceId: text("source_id").notNull(),
    sourceTitle: text("source_title").notNull(),
    sourceLocation: text("source_location").notNull(),
    text: text("text").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_source_fragments_audit").on(table.auditId),
    index("idx_source_fragments_owner").on(table.ownerId),
  ],
);

export const analysisRuns = pgTable(
  "analysis_runs",
  {
    id: text("id").primaryKey(),
    auditId: text("audit_id").notNull(),
    ownerId: text("owner_id").notNull(),
    requestedAt: text("requested_at").notNull(),
  },
  (table) => [
    index("idx_analysis_runs_owner_requested").on(
      table.ownerId,
      table.requestedAt,
    ),
    index("idx_analysis_runs_requested").on(table.requestedAt),
  ],
);
