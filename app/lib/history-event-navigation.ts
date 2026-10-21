export type HistoryShareResult = "shared" | "copied" | "cancelled" | "unavailable";

type SharePayload = { title: string; text?: string; url: string };
type HistoryShareNavigator = {
  share?: (payload: SharePayload) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

export function historyEventFromUrl(raw: string, validIds: ReadonlySet<string>): string | null {
  const id = new URL(raw, "https://site.invalid").searchParams.get("evento");
  return id !== null && validIds.has(id) ? id : null;
}

export function historyEventUrl(id: string): string {
  return `/polisrossa?${new URLSearchParams({ view: "teoria", percorso: "timeline", evento: id })}`;
}

export function historyTimelineUrl(id?: string): string {
  const url = "/polisrossa?view=teoria&percorso=timeline";
  return id ? `${url}#${encodeURIComponent(id)}` : url;
}

export async function copyHistoryEventUrl(
  navigatorLike: HistoryShareNavigator,
  url: string,
): Promise<HistoryShareResult> {
  if (!navigatorLike.clipboard?.writeText) return "unavailable";
  try {
    await navigatorLike.clipboard.writeText(url);
    return "copied";
  } catch {
    return "unavailable";
  }
}

export async function shareHistoryEvent(
  navigatorLike: HistoryShareNavigator,
  payload: SharePayload,
): Promise<HistoryShareResult> {
  if (navigatorLike.share) {
    try {
      await navigatorLike.share(payload);
      return "shared";
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return "cancelled";
    }
  }
  return copyHistoryEventUrl(navigatorLike, payload.url);
}
