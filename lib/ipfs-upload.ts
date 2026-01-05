import * as Client from "@storacha/client";
import { Signer } from "@storacha/client/principal/ed25519";
import * as Proof from "@storacha/client/proof";

/**
 * IPFSUploader for Athena Protocol
 * Migrated to @storacha/client (Storacha Network)
 */
export class IPFSUploader {
  private client: Client.Client | null = null;

  async initialize() {
    if (this.client) return this.client;

    // Initialize the client
    // Note: To work in production, you must provide a Principal and Proof
    // from your environment variables so users don't have to 'login' themselves.
    this.client = await Client.create();

    return this.client;
  }

  /**
   * Uploads a file (evidence, documents) to Storacha
   */
  async uploadFile(file: File): Promise<string> {
    try {
      const client = await this.initialize();

      // Storacha requires a 'Space' to be selected for uploads
      const space = client.currentSpace();
      if (!space) {
        throw new Error("No Storacha Space selected. Ensure your Agent has a delegated space.");
      }

      // Upload to the hot storage network
      const cid = await client.uploadFile(file);

      // Return the CID string (or wrap in a gateway URL)
      return cid.toString();
    } catch (error) {
      console.error("Athena IPFS Upload Error:", error);
      throw error;
    }
  }

  /**
   * Uploads contract metadata or dispute details as JSON
   */
  async uploadJSON(data: unknown): Promise<string> {
    try {
      const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      const file = new File([blob], "athena-metadata.json");

      return await this.uploadFile(file);
    } catch (error) {
      console.error("Athena JSON Upload Error:", error);
      throw error;
    }
  }
}

export const ipfs = new IPFSUploader();
