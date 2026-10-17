import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { listWorkspaceOfficers } from "@/lib/tasks";
import { CreateTaskForm } from "@/components/tasks/create-task-form";

type SearchParams = Promise<{ workspaceId?: string }>;

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const workspaceId = params.workspaceId;

  if (!workspaceId) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-2xl font-medium text-black">New task</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Missing <code>workspaceId</code> query param.
        </p>
      </main>
    );
  }

  await requireMembership(workspaceId);

  let officers = [] as Awaited<ReturnType<typeof listWorkspaceOfficers>>;
  let loadError: string | null = null;
  try {
    officers = await listWorkspaceOfficers(workspaceId);
  } catch (err) {
    loadError =
      err instanceof Error ? err.message : "Failed to load officers";
  }

  return (
    <main className="mx-auto max-w-xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-medium text-black">New task</h1>
        <Link
          href={`/tasks?workspaceId=${workspaceId}`}
          className="rounded-full border border-black bg-white px-4 py-2 text-sm text-black hover:bg-black hover:text-white"
        >
          Back
        </Link>
      </div>

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}

      <CreateTaskForm workspaceId={workspaceId} officers={officers} />
    </main>
  );
}
