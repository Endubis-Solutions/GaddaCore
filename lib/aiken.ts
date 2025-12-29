import {
    BlockfrostProvider,
    MeshTxBuilder,
    serializePlutusScript,
    UTxO,
} from "@meshsdk/core";
import { applyParamsToScript } from "@meshsdk/core";
import { ENV } from "@/config/env";
import { AikenBluePrint } from "@/constants";

const blockchainProvider = new BlockfrostProvider(ENV.BLOCKFROST_PROJECT_ID);

export function getScript() {
    const scriptCbor = applyParamsToScript(
        AikenBluePrint.validators[0].compiledCode,
        []
    );

    const scriptAddr = serializePlutusScript(
        { code: scriptCbor, version: "V3" },
    ).address;

    return { scriptCbor, scriptAddr };
}

export function getArbitratorScript() {
    const scriptCbor = applyParamsToScript(
        AikenBluePrint.validators[0].compiledCode,
        []
    );

    const scriptAddr = serializePlutusScript(
        { code: scriptCbor, version: "V3" },
    ).address;

    return { scriptCbor, scriptAddr };
}

// reusable function to get a transaction builder
export function getTxBuilder() {
    return new MeshTxBuilder({
        fetcher: blockchainProvider,
        submitter: blockchainProvider,
    });
}

// reusable function to get a UTxO by transaction hash
export async function getUtxoByTxHash(txHash: string): Promise<UTxO> {
    const utxos = await blockchainProvider.fetchUTxOs(txHash);
    if (utxos.length === 0) {
        throw new Error("UTxO not found");
    }
    return utxos[0];
}

export const sleep = async (ms: number) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
