import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type ContractAction = {
  id: string;
  timestamp: number;
  action: "DEPLOY" | "CALL" | "READ" | "ERROR" | "INIT";
  contractName: string;
  method?: string;
  txHash?: string;
  details: Record<string, unknown>;
};

interface ActionLogState {
  logs: ContractAction[];
  // Methods
  logAction: (action: Omit<ContractAction, "id" | "timestamp">) => void;
  clearLogs: () => void;
}

export const useContractActionLog = create<ActionLogState>()(
  immer(
    persist(
      (set) => ({
        logs: [],
        logAction: (action) =>
          set((state) => {
            const newAction: ContractAction = {
              id: crypto.randomUUID(), // Use crypto for robust unique IDs
              timestamp: Date.now(),
              ...action,
            };
            state.logs.unshift(newAction);
          }),

        clearLogs: () =>
          set((state) => {
            state.logs = [];
          }),
      }),
      {
        // Persistence Configuration
        name: "smart-contract-action-log", // Key in localStorage
        storage: createJSONStorage(() => localStorage), // Use localStorage
        version: 1, // Optional: for handling future migration of state structure

        // Optional: Only persist the 'logs' array, not the methods
        partialize: (state) => ({ logs: state.logs }),
      }
    )
  )
);
