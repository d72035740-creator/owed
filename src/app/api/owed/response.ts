import { NextResponse } from "next/server";

export async function owedResponse<T>(work: () => Promise<T>) {
  try {
    return NextResponse.json(await work());
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The OWED demo could not continue";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
