/** Public contracts for events (Dom + rest of app). Keep getEvent/listEvents signatures. */

export { getEvent } from "./get-event";
export { listEvents } from "./list-events";
export { createEventFromTemplate } from "./create-from-template";
export {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
} from "./templates";
export {
  eventLinks,
  parseTaskItems,
  parseFileTypes,
  ALL_FILE_TYPES,
} from "./types";
export type {
  Event,
  EventTemplate,
  TemplateTaskItem,
  FileTypeKey,
  EventLinks,
  CreateFromTemplateInput,
} from "./types";
