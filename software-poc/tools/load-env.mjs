import { readFile } from "node:fs/promises";
import path from "node:path";

let envLoaded = false;

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseEnvFile(contents) {
  const parsed = {};

  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripWrappingQuotes(line.slice(separatorIndex + 1).trim());

    if (!key || key in parsed) {
      continue;
    }

    parsed[key] = value;
  }

  return parsed;
}

async function readEnvFile(filePath) {
  try {
    const contents = await readFile(filePath, "utf8");
    return parseEnvFile(contents);
  } catch {
    return {};
  }
}

export async function loadProjectEnv(rootDir) {
  if (envLoaded) {
    return;
  }

  for (const fileName of [".env", ".env.local"]) {
    const filePath = path.join(rootDir, fileName);
    const values = await readEnvFile(filePath);

    for (const [key, value] of Object.entries(values)) {
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }

  envLoaded = true;
}

