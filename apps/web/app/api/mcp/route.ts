import { NextRequest, NextResponse } from "next/server";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import {
  MCP_PROTOCOL_VERSIONS,
  McpDispatch,
  rpcError,
  type JsonRpcRequest,
  RPC,
} from "@/lib/mcp/protocol";
import { buildToolHandlers } from "@/lib/mcp/preset-factory/handlers";

/**
 * 5Pixels Preset Factory MCP endpoint (#272) — streamable HTTP, stateless.
 *
 * POST accepts exactly one JSON-RPC message per request. Responses are
 * plain `application/json` (no SSE, no sessions) — permitted by the
 * transport spec and the simplest correct surface for a private connector.
 *
 * Transport hardening per the Streamable HTTP spec:
 *   - Origin header validated when present (DNS-rebinding defense); absent
 *     Origin is fine for non-browser clients, never for browsers.
 *   - `MCP-Protocol-Version` validated against supported revisions.
 *   - ONE JSON-RPC message per POST (the 2025-06-18 transport requirement);
 *     array batches are rejected outright, which also removes batched-write
 *     concurrency as an abuse vector.
 *   - Request body capped before parsing.
 *
 * Auth: `Authorization: Bearer <supabase access token>` verified on every
 * request; non-admin callers get 403; 401s advertise the OAuth 2.1 flow via
 * `WWW-Authenticate` + RFC 9728 resource metadata so ChatGPT connectors can
 * self-configure.
 */

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;

const tools = buildToolHandlers();

/**
 * Bounded body read — enforces the byte cap on the WIRE bytes, not on
 * decoded text length (`.length` counts UTF-16 code units, undercounting
 * multi-byte payloads). Reads the request stream chunk-by-chunk and aborts
 * as soon as the cap is exceeded, so oversized chunked bodies (which may
 * not declare Content-Length) cannot exhaust memory.
 */
async function readBoundedBody(
  request: NextRequest
): Promise<{ ok: true; body: string } | { ok: false }> {
  const reader = request.body?.getReader();
  if (!reader) return { ok: true, body: "" };
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return { ok: false };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, body: new TextDecoder("utf-8").decode(merged) };
}

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

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) {
    return rejected(403, "Origin not allowed for this MCP endpoint");
  }
  if (!protocolVersionOk(request)) {
    return rejected(400, `Unsupported MCP-Protocol-Version (supported: ${MCP_PROTOCOL_VERSIONS.join(", ")})`);
  }

  // Body cap — cheap early reject on declared length, then a bounded
  // byte-accurate stream read (chunked bodies may not declare it).
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return rejected(413, "Request body too large");
  }
  const read = await readBoundedBody(request);
  if (!read.ok) {
    return rejected(413, "Request body too large");
  }
  const rawBody = read.body;

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

  // 2025-06-18 Streamable HTTP: exactly one JSON-RPC message per POST.
  if (Array.isArray(body)) {
    return NextResponse.json(
      rpcError(null, RPC.INVALID_REQUEST, "JSON-RPC batches are not supported — send one message per POST"),
      { status: 400 }
    );
  }

  const response = await dispatch.handle(body as JsonRpcRequest);

  // Notifications are acknowledged with 202 and no body.
  if (response === null) {
    return new NextResponse(null, { status: 202 });
  }
  return NextResponse.json(response);
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
