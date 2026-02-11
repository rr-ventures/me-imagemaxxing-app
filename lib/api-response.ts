import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;
  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function requestId(headers: Headers) {
  return headers.get("x-request-id") || randomUUID();
}

export function ok<T>(data: T, rid: string, status = 200) {
  return NextResponse.json({ ok: true, requestId: rid, ...data }, { status });
}

export function fail(rid: string, error: unknown, fallback: { status: number; code: string; message: string }) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { ok: false, requestId: rid, error: { code: error.code, message: error.message, details: error.details ?? null } },
      { status: error.status }
    );
  }
  const message = error instanceof Error ? error.message : fallback.message;
  return NextResponse.json(
    { ok: false, requestId: rid, error: { code: fallback.code, message, details: null } },
    { status: fallback.status }
  );
}
