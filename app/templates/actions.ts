"use server";

import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { createTemplate, updateTemplate } from "@/lib/events";
import {
  DUPLICATABLE_FILE_TYPES,
  FILE_TYPE_EXPECT_KIND,
  type FileTypeConfig,
  type TemplateTaskItem,
} from "@/lib/events/types";
import { getGoogleFileMeta, parseGoogleFileId } from "@/lib/google/drive";

async function requireAdmin() {
  const ctx = await requireMembership();
  if (ctx.membership.role !== "admin") {
    throw new Error("Only admins can create or edit templates with Google sources");
  }
  return ctx;
}

/**
 * Resolve pasted Google links/ids into { sourceFileId, sourceUrl } and validate
 * the connected account can read them. Clears source when the field is empty.
 */
async function resolveFileTypeSources(
  workspaceId: string,
  configs: FileTypeConfig[],
): Promise<FileTypeConfig[]> {
  const out: FileTypeConfig[] = [];

  for (const config of configs) {
    if (
      !DUPLICATABLE_FILE_TYPES.includes(config.key) ||
      (!config.sourceUrl && !config.sourceFileId)
    ) {
      out.push({
        key: config.key,
        sourceFileId: null,
        sourceUrl: null,
      });
      continue;
    }

    const raw = (config.sourceUrl || config.sourceFileId || "").trim();
    let fileId: string;
    try {
      fileId = parseGoogleFileId(raw);
    } catch (err) {
      throw new Error(
        `${labelFor(config.key)}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const expectKind = FILE_TYPE_EXPECT_KIND[config.key];
    try {
      const meta = await getGoogleFileMeta(workspaceId, fileId);
      if (expectKind && meta.kind !== expectKind) {
        throw new Error(
          `Expected a ${expectKindLabel(expectKind)}, but that link is a ${expectKindLabel(meta.kind!)}.`,
        );
      }
      out.push({
        key: config.key,
        sourceFileId: meta.fileId,
        sourceUrl: looksLikeUrl(raw) ? raw : meta.webViewLink,
      });
    } catch (err) {
      throw new Error(
        `${labelFor(config.key)}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return out;
}

function looksLikeUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function labelFor(key: FileTypeConfig["key"]): string {
  switch (key) {
    case "rsvp_form":
      return "RSVP form";
    case "slides":
      return "Slides";
    case "signin_sheet":
      return "Sign-in sheet";
    default:
      return key;
  }
}

function expectKindLabel(kind: string): string {
  switch (kind) {
    case "document":
      return "Google Doc";
    case "spreadsheet":
      return "Google Sheet";
    case "presentation":
      return "Google Slides";
    case "form":
      return "Google Form";
    default:
      return kind;
  }
}

export async function actionCreateTemplate(form: {
  name: string;
  taskItems: TemplateTaskItem[];
  fileTypeConfigs: FileTypeConfig[];
}) {
  const { workspace, membership } = await requireMembership();
  const isAdmin = membership.role === "admin";

  let fileTypeConfigs = form.fileTypeConfigs.map((c) => ({
    key: c.key,
    sourceFileId: null as string | null,
    sourceUrl: null as string | null,
  }));

  if (isAdmin) {
    fileTypeConfigs = await resolveFileTypeSources(
      workspace.id,
      form.fileTypeConfigs,
    );
  }

  const template = await createTemplate({
    workspaceId: workspace.id,
    name: form.name,
    taskItems: form.taskItems,
    fileTypeConfigs,
  });
  redirect(`/templates/${template.id}`);
}

export async function actionUpdateTemplate(form: {
  templateId: string;
  name: string;
  taskItems: TemplateTaskItem[];
  fileTypeConfigs: FileTypeConfig[];
}) {
  const { workspace, membership } = await requireMembership();
  const isAdmin = membership.role === "admin";

  let fileTypeConfigs: FileTypeConfig[];

  if (isAdmin) {
    fileTypeConfigs = await resolveFileTypeSources(
      workspace.id,
      form.fileTypeConfigs,
    );
  } else {
    // Officers can edit name/tasks/checklist keys but cannot change Google sources.
    // Preserve existing sources from the stored template for keys that remain enabled.
    const { getTemplate } = await import("@/lib/events");
    const existing = await getTemplate(form.templateId);
    if (existing.workspace_id !== workspace.id) {
      throw new Error("Template not found in this club");
    }
    const byKey = new Map(
      existing.file_type_configs.map((c) => [c.key, c] as const),
    );
    fileTypeConfigs = form.fileTypeConfigs.map((c) => {
      const prev = byKey.get(c.key);
      return {
        key: c.key,
        sourceFileId: prev?.sourceFileId ?? null,
        sourceUrl: prev?.sourceUrl ?? null,
      };
    });
  }

  await updateTemplate(form.templateId, {
    name: form.name,
    taskItems: form.taskItems,
    fileTypeConfigs,
  });
  redirect(`/templates/${form.templateId}`);
}

/** Admin-only: validate a Google source link without saving (optional UX helper). */
export async function actionValidateGoogleSource(form: {
  fileTypeKey: FileTypeConfig["key"];
  source: string;
}) {
  const { workspace } = await requireAdmin();
  if (!DUPLICATABLE_FILE_TYPES.includes(form.fileTypeKey)) {
    throw new Error("This file type does not support duplicate-from");
  }
  const expectKind = FILE_TYPE_EXPECT_KIND[form.fileTypeKey];
  const meta = await getGoogleFileMeta(workspace.id, form.source);
  if (expectKind && meta.kind !== expectKind) {
    throw new Error(
      `Expected a ${expectKindLabel(expectKind)}, but that link is a ${expectKindLabel(meta.kind!)}.`,
    );
  }
  return {
    fileId: meta.fileId,
    name: meta.name,
    kind: meta.kind,
    url: meta.webViewLink,
  };
}
