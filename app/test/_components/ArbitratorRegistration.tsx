import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import React, { useState } from "react";

// --- DEMO CONSTANT ---
const ARBITRATOR_STAKE_ADA = 100;

const ArbitratorRegistration = () => {
  const [expertise, setExpertise] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleRegister = () => {
    if (!expertise.trim()) {
      alert("Please list your areas of expertise.");
      return;
    }

    setIsPending(true);
    console.log(`[DEMO] Required Stake: ${ARBITRATOR_STAKE_ADA} ADA. Expertise: ${expertise}`);

    // Simulate a network transaction delay (replace with your Mesh TX builder)
    setTimeout(() => {
      setIsPending(false);
      setIsRegistered(true);
      alert(`Registration successful! You have virtually staked ${ARBITRATOR_STAKE_ADA} ADA.`);
    }, 2000);
  };

  if (isRegistered) {
    return (
      <section className="space-y-4 rounded-xl border border-green-400 bg-green-50 p-6 shadow-md">
        <h2 className="text-xl font-bold text-green-700">✅ Registration Complete</h2>
        <p className="text-sm">You are now eligible to review cases.</p>
        <p className="font-mono text-xs text-gray-600">Expertise: {expertise}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-2xl font-bold text-indigo-700">Arbitrator Registration</h2>
      <p className="text-sm text-gray-600">
        Stake **100 ADA** (demo) and declare your expertise to participate.
      </p>

      <div className="space-y-4">
        {/* STAKE AMOUNT (Demo) */}
        <div className="rounded-lg border bg-gray-50 p-3">
          <Label>Required Stake</Label>
          <Input
            value={`${ARBITRATOR_STAKE_ADA} ADA`}
            readOnly
            className="border-0 bg-transparent font-mono text-lg text-red-600"
          />
        </div>

        {/* EXPERTISE INPUT */}
        <div>
          <Label htmlFor="expertise">Areas of Expertise</Label>
          <Input
            id="expertise"
            value={expertise}
            onChange={(e) => setExpertise(e.target.value)}
            placeholder="e.g., Software, Finance, Law"
            disabled={isPending}
          />
        </div>
      </div>

      <Button
        onClick={handleRegister}
        disabled={isPending || !expertise.trim()}
        className="h-10 w-full bg-indigo-600 text-white hover:bg-indigo-700"
      >
        {isPending ? "Processing Stake & Registration..." : "Register as Arbitrator"}
      </Button>
    </section>
  );
};

export default ArbitratorRegistration;
