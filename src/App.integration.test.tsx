import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "./App";

const { validateImageFile } = vi.hoisted(() => ({ validateImageFile: vi.fn() }));
vi.mock("./lib/imageValidation", () => ({
  validateImageFile,
}));

test("identifies the page as a simulated image analysis prototype", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: /image analysis progress/i })).toBeInTheDocument();
  expect(screen.getByText(/simulated processing/i)).toBeInTheDocument();
});

const imageFile = (name = "bike.png") => new File([new Uint8Array(2048)], name, { type: "image/png" });

beforeEach(() => {
  validateImageFile.mockReset();
  validateImageFile.mockResolvedValue({
    id: "attachment-1",
    name: "bike.png",
    type: "image/png",
    size: 2048,
    width: 1200,
    height: 800,
    previewUrl: "blob:first",
  });
});

afterEach(() => cleanup());

test("selects an image and shows its filename, size, and dimensions", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.upload(screen.getByLabelText(/choose an image/i), imageFile());

  expect(await screen.findByText("bike.png")).toBeInTheDocument();
  expect(screen.getByText(/2 KB/i)).toBeInTheDocument();
  expect(screen.getByText(/1200 × 800/i)).toBeInTheDocument();
  expect(screen.getByText(/ready to analyze/i)).toBeInTheDocument();
});

test("keeps the message draft when analysis starts", async () => {
  const user = userEvent.setup();
  render(<App />);
  const draft = screen.getByLabelText(/message/i);

  await user.type(draft, "Please store this bicycle");
  await user.upload(screen.getByLabelText(/choose an image/i), imageFile());
  await user.click(screen.getByRole("button", { name: /analyze image/i }));

  expect(draft).toHaveValue("Please store this bicycle");
});

test("disables analyze until a valid image is selected", () => {
  render(<App />);
  expect(screen.getByRole("button", { name: /analyze image/i })).toBeDisabled();
});

test("shows a specific validation error for an unsupported file", async () => {
  const user = userEvent.setup();
  validateImageFile.mockRejectedValue({ error: { message: "This file type is not supported." } });
  render(<App />);

  fireEvent.change(screen.getByLabelText(/choose an image/i), {
    target: { files: [new File(["pdf"], "document.pdf", { type: "application/pdf" })] },
  });

  expect(await screen.findByText(/file type is not supported/i)).toBeInTheDocument();
});

test("revokes the previous preview URL when the attachment is replaced", async () => {
  const user = userEvent.setup();
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  validateImageFile
    .mockResolvedValueOnce({ id: "one", name: "bike.png", type: "image/png", size: 2048, width: 1200, height: 800, previewUrl: "blob:first" })
    .mockResolvedValueOnce({ id: "two", name: "chair.png", type: "image/png", size: 1024, width: 800, height: 600, previewUrl: "blob:second" });
  render(<App />);

  const input = screen.getByLabelText(/choose an image/i);
  await user.upload(input, imageFile("bike.png"));
  await user.upload(input, imageFile("chair.png"));

  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first"));
});

test("allows Normal, Slow, and Failure scenarios to be selected", async () => {
  const user = userEvent.setup();
  render(<App />);
  const selector = screen.getByLabelText(/demo scenario/i);

  await user.selectOptions(selector, "slow");
  expect(selector).toHaveValue("slow");
  await user.selectOptions(selector, "failure");
  expect(selector).toHaveValue("failure");
  await user.selectOptions(selector, "normal");
  expect(selector).toHaveValue("normal");
});
