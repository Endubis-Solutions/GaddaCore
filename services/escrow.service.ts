'use client'

import { createEscrow, getUserEscrows, updateEscrow } from "@/actions/escrow.action"
import { EscrowStatus } from "@/lib/generated/prisma/enums"
import { EscrowCreateInput } from "@/lib/generated/prisma/models"
import { throwFailedActions } from "@/lib/server-action-wrapper"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export const useCreateEscrowMutation = () => {
    return useMutation({
        mutationKey: ['CREATE_ESCROW'],
        mutationFn: async (data: EscrowCreateInput) => {
            console.log({ data })
            const response = await createEscrow(data)
            console.dir({ response }, { depth: null })
            throwFailedActions(response)
            return response.data
        }
    })
}


export const useUpdateEscrowMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            id: string
            status: EscrowStatus;
            walletAddress: string,
            txHash: string,
        }) => {
            const res = await updateEscrow(data)

            throwFailedActions(res)
            return res.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['GET_USERS_ESCROWS'] });
        },
        onError: (error) => {
            console.error('Update escrow error:', error);
            alert('Failed to update escrow status');
        }
    });
};

export const useGetUsersEscrowQuery = (walletAddress: string) => {
    return useQuery({
        queryKey: ["GET_USERS_ESCROWS"],
        queryFn: async () => {
            const response = await getUserEscrows(walletAddress)
            throwFailedActions(response)
            return response.data || []
        },
        enabled: !!walletAddress
    })
}



