"use strict";

const { mkdirSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join, resolve, win32 } = require("node:path");

const DEFAULT_DIRECTORY_NAME = "cq-talent-visual-evidence";
const REPOSITORY_ROOT = win32.normalize(resolve(__dirname, "..", ".."));

function isWithinDirectory(candidate, root) {
  const relative = win32.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..\\") && relative !== ".." && !win32.isAbsolute(relative));
}

function assertVisualEvidenceDirectory(directory) {
  const normalized = win32.normalize(win32.resolve(directory));
  if (isWithinDirectory(normalized, REPOSITORY_ROOT)) {
    throw new Error("visual evidence must not be written inside this repository worktree");
  }
  if (normalized.split(/[\\/]+/).some((segment) => segment.toLowerCase() === "desktop")) {
    throw new Error("visual evidence must not be written to the desktop");
  }
  return normalized;
}

function getVisualEvidenceDirectory({ env = process.env, temporaryDirectory = tmpdir() } = {}) {
  const configuredDirectory = env.CQ_TALENT_VISUAL_EVIDENCE_DIR;
  const candidate = configuredDirectory
    ? resolve(configuredDirectory)
    : resolve(temporaryDirectory, DEFAULT_DIRECTORY_NAME);
  const directory = assertVisualEvidenceDirectory(candidate);
  mkdirSync(directory, { recursive: true });
  return directory;
}

function safePrefix(prefix) {
  return String(prefix || "screenshot")
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "") || "screenshot";
}

function createDefaultVisualEvidencePath(prefix = "screenshot", options = {}) {
  const directory = getVisualEvidenceDirectory(options);
  const now = typeof options.now === "function" ? options.now() : Date.now();
  const random = typeof options.random === "function" ? options.random() : Math.random();
  const nonce = `${process.pid}${Math.floor(Math.max(0, Math.min(0.999999999, random)) * 1_000_000_000)}`;
  return join(directory, `${safePrefix(prefix)}-${now}-${nonce}.png`);
}

function assertVisualEvidencePath(filePath) {
  const normalized = win32.normalize(win32.resolve(filePath));
  if (win32.extname(normalized).toLowerCase() !== ".png") {
    throw new Error("visual evidence output must be a PNG");
  }
  assertVisualEvidenceDirectory(dirname(normalized));
  return normalized;
}

module.exports = {
  DEFAULT_DIRECTORY_NAME,
  assertVisualEvidenceDirectory,
  assertVisualEvidencePath,
  createDefaultVisualEvidencePath,
  getVisualEvidenceDirectory,
};
