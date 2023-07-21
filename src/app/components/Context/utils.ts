import { ICard } from "./Card";
import { Octokit } from "@octokit/rest";

// Create IUrlEntry type
export interface IUrlEntry {
  url: string;
  loading: boolean;
  seeded: boolean;
}

// Parse a GitHub URL into owner and repo
function parseGithubUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  throw new Error("Invalid GitHub URL");
}

// Crawl GitHub document and update states for entries and cards
export async function crawlDocument(
  url: string,
  setEntries: React.Dispatch<React.SetStateAction<IUrlEntry[]>>,
  setCards: React.Dispatch<React.SetStateAction<ICard[]>>,
  splittingMethod: string,
  chunkSize: number,
  overlap: number
): Promise<void> {
  setEntries((entries: IUrlEntry[]) =>
    entries.map((entry: IUrlEntry) =>
      entry.url === url ? { ...entry, loading: true } : entry
    )
  );

  const octokit = new Octokit();
  const { owner, repo } = parseGithubUrl(url);
  const { data: files } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: "",
  });

  const cards = files.map((file) => ({
    pageContent: file.content,
    metadata: {
      hash: file.sha,
    },
  }));

  setCards(cards);

  setEntries((prevEntries: IUrlEntry[]) =>
    prevEntries.map((entry: IUrlEntry) =>
      entry.url === url ? { ...entry, seeded: true, loading: false } : entry
    )
  );
}

// Clear the current index and reset states for entries and cards
export async function clearIndex(
  setEntries: React.Dispatch<React.SetStateAction<IUrlEntry[]>>,
  setCards: React.Dispatch<React.SetStateAction<ICard[]>>
) {
  const response = await fetch("/api/clearIndex", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (response.ok) {
    setEntries((prevEntries: IUrlEntry[]) =>
      prevEntries.map((entry: IUrlEntry) => ({
        ...entry,
        seeded: false,
        loading: false,
      }))
    );
    setCards([]);
  }
}
