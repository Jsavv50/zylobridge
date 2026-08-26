import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("public marketplace summary", () => {
  const read = (relativePath: string) => fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

    it("exposes a read-only public summary procedure backed by database aggregates", () => {
      const router = read("./routers.ts");
      const database = read("./db.ts");
      expect(router).toContain("publicSummary: publicProcedure.query");
      expect(router).toContain("getPublicMarketplaceSummary");
      expect(database).toContain("export async function getPublicMarketplaceSummary()");
      expect(database).toContain("activeProfessionals");
      expect(database).toContain("verifiedProfessionals");
      expect(database).toContain("averageRating");
      expect(database).toContain(".limit(9)");
    });

    it("renders prior home sections from live summary data with an honest empty state", () => {
      const home = read("../client/src/pages/Home.tsx");
      expect(home).toContain("trpc.publicSummary.useQuery");
      expect(home).toContain("summaryQuery.data?.activeProfessionals");
      expect(home).toContain("summaryQuery.data?.totalReviews");
      expect(home).toContain("No reviews have been published yet");
      expect(home).not.toContain("const TESTIMONIALS =");
      expect(home).not.toContain("Trustpilot");
      expect(home).not.toContain("Google Reviews");
      expect(home).not.toContain("2,400+");
      expect(home).not.toContain("8,900+");
    });
});
