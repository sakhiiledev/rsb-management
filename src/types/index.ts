import { type UserRole } from "@prisma/client";

export type { UserRole };

export interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role: UserRole;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
