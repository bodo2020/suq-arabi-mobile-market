import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const client = readFileSync(new URL("../src/components/search/MarcoAiPrompt.tsx", import.meta.url), "utf8");
const intent = readFileSync(new URL("../src/lib/markoAi.ts", import.meta.url), "utf8");

test("Customer Marko uses the shared authenticated gateway and keeps existing group/search routes", () => {
  assert.match(client, /functions\.invoke\('marko-ai-engine'/);
  assert.match(client, /mode: 'customer_shopping'/);
  assert.match(client, /interpretMarkoResponse\(response\)/);
  assert.match(client, /navigate\('\/search\?q='/);
  assert.match(client, /navigate\('\/ala-mazagak\//);
  assert.doesNotMatch(client, /functions\.invoke\('ai-gateway'/);
  assert.ok(intent.includes("interpretMarkoResponse"));
});

test("Marko results come from the address-scoped catalog, not generated product attributes", () => {
  assert.match(client, /searchBranchProductsIncludingUnavailable\(intent\.query/);
  assert.match(client, /<ProductCard product=\{product\}/);
  assert.match(client, /Number\(product\.quantity \|\| 0\) > 0/);
  assert.match(client, /Number\(product\.price \|\| 0\) > 0/);
  assert.match(client, /branch\?\.delivery_branch_id/);
  assert.match(client, /requestSequence\.current/);
  assert.doesNotMatch(client, /addToCart\s*\(/);
  assert.doesNotMatch(client, /checkout\s*\(/);
});
