"use client";

import {
  cancelPayment,
  CancelPaymentArgs,
  createNewPayment,
  CreateNewPaymentArgs,
  getEscrowById,
  getUserEscrows,
  recipientDeposit,
  RecipientDepositArgs,
  releasePayment,
  ReleasePaymentArgs,
} from "@/actions/escrow.action";
import { throwFailedActions } from "@/lib/server-action-wrapper";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useNewPaymentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["CREATE_ESCROW"],
    mutationFn: async (data: CreateNewPaymentArgs) => {
      console.log({ data });
      const response = await createNewPayment(data);
      console.dir({ response }, { depth: null });
      throwFailedActions(response);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["GET_USERS_ESCROWS"],
      });
    },
  });
};

export const useRecipientStakeMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["RECIPIENT_STAKE"],
    mutationFn: async (data: RecipientDepositArgs) => {
      const response = await recipientDeposit(data);
      throwFailedActions(response);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["GET_USERS_ESCROWS"],
      });
    },
  });
};

export const useCancelPaymentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["CANCEL_PAYMENT"],
    mutationFn: async (data: CancelPaymentArgs) => {
      const response = await cancelPayment(data);
      throwFailedActions(response);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["GET_USERS_ESCROWS"],
      });
    },
  });
};

export const useReleasePaymentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["RELEASE_PAYMENT"],
    mutationFn: async (data: ReleasePaymentArgs) => {
      const response = await releasePayment(data);
      throwFailedActions(response);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["GET_USERS_ESCROWS"],
      });
    },
  });
};

export const useGetEscrowByIdQuery = ({ id, enabled }: { id?: string; enabled: boolean }) => {
  return useQuery({
    queryKey: ["GET_ESCROW_BY_ID", id],
    queryFn: async () => {
      if (!id) {
        throw new Error("Escrow id not provided");
      }
      const response = await getEscrowById(id);
      throwFailedActions(response);
      return response.data;
    },
    enabled,
  });
};

export const useGetUsersEscrowQuery = (walletAddress: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["GET_USERS_ESCROWS"],
    queryFn: async () => {
      const response = await getUserEscrows(walletAddress);
      throwFailedActions(response);
      return response.data || [];
    },
    enabled,
  });
};
