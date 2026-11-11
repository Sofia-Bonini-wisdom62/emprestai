import { readFileSync } from "node:fs";

import { expect, it } from "vitest";

import { IMAGES } from "./images";

it("adr_006 o compose.yaml usa as mesmas imagens dos testes e do E2E", () => {
  const compose = readFileSync("compose.yaml", "utf8");
  const images = [...compose.matchAll(/^\s*image:\s*(\S+)\s*$/gm)].map(
    (match) => match[1],
  );

  expect(images.sort()).toEqual(Object.values(IMAGES).sort());
});
