"use strict";

const { mkdirSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

const DEFAULT_DIRECTORY_NAME = "cq-talent-visual-evidence";

function getVisualEvidenceDirectory({ env = process.env, temporaryDirectory = tmpdir() } = {}) {
  const configuredDirectory = env.CQ_TALENT_VISUAL_EVIDENCE_DIR;
  const directory = configuredDirectory
    ? resolve(configuredDirectory)
    : resolve(temporaryDirectory, DEFAULT_DIRECTORY_NAME);
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

module.exports = {
  DEFAULT_DIRECTORY_NAME,
  createDefaultVisualEvidencePath,
  getVisualEvidenceDirectory,
};
