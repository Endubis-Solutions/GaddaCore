import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import React, { useState, useMemo, useEffect } from "react";

// --- DEMO UTILITIES ---
type VoteOption = "funder" | "recipient";
type CommitStatus = "none" | "pending" | "committed" | "revealed";

// Simple hashing function simulation (replace with real crypto hash in integration)
const simpleHash = (vote: VoteOption, salt: string) => btoa(`${vote}:${salt}`).substring(0, 32);

// --- DEMO DATA ---
const DEMO_ACTIVE_CASE = {
  case_id: "ESC-78901",
  description: "Dispute over the delivery quality of 100 custom software licenses.",
  funder_claim: "The licenses were buggy, demanding a 75% refund.",
  recipient_claim: "The licenses met all specified parameters.",
  commit_deadline: new Date(Date.now() + 1000 * 60 * 60 * 24).toLocaleString(),
  reveal_deadline: new Date(Date.now() + 1000 * 60 * 60 * 48).toLocaleString(),
};
// --- END DEMO DATA ---

const ArbitratorCaseList = () => {
  // Arbitrator's true vote (Funder/Recipient)
  const [privateVote, setPrivateVote] = useState<VoteOption | null>(null);
  // User-managed salt: generated on first load, must be re-entered for reveal
  const [generatedSalt] = useState(crypto.randomUUID());
  const [revealSalt, setRevealSalt] = useState("");

  const [commitStatus, setCommitStatus] = useState<CommitStatus>("none");
  const [isPending, setIsPending] = useState(false);

  // Auto-generate the commitment hash whenever the vote changes
  const commitmentHash = useMemo(
    () => (privateVote ? simpleHash(privateVote, generatedSalt) : null),
    [privateVote, generatedSalt]
  );

  // --- PHASE 1: COMMIT ACTION ---
  const handleCommit = () => {
    if (!privateVote) {
      alert("Please select your vote.");
      return;
    }

    setIsPending(true);
    console.log(
      `[COMMIT] Private Vote: ${privateVote}, Salt: ${generatedSalt}, Hash: ${commitmentHash}`
    );

    // Simulate transaction
    setTimeout(() => {
      setIsPending(false);
      setCommitStatus("committed");
      // Inform user to save the salt
      alert(
        `Commitment submitted! Your unique salt (${generatedSalt}) is required for the Reveal phase.`
      );
    }, 2000);
  };

  // --- PHASE 2: REVEAL ACTION ---
  const handleReveal = () => {
    if (commitStatus !== "committed") {
      alert("Commitment must be completed first.");
      return;
    }
    if (!revealSalt.trim()) {
      alert("Please enter your saved salt to reveal your vote.");
      return;
    }
    // Demo verification: check if the re-hashed value matches the saved commitment
    const reHashed = simpleHash(privateVote!, revealSalt);

    if (reHashed !== commitmentHash) {
      alert(
        "Error: Salt or Private Vote does not match the committed hash. Penalty likely in real system."
      );
      return;
    }

    setIsPending(true);
    console.log(`[REVEAL] Submitting True Vote: ${privateVote} with Salt: ${revealSalt}`);

    // Simulate transaction
    setTimeout(() => {
      setIsPending(false);
      setCommitStatus("revealed");
      alert(`Vote successfully revealed! The Resolution/Tally transaction can now execute.`);
    }, 2500);
  };

  const isCommitted = commitStatus === "committed" || commitStatus === "revealed";

  return (
    <section className="space-y-8 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="border-b pb-4 text-2xl font-bold text-teal-700">
        Arbitration Voting (Commit-Reveal)
      </h2>

      {/* Case Details */}
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <h3 className="mb-2 text-xl font-semibold text-gray-800">
          Case ID: {DEMO_ACTIVE_CASE.case_id}
        </h3>
        <p className="text-sm italic">{DEMO_ACTIVE_CASE.description}</p>
        <div className="mt-3 space-y-1 text-xs">
          <p className="text-red-700">Funder Claim: {DEMO_ACTIVE_CASE.funder_claim}</p>
          <p className="text-blue-700">Recipient Claim: {DEMO_ACTIVE_CASE.recipient_claim}</p>
        </div>
      </div>

      {/* Step 1: Commit Phase */}
      <div
        className={`rounded-lg border p-5 ${isCommitted ? "border-gray-300 bg-gray-100" : "border-indigo-200 bg-indigo-50"}`}
      >
        <h3 className="mb-3 flex items-center text-xl font-bold text-indigo-800">
          1. Commit Phase
          {isCommitted && (
            <span className="ml-3 text-sm font-normal text-green-600">✅ Committed</span>
          )}
        </h3>
        <p className="mb-4 text-sm">
          Select your vote. The **hash** is submitted to the contract. Commit Deadline: **
          {DEMO_ACTIVE_CASE.commit_deadline}**
        </p>

        <Label>Select Your Vote (Secret)</Label>
        <div className="mb-4 flex space-x-4">
          <Button
            onClick={() => setPrivateVote("funder")}
            disabled={isCommitted || isPending}
            className={`h-12 flex-1 ${privateVote === "funder" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-red-100"}`}
          >
            Vote Funder
          </Button>
          <Button
            onClick={() => setPrivateVote("recipient")}
            disabled={isCommitted || isPending}
            className={`h-12 flex-1 ${privateVote === "recipient" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800 hover:bg-blue-100"}`}
          >
            Vote Recipient
          </Button>
        </div>

        <p className="mb-4 font-mono text-xs break-all text-gray-600">
          Generated Salt: **{generatedSalt}** (SAVE THIS NOW!)
          <br />
          Commitment Hash: **{commitmentHash || "Select vote to generate"}**
        </p>

        <Button
          onClick={handleCommit}
          disabled={isPending || isCommitted || !privateVote}
          className="h-10 w-full bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {isPending ? "Committing Hash..." : isCommitted ? "Committed" : "Submit Commitment Hash"}
        </Button>
      </div>

      {/* Step 2: Reveal Phase */}
      <div
        className={`rounded-lg border p-5 ${commitStatus === "revealed" ? "border-green-300 bg-green-100" : "border-gray-300 bg-white"}`}
      >
        <h3 className="mb-3 flex items-center text-xl font-bold text-green-800">
          2. Reveal Phase
          {commitStatus === "revealed" && (
            <span className="ml-3 text-sm font-normal text-green-600">✅ Revealed</span>
          )}
        </h3>
        <p className="mb-4 text-sm">
          Submit your **original vote and saved salt** to unlock your stake. Reveal Deadline: **
          {DEMO_ACTIVE_CASE.reveal_deadline}**
        </p>

        <div className="mb-4">
          <Label htmlFor="reveal-salt">Enter Saved Salt</Label>
          <Input
            id="reveal-salt"
            value={revealSalt}
            onChange={(e) => setRevealSalt(e.target.value)}
            placeholder="Paste your saved salt here"
            disabled={!isCommitted || commitStatus === "revealed" || isPending}
            className="font-mono"
          />
        </div>

        <Button
          onClick={handleReveal}
          disabled={!isCommitted || commitStatus === "revealed" || isPending || !revealSalt}
          className="h-10 w-full bg-green-600 text-white hover:bg-green-700"
        >
          {isPending
            ? "Revealing Vote..."
            : commitStatus === "revealed"
              ? "Vote Revealed"
              : "Reveal True Vote"}
        </Button>
      </div>

      {commitStatus === "revealed" && (
        <div className="rounded-lg border-2 border-teal-500 bg-teal-100 p-4 text-center font-semibold text-teal-700">
          Resolution Complete! Funds will be distributed based on the majority vote and stake
          slashed for the minority.
        </div>
      )}
    </section>
  );
};

export default ArbitratorCaseList;
