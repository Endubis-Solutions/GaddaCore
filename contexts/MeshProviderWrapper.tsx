"use client";

import { MeshProvider } from "@meshsdk/react";

export const MeshProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  return <MeshProvider>{children}</MeshProvider>;
};
