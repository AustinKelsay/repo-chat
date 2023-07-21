import { NodeHtmlMarkdown } from "node-html-markdown";
import { Octokit } from "@octokit/rest";

interface RepoFile {
  path: string;
  content: string;
}

class Crawler {
  private files: RepoFile[] = [];
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit();
  }

  async crawlGitRepo(owner: string, repo: string): Promise<RepoFile[]> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: "",
      });
      const fileList = data as { [key: string]: any }[];

      for (const file of fileList) {
        if (file.type === "file") {
          try {
            const fileData = await this.octokit.rest.repos.getContent({
              owner,
              repo,
              path: file.path,
            });

            // The content of a file is base64 encoded
            const content = Buffer.from(
              fileData.data.content,
              "base64"
            ).toString("utf8");

            // If the file is markdown, translate it
            if (file.path.endsWith(".md")) {
              this.files.push({
                path: file.path,
                content: NodeHtmlMarkdown.translate(content),
              });
            } else {
              this.files.push({ path: file.path, content });
            }
          } catch (error) {
            console.error(
              `Failed to fetch file ${file.path} from GitHub repository: ${error}`
            );
            continue; // continue with the next file
          }
        }
      }

      return this.files;
    } catch (error) {
      console.error(`Failed to fetch files from GitHub repository: ${error}`);
      return [];
    }
  }
}

export { Crawler };
export type { RepoFile };
