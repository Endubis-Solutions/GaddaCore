"use client";

import { Button } from "@/components/ui/button";
import { useWalletContext } from "@/contexts/WalletContext";

import InitateEscrow from "./_components/InitateEscrow";
import RecipientDeposit from "./_components/RecipientDeposit";
import CancelEscrow from "./_components/CancelEscrow";
import CompleteEscrow from "./_components/CompleteEscrow";
import EscrowLogs from "./_components/EscrowLogger";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import DisputeActions from "./_components/DisputeActions";
import ArbitratorRegistration from "./_components/ArbitratorRegistration";
import ArbitratorCaseList from "./_components/ArbitratorCaseList";

const Page = () => {
  const { refreshBalance } = useWalletContext();

  return (
    <main className="mx-auto mt-6 max-w-4xl space-y-6 px-6">
      <section className="flex items-center justify-between">
        <div className="flex gap-4">
          <Button onClick={refreshBalance} variant="outline">
            Refresh Wallet
          </Button>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open Logger</Button>
          </SheetTrigger>

          <SheetContent className="w-full max-w-[1200px] sm:w-[80vw]">
            <SheetHeader>
              <SheetTitle asChild>
                <h2 className="text-2xl font-extrabold text-gray-900">Escorw Action Log 📝</h2>
              </SheetTitle>
            </SheetHeader>
            <section>
              <EscrowLogs />
            </section>
          </SheetContent>
        </Sheet>
      </section>

      <section className="flex flex-col gap-4">
        <InitateEscrow />
        <RecipientDeposit />
        <CancelEscrow />
        <CompleteEscrow />
        <DisputeActions />
        <ArbitratorRegistration />
        <ArbitratorCaseList />
      </section>
    </main>
  );
};

export default Page;
