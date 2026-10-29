import { ReviewQueue } from "../components/ReviewQueue";

export function Review() {
  return (
    <div className="page-header-wrap">
      <h1 className="page-title">Review</h1>
      <ReviewQueue />
    </div>
  );
}
