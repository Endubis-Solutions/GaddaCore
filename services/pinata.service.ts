import { uploadToPinata } from "@/actions/pinata.action";
import { useMutation } from "@tanstack/react-query";

export const usePinataUploadMutation = () => {
  return useMutation({
    mutationKey: ["PINATA_UPLOAD"],
    mutationFn: async (file: File) => {
      const url = await uploadToPinata(file);
      return url; // This is the S3 CDN URL returned by Next API
    },
  });
};
