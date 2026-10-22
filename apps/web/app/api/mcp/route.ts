import { NextRequest, NextResponse } from "next/server";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import {
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
 * Auth: `Authorization: Bearer <supabase access token>` verified on every
 * request; non-admin callers get 403; 401s advertise the OAuth 2.1 flow via
 * `WWW-Authenticate` + RFC 9728 resource metadata so ChatGPT connectors can
 * self-configure.
 */

export const dynamic = "force-dynamic";

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

const tools = buildToolHandlers();

export async function POST(request: NextRequest) {
  const auth = await authenticateMcpRequest(request);
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(request, auth.error);
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: RPC.INVALID_REQUEST, message: auth.error } },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
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
  if (messages.length === 0 || messages.length > 20) {
    return NextResponse.json(
      rpcError(null, RPC.INVALID_REQUEST, "Batch must contain 1..20 messages"),
      { status: 400 }
    );
  }

  const responses = (
    await Promise.all(messages.map((m) => dispatch.handle(m as JsonRpcRequest)))
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
