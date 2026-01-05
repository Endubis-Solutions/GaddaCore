"use client";

import { upsertUser } from "@/actions/user.action";
import { UserCreateInput } from "@/lib/generated/prisma/models";
import { throwFailedActions } from "@/lib/server-action-wrapper";
import { useMutation } from "@tanstack/react-query";

export const useUpsertUserMutation = () => {
  return useMutation({
    mutationKey: ["UPSERT_USER"],
    mutationFn: async (data: UserCreateInput) => {
      const response = await upsertUser(data);
      throwFailedActions(response);

      return response.data;
    },
  });
};
