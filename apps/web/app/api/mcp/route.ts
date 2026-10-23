import { NextRequest, NextResponse } from "next/server";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import {
  MCP_PROTOCOL_VERSIONS,
  McpDispatch,
  rpcError,
  type JsonRpcRequest,
  type JsonRpcResponse,
  RPC,
} from "@/lib/mcp/protocol";
import { buildToolHandlers } from "@/lib/mcp/preset-factory/handlers";

/**
 * 5Pixels Preset Factory MCP endpoint (#272) — streamable HTTP, stateless.
 *
 * POST accepts single or batched JSON-RPC messages. Responses are plain
 * `application/json` (no SSE, no sessions) — permitted by the transport spec
 * and the simplest correct surface for a private connector.
 *
 * Transport hardening per the Streamable HTTP spec:
 *   - Origin header validated when present (DNS-rebinding defense); absent
 *     Origin is fine for non-browser clients, never for browsers.
 *   - `MCP-Protocol-Version` validated against supported revisions.
 *   - Request body capped before parsing; JSON-RPC batch capped; tool calls
 *     within a batch run with bounded concurrency (writes included).
 *
 * Auth: `Authorization: Bearer <supabase access token>` verified on every
 * request; non-admin callers get 403; 401s advertise the OAuth 2.1 flow via
 * `WWW-Authenticate` + RFC 9728 resource metadata so ChatGPT connectors can
 * self-configure.
 */

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;
const MAX_BATCH_MESSAGES = 10;
const TOOL_CALL_CONCURRENCY = 4;

const tools = buildToolHandlers();

function resourceMetadataUrl(req: NextRequest): string {
  return new URL("/.well-known/oauth-protected-resource", req.nextUrl.origin).toString();
}

function unauthorized(req: NextRequest, message: string): NextResponse {
  return NextResponse.json(
    { jsonrpc: "2.0", id: null, error: { code: RPC.INVALID_REQUEST, message } },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": `Bearer realm="5pixels-preset-factory", resource_metadata="${resourceMetadataUrl(req)}"`,
      },
    }
  );
}

function rejected(status: number, message: string): NextResponse {
  return NextResponse.json(
    { jsonrpc: "2.0", id: null, error: { code: RPC.INVALID_REQUEST, message } },
    { status }
  );
}

/** DNS-rebinding / cross-site defense: an Origin header must be same-origin
 * or explicitly allowlisted. Absent Origin = non-browser client (allowed). */
function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  if (origin === req.nextUrl.origin) return true;
  const allow = (process.env.PRESET_FACTORY_MCP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allow.includes(origin);
}

/** The negotiated protocol version must be one we actually implement. */
function protocolVersionOk(req: NextRequest): boolean {
  const v = req.headers.get("mcp-protocol-version");
  if (!v) return true; // pre-initialize or default assumption — dispatch negotiates
  return (MCP_PROTOCOL_VERSIONS as readonly string[]).includes(v);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) {
    return rejected(403, "Origin not allowed for this MCP endpoint");
  }
  if (!protocolVersionOk(request)) {
    return rejected(400, `Unsupported MCP-Protocol-Version (supported: ${MCP_PROTOCOL_VERSIONS.join(", ")})`);
  }

  // Body cap — enforce before parsing; chunked bodies are measured raw.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return rejected(413, "Request body too large");
  }
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return rejected(413, "Request body too large");
  }

  const auth = await authenticateMcpRequest(request);
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(request, auth.error);
    return rejected(403, auth.error);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      rpcError(null, RPC.PARSE_ERROR, "Request body must be valid JSON"),
      { status: 400 }
    );
  }

  const origin = request.nextUrl.origin;
  const ctx = { caller: auth.caller, requestOrigin: origin };
  const dispatch = new McpDispatch(new Map(tools), () => ctx);

  const messages = Array.isArray(body) ? body : [body];
  if (messages.length === 0 || messages.length > MAX_BATCH_MESSAGES) {
    return NextResponse.json(
      rpcError(null, RPC.INVALID_REQUEST, `Batch must contain 1..${MAX_BATCH_MESSAGES} messages`),
      { status: 400 }
    );
  }

  const responses = (
    await mapWithConcurrency(messages, TOOL_CALL_CONCURRENCY, (m) =>
      dispatch.handle(m as JsonRpcRequest)
    )
  ).filter((r): r is JsonRpcResponse => r !== null);

  // Notification-only payloads are acknowledged with 202 and no body.
  if (responses.length === 0) {
    return new NextResponse(null, { status: 202 });
  }
  return NextResponse.json(Array.isArray(body) ? responses : responses[0]);
}

export async function GET() {
  // Stateless server: no SSE stream endpoint. Spec-compliant 405.
  return NextResponse.json(
    { error: "SSE streams are not supported; use POST." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Sessions are not supported; DELETE is a no-op." },
    { status: 405, headers: { Allow: "POST" } }
  );
}
