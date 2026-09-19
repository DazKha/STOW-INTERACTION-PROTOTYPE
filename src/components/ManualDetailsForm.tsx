import { useState, type FormEvent } from "react";

interface ManualDetailsFormProps {
  onSubmit: (itemName: string) => void;
}

export function ManualDetailsForm({ onSubmit }: ManualDetailsFormProps) {
  const [itemName, setItemName] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = itemName.trim();
    if (!trimmedName) {
      setValidationMessage("Enter an item name before saving.");
      return;
    }
    setValidationMessage(null);
    onSubmit(trimmedName);
  };

  return (
    <form className="manual-form" aria-labelledby="manual-heading" onSubmit={handleSubmit}>
      <h2 id="manual-heading">Enter item details manually</h2>
      <label htmlFor="item-name">Item name</label>
      <input id="item-name" required value={itemName} aria-invalid={validationMessage ? "true" : undefined} onChange={(event) => { setItemName(event.target.value); setValidationMessage(null); }} />
      {validationMessage && <p role="alert">{validationMessage}</p>}
      <div className="dimension-fields">
        <label htmlFor="length">Length (m)<input id="length" type="number" min="0" step="0.01" /></label>
        <label htmlFor="width">Width (m)<input id="width" type="number" min="0" step="0.01" /></label>
        <label htmlFor="height">Height (m)<input id="height" type="number" min="0" step="0.01" /></label>
      </div>
      <button type="submit" disabled={!itemName.trim()}>Use these details</button>
    </form>
  );
}
