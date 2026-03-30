import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    session: { userId?: number } | null | undefined;
  }
}
