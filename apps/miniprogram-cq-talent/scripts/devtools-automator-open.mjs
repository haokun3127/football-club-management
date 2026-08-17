#!/usr/bin/env node

import { openAutomation } from "./devtools-screenshot.mjs";

openAutomation({ detectIdeHttpPort: true, persistSession: true })
  .then((result) => console.log(JSON.stringify({ port: result.port, route: result.route, sessionFile: result.sessionFile, message: "DevTools automation is ready; authenticate and navigate manually before capture." })))
  .catch((error) => {
    console.error(`devtools:automator:open failed: ${error.message}`);
    process.exitCode = 1;
  });
