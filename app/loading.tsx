import { Spinner } from "@/components/ui/spinner";
import React from "react";

const Loading = () => {
  return (
    <main className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner />
        <p className="text-zinc-400">Loading Content ...</p>
      </div>
    </main>
  );
};

export default Loading;
