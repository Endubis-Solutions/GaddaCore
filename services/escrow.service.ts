'use client'

import { createEscrow, getUserEscrows } from "@/actions/escrow.action"
import { EscrowCreateInput } from "@/lib/generated/prisma/models"
import { throwFailedActions } from "@/lib/server-action-wrapper"
import { useMutation, useQuery } from "@tanstack/react-query"

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

export const useGetUsersEscrowQuery = (walletAddress: string) => {
    return useQuery({
        queryKey: ["GET_USERS_ESCROWS"],
        queryFn: async () => {
            const response = await getUserEscrows(walletAddress)
            throwFailedActions(response)
            return response.data
        },
        enabled: !!walletAddress
    })
}