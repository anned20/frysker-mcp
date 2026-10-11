#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { createGateway } from "./gatewayFactory.js";
import { createServer } from "./server.js";

const config = loadConfig();
const gateway = createGateway(config);
const server = createServer(gateway);

await server.connect(new StdioServerTransport());
