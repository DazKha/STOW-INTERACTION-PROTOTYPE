import type { AttachmentMeta, DemoResult } from "../domain/analysisTypes";

export const fixtureAttachment: AttachmentMeta = {
  id: "fixture-image",
  name: "city-bike.png",
  type: "image/png",
  size: 245760,
  width: 1600,
  height: 1200,
  previewUrl: "blob:fixture-image",
};

export const fixtureResult: DemoResult = {
  item: "City bicycle with basket",
  dimensionsM: [1.75, 0.6, 1.05],
  volumeM3: 1.1,
  confidence: "Medium",
};
