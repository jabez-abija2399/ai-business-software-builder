import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
    timestamp: string;
    pagination?: {
      nextCursor?: string;
      hasMore: boolean;
      limit: number;
    };
  };
}

export function apiSuccess<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

export function apiCreated<T>(data: T): NextResponse<ApiResponse<T>> {
  return apiSuccess(data, 201);
}

export function apiAccepted<T>(data: T): NextResponse<ApiResponse<T>> {
  return apiSuccess(data, 202);
}

export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function apiError(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

export function apiUnauthorized(message: string = "Authentication required"): NextResponse {
  return apiError("UNAUTHORIZED", message, 401);
}

export function apiForbidden(message: string = "Insufficient permissions"): NextResponse {
  return apiError("FORBIDDEN", message, 403);
}

export function apiNotFound(resource: string = "Resource"): NextResponse {
  return apiError("NOT_FOUND", `${resource} not found`, 404);
}

export function apiConflict(message: string): NextResponse {
  return apiError("CONFLICT", message, 409);
}

export function apiValidationError(details: unknown): NextResponse {
  return apiError("VALIDATION_ERROR", "Validation failed", 422, details);
}

export function apiInternalError(message: string = "Internal server error"): NextResponse {
  return apiError("INTERNAL_ERROR", message, 500);
}

export function apiRateLimited(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "RATE_LIMITED",
        message: `Too many requests. Please retry after ${retryAfter} seconds.`,
        details: {
          retryAfter,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfter.toString(),
      },
    }
  );
}
