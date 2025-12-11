'use client'

import { Button } from "@/components/ui/button"
import { useWalletContext } from "@/contexts/WalletContext";

import InitateEscrow from "./_components/InitateEscrow";
import RecipientDeposit from "./_components/RecipientDeposit";
import CancelEscrow from "./_components/CancelEscrow";
import CompleteEscrow from "./_components/CompleteEscrow";
import EscrowLogs from "./_components/EscrowLogger";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";


const Page = () => {
    const { refreshBalance } = useWalletContext()

    return (
        <main className="px-6 mt-6 space-y-6 max-w-4xl mx-auto">
            <section className="flex justify-between items-center">
                <div className="flex gap-4">
                    <Button onClick={refreshBalance} variant="outline">Refresh Wallet</Button>
                </div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button>Open Logger</Button>
                    </SheetTrigger>

                    <SheetContent
                        className="w-full max-w-[1200px] sm:w-[80vw]"
                    >
                        <SheetHeader>
                            <SheetTitle asChild>
                                <h2 className="text-2xl font-extrabold text-gray-900">
                                    Escorw Action Log 📝
                                </h2>
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
            </section>

        </main>
    )
}



export default Page