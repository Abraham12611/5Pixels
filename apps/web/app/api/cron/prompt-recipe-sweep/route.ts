import { NextRequest, NextResponse } from "next/server";
import { isOpenRouterConfigured } from "@/lib/ai/openrouter";
import { sweepPromptRecipes } from "@/lib/prompt-recipe/sweep";

// Backfills public_prompt_recipe for published presets that don't have
// one — covers existing catalog plus anything the on-save hooks missed.
// Authorization: Bearer $CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[prompt-recipe-sweep] missing CRON_SECRET");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOpenRouterConfigured()) {
    console.error("[prompt-recipe-sweep] missing OPENROUTER_API_KEY");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const result = await sweepPromptRecipes();
    return NextResponse.json(result);
  } catch (err) {
    console.error(
      "[prompt-recipe-sweep] run failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Sweep run failed" }, { status: 500 });
  }
}
