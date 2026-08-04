import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { openAutomation, parseArgs, runCli } from "./devtools-screenshot.mjs";

const tempDirectories = [];

function createPng(width = 375, height = 812) {
  const bytes = Buffer.alloc(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes[24] = 8;
  bytes[25] = 6;
  return bytes;
}

function createOutputDirectory() {
  const directory = mkdtempSync(join(tmpdir(), "cq-talent-automator-"));
  tempDirectories.push(directory);
  return directory;
}

function createAutomator({
  route = "/pages/parent/schedule/index",
  pageStack = [route],
  png = createPng(),
  systemInfo = { windowWidth: 375, windowHeight: 812, pixelRatio: 1 },
  connectFailures = 0,
} = {}) {
  const calls = { connect: [], launch: [], screenshotPaths: [], sequence: [], systemInfo: 0, disconnects: 0 };
  const miniProgram = {
    async currentPage() { return { path: route }; },
    async pageStack() { return pageStack.map((path) => ({ path })); },
    async screenshot({ path }) { calls.screenshotPaths.push(path); calls.sequence.push("screenshot"); writeFileSync(path, png); },
    async systemInfo() { calls.systemInfo += 1; calls.sequence.push("systemInfo"); return systemInfo; },
    disconnect() { calls.disconnects += 1; },
  };
  return {
    calls,
    automatorImpl: {
      async connect(options) {
        calls.connect.push(options);
        if (calls.connect.length <= connectFailures) throw new Error("automation endpoint is not ready");
        return miniProgram;
      },
      async launch(options) { calls.launch.push(options); return miniProgram; },
    },
  };
}

afterEach(() => {
  while (tempDirectories.length > 0) rmSync(tempDirectories.pop(), { recursive: true, force: true });
});

describe("DevTools Automator screenshot CLI", () => {
  it("uses the official Automator connection instead of raw DevTools RPC", async () => {
    const directory = createOutputDirectory();
    const output = join(directory, "parent.png");
    const fake = createAutomator();

    const result = await runCli({
      argv: ["--output", output, "--expect-route-prefix", "/pages/parent/"],
      automatorImpl: fake.automatorImpl,
      now: () => new Date("2026-08-04T01:00:00.000Z"),
    });

    expect(fake.calls.connect).toEqual([
      { wsEndpoint: "ws://127.0.0.1:9421" },
      { wsEndpoint: "ws://127.0.0.1:9421" },
    ]);
    expect(fake.calls.screenshotPaths).toHaveLength(1);
    expect(fake.calls.screenshotPaths[0]).not.toBe(output);
    expect(fake.calls.sequence).toEqual(["screenshot", "systemInfo"]);
    expect(fake.calls.systemInfo).toBe(1);
    expect(fake.calls.disconnects).toBe(2);
    expect(result.route).toBe("/pages/parent/schedule/index");
    expect(result.viewport).toEqual({
      width: 375,
      height: 812,
      devicePixelRatio: 1,
      rasterScale: { width: 1, height: 1 },
    });
    expect(result.captureMethod).toBe("miniprogram-automator MiniProgram.screenshot");
  });

  it("writes a strict 375x812 PNG and non-sensitive sidecar after route verification", async () => {
    const directory = createOutputDirectory();
    const output = join(directory, "parent.png");
    const png = createPng();
    const fake = createAutomator({ png });

    await runCli({ argv: ["--output", output, "--expect-route-prefix", "/pages/parent/"], automatorImpl: fake.automatorImpl });

    expect(readFileSync(output)).toEqual(png);
    expect(JSON.parse(readFileSync(`${output}.json`, "utf8"))).toEqual({
      capturedAt: expect.any(String),
      automationEndpoint: "ws://127.0.0.1:9421",
      route: "/pages/parent/schedule/index",
      pageStackRoutes: ["/pages/parent/schedule/index"],
      png: {
        path: output,
        bytes: png.length,
        width: 375,
        height: 812,
        sha256: createHash("sha256").update(png).digest("hex"),
      },
      viewport: {
        width: 375,
        height: 812,
        devicePixelRatio: 1,
        rasterScale: { width: 1, height: 1 },
      },
      captureMethod: "miniprogram-automator MiniProgram.screenshot",
    });
  });

  it("accepts a uniform high-density raster for the required 375x812 logical viewport", async () => {
    const directory = createOutputDirectory();
    const output = join(directory, "parent-high-density.png");
    const fake = createAutomator({
      png: createPng(563, 1218),
      systemInfo: { windowWidth: 375, windowHeight: 812, pixelRatio: 3 },
    });

    const result = await runCli({ argv: ["--output", output, "--expect-route-prefix", "/pages/parent/"], automatorImpl: fake.automatorImpl });

    expect(result.png).toMatchObject({ width: 563, height: 1218 });
    expect(result.viewport).toMatchObject({ width: 375, height: 812, devicePixelRatio: 3 });
    expect(result.viewport.rasterScale.width).toBeCloseTo(563 / 375, 8);
    expect(result.viewport.rasterScale.height).toBeCloseTo(1218 / 812, 8);
    expect(existsSync(output)).toBe(true);
  });

  it("rejects a wrong route before calling screenshot", async () => {
    const directory = createOutputDirectory();
    const fake = createAutomator({ route: "/pages/login/index" });

    await expect(runCli({
      argv: ["--output", join(directory, "wrong-route.png"), "--expect-route-prefix", "/pages/parent/"],
      automatorImpl: fake.automatorImpl,
    })).rejects.toThrow(/route prefix/i);
    expect(fake.calls.screenshotPaths).toEqual([]);
    expect(fake.calls.disconnects).toBe(1);
  });

  it.each([
    [390, 844, { windowWidth: 390, windowHeight: 844, pixelRatio: 1 }, /375x812 logical viewport/i],
    [562, 1220, { windowWidth: 375, windowHeight: 812, pixelRatio: 3 }, /uniformly scaled/i],
  ])("rejects %ix%i images that do not prove the required viewport", async (width, height, systemInfo, error) => {
    const directory = createOutputDirectory();
    const output = join(directory, "wrong-size.png");
    const fake = createAutomator({ png: createPng(width, height), systemInfo });

    await expect(runCli({
      argv: ["--output", output, "--expect-route-prefix", "/pages/parent/"],
      automatorImpl: fake.automatorImpl,
    })).rejects.toThrow(error);
    expect(existsSync(output)).toBe(false);
    expect(existsSync(`${output}.json`)).toBe(false);
  });

  it("accepts one leading pnpm separator and validates an explicit automation port", () => {
    expect(parseArgs(["--", "--output", "C:\\temp\\parent.png", "--expect-route-prefix", "/pages/parent/", "--port", "9431"])).toEqual({
      output: "C:\\temp\\parent.png",
      expectRoutePrefix: "/pages/parent/",
      port: 9431,
    });
    expect(() => parseArgs(["--output", "C:\\temp\\parent.png", "--expect-route-prefix", "/pages/parent/", "--port", "0"])).toThrow(/between/i);
    expect(() => parseArgs(["--output", "C:\\temp\\parent.png", "--expect-route-prefix", "/pages/parent/", "--", "--port", "9431"])).toThrow(/separator/i);
  });

  it("opens a Windows automation window through the CLI and disconnects without closing it", async () => {
    const fake = createAutomator({ route: "/pages/launch/index" });
    const spawnCalls = [];
    let unrefCalls = 0;

    const result = await openAutomation({
      automatorImpl: fake.automatorImpl,
      cliPath: "D:\\微信web开发者工具\\cli.bat",
      projectPath: "C:\\workspace\\mini-program",
      port: 9431,
      timeoutMs: 12_000,
      isWindows: true,
      spawnImpl(command, args, options) {
        spawnCalls.push({ command, args, options });
        return { unref() { unrefCalls += 1; } };
      },
    });

    expect(fake.calls.launch).toEqual([]);
    expect(fake.calls.connect).toEqual([{ wsEndpoint: "ws://127.0.0.1:9431" }]);
    expect(spawnCalls).toEqual([{
      command: "D:\\微信web开发者工具\\cli.bat",
      args: ["auto", "--project", "C:\\workspace\\mini-program", "--auto-port", "9431", "--lang", "zh"],
      options: { stdio: "ignore", windowsHide: true, shell: true },
    }]);
    expect(unrefCalls).toBe(1);
    expect(result).toEqual({ port: 9431, route: "/pages/launch/index" });
    expect(fake.calls.disconnects).toBe(1);
  });

  it("waits for the automation endpoint after starting the Windows CLI", async () => {
    const fake = createAutomator({ route: "/pages/launch/index", connectFailures: 1 });
    let sleepCalls = 0;

    await openAutomation({
      automatorImpl: fake.automatorImpl,
      cliPath: "D:\\微信web开发者工具\\cli.bat",
      projectPath: "C:\\workspace\\mini-program",
      port: 9431,
      isWindows: true,
      spawnImpl() { return { unref() {} }; },
      retryDelayMs: 1,
      sleepImpl: async () => { sleepCalls += 1; },
    });

    expect(fake.calls.connect).toEqual([
      { wsEndpoint: "ws://127.0.0.1:9431" },
      { wsEndpoint: "ws://127.0.0.1:9431" },
    ]);
    expect(sleepCalls).toBe(1);
    expect(fake.calls.disconnects).toBe(1);
  });

  it("ships no direct CDP screenshot command", () => {
    const source = readFileSync(new URL("./devtools-screenshot.mjs", import.meta.url), "utf8");
    expect(source).not.toContain("App.captureScreenshot");
    expect(source).toContain("miniprogram-automator");
  });
});
