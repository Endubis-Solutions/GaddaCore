use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{OutputReference, Transaction}

// 1. Define the State (Datum)
// This stores the IDs (Public Key Hashes) of the three parties involved.
pub type EscrowDatum {
  sender: VerificationKeyHash,
  recipient: VerificationKeyHash,
  arbiter: VerificationKeyHash,
}

// 2. Define the Actions (Redeemer)
// These are the two things that can happen to the money.
pub type Action {
  Pay
  Refund
}

// 3. The Validator Logic
validator escrow {
  spend(
    datum: Option<EscrowDatum>,
    redeemer: Action,
    _input: OutputReference,
    tx: Transaction,
  ) {
    // Ensure the datum exists (it's not an inline datum error)
    expect Some(d) = datum

    // Extract the list of people who signed this transaction
    let Transaction { extra_signatories, .. } = tx

    when redeemer is {
      // Scenario: Funds go to the Recipient
      Pay ->
        list.has(extra_signatories, d.sender) && list.has(
          extra_signatories,
          d.arbiter,
        )

      // Scenario: Funds go back to the Sender
      Refund ->
        list.has(extra_signatories, d.recipient) && list.has(
          extra_signatories,
          d.arbiter,
        )
    }
  }

  else(_) {
    fail
  }
}
