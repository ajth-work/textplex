#!/usr/bin/env node

process.env.NEXT_IGNORE_INCORRECT_LOCKFILE = "1";

require("../node_modules/next/dist/bin/next");
