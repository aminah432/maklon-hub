import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeTree = readFileSync(new URL("../routeTree.gen.ts", import.meta.url), "utf8");

describe("rute editor HPP", () => {
  it("tetap memakai URL /app/costings/$id tetapi bukan anak halaman daftar", () => {
    const detailRoute = routeTree.match(
      /const AuthenticatedAppCostingsIdRoute =[\s\S]*?\n\s*}\s+as any\)/,
    )?.[0];

    expect(detailRoute).toBeDefined();
    expect(detailRoute).toContain("path: '/costings/$id'");
    expect(detailRoute).toContain("getParentRoute: () => AuthenticatedAppRoute");
    expect(detailRoute).not.toContain("getParentRoute: () => AuthenticatedAppCostingsRoute");
  });
});
