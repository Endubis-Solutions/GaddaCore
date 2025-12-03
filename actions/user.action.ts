"use server"

import { UserCreateInput } from "@/lib/generated/prisma/models"
import prisma from "@/lib/prisma"
import { serverActionWrapper } from "@/lib/server-action-wrapper"

export const upsertUser = serverActionWrapper(async (userData: UserCreateInput) => {
    return await prisma.user.upsert({
        where: {
            walletAddress: userData.walletAddress
        },
        update: {
            role: userData.role
        },
        create: {
            walletAddress: userData.walletAddress,
            role: userData.role,
        }
    })
})

export const getUser = serverActionWrapper(async (walletAddress: string) => {
    return await prisma.user.findUnique({
        where: {
            walletAddress: walletAddress
        },
        include: {
            arbitrator: true,
        }
    })
})