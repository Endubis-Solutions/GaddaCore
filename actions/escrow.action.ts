"use server"

import { serverActionWrapper } from "@/lib/server-action-wrapper"
import { EscrowCreateInput } from "@/lib/generated/prisma/models"
import prisma from "@/lib/prisma"
import { EscrowStatus } from "@/lib/generated/prisma/enums"

export const createEscrow = serverActionWrapper(async (data: EscrowCreateInput) => {
    console.log({ data })

    const user = await prisma.user.findUnique({
        where: {
            walletAddress: data.funderAddress
        }
    })

    if (!user) {
        throw new Error("User not found")
    }

    const { txHash } = data

    const newEscrow = await prisma.escrow.create({
        data
    })

    await prisma.escrowTransaction.create({
        data: {
            reason: "RECIPIENT_STAKING",
            txHash,
            escrowId: newEscrow.id,
            userId: user.id
        }
    })

    return newEscrow
})

export const updateEscrow = serverActionWrapper(async (data: {
    id: string
    status: EscrowStatus;
    walletAddress: string,
    txHash: string,
}) => {
    console.log({ data })
    const { id, status, walletAddress, txHash } = data
    const user = await prisma.user.findUnique({
        where: {
            walletAddress
        }
    })

    if (!user) {
        throw new Error("User not found")
    }


    if (status === "ACTIVE") {
        await prisma.escrowTransaction.create({
            data: {
                reason: "RECIPIENT_STAKING",
                txHash,
                escrowId: id,
                userId: user.id
            }
        })
    }


    return await prisma.escrow.update({
        where: {
            id
        },
        data: {
            status
        }
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
            OR: [
                {
                    funderAddress: walletAddress
                },
                {
                    recipientAddress: walletAddress
                }
            ]
        }
    })

    return escrows
})