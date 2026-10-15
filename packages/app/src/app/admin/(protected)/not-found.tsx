import Link from "next/link";

/** Admin 404: an unknown or malformed record id in an admin URL (`notFound()`). */
export default function AdminNotFound() {
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
      <p className="text-sm text-muted-foreground">This record does not exist or was deleted.</p>
      <Link href="/admin" className="w-fit text-sm underline underline-offset-4">
        Back to the dashboard
      </Link>
    </div>
  );
}
