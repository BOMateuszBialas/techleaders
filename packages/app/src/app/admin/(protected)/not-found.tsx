import { TextLink } from "@/components/ui/text-link";

/** Admin 404: an unknown or malformed record id in an admin URL (`notFound()`). */
export default function AdminNotFound() {
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <h1 className="type-h1">Not found</h1>
      <p className="type-body text-muted-foreground">This record does not exist or was deleted.</p>
      <TextLink href="/admin" variant="standalone">
        Back to the dashboard
      </TextLink>
    </div>
  );
}
