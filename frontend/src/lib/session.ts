"use client";

import { apiRequest } from "@/lib/api";
export type CurrentUser = {
  user_id: number;
  role: string | null;
  employee_id: number | null;
  employee_name: string | null;
  must_change_password: boolean;
};

export async function fetchCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/auth/me");
}


