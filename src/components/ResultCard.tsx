import type { DemoResult } from "../domain/analysisTypes";

export function ResultCard({ result }: { result: DemoResult }) {
  return (
    <section className="result-card" aria-labelledby="result-heading">
      <p className="eyebrow">Simulated demo output</p>
      <h2 id="result-heading">Recognition result</h2>
      <dl>
        <div><dt>Detected item</dt><dd>{result.item}</dd></div>
        <div><dt>Estimated dimensions</dt><dd>{result.dimensionsM.map((value) => value.toFixed(2)).join(" × ")} m</dd></div>
        <div><dt>Estimated base volume</dt><dd>{result.volumeM3.toFixed(2)} m3</dd></div>
        <div><dt>Confidence</dt><dd>{result.confidence}</dd></div>
      </dl>
      <fieldset>
        <legend>Clarify the storage context</legend>
        <label>Will the bicycle be stored intact? <select defaultValue=""><option value="" disabled>Choose</option><option>Yes</option><option>No</option></select></label>
        <label>Can other items be stacked above it? <select defaultValue=""><option value="" disabled>Choose</option><option>Yes</option><option>No</option></select></label>
      </fieldset>
    </section>
  );
}
