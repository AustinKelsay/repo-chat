import { getEmbeddings } from "@/utils/embeddings";
import {
  Document,
  MarkdownTextSplitter,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import { utils as PineconeUtils, Vector } from "@pinecone-database/pinecone";
import md5 from "md5";
import { getPineconeClient } from "@/utils/pinecone";
import { Crawler, RepoFile } from "./crawler";
import { truncateStringByBytes } from "@/utils/truncateString";

const { chunkedUpsert, createIndexIfNotExists } = PineconeUtils;

interface SeedOptions {
  splittingMethod: string;
  chunkSize: number;
  chunkOverlap: number;
}

type DocumentSplitter = RecursiveCharacterTextSplitter | MarkdownTextSplitter;

async function seed(
  owner: string,
  repo: string,
  indexName: string,
  options: SeedOptions
) {
  try {
    // Initialize the Pinecone client
    const pinecone = await getPineconeClient();

    // Destructure the options object
    const { splittingMethod, chunkSize, chunkOverlap } = options;

    // Create a new Crawler instance
    const crawler = new Crawler(1, 1);

    // Crawl the given Git repo and get the files
    const files = await crawler.crawlGitRepo(owner, repo);

    // Choose the appropriate document splitter based on the splitting method
    const splitter: DocumentSplitter =
      splittingMethod === "recursive"
        ? new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap })
        : new MarkdownTextSplitter({});

    // Prepare documents by splitting the files
    const documents = await Promise.all(
      files.map((file) => prepareDocument(file, splitter))
    );

    // Create Pinecone index if it does not exist
    await createIndexIfNotExists(pinecone!, indexName, 1536);
    const index = pinecone && pinecone.Index(indexName);

    // Get the vector embeddings for the documents
    const vectors = await Promise.all(documents.flat().map(embedDocument));

    // Upsert vectors into the Pinecone index
    await chunkedUpsert(index!, vectors, "", 10);

    // Return the first document
    return documents[0];
  } catch (error) {
    console.error("Error seeding:", error);
    throw error;
  }
}

async function embedDocument(doc: Document): Promise<Vector> {
  try {
    // Generate OpenAI embeddings for the document content
    const embedding = await getEmbeddings(doc.pageContent);

    // Create a hash of the document content
    const hash = md5(doc.pageContent);

    // Return the vector embedding object
    return {
      id: hash, // The ID of the vector is the hash of the document content
      values: embedding, // The vector values are the OpenAI embeddings
      metadata: {
        // The metadata includes details about the document
        chunk: doc.pageContent, // The chunk of text that the vector represents
        path: doc.metadata.path as string, // The path of the file in the repository
        hash: doc.metadata.hash as string, // The hash of the document content
      },
    } as Vector;
  } catch (error) {
    console.log("Error embedding document: ", error);
    throw error;
  }
}

async function prepareDocument(
  file: RepoFile,
  splitter: DocumentSplitter
): Promise<Document[]> {
  // Get the content of the file
  const fileContent = file.content;

  // Split the documents using the provided splitter
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent: fileContent,
      metadata: {
        path: file.path,
        // Truncate the text to a maximum byte length
        text: truncateStringByBytes(fileContent, 36000),
      },
    }),
  ]);

  // Map over the documents and add a hash to their metadata
  return docs.map((doc: Document) => {
    return {
      pageContent: doc.pageContent,
      metadata: {
        ...doc.metadata,
        // Create a hash of the document content
        hash: md5(doc.pageContent),
      },
    };
  });
}

export default seed;
