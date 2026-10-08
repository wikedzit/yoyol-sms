export type ErrorCode =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'internal';

const statusFor: Record<ErrorCode, number> = {
  validation: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  internal: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export type ErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
  };
};

const internalMessage = 'Something went wrong.';

export function errorBody(error: unknown): { status: number; body: ErrorBody } {
  if (error instanceof AppError) {
    return {
      status: statusFor[error.code],
      body: { error: { code: error.code, message: error.message } },
    };
  }
  return {
    status: statusFor.internal,
    body: { error: { code: 'internal', message: internalMessage } },
  };
}

export function errorResponse(error: unknown): Response {
  const result = errorBody(error);
  return Response.json(result.body, { status: result.status });
}
