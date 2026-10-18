"use server";

import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { createTemplate, deleteTemplate, updateTemplate } from "@/lib/events";
import {
  DUPLICATABLE_FILE_TYPES,
  FILE_TYPE_EXPECT_KIND,
  fileTypeLabel,
  type FileTypeConfig,
  type TemplateTaskItem,
} from "@/lib/events/types";
import { GoogleNotConnectedError } from "@/lib/google/client";
import { getGoogleFileMeta, parseGoogleFileId } from "@/lib/google/drive";

function googleSourceErrorMessage(err: unknown): string {
  if (err instanceof GoogleNotConnectedError) {
    return "Google is not connected for this club. An admin must connect it in Settings before saving Google source links.";
  }
  return err instanceof Error ? err.message : String(err);
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
      throw new Error(`${fileTypeLabel(config.key)}: ${googleSourceErrorMessage(err)}`);
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
      throw new Error(`${fileTypeLabel(config.key)}: ${googleSourceErrorMessage(err)}`);
    }
  }

  return out;
}

function looksLikeUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
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
  // Any club member who can open the template editor may set Google sources.
  const { workspace } = await requireMembership();
  const fileTypeConfigs = await resolveFileTypeSources(
    workspace.id,
    form.fileTypeConfigs,
  );

  await createTemplate({
    workspaceId: workspace.id,
    name: form.name,
    taskItems: form.taskItems,
    fileTypeConfigs,
  });
  redirect("/templates");
}

export async function actionUpdateTemplate(form: {
  templateId: string;
  name: string;
  taskItems: TemplateTaskItem[];
  fileTypeConfigs: FileTypeConfig[];
}) {
  const { workspace } = await requireMembership();
  const fileTypeConfigs = await resolveFileTypeSources(
    workspace.id,
    form.fileTypeConfigs,
  );

  await updateTemplate(form.templateId, {
    name: form.name,
    taskItems: form.taskItems,
    fileTypeConfigs,
  });
  redirect("/templates");
}

export async function actionDeleteTemplate(fd: FormData) {
  const { workspace } = await requireMembership();
  await deleteTemplate(workspace.id, String(fd.get("id")));
  redirect("/templates");
}

/** Validate a Google source link without saving (optional UX helper). */
export async function actionValidateGoogleSource(form: {
  fileTypeKey: FileTypeConfig["key"];
  source: string;
}) {
  const { workspace } = await requireMembership();
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
