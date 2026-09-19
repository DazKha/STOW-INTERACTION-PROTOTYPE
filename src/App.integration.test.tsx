import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("selects an image and shows its filename, size, and dimensions", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.upload(screen.getByLabelText(/choose an image/i), imageFile());

  expect(await screen.findByText("bike.png")).toBeInTheDocument();
  expect(screen.getByText(/2 KB/i)).toBeInTheDocument();
  expect(screen.getByText(/1200 × 800/i)).toBeInTheDocument();
  expect(screen.getByText("Ready to analyze")).toBeInTheDocument();
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
  validateImageFile.mockRejectedValue({ error: { message: "This file type is not supported." } });
  render(<App />);

  fireEvent.change(screen.getByLabelText(/choose an image/i), {
    target: { files: [new File(["pdf"], "document.pdf", { type: "application/pdf" })] },
  });

  expect(await screen.findByRole("alert")).toHaveTextContent(/file type is not supported/i);
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

async function selectAndAnalyze(scenario = "normal") {
  render(<App />);
  await act(async () => {
    fireEvent.change(screen.getByLabelText(/demo scenario/i), { target: { value: scenario } });
    fireEvent.change(screen.getByLabelText(/choose an image/i), { target: { files: [imageFile()] } });
    await Promise.resolve();
  });
  fireEvent.click(screen.getByRole("button", { name: /analyze image/i }));
}

test("shows numeric progress only while uploading", async () => {
  vi.useFakeTimers();
  await selectAndAnalyze();

  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  act(() => vi.advanceTimersByTime(80));
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");
});

test("shows elapsed time and named stages during analysis", async () => {
  vi.useFakeTimers();
  await selectAndAnalyze();

  act(() => vi.advanceTimersByTime(700));
  expect(screen.getByText(/checking image quality/i)).toBeInTheDocument();
  expect(screen.getByText(/elapsed/i)).toBeInTheDocument();
  expect(screen.queryByText(/% complete/i)).not.toBeInTheDocument();
});

test("disables analyze, scenario, and file replacement throughout processing", async () => {
  vi.useFakeTimers();
  await selectAndAnalyze();

  const analyze = screen.getByRole("button", { name: /analyze image/i });
  const scenario = screen.getByLabelText(/demo scenario/i);
  const imageInput = screen.getByLabelText(/choose an image/i);

  expect(analyze).toBeDisabled();
  expect(scenario).toBeDisabled();
  expect(imageInput).toBeDisabled();

  act(() => vi.advanceTimersByTime(400));
  expect(screen.getByText(/checking image quality/i)).toBeInTheDocument();
  expect(analyze).toBeDisabled();
  expect(scenario).toBeDisabled();

  act(() => vi.advanceTimersByTime(300));
  expect(screen.getByText(/recognizing the item/i)).toBeInTheDocument();
  expect(analyze).toBeDisabled();
  expect(scenario).toBeDisabled();

  act(() => vi.advanceTimersByTime(900));
  expect(screen.getByText(/estimating dimensions/i)).toBeInTheDocument();
  expect(analyze).toBeDisabled();
  expect(scenario).toBeDisabled();

  act(() => vi.advanceTimersByTime(700));
  expect(screen.getByText(/preparing recommendation/i)).toBeInTheDocument();
  expect(analyze).toBeDisabled();
  expect(scenario).toBeDisabled();
  vi.useRealTimers();
});

test("announces long wait and keeps the active recognition stage visible", async () => {
  vi.useFakeTimers();
  await selectAndAnalyze("slow");

  act(() => vi.advanceTimersByTime(3200));
  expect(screen.getByRole("status", { name: /taking longer than usual/i })).toHaveTextContent(/taking longer than usual/i);
  expect(screen.getByText(/recognizing the item/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /keep waiting/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /retry analysis/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /cancel image analysis/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /enter details manually/i })).toBeInTheDocument();
  vi.useRealTimers();
});

test("keeps the image and draft after retry from a long wait", async () => {
  vi.useFakeTimers();
  render(<App />);
  fireEvent.change(screen.getByLabelText(/message/i), { target: { value: "Keep this draft" } });
  await act(async () => {
    fireEvent.change(screen.getByLabelText(/demo scenario/i), { target: { value: "slow" } });
    fireEvent.change(screen.getByLabelText(/choose an image/i), { target: { files: [imageFile()] } });
    await Promise.resolve();
  });
  fireEvent.click(screen.getByRole("button", { name: /analyze image/i }));
  act(() => vi.advanceTimersByTime(3200));
  fireEvent.click(screen.getByRole("button", { name: /retry analysis/i }));

  expect(screen.getByText("bike.png")).toBeInTheDocument();
  expect(screen.getByLabelText(/message/i)).toHaveValue("Keep this draft");
  expect(screen.getByText(/recognizing the item/i)).toBeInTheDocument();
  vi.useRealTimers();
});

test("shows Cancelled and never renders the result after cancel", async () => {
  vi.useFakeTimers();
  await selectAndAnalyze("slow");
  act(() => vi.advanceTimersByTime(3200));
  fireEvent.click(screen.getByRole("button", { name: /cancel image analysis/i }));
  act(() => vi.runAllTimers());

  expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
  expect(screen.queryByText(/city bicycle with basket/i)).not.toBeInTheDocument();
  vi.useRealTimers();
});

test("explains that upload succeeded when recognition fails", async () => {
  vi.useFakeTimers();
  await selectAndAnalyze("failure");
  act(() => vi.advanceTimersByTime(2500));

  expect(screen.getByText(/image was received, but item recognition could not be completed/i)).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(/recognition/i);
});

test("retries recognition without showing upload progress again", async () => {
  vi.useFakeTimers();
  await selectAndAnalyze("failure");
  act(() => vi.advanceTimersByTime(2500));
  fireEvent.click(screen.getByRole("button", { name: /retry analysis/i }));

  expect(screen.getByText(/recognizing the item/i)).toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(2500));
  expect(screen.getByText(/city bicycle with basket/i)).toBeInTheDocument();
});

test("opens manual entry with item name and optional dimensions", async () => {
  vi.useFakeTimers();
  await selectAndAnalyze("failure");
  act(() => vi.advanceTimersByTime(2500));
  fireEvent.click(screen.getByRole("button", { name: /enter details manually/i }));

  expect(screen.getByLabelText(/item name/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/length/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
});

test("requires and saves a manual item name without rendering a simulated result", async () => {
  vi.useFakeTimers();
  await selectAndAnalyze("failure");
  act(() => vi.advanceTimersByTime(2500));
  fireEvent.click(screen.getByRole("button", { name: /enter details manually/i }));

  const submit = screen.getByRole("button", { name: /use these details/i });
  expect(submit).toBeDisabled();
  expect(screen.queryByText(/details saved for manual sizing/i)).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: "Dining table" } });
  expect(submit).toBeEnabled();
  fireEvent.click(submit);

  expect(screen.getByText(/details saved for manual sizing/i)).toBeInTheDocument();
  expect(screen.queryByText(/city bicycle with basket/i)).not.toBeInTheDocument();
  vi.useRealTimers();
});

test("marks the completed result as simulated", async () => {
  vi.useFakeTimers();
  await selectAndAnalyze();
  act(() => vi.advanceTimersByTime(4000));

  expect(screen.getByText(/simulated demo output/i)).toBeInTheDocument();
  expect(screen.getByText(/city bicycle with basket/i)).toBeInTheDocument();
  expect(screen.getByText(/1\.10 m3/i)).toBeInTheDocument();
});

test("asks whether the bicycle stays intact and can be stacked above", async () => {
  vi.useFakeTimers();
  await selectAndAnalyze();
  act(() => vi.advanceTimersByTime(4000));

  expect(screen.getByText(/will the bicycle be stored intact/i)).toBeInTheDocument();
  expect(screen.getByText(/can other items be stacked above it/i)).toBeInTheDocument();
});

test("exposes keyboard-friendly labels, live status, and recovery names", () => {
  render(<App />);

  expect(screen.getByLabelText(/choose an image/i)).toHaveAttribute("accept", expect.stringContaining("image/png"));
  expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  expect(screen.getByRole("button", { name: /analyze image/i })).toBeInTheDocument();
});

test("renders visible focus targets for selected image removal", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.upload(screen.getByLabelText(/choose an image/i), imageFile());

  expect(screen.getByRole("button", { name: /remove selected image/i })).toBeInTheDocument();
});
