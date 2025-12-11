import { Asset, conStr0, ConStr0, conStr1, ConStr1, deserializeAddress, PubKeyAddress, pubKeyAddress, Value, value, Integer, BuiltinByteString, integer, builtinByteString } from "@meshsdk/core";

export const isClient = typeof window !== 'undefined';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stringifyPlutusData = (data: any) => {
    return JSON.stringify(data, (key, value) => {
        // Check if the value is a BigInt and convert it to a string
        if (typeof value === 'bigint') {
            return value.toString();
        }
        return value;
    }, 2);
}

export const getErrMsg = (error: unknown) => {
    if (error instanceof Error) return error?.message;
    return String(error);
}


// Aiken specific
export type InitiationDatum = ConStr0<[PubKeyAddress, Value, PubKeyAddress, Integer, BuiltinByteString, Integer]>;

export const initiateEscrowDatum = (
    walletAddress: string,
    amount: Asset[],
    recipientAddr: string,
    deadline: number,
    contract_ipfs_url: string
): InitiationDatum => {
    const { pubKeyHash, stakeCredentialHash } = deserializeAddress(walletAddress);
    const { pubKeyHash: recipient, stakeCredentialHash: recipientStakeCredentialHash } = deserializeAddress(recipientAddr);
    const now = Date.now()

    return conStr0([
        pubKeyAddress(pubKeyHash, stakeCredentialHash),
        value(amount),
        pubKeyAddress(recipient, recipientStakeCredentialHash),
        integer(deadline),
        builtinByteString(contract_ipfs_url),
        integer(now)
    ]);
};


export type ActiveEscrowDatum = ConStr1<
    [PubKeyAddress, Value, PubKeyAddress, Value, Integer, BuiltinByteString, Integer]
>;



export const activeEscrowDatum = (
    initiationDatum: InitiationDatum,
    walletAddress: string,
    amount: Asset[],
): ActiveEscrowDatum => {
    const { pubKeyHash, stakeCredentialHash } = deserializeAddress(walletAddress);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [initiator, initiatorAmount, _recipient, deadline, contract_ipfs_url, created_at] = initiationDatum.fields;
    console.log(stringifyPlutusData({
        initiator,
        initiatorAmount,
        _recipient,
        deadline,
        contract_ipfs_url,
        created_at
    }))
    return conStr1([
        initiator,
        initiatorAmount,
        pubKeyAddress(pubKeyHash, stakeCredentialHash),
        value(amount),
        deadline,
        contract_ipfs_url,
        created_at
    ]);
};



export type RecipientDepositRedeemer = ConStr0<[PubKeyAddress, Value]>;

export const recipientDepositRedeemer = (
    recipientAddr: string,
    depositAmount: Asset[],
) => {
    const { pubKeyHash, stakeCredentialHash } = deserializeAddress(recipientAddr);

    return conStr0([
        pubKeyAddress(pubKeyHash, stakeCredentialHash),
        value(depositAmount),
    ]);
}
