import React, { ChangeEvent, useEffect, useState, FormEvent } from "react";
import { Card, ICard } from "./Card";
import { clearIndex, crawlDocument, IUrlEntry } from "./utils";
import { Button } from "./Button";

interface ContextProps {
  className: string;
  selected: string[] | null;
}

export const Context: React.FC<ContextProps> = ({ className, selected }) => {
  const [cards, setCards] = useState<ICard[]>([]);
  const [entries, setEntries] = useState<IUrlEntry[]>([]); // <--- define entries state
  const [inputUrl, setInputUrl] = useState("");

  const [splittingMethod, setSplittingMethod] = useState("markdown");
  const [chunkSize, setChunkSize] = useState(256);
  const [overlap, setOverlap] = useState(1);

  useEffect(() => {
    const element = selected && document.getElementById(selected[0]);
    element?.scrollIntoView({ behavior: "smooth" });
  }, [selected]);

  const handleUrlInput = (event: ChangeEvent<HTMLInputElement>) => {
    setInputUrl(event.target.value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    crawlDocument(
      inputUrl, // <--- use inputUrl
      setEntries,
      setCards,
      splittingMethod,
      chunkSize,
      overlap
    );

    setInputUrl("");
  };

  const DropdownLabel: React.FC<
    React.PropsWithChildren<{ htmlFor: string }>
  > = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="text-white p-2 font-bold">
      {children}
    </label>
  );

  return (
    <div
      className={`flex flex-col space-y-4 overflow-y-scroll border-2 border-gray-500 w-full ${className}`}
    >
      <div className="flex flex-col items-start sticky top-0 w-full">
        <form onSubmit={handleSubmit} className="flex p-2 w-full">
          <input
            type="text"
            value={inputUrl}
            onChange={handleUrlInput}
            className="flex-grow mr-2 p-2"
            placeholder="Enter URL"
          />
          <button type="submit" className="p-2 bg-blue-500 text-white">
            Submit
          </button>
        </form>

        <div className="flex-grow w-full px-4">
          <Button
            className="w-full my-2"
            style={{
              backgroundColor: "#4f6574",
              color: "white",
            }}
            onClick={() => clearIndex(setEntries, setCards)}
          >
            Clear Index
          </Button>
        </div>
        <div className="flex p-2"></div>
        <div className="text-left w-full ml-1 mr-1 flex flex-col bg-gray-600 p-3  subpixel-antialiased">
          <DropdownLabel htmlFor="splittingMethod">
            Splitting Method:
          </DropdownLabel>
          <div className="relative w-full">
            <select
              id="splittingMethod"
              value={splittingMethod}
              className="p-2 bg-gray-700 rounded text-white w-full appearance-none"
              onChange={(e) => setSplittingMethod(e.target.value)}
            >
              <option value="recursive">Recursive Text Splitting</option>
              <option value="markdown">Markdown Splitting</option>
            </select>
          </div>
          {splittingMethod === "recursive" && (
            <div className="my-4 flex flex-col">
              <div className="flex flex-col w-full">
                <DropdownLabel htmlFor="chunkSize">
                  Chunk Size: {chunkSize}
                </DropdownLabel>
                <input
                  className="p-2 bg-gray-700"
                  type="range"
                  id="chunkSize"
                  min={1}
                  max={2048}
                  onChange={(e) => setChunkSize(parseInt(e.target.value))}
                />
              </div>
              <div className="flex flex-col w-full">
                <DropdownLabel htmlFor="overlap">
                  Overlap: {overlap}
                </DropdownLabel>
                <input
                  className="p-2 bg-gray-700"
                  type="range"
                  id="overlap"
                  min={1}
                  max={200}
                  onChange={(e) => setOverlap(parseInt(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap w-full">
        {cards &&
          cards.map((card, key) => (
            <Card key={key} card={card} selected={selected} />
          ))}
      </div>
    </div>
  );
};
