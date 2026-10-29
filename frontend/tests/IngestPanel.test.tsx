import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { IngestPanel } from "../src/components/IngestPanel";
import { useStudyStore } from "../src/store/useStudyStore";
import { api } from "../src/api/client";

vi.mock("../src/api/client", () => ({ api: { ingestFile: vi.fn() } }));

beforeEach(() => { useStudyStore.getState().reset(); vi.mocked(api.ingestFile).mockReset(); });

const pickFile = (container: HTMLElement, file: File) => fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });

describe("IngestPanel", () => {
  it("stores pasted text in the store", () => {
    render(<IngestPanel />);
    fireEvent.change(screen.getByPlaceholderText(/paste your notes/i), { target: { value: "my notes" } });
    expect(useStudyStore.getState().sourceText).toBe("my notes");
  });

  it("uploads a file and puts the extracted text into the textarea", async () => {
    vi.mocked(api.ingestFile).mockResolvedValue({ text: "extracted from pdf", source: "pdf" });
    const { container } = render(<IngestPanel />);
    const file = new File(["x"], "notes.pdf", { type: "application/pdf" });
    pickFile(container, file);
    await waitFor(() => expect(useStudyStore.getState().sourceText).toBe("extracted from pdf"));
    expect(api.ingestFile).toHaveBeenCalledWith(file);
    expect(screen.getByPlaceholderText(/paste your notes/i)).toHaveValue("extracted from pdf");
  });

  it("shows an error when extraction fails", async () => {
    vi.mocked(api.ingestFile).mockRejectedValue(new Error("Unsupported file type"));
    const { container } = render(<IngestPanel />);
    pickFile(container, new File(["x"], "a.png", { type: "image/png" }));
    expect(await screen.findByText("Unsupported file type")).toBeInTheDocument();
  });
});
