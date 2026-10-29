import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchResults } from "../src/components/SearchResults";
import { useStudyStore } from "../src/store/useStudyStore";

beforeEach(() => useStudyStore.getState().reset());

describe("SearchResults", () => {
  it("renders nothing when there is no search result", () => {
    const { container } = render(<SearchResults />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the search result from the store", () => {
    useStudyStore.getState().setSearchResult("Mitochondria produce ATP.");
    render(<SearchResults />);
    expect(screen.getByText("Mitochondria produce ATP.")).toBeInTheDocument();
  });

  it("clears the result when dismissed", () => {
    useStudyStore.getState().setSearchResult("Some answer");
    render(<SearchResults />);
    fireEvent.click(screen.getByText(/dismiss/i));
    expect(useStudyStore.getState().searchResult).toBeNull();
  });
});
