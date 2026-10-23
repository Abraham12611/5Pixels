/**
 * Minimal MCP (Model Context Protocol) over Streamable HTTP — JSON-RPC 2.0
 * framing for the methods ChatGPT connectors actually exercise:
 *   initialize, ping, notifications/*, tools/list, tools/call.
 *
 * Stateless by design: no `Mcp-Session-Id`, no SSE streams — every request is
 * a self-contained POST answered with `application/json`, which the spec
 * permits for non-streaming servers. GET is rejected with 405.
 *
 * Hand-rolled instead of the official SDK so the transport is auditable and
 * dependency-free; the surface is intentionally narrow (#272).
 */

/**
 * Streamable-HTTP-era protocol revisions only. `2024-11-05` predates the
 * transport this server implements and must not be advertised; unknown or
 * newer versions are negotiated down to the newest we support per spec.
 */
export const MCP_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26"] as const;
export const MCP_DEFAULT_VERSION = MCP_PROTOCOL_VERSIONS[0];
export const MCP_SERVER_INFO = {
  name: "5pixels-preset-factory",
  version: "0.1.0",
} as const;

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | { jsonrpc: "2.0"; id: string | number | null; error: JsonRpcError };

export const RPC = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

export function rpcResult(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

export function rpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}

function isValidRequestMessage(msg: unknown): msg is JsonRpcRequest & { method: string } {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as JsonRpcRequest).jsonrpc === "2.0" &&
    typeof (msg as JsonRpcRequest).method === "string"
  );
}

export interface ToolResultPayload {
  content: { type: "text"; text: string }[];
  structuredContent?: unknown;
  isError?: boolean;
}

export function toolOk(structured: unknown): ToolResultPayload {
  return {
    content: [{ type: "text", text: JSON.stringify(structured, null, 2) }],
    structuredContent: structured,
  };
}

export function toolError(message: string, structured?: unknown): ToolResultPayload {
  return {
    content: [{ type: "text", text: message }],
    ...(structured !== undefined ? { structuredContent: structured } : {}),
    isError: true,
  };
}

export interface McpTool {
  name: string;
  description: string;
  /** JSON Schema (draft-07 compatible) for the tool arguments object. */
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
  handler: (args: unknown, ctx: unknown) => Promise<ToolResultPayload>;
}

export class McpDispatch {
  constructor(private tools: Map<string, McpTool>, private ctxFor: () => unknown) {}

  /**
   * Handle one parsed JSON-RPC message. Returns null for notifications.
   */
  async handle(msg: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    if (!isValidRequestMessage(msg)) {
      return rpcError(
        typeof msg === "object" && msg !== null ? (msg as JsonRpcRequest).id ?? null : null,
        RPC.INVALID_REQUEST,
        "Invalid JSON-RPC request"
      );
    }
    const id = msg.id ?? null;
    const method = msg.method;

    if (method.startsWith("notifications/")) {
      return null; // acknowledged silently
    }

    switch (method) {
      case "initialize": {
        const requested =
          typeof msg.params === "object" && msg.params !== null
            ? (msg.params as { protocolVersion?: string }).protocolVersion
            : undefined;
        const protocolVersion = MCP_PROTOCOL_VERSIONS.includes(
          requested as (typeof MCP_PROTOCOL_VERSIONS)[number]
        )
          ? (requested as string)
          : MCP_PROTOCOL_VERSIONS[0];
        return rpcResult(id, {
          protocolVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo: MCP_SERVER_INFO,
          instructions:
            "5Pixels Preset Factory — draft-only preset authoring. Write tools require an owner-minted approval token bound to the exact payload; no generation, testing or publishing capability exists here.",
        });
      }
      case "ping":
        return rpcResult(id, {});
      case "tools/list":
        return rpcResult(id, {
          tools: [...this.tools.values()].map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            ...(t.annotations ? { annotations: t.annotations } : {}),
          })),
        });
      case "tools/call": {
        const params = msg.params as { name?: string; arguments?: unknown } | undefined;
        if (!params || typeof params.name !== "string") {
          return rpcError(id, RPC.INVALID_PARAMS, "tools/call requires params.name");
        }
        const tool = this.tools.get(params.name);
        if (!tool) {
          return rpcError(id, RPC.INVALID_PARAMS, `Unknown tool: ${params.name}`);
        }
        try {
          const result = await tool.handler(params.arguments ?? {}, this.ctxFor());
          return rpcResult(id, result);
        } catch (err) {
          // Tool-level throws become MCP-level results, not JSON-RPC errors —
          // the model sees a structured failure it can reason about.
          const message = err instanceof Error ? err.message : "Tool execution failed";
          return rpcResult(id, toolError(message, { ok: false, error: { code: "internal", message } }));
        }
      }
      default:
        return rpcError(id, RPC.METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
  }
}
