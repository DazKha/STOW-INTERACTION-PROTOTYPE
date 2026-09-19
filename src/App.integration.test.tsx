import { render, screen } from "@testing-library/react";
import { test, expect } from "vitest";
import App from "./App";

test("identifies the page as a simulated image analysis prototype", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: /image analysis progress/i })).toBeInTheDocument();
  expect(screen.getByText(/simulated processing/i)).toBeInTheDocument();
});
