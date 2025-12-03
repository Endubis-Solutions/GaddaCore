// =============================================================================
// TrustSeal Generic Escrow Validator
// Roles: funder (locks funds), recipient (receives on approval)
// =============================================================================

use aiken/collection/list
use cardano/transaction.{OutputReference, Transaction}
use cocktail.{valid_after}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/// Datum stored on the escrow UTXO
pub type EscrowDatum {
  funder: ByteArray,
  recipient: ByteArray,
  amount: Int,
  // in lovelace
  status: EscrowStatus,
  dispute_deadline: Int,
}

pub type EscrowStatus {
  Active
  // waiting for approval or dispute
  Approved
  // funder approved → ready to release to recipient
  Disputed
  // in arbitration
  Resolved
}

pub type EscrowRedeemer {
  Approve
  // funder confirms work is done
  RaiseDispute
  // either party claims issue
  ResolveDispute(DisputeResolution)
}

pub type DisputeResolution {
  ReleaseToRecipient
  // recipient gets funds
  RefundToFunder
}

// -----------------------------------------------------------------------------
// Validator Logic
// -----------------------------------------------------------------------------

validator trustseal_escrow {
  spend(
    datum: Option<EscrowDatum>,
    redeemer: EscrowRedeemer,
    _input: OutputReference,
    tx: Transaction,
  ) {
    expect Some(escrow) = datum

    let signed_by_funder = list.has(tx.extra_signatories, escrow.funder)
    let signed_by_recipient = list.has(tx.extra_signatories, escrow.recipient)

    when redeemer is {
      // Only the funder can approve successful completion
      Approve -> signed_by_funder && escrow.status == Active

      // Either party can raise a dispute, but only AFTER the deadline
      RaiseDispute -> {
        let deadline_passed =
          valid_after(tx.validity_range, escrow.dispute_deadline)
        ( signed_by_funder || signed_by_recipient ) && deadline_passed && escrow.status == Active
      }

      // Future: ResolveDispute will require arbitrator consensus
      _ -> False
    }
  }

  else(_) {
    fail
  }
}
// -----------------------------------------------------------------------------
// Test Suite
// -----------------------------------------------------------------------------
