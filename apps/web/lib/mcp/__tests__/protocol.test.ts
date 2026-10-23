import { describe, expect, it } from "vitest";
import {
  McpDispatch,
  MCP_PROTOCOL_VERSIONS,
  RPC,
  toolOk,
  type McpTool,
} from "../protocol";

/**
 * NOTE: written but intentionally UNEXECUTED per the owner's manual-only
 * test policy on #272 — run with the rest of the suite only after the owner
 * authorizes automated testing.
 */

const echoTool: McpTool = {
  name: "echo",
  description: "echoes args",
  inputSchema: { type: "object" },
  handler: async (args) => toolOk({ echoed: args }),
};

function makeDispatch() {
  return new McpDispatch(new Map([[echoTool.name, echoTool]]), () => ({}));
}

describe("McpDispatch", () => {
  it("answers initialize with server info and a supported protocol version", async () => {
    const res = await makeDispatch().handle({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-03-26" },
    });
    expect(res && "result" in res && (res.result as { protocolVersion: string }).protocolVersion).toBe("2025-03-26");
  });

  it("does not accept the legacy pre-streamable revision", async () => {
    const res = await makeDispatch().handle({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05" },
    });
    // Unsupported request → negotiate to the newest supported version.
    expect(
      res && "result" in res && (res.result as { protocolVersion: string }).protocolVersion
    ).toBe(MCP_PROTOCOL_VERSIONS[0]);
    expect(MCP_PROTOCOL_VERSIONS).not.toContain("2024-11-05");
  });

  it("falls back to its own protocol version for unknown requests", async () => {
    const res = await makeDispatch().handle({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "1900-01-01" },
    });
    expect(
      res && "result" in res && (res.result as { protocolVersion: string }).protocolVersion
    ).toBe(MCP_PROTOCOL_VERSIONS[0]);
  });

  it("lists tools without their handlers", async () => {
    const res = await makeDispatch().handle({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const tools = res && "result" in res ? (res.result as { tools: { name: string }[] }).tools : [];
    expect(tools.map((t) => t.name)).toContain("echo");
    expect(JSON.stringify(res)).not.toContain("handler");
  });

  it("dispatches tools/call and returns structured content", async () => {
    const res = await makeDispatch().handle({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "echo", arguments: { hello: "world" } },
    });
    const result = res && "result" in res ? (res.result as { structuredContent: { echoed: { hello: string } } }).structuredContent : null;
    expect(result?.echoed).toEqual({ hello: "world" });
  });

  it("returns INVALID_PARAMS for unknown tools", async () => {
    const res = await makeDispatch().handle({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "nope" },
    });
    expect(res && "error" in res && res.error.code).toBe(RPC.INVALID_PARAMS);
  });

  it("returns METHOD_NOT_FOUND for unknown methods", async () => {
    const res = await makeDispatch().handle({ jsonrpc: "2.0", id: 5, method: "resources/list" });
    expect(res && "error" in res && res.error.code).toBe(RPC.METHOD_NOT_FOUND);
  });

  it("returns null for notifications (no response expected)", async () => {
    const res = await makeDispatch().handle({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(res).toBeNull();
  });

  it("rejects non-2.0 messages", async () => {
    const res = await makeDispatch().handle({ id: 6, method: "ping" } as never);
    expect(res && "error" in res && res.error.code).toBe(RPC.INVALID_REQUEST);
  });
});
