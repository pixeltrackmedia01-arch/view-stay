import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { isAppError } from "./errors";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function errorResponse(e: unknown) {
  if (isAppError(e)) {
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status });
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: e.issues[0]?.message ?? "Invalid input",
          fields: e.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not found" } }, { status: 404 });
  }
  console.error(e);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wrap a route handler so thrown AppErrors / ZodErrors become JSON error responses. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
