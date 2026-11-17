import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimits, clientKey } from "@/server/rate-limit";

describe("pembatas laju server", () => {
  beforeEach(resetRateLimits);

  it("mengizinkan sampai batas lalu menolak dengan waktu tunggu", () => {
    for (let i = 0; i < 3; i++) expect(checkRateLimit("k", 3, 1000, 1000 + i).allowed).toBe(true);
    const r = checkRateLimit("k", 3, 1000, 1500);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it("pulih setelah jendela waktu berlalu dan terpisah per kunci", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("a", 3, 1000, 1000);
    expect(checkRateLimit("a", 3, 1000, 1500).allowed).toBe(false);
    expect(checkRateLimit("b", 3, 1000, 1500).allowed).toBe(true);
    expect(checkRateLimit("a", 3, 1000, 2100).allowed).toBe(true);
  });

  it("penggunaan normal satu kelas (35 siswa x 2 pengiriman) tidak terblokir pada batas 60", () => {
    for (let i = 0; i < 60; i++) expect(checkRateLimit("kelas", 60, 600_000, i * 1000).allowed).toBe(true);
    expect(checkRateLimit("kelas", 60, 600_000, 61_000).allowed).toBe(false);
  });

  it("kunci klien dari header proxy", () => {
    expect(clientKey(new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } }))).toBe("1.2.3.4");
    expect(clientKey(new Request("http://x"))).toBe("anon");
  });
});
