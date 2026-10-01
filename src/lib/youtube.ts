export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return isVideoId(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return isVideoId(id) ? id : null;
      }
      const parts = url.pathname.split("/").filter(Boolean);
      if ((parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") && isVideoId(parts[1])) {
        return parts[1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

function isVideoId(value: string | null | undefined): value is string {
  return !!value && /^[\w-]{11}$/.test(value);
}

export function isYouTubeUrl(input: string): boolean {
  return parseYouTubeId(input) !== null;
}

export function watchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function thumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

type OEmbed = { title?: string; author_name?: string; thumbnail_url?: string };

function splitTitle(title: string): { title: string; artist: string } {
  const cleaned = title.replace(/\s*[([].*official.*[)\]]/i, "").trim();
  const parts = cleaned.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  }
  return { title: cleaned, artist: "" };
}

export async function fetchTrack(url: string): Promise<{
  id: string;
  url: string;
  title: string;
  artist: string;
  artworkUrl: string;
}> {
  const id = parseYouTubeId(url);
  if (!id) throw new Error("Please paste a valid YouTube link");
  const canonical = watchUrl(id);
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(canonical)}`);
    if (res.ok) {
      const data = (await res.json()) as OEmbed;
      const parsed = splitTitle(data.title || "Untitled");
      return {
        id,
        url: canonical,
        title: parsed.title,
        artist: parsed.artist || data.author_name || "",
        artworkUrl: data.thumbnail_url || thumbnailUrl(id),
      };
    }
  } catch {
    /* fall through */
  }
  return {
    id,
    url: canonical,
    title: "YouTube track",
    artist: "",
    artworkUrl: thumbnailUrl(id),
  };
}
