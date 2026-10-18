import { getDb } from "@/lib/db";
import {
  parseFileTypes,
  parseTaskItems,
  type EventTemplate,
  type FileTypeKey,
  type TemplateTaskItem,
} from "./types";

function mapTemplate(row: {
  id: string;
  workspace_id: string;
  name: string;
  task_items: unknown;
  file_types: unknown;
  created_at: string;
}): EventTemplate {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    name: row.name,
    task_items: parseTaskItems(row.task_items),
    file_types: parseFileTypes(row.file_types),
    created_at: row.created_at,
  };
}

export async function listTemplates(workspaceId: string): Promise<EventTemplate[]> {
  const { data, error } = await getDb()
    .from("event_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });

  if (error) throw new Error(`listTemplates failed: ${error.message}`);
  return (data ?? []).map(mapTemplate);
}

export async function getTemplate(templateId: string): Promise<EventTemplate> {
  const { data, error } = await getDb()
    .from("event_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (error) throw new Error(`getTemplate failed: ${error.message}`);
  if (!data) throw new Error(`Template not found: ${templateId}`);
  return mapTemplate(data);
}

export type UpsertTemplateInput = {
  workspaceId: string;
  name: string;
  taskItems: TemplateTaskItem[];
  fileTypes: FileTypeKey[];
};

export async function createTemplate(input: UpsertTemplateInput): Promise<EventTemplate> {
  const { data, error } = await getDb()
    .from("event_templates")
    .insert({
      workspace_id: input.workspaceId,
      name: input.name,
      task_items: input.taskItems,
      file_types: input.fileTypes,
    })
    .select("*")
    .single();

  if (error) throw new Error(`createTemplate failed: ${error.message}`);
  return mapTemplate(data);
}

export async function updateTemplate(
  templateId: string,
  input: Omit<UpsertTemplateInput, "workspaceId">,
): Promise<EventTemplate> {
  const { data, error } = await getDb()
    .from("event_templates")
    .update({
      name: input.name,
      task_items: input.taskItems,
      file_types: input.fileTypes,
    })
    .eq("id", templateId)
    .select("*")
    .single();

  if (error) throw new Error(`updateTemplate failed: ${error.message}`);
  return mapTemplate(data);
}
