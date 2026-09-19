import type { ScenarioName } from "../domain/analysisTypes";

interface ScenarioSelectorProps {
  value: ScenarioName;
  onChange: (scenario: ScenarioName) => void;
  disabled?: boolean;
}

export function ScenarioSelector({ value, onChange, disabled = false }: ScenarioSelectorProps) {
  return (
    <label>
      Demo scenario
      <select value={value} onChange={(event) => onChange(event.target.value as ScenarioName)} disabled={disabled}>
        <option value="normal">Normal</option>
        <option value="slow">Slow</option>
        <option value="failure">Failure</option>
      </select>
    </label>
  );
}
