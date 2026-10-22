const KIND = /^[a-z][a-z0-9-]{0,63}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;

export type KnowledgeSelection = { kind: string; id: string };

export function knowledgeEntityUrl(kind: string, id: string): string {
  if (!KIND.test(kind) || !ID.test(id)) {
    throw new Error("Invalid public knowledge identity");
  }
  const query = new URLSearchParams({
    view: "teoria",
    percorso: "timeline",
    knowledgeKind: kind,
    knowledgeId: id,
  });
  return `/polisrossa?${query}`;
}

export function knowledgeSelectionFromUrl(raw: string): KnowledgeSelection | null {
  const url = new URL(raw, "https://site.invalid");
  const kind = url.searchParams.get("knowledgeKind");
  const id = url.searchParams.get("knowledgeId");
  if (!kind && !id) return null;
  if (
    !kind ||
    !id ||
    !KIND.test(kind) ||
    !ID.test(id) ||
    url.searchParams.getAll("knowledgeKind").length !== 1 ||
    url.searchParams.getAll("knowledgeId").length !== 1
  ) {
    return null;
  }
  return { kind, id };
}
