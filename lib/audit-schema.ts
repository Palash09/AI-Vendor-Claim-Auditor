import { z } from "zod";
import { dataSensitivities, decisionImpacts } from "@/db/schema";

const optionalHttpUrl = z
  .string()
  .trim()
  .max(2_000)
  .refine(
    (value) => value.length === 0 || /^https?:\/\//i.test(value),
    "Enter a complete http:// or https:// URL.",
  );

export const createAuditSchema = z
  .object({
    vendorName: z.string().trim().min(2).max(160),
    productUrl: optionalHttpUrl,
    productDescription: z.string().trim().max(8_000),
  })
  .refine((value) => value.productUrl || value.productDescription, {
    message: "Add a product URL or a product description.",
    path: ["productUrl"],
  });

export const updateAuditSchema = z.union([
  createAuditSchema.and(z.object({ section: z.literal("vendor") })),
  z.object({
    section: z.literal("context"),
    intendedUse: z.string().trim().min(10).max(4_000),
    dataSensitivity: z.enum(dataSensitivities),
    decisionImpact: z.enum(decisionImpacts),
    assumptions: z.string().trim().max(2_000).default(""),
  }),
  z.object({
    section: z.literal("progress"),
    currentStep: z.literal(4),
  }),
]);

export const urlSourceSchema = z.object({
  url: z
    .string()
    .trim()
    .url()
    .refine((value) => /^https?:\/\//i.test(value), "Use an http(s) URL."),
});

export type CreateAuditInput = z.infer<typeof createAuditSchema>;
export type UpdateAuditInput = z.infer<typeof updateAuditSchema>;
