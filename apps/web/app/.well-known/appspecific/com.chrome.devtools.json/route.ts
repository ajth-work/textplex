import { createHash } from "crypto";

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toStableUuid(rootPath: string): string {
  const digest = createHash("sha1").update(rootPath.replace(/\\/g, "/")).digest();
  const bytes = Uint8Array.from(digest.subarray(0, 16));

  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

export function GET() {
  const rootPath = process.cwd();

  return NextResponse.json(
    {
      workspace: {
        root: rootPath,
        uuid: toStableUuid(rootPath),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
