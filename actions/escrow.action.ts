"use server";

import { serverActionWrapper } from "@/lib/server-action-wrapper";
import { EscrowCreateInput } from "@/lib/generated/prisma/models";
import prisma from "@/lib/prisma";
import { getUser } from "./user.action";
import { InputJsonValue } from "@/lib/generated/prisma/internal/prismaNamespace";

export type CreateNewPaymentArgs = Omit<EscrowCreateInput, "status" | "recipientStakeInAda"> & {
  transaction: {
    datum: InputJsonValue;
    txHash: string;
  };
};

export const createNewPayment = serverActionWrapper(async (data: CreateNewPaymentArgs) => {
  const { success, data: user } = await getUser(data.funderAddress);

  if (!success || !user) {
    throw new Error("User not found with provided wallet address");
  }

  const { transaction, ...escrowPayload } = data;

  const newEscrow = await prisma.$transaction(async (tx) => {
    const newEscrow = await tx.escrow.create({
      data: {
        ...escrowPayload,
        status: "AWAITING_RECIPIENT",
        users: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    // Create tnx
    await tx.transaction.create({
      data: {
        userId: user.id,
        escrowId: newEscrow.id,
        type: "CREATE_ESCROW",
        datum: transaction.datum,
        txHash: transaction.txHash,
        reason: "new payment created",
        amount: escrowPayload.funderStakeInAda,
      },
    });

    return newEscrow;
  });

  return newEscrow;
});

export type RecipientDepositArgs = Pick<EscrowCreateInput, "recipientStakeInAda"> & {
  escrowId: string;
  transaction: {
    datum: InputJsonValue;
    txHash: string;
  };
};

export const recipientDeposit = serverActionWrapper(async (data: RecipientDepositArgs) => {
  const escrow = await prisma.escrow.findUnique({
    where: {
      id: data.escrowId,
    },
  });

  if (!escrow) {
    throw new Error("Escrow not found with provided id");
  }

  const { success, data: user } = await getUser(escrow.recipientAddress);

  if (!success || !user) {
    throw new Error("User not found with provided wallet address");
  }

  const { transaction, ...escrowPayload } = data;

  const newEscrow = await prisma.$transaction(async (tx) => {
    const newEscrow = await tx.escrow.update({
      where: {
        id: data.escrowId,
      },
      data: {
        recipientStakeInAda: escrowPayload.recipientStakeInAda,
        status: "ACTIVE",
        users: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    // Create tnx
    await tx.transaction.create({
      data: {
        escrowId: newEscrow.id,
        type: "DEPOSIT_COLLATERAL",
        datum: transaction.datum,
        txHash: transaction.txHash,
        userId: user.id,
        reason: "recipient deposit",
        amount: escrowPayload.recipientStakeInAda as number,
      },
    });

    return newEscrow;
  });

  return newEscrow;
});

export type CancelPaymentArgs = {
  walletAddress: string;
  escrowId: string;
  transaction: {
    datum: InputJsonValue;
    txHash: string;
  };
};

export const cancelPayment = serverActionWrapper(async (data: CancelPaymentArgs) => {
  const { success, data: user } = await getUser(data.walletAddress);

  if (!success || !user) {
    throw new Error("User not found with provided wallet address");
  }

  const escrow = await prisma.escrow.findUnique({
    where: {
      id: data.escrowId,
    },
  });

  if (!escrow) {
    throw new Error("Escrow not found with provided id");
  }

  const { transaction } = data;

  const newEscrow = await prisma.$transaction(async (tx) => {
    const newEscrow = await tx.escrow.update({
      where: {
        id: data.escrowId,
      },
      data: {
        status: "CANCELLED",
        users: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    // Create tnx
    await tx.transaction.create({
      data: {
        escrowId: newEscrow.id,
        type: "CANCEL",
        datum: transaction.datum,
        txHash: transaction.txHash,
        userId: user.id,
        reason: "payment cancelled",
      },
    });

    return newEscrow;
  });

  return newEscrow;
});

export type ReleasePaymentArgs = {
  walletAddress: string;
  escrowId: string;
  transaction: {
    datum: InputJsonValue;
    txHash: string;
  };
};

export const releasePayment = serverActionWrapper(async (data: ReleasePaymentArgs) => {
  const { success, data: user } = await getUser(data.walletAddress);

  if (!success || !user) {
    throw new Error("User not found with provided wallet address");
  }

  const escrow = await prisma.escrow.findUnique({
    where: {
      id: data.escrowId,
    },
  });

  if (!escrow) {
    throw new Error("Escrow not found with provided id");
  }

  const { transaction, ...escrowPayload } = data;

  const newEscrow = await prisma.$transaction(async (tx) => {
    const newEscrow = await tx.escrow.update({
      where: {
        id: data.escrowId,
      },
      data: {
        ...escrowPayload,
        status: "APPROVED",
        users: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    // Create tnx
    await tx.transaction.create({
      data: {
        escrowId: newEscrow.id,
        type: "RELEASE_FUNDS",
        datum: transaction.datum,
        txHash: transaction.txHash,
        userId: user.id,
        reason: "payment released",
      },
    });

    return newEscrow;
  });

  return newEscrow;
});

export const getEscrowById = serverActionWrapper(async (id: string) => {
  const escrow = await prisma.escrow.findUnique({
    where: {
      id,
    },
    include: {
      transactions: {
        orderBy: {
          createdAt: "desc",
        },
      },
      dispute: true,
      resolution: true,
      users: true,
    },
  });

  return escrow;
});

export const getUserEscrows = serverActionWrapper(async (walletAddress: string) => {
  const user = await prisma.user.findUnique({
    where: {
      walletAddress,
    },
  });

  if (!user) {
    throw new Error("User not found with provided wallet address");
  }

  const escrows = await prisma.escrow.findMany({
    where: {
      OR: [
        {
          funderAddress: walletAddress,
        },
        {
          recipientAddress: walletAddress,
        },
      ],
    },
    include: {
      transactions: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return escrows;
});
