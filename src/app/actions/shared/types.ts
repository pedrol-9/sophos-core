/**
 * @file src/app/actions/shared/types.ts
 * @description Tipos compartidos y estandarizados para Server Actions en Sophos Core.
 */

export type ActionResult<T = void> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};
