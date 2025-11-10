import { ContentWriterState } from "../types";

export function shouldRegenerate(state: ContentWriterState): "regenerate" | "human_review" | "complete" {
  const brandScore = state.brandScore ?? 100;
  const factScore = state.factScore ?? 100;
  const regenerationCount = state.metadata?.regenerationCount ?? 0;

  if (regenerationCount >= 3) {
    return "human_review";
  }

  if (brandScore < 70 || factScore < 70) {
    return "regenerate";
  }

  return "complete";
}
