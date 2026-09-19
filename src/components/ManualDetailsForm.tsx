import { useState } from "react";

export function ManualDetailsForm() {
  const [itemName, setItemName] = useState("");
  return (
    <section className="manual-form" aria-labelledby="manual-heading">
      <h2 id="manual-heading">Enter item details manually</h2>
      <label htmlFor="item-name">Item name</label>
      <input id="item-name" required value={itemName} onChange={(event) => setItemName(event.target.value)} />
      <div className="dimension-fields">
        <label htmlFor="length">Length (m)<input id="length" type="number" min="0" step="0.01" /></label>
        <label htmlFor="width">Width (m)<input id="width" type="number" min="0" step="0.01" /></label>
        <label htmlFor="height">Height (m)<input id="height" type="number" min="0" step="0.01" /></label>
      </div>
      <button type="button" disabled={!itemName.trim()}>Use these details</button>
    </section>
  );
}
