"use server"

import { serverActionWrapper } from "@/lib/server-action-wrapper"
import { EscrowCreateInput } from "@/lib/generated/prisma/models"
import prisma from "@/lib/prisma"

export const createEscrow = serverActionWrapper(async (data: EscrowCreateInput) => {
    console.log({ data })
    return await prisma.escrow.create({
        data
    })
})

export const getUserEscrows = serverActionWrapper(async (walletAddress: string) => {
    const user = await prisma.user.findUnique({
        where: {
            walletAddress
        }
    })

    if (!user) {
        throw new Error("User not found with provided wallet address")
    }

    const escrows = await prisma.escrow.findMany({
        where: {
            user: {
                walletAddress
            }
        }
    })

    return escrows
})