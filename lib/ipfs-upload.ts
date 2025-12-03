import { create, Client } from '@web3-storage/w3up-client'

export class IPFSUploader {
  private client: Client | null = null

  async initialize() {
    if (!this.client) {
      this.client = await create()
      // You'll need to authenticate with w3up
      // This requires setting up an account at https://web3.storage
    }
    return this.client
  }

  async uploadFile(file: File): Promise<string> {
    try {
      await this.initialize()
      
      if (!this.client) {
        throw new Error("Client not initialized")
      }

      // Upload file to IPFS
      const cid = await this.client.uploadFile(file)
      return cid.toString()
    } catch (error) {
      console.error("IPFS upload failed:", error)
      throw error
    }
  }

  async uploadJSON(data: unknown): Promise<string> {
    try {
      await this.initialize()
      
      if (!this.client) {
        throw new Error("Client not initialized")
      }

      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
      const file = new File([blob], 'contract.json')
      
      const cid = await this.client.uploadFile(file)
      return cid.toString()
    } catch (error) {
      console.error("JSON upload failed:", error)
      throw error
    }
  }
}