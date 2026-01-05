"server only";

import { ENV } from "@/config/env";
import { PinataSDK } from "pinata";

export const pinata = new PinataSDK({
  pinataJwt: ENV.PINATA_JWT,
  pinataGateway: `${process.env.NEXT_PUBLIC_GATEWAY_URL}`,
});
