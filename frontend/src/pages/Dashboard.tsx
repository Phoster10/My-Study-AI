import { LevelPanel } from "../components/LevelPanel";
import { SearchResults } from "../components/SearchResults";
import { IngestPanel } from "../components/IngestPanel";
import { SummaryPanel } from "../components/SummaryPanel";
import { ExamPanel } from "../components/ExamPanel";
import { ReviewQueue } from "../components/ReviewQueue";

export function Dashboard() {
  return (
    <main className="dashboard">
      <LevelPanel />
      <SearchResults />
      <IngestPanel />
      <SummaryPanel />
      <ExamPanel />
      <ReviewQueue />
    </main>
  );
}
