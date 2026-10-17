/**
 * Pure-function smoke test (no scaffold / DB required).
 * Run: node lib/tasks/__smoke_test.mjs
 */

function pacificDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function mapTaskRow(row, assigneeIds = [], taggedOfficerIds = []) {
  const STATUSES = ["todo", "doing", "done"];
  const DIFFICULTIES = ["easy", "medium", "hard"];
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    title: row.title,
    description: row.description,
    eventId: row.event_id,
    dueAt: row.due_at,
    status: STATUSES.includes(row.status) ? row.status : "todo",
    difficulty: DIFFICULTIES.includes(row.difficulty) ? row.difficulty : "medium",
    isPrereq: Boolean(row.is_prereq),
    completedAt: row.completed_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assigneeIds,
    taggedOfficerIds,
  };
}

function shouldEmailAssignee({ assigneeId, createdBy, lastEmailedOn, today }) {
  if (assigneeId === createdBy) return false;
  if (lastEmailedOn === today) return false;
  return true;
}

const row = {
  id: "t1",
  workspace_id: "w1",
  title: "jackson: book room",
  description: null,
  event_id: "e1",
  due_at: "2026-10-20T18:00:00.000Z",
  status: "todo",
  difficulty: "easy",
  is_prereq: true,
  completed_at: null,
  created_by: "u-creator",
  created_at: "2026-10-17T00:00:00.000Z",
  updated_at: "2026-10-17T00:00:00.000Z",
};

const task = mapTaskRow(row, ["u-a", "u-creator"], ["u-tag"]);
const today = "2026-10-17";

const asserts = [
  ["maps workspaceId", task.workspaceId === "w1"],
  ["maps dueAt", task.dueAt === "2026-10-20T18:00:00.000Z"],
  ["maps isPrereq", task.isPrereq === true],
  ["maps assignees", task.assigneeIds.join(",") === "u-a,u-creator"],
  ["maps tags", task.taggedOfficerIds.join(",") === "u-tag"],
  [
    "email other assignee first time",
    shouldEmailAssignee({
      assigneeId: "u-a",
      createdBy: "u-creator",
      lastEmailedOn: null,
      today,
    }) === true,
  ],
  [
    "no email self-assign",
    shouldEmailAssignee({
      assigneeId: "u-creator",
      createdBy: "u-creator",
      lastEmailedOn: null,
      today,
    }) === false,
  ],
  [
    "no second email same Pacific day",
    shouldEmailAssignee({
      assigneeId: "u-a",
      createdBy: "u-creator",
      lastEmailedOn: today,
      today,
    }) === false,
  ],
  ["pacificDateString shape", /^\d{4}-\d{2}-\d{2}$/.test(pacificDateString())],
];

let failed = 0;
for (const [name, ok] of asserts) {
  if (!ok) {
    console.error("FAIL:", name);
    failed += 1;
  } else {
    console.log("ok:", name);
  }
}

if (failed) process.exit(1);
console.log("All smoke checks passed.");
