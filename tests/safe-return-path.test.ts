import assert from "node:assert/strict";
import test from "node:test";
import { safeReturnPath } from "../src/lib/safe-return-path";

test("auth return paths preserve local destinations", () => {
  assert.equal(safeReturnPath("/projects?status=active#overview"), "/projects?status=active#overview");
  assert.equal(safeReturnPath("/search?q=https://example.com"), "/search?q=https://example.com");
});

test("auth redirects reject external, backslash and control-character destinations", () => {
  for (const value of [null, "https://example.com", "//example.com", "/\\example.com", "/\n/example.com", "/\t/example.com", "javascript:alert(1)"]) {
    assert.equal(safeReturnPath(value), "/");
  }
});
