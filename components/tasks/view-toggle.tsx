import Link from "next/link";

type Props = {
  workspaceId: string;
  view: "list" | "board";
};

export function ViewToggle({ workspaceId, view }: Props) {
  const base = `/tasks?workspaceId=${workspaceId}`;
  const pill =
    "rounded-full border border-black px-4 py-2 text-sm";
  const active = `${pill} bg-black text-white`;
  const idle = `${pill} bg-white text-black hover:bg-black hover:text-white`;

  return (
    <div className="flex gap-2">
      <Link href={`${base}&view=list`} className={view === "list" ? active : idle}>
        List
      </Link>
      <Link href={`${base}&view=board`} className={view === "board" ? active : idle}>
        Board
      </Link>
    </div>
  );
}
