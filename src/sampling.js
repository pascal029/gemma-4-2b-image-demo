// Top-k then top-p (nucleus) filtering, in the same order as Hugging Face transformers.
// transformers.js 4.3.0 declares TopPLogitsWarper but never applies it, so top_p would be ignored.
// Edits `scores` in place: every token outside the nucleus becomes -Infinity.
export function nucleusFilter(scores, topK, topP) {
  // Indices of the topK highest scores, highest first.
  const best = [];
  for (let index = 0; index < scores.length; index++) {
    const score = scores[index];
    if (best.length === topK && score <= scores[best[topK - 1]]) continue;
    const position = best.findIndex((bestIndex) => scores[bestIndex] < score);
    if (position === -1) best.push(index);
    else best.splice(position, 0, index);
    if (best.length > topK) best.pop();
  }

  // Softmax over the top-k, then keep the fewest tokens whose probability reaches topP.
  const highest = scores[best[0]];
  const weights = best.map((index) => Math.exp(scores[index] - highest));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cumulative = 0;
  let keep = 0;
  while (keep < best.length && cumulative < topP) {
    cumulative += weights[keep] / total;
    keep++;
  }

  const kept = best.slice(0, keep).map((index) => [index, scores[index]]);
  scores.fill(-Infinity);
  for (const [index, score] of kept) scores[index] = score;
  return scores;
}
