import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    {
      error:
        "Self-service admin grant has been disabled. The project owner should run a one-time SQL statement in the Supabase SQL editor to grant the first admin role.",
    },
    { status: 410 }
  );
}
