import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import type { FryskerGateway } from "../src/gateway.js";
import { MockGateway } from "../src/mockGateway.js";
import { createServer } from "../src/server.js";

export interface ToolResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

export async function connect(
  gateway: FryskerGateway = new MockGateway(),
): Promise<Client> {
  const server = createServer(gateway);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

export function textOf(result: unknown): string {
  const typed = result as ToolResult;
  return typed.content
    .map((part) => part.text ?? "")
    .join("\n")
    .trimEnd();
}

export function isError(result: unknown): boolean {
  return (result as ToolResult).isError === true;
}

export async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  return (await client.callTool({ name, arguments: args })) as ToolResult;
}
