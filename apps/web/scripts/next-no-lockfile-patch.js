#!/usr/bin/env node

const path = require("node:path");
const Module = require("node:module");

process.env.NEXT_IGNORE_INCORRECT_LOCKFILE = "1";
process.env.NODE_PATH = [
  path.join(__dirname, "..", "node_modules"),
  process.env.NODE_PATH,
].filter(Boolean).join(path.delimiter);
Module._initPaths();

require("../node_modules/next/dist/bin/next");
