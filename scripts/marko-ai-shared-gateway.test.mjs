import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const client = readFileSync(new URL("../src/components/search/MarcoAiPrompt.tsx", import.meta.url), "utf8");
const intent = readFileSync(new URL("../src/lib/markoAi.ts", import.meta.url), "utf8");
test("Customer Marko uses shared engine while routing only to verified shopping screens", () => {
  assert.match(client, /functions\.invoke\('marko-ai-engine'/);
  assert.match(client, /mode: 'customer_shopping'/);
  assert.match(client, /interpretMarkoResponse\(response\)/);
  assert.match(client, /navigate\('\/search\?q='/);
  assert.match(client, /navigate\('\/ala-mazagak\//);
  assert.doesNotMatch(client, /functions\.invoke\('ai-gateway'/);
  assert.ok(intent.includes("interpretMarkoResponse"));
});
