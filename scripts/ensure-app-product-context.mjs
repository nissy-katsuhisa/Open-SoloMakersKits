#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const contract = {
  contextPath: "data/app-product-context.json",
  producerSkill: "skills/app-product-summary/",
  consumerSkills: [
    "skills/gen-feed-posts/instagram-feed-image-generation/",
    "skills/gen-appstore-image/"
  ],
  requiredKeys: [
    "schema_version",
    "product_name",
    "product_summary",
    "main_features",
    "catchcopies",
    "tone_keywords",
    "brand",
    "screenshot_candidates"
  ]
};

const args = process.argv.slice(2);
const useJson = args.includes("--json");
const listConsumers = args.includes("--list-consumers");
const help = args.includes("--help") || args.includes("-h");

function print(value) {
  if (useJson) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }

  if (value.status === "ready") {
    console.log(`OK: ${contract.contextPath} is ready.`);
    return;
  }

  if (value.status === "missing") {
    console.log(`MISSING: ${contract.contextPath}`);
    console.log(`Run the producer skill first: ${contract.producerSkill}`);
    console.log("Then rerun this script before continuing to the downstream skill.");
    return;
  }

  if (value.status === "invalid_json") {
    console.log(`INVALID JSON: ${contract.contextPath}`);
    console.log(value.message);
    return;
  }

  if (value.status === "invalid_shape") {
    console.log(`INVALID SHAPE: ${contract.contextPath}`);
    console.log(`Missing keys: ${value.missingKeys.join(", ")}`);
  }
}

function usage() {
  const text = [
    "Usage: node scripts/ensure-app-product-context.mjs [--json] [--list-consumers]",
    "",
    "Checks the shared app product context before downstream skills run.",
    "",
    `Context file: ${contract.contextPath}`,
    `Producer skill: ${contract.producerSkill}`,
    "",
    "Exit codes:",
    "  0  context exists and has the expected basic shape",
    "  2  context is missing; run the producer skill first",
    "  3  context exists but is invalid JSON",
    "  4  context exists but is missing required top-level keys"
  ].join("\n");

  console.log(text);
}

function printConsumers() {
  const value = {
    contextPath: contract.contextPath,
    producerSkill: contract.producerSkill,
    consumerSkills: contract.consumerSkills
  };

  if (useJson) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }

  console.log(`Context file: ${contract.contextPath}`);
  console.log(`Producer skill: ${contract.producerSkill}`);
  console.log("Consumer skills:");
  for (const skill of contract.consumerSkills) {
    console.log(`- ${skill}`);
  }
}

function check() {
  const contextFile = resolve(rootDir, contract.contextPath);

  if (!existsSync(contextFile)) {
    return {
      ok: false,
      status: "missing",
      contextPath: contract.contextPath,
      producerSkill: contract.producerSkill,
      consumerSkills: contract.consumerSkills
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(contextFile, "utf8"));
  } catch (error) {
    return {
      ok: false,
      status: "invalid_json",
      contextPath: contract.contextPath,
      message: error.message
    };
  }

  const missingKeys = contract.requiredKeys.filter((key) => !(key in parsed));
  if (missingKeys.length > 0) {
    return {
      ok: false,
      status: "invalid_shape",
      contextPath: contract.contextPath,
      missingKeys
    };
  }

  return {
    ok: true,
    status: "ready",
    contextPath: contract.contextPath,
    producerSkill: contract.producerSkill,
    consumerSkills: contract.consumerSkills
  };
}

if (help) {
  usage();
  process.exit(0);
}

if (listConsumers) {
  printConsumers();
  process.exit(0);
}

const result = check();
print(result);

if (result.status === "ready") {
  process.exit(0);
}

if (result.status === "missing") {
  process.exit(2);
}

if (result.status === "invalid_json") {
  process.exit(3);
}

process.exit(4);
