import { Asset, conStr0, ConStr0, conStr1, ConStr1, deserializeAddress, PubKeyAddress, pubKeyAddress, Value, value, Integer, BuiltinByteString, integer, builtinByteString, ConStr3, ConStr, conStr3, conStr, ConStr2, conStr2 } from "@meshsdk/core";

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
    const [initiator, initiatorAmount, _recipient, deadline, contract_ipfs_url, created_at] = initiationDatum.fields;
    /**  
     * ActiveEscrow {
        initiator: Address,
        initiator_assets: MValue,
        recipient: Address,
        recipient_assets: MValue,
        deadline: Int,
        contract_ipfs_url: ByteArray,
        created_at: Int,
    }
     */
    console.log(stringifyPlutusData({
        initiationDatum: initiationDatum.fields,
        _recipient
    }))

    const result: ActiveEscrowDatum = conStr1([
        initiator,
        initiatorAmount,
        pubKeyAddress(pubKeyHash, stakeCredentialHash),
        value(amount),
        deadline,
        contract_ipfs_url,
        created_at
    ]);

    console.log(stringifyPlutusData(result))

    return result
};



export type RecipientDepositRedeemer = ConStr0<[PubKeyAddress, Value]>;

export const recipientDepositRedeemer = (
    recipientAddr: string,
    depositAmount: Asset[],
) => {
    const { pubKeyHash, stakeCredentialHash } = deserializeAddress(recipientAddr);

    /**
     * RecipientDeposit { recipient: Address, recipient_assets: MValue }
     */
    return conStr0([
        pubKeyAddress(pubKeyHash, stakeCredentialHash),
        value(depositAmount),
    ]);
}


/**
 *  RaiseInitiatorDispute {
    initiator_dispute_raised_at: Int,
    initiator_case_ipfs_url: ByteArray,
  }

  SubmitRecipientEvidence {
    recipient_dispute_raised_at: Int,
    recipient_case_ipfs_url: ByteArray,
  }
 */

export type RaiseInitiatorDisputeRedeemer = ConStr3<[Integer, BuiltinByteString]>;
export type SubmitRecipientEvidenceRedeemer = ConStr<4, [Integer, BuiltinByteString]>


export const raiseInitiatorDisputeRedeemer = (initiatorDisputeRaisedAt: number, initiatorCaseIpfsUrl: string) => {
    return conStr3([integer(initiatorDisputeRaisedAt), builtinByteString(initiatorCaseIpfsUrl)]);
}

export const submitRecipientEvidenceRedeemer = (recipientDisputeRaisedAt: number, recipientCaseIpfsUrl: string) => {
    return conStr(4, [integer(recipientDisputeRaisedAt), builtinByteString(recipientCaseIpfsUrl)]);
}

/**
 * InitiatorDispute {
    initiator: Address,
    initiator_assets: MValue,
    recipient: Address,
    recipient_assets: MValue,
    deadline: Int,
    contract_ipfs_url: ByteArray,
    created_at: Int,
    initiator_dispute_raised_at: Int,
    initiator_case_ipfs_url: ByteArray,
  }
    */
export type InitiatorDisputeDatum = ConStr2<
    [PubKeyAddress, Value, PubKeyAddress, Value, Integer, BuiltinByteString, Integer, Integer, BuiltinByteString]>

/*******  7e0f2704-dbd3-4775-bfa7-afd4303b7471  *******/export const initiatorDisputeDatum = (
        activeEscrowDatum: ActiveEscrowDatum,
        initiatorDisputeRaisedAt: number,
        initiatorCaseIpfsUrl: string
    ): InitiatorDisputeDatum => {
    const f0_initiator = activeEscrowDatum.fields[0];
    const f1_initiator_assets = activeEscrowDatum.fields[1];
    const f2_recipient = activeEscrowDatum.fields[2];
    const f3_recipient_assets = activeEscrowDatum.fields[3];
    const f4_deadline = activeEscrowDatum.fields[4];
    const f5_contract_ipfs = activeEscrowDatum.fields[5];
    const f6_created_at = activeEscrowDatum.fields[6];

    // 2. PREPARE NEW DISPUTE FIELDS
    const f7_dispute_raised_at = integer(initiatorDisputeRaisedAt);
    const f8_case_ipfs_url = builtinByteString(initiatorCaseIpfsUrl);

    console.log("--- DEBUG: initiatorDisputeDatum Helper ---");
    console.log("F0 (Initiator):", f0_initiator);
    console.log("F1 (Initiator Assets):", f1_initiator_assets);
    console.log("F2 (Recipient):", f2_recipient);
    console.log("F3 (Recipient Assets):", f3_recipient_assets);
    console.log("F4 (Deadline):", f4_deadline);
    console.log("F5 (Contract IPFS):", f5_contract_ipfs);
    console.log("F6 (Created At):", f6_created_at);
    console.log("F7 (Dispute Raised At):", f7_dispute_raised_at);
    console.log("F8 (Case IPFS URL):", f8_case_ipfs_url);
    console.log("-----------------------------------------");
    return conStr2(
        [
            activeEscrowDatum.fields[0],
            activeEscrowDatum.fields[1],
            activeEscrowDatum.fields[2],
            activeEscrowDatum.fields[3],
            activeEscrowDatum.fields[4],
            activeEscrowDatum.fields[5],
            activeEscrowDatum.fields[6],
            integer(initiatorDisputeRaisedAt),
            builtinByteString(initiatorCaseIpfsUrl),
        ]

    )
}
/*
RecipientDispute {
  initiator: Address,
  initiator_assets: MValue,
  recipient: Address,
  recipient_assets: MValue,
  deadline: Int,
  contract_ipfs_url: ByteArray,
  created_at: Int,
  initiator_dispute_raised_at: Int,
  initiator_case_ipfs_url: ByteArray,
  recipient_dispute_raised_at: Int,
  recipient_case_ipfs_url: ByteArray,
}
*/

export type RecipientDisputeDatum = ConStr3<
    [PubKeyAddress, Value, PubKeyAddress, Value, Integer, BuiltinByteString, Integer, Integer, BuiltinByteString, Integer, BuiltinByteString]>


export const recipientDisputeDatum = (
    initiatorDisputeDatum: InitiatorDisputeDatum,
    recipientDisputeRaisedAt: number,
    recipientCaseIpfsUrl: string
): RecipientDisputeDatum =>
    conStr3(
        [
            initiatorDisputeDatum.fields[0],
            initiatorDisputeDatum.fields[1],
            initiatorDisputeDatum.fields[2],
            initiatorDisputeDatum.fields[3],
            initiatorDisputeDatum.fields[4],
            initiatorDisputeDatum.fields[5],
            initiatorDisputeDatum.fields[6],
            initiatorDisputeDatum.fields[7],
            initiatorDisputeDatum.fields[8],
            integer(recipientDisputeRaisedAt),
            builtinByteString(recipientCaseIpfsUrl),
        ]
    )