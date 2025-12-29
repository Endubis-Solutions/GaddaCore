// use aiken/collection/list
// use cardano/transaction.{OutputReference, Transaction, placeholder}
// use cocktail.{valid_after}
// use mocktail.{mock_interval}

// // Constants (configurable parameters)

// // Minimum stake required from recipient to prevent scams (in lovelace)
// const recipient_min_stack = 5_000_000

// // 5 ADA

// // Time window for recipient to lock stake after funder locks funds (in milliseconds)
// const recipient_lock_window = 48 * 60 * 60 * 1000

// // 48 hours in milliseconds

// // Types

// /// Datum stored on the escrow UTXO
// pub type EscrowDatum {
//   funder: ByteArray,
//   recipient: ByteArray,
//   amount: Int,
//   // in lovelace (funder's locked amount)
//   recipient_stake: Int,
//   // in lovelace (recipient's security deposit)
//   status: EscrowStatus,
//   dispute_deadline: Int,
//   // timestamp when disputes can be raised
//   created_at: Int,
//   // timestamp when escrow was created
//   funder_locked_at: Option<Int>,
//   // timestamp when funder locked funds
//   recipient_lock_deadline: Option<Int>,
//   // deadline for recipient to lock stake
//   contract_hash: Option<ByteArray>,
//   // hash of contract terms from form
//   ipfs_hash: Option<ByteArray>,
// }

// // IPFS hash for document storage

// pub type EscrowStatus {
//   AwaitingFunder
//   // waiting for funder to lock funds
//   AwaitingRecipient
//   // funder locked, waiting for recipient stake
//   Active
//   // both parties locked funds, waiting for approval/dispute
//   Approved
//   // funder approved → ready to release to recipient
//   Disputed
//   // in arbitration
//   Resolved
//   // dispute resolved
//   Expired
//   // recipient didn't lock stake within window
//   Forfeited
// }

// // recipient forfeited stake due to dispute

// pub type EscrowRedeemer {
//   LockFunderFunds
//   // funder locks the agreed amount
//   LockRecipientStake
//   // recipient locks their 5 ADA stake
//   Approve
//   // funder confirms work is done
//   RaiseDispute
//   // either party claims issue
//   ResolveDispute(DisputeResolution)
//   RefundExpired
//   // funder claims refund if recipient doesn't lock stake
//   ReleaseStake
// }

// // release recipient's stake after successful completion

// pub type DisputeResolution {
//   ReleaseToRecipient
//   // recipient gets funds + stake back
//   RefundToFunder
// }

// // funder gets refund + recipient's stake as penalty

// // Helper Functions

// /// Check if current time is after a specific timestamp
// fn is_after_deadline(tx: Transaction, deadline: Int) -> Bool {
//   valid_after(tx.validity_range, deadline)
// }

// /// Check if current time is before a specific timestamp
// fn is_before_deadline(tx: Transaction, deadline: Int) -> Bool {
//   !valid_after(tx.validity_range, deadline)
// }

// /// Check if recipient has locked sufficient stake
// fn has_sufficient_stake(datum: EscrowDatum) -> Bool {
//   datum.recipient_stake >= recipient_min_stack
// }

// /// Check if recipient lock window has expired
// fn recipient_lock_expired(tx: Transaction, datum: EscrowDatum) -> Bool {
//   expect Some(deadline) = datum.recipient_lock_deadline
//   is_after_deadline(tx, deadline)
// }

// /// Check if recipient is still within lock window
// fn within_recipient_lock_window(tx: Transaction, datum: EscrowDatum) -> Bool {
//   expect Some(deadline) = datum.recipient_lock_deadline
//   is_before_deadline(tx, deadline)
// }

// // Validator Logic

// validator trustseal_escrow {
//   spend(
//     datum: Option<EscrowDatum>,
//     redeemer: EscrowRedeemer,
//     _input: OutputReference,
//     tx: Transaction,
//   ) {
//     expect Some(escrow) = datum

//     let signed_by_funder = list.has(tx.extra_signatories, escrow.funder)
//     let signed_by_recipient = list.has(tx.extra_signatories, escrow.recipient)

//     when redeemer is {
//       // Phase 1: Funder locks their funds
//       LockFunderFunds ->
//         signed_by_funder && escrow.status == AwaitingFunder && escrow.amount > 0

//       // Must lock positive amount
//       // Phase 2: Recipient locks their stake within 48 hours
//       LockRecipientStake ->
//         signed_by_recipient && escrow.status == AwaitingRecipient && has_sufficient_stake(
//           escrow,
//         ) && within_recipient_lock_window(tx, escrow)

//       // Funder can claim refund if recipient doesn't lock stake within 48 hours
//       RefundExpired ->
//         signed_by_funder && escrow.status == AwaitingRecipient && recipient_lock_expired(
//           tx,
//           escrow,
//         )

//       // Only the funder can approve successful completion (escrow is Active)
//       Approve -> signed_by_funder && escrow.status == Active

//       // Either party can raise a dispute, but only AFTER the dispute deadline
//       RaiseDispute -> {
//         let deadline_passed = is_after_deadline(tx, escrow.dispute_deadline)
//         ( signed_by_funder || signed_by_recipient ) && deadline_passed && escrow.status == Active
//       }

//       // Release recipient's stake after successful approval
//       ReleaseStake ->
//         signed_by_funder && escrow.status == Approved && // Stake can only be released after dispute deadline has passed
//         is_after_deadline(tx, escrow.dispute_deadline)

//       // Resolve dispute (future: will require arbitrator consensus)
//       ResolveDispute(resolution) ->
//         escrow.status == Disputed && when resolution is {
//           ReleaseToRecipient ->
//             // Arbitrator decides to release to recipient
//             // For now, require both parties to sign
//             signed_by_funder && signed_by_recipient
//           RefundToFunder ->
//             // Arbitrator decides to refund to funder + give stake as penalty
//             // For now, require both parties to sign
//             signed_by_funder && signed_by_recipient
//         }
//     }
//   }

//   else(_) {
//     fail
//   }
// }

// // Test Suite

// test test_escrow_flow() {
//   let funder = #"01010101010101010101010101010101010101010101010101010101"
//   let recipient = #"02020202020202020202020202020202020202020202020202020202"
//   // Initial state: Awaiting funder
//   let initial_datum =
//     EscrowDatum {
//       funder,
//       recipient,
//       amount: 0,
//       // Not locked yet
//       recipient_stake: 0,
//       // Not locked yet
//       status: AwaitingFunder,
//       dispute_deadline: 10000,
//       created_at: 1000,
//       funder_locked_at: None,
//       recipient_lock_deadline: None,
//       contract_hash: None,
//       ipfs_hash: None,
//     }
//   // After funder locks funds
//   let after_funder_lock =
//     EscrowDatum {
//       funder,
//       recipient,
//       amount: 10_000_000,
//       // 10 ADA locked
//       recipient_stake: 0,
//       // Still not locked
//       status: AwaitingRecipient,
//       dispute_deadline: 10000,
//       created_at: 1000,
//       funder_locked_at: Some(2000),
//       // Funder locked at time 2000
//       recipient_lock_deadline: Some(2000 + recipient_lock_window),
//       // Deadline: 2000 + 48 hours
//       contract_hash: None,
//       ipfs_hash: None,
//     }
//   // Test: Can recipient lock stake within window?
//   let tx_within_window =
//     Transaction {
//       ..placeholder,
//       extra_signatories: [recipient],
//       // 24 hours after funder lock (within window)
//       validity_range: mock_interval(
//         Some(2000 + 24 * 60 * 60 * 1000),
//         Some(100000),
//       ),
//     }
//   trace within_recipient_lock_window(tx_within_window, after_funder_lock)
//   // Test: Has recipient lock window expired?
//   let tx_after_window =
//     Transaction {
//       ..placeholder,
//       extra_signatories: [funder],
//       // 72 hours after (window expired)
//       validity_range: mock_interval(
//         Some(2000 + 72 * 60 * 60 * 1000),
//         Some(100000),
//       ),
//     }
//   trace recipient_lock_expired(tx_after_window, after_funder_lock)
//   Void
// }

// test test_sufficient_stake() {
//   let datum_with_stake =
//     EscrowDatum {
//       funder: #"01010101010101010101010101010101010101010101010101010101",
//       recipient: #"02020202020202020202020202020202020202020202020202020202",
//       amount: 10_000_000,
//       recipient_stake: 5_000_000,
//       // 5 ADA - sufficient
//       status: AwaitingRecipient,
//       dispute_deadline: 10000,
//       created_at: 1000,
//       funder_locked_at: Some(2000),
//       recipient_lock_deadline: Some(2000 + recipient_lock_window),
//       contract_hash: None,
//       ipfs_hash: None,
//     }
//   let datum_insufficient_stake =
//     EscrowDatum {
//       funder: #"01010101010101010101010101010101010101010101010101010101",
//       recipient: #"02020202020202020202020202020202020202020202020202020202",
//       amount: 10_000_000,
//       recipient_stake: 1_000_000,
//       // 1 ADA - insufficient
//       status: AwaitingRecipient,
//       dispute_deadline: 10000,
//       created_at: 1000,
//       funder_locked_at: Some(2000),
//       recipient_lock_deadline: Some(2000 + recipient_lock_window),
//       contract_hash: None,
//       ipfs_hash: None,
//     }
//   trace has_sufficient_stake(datum_with_stake)
//   trace !has_sufficient_stake(datum_insufficient_stake)
//   Void
// }

// test test_is_after_deadline() {
//   let tx =
//     Transaction {
//       ..placeholder,
//       extra_signatories: [],
//       validity_range: mock_interval(Some(5000), Some(100000)),
//     }
//   // Test deadline that has passed
//   trace is_after_deadline(tx, 3000)
//   // Current time 5000 > deadline 3000
//   // Test deadline that hasn't passed
//   trace !is_after_deadline(tx, 7000)
//   Void
//   // Current time 5000 < deadline 7000
// }

// test test_is_before_deadline() {
//   let tx =
//     Transaction {
//       ..placeholder,
//       extra_signatories: [],
//       validity_range: mock_interval(Some(5000), Some(10000)),
//     }
//   // Test deadline that hasn't passed
//   trace is_before_deadline(tx, 7000)
//   // Current time 5000 < deadline 7000
//   // Test deadline that has passed
//   trace !is_before_deadline(tx, 3000)
//   Void
//   // Current time 5000 > deadline 3000
// }

// test test_recipient_lock_stake() {
//   let funder = #"01010101010101010101010101010101010101010101010101010101"
//   let recipient = #"02020202020202020202020202020202020202020202020202020202"
//   let datum =
//     EscrowDatum {
//       funder,
//       recipient,
//       amount: 10_000_000,
//       recipient_stake: 5_000_000,
//       status: AwaitingRecipient,
//       dispute_deadline: 10000,
//       created_at: 1000,
//       funder_locked_at: Some(2000),
//       recipient_lock_deadline: Some(2000 + recipient_lock_window),
//       contract_hash: None,
//       ipfs_hash: None,
//     }
//   let tx_within_window =
//     Transaction {
//       ..placeholder,
//       extra_signatories: [recipient],
//       validity_range: mock_interval(
//         Some(2000 + 24 * 60 * 60 * 1000),
//         Some(100000),
//       ),
//     }
//   // All conditions should be true for LockRecipientStake
//   trace has_sufficient_stake(datum)
//   trace within_recipient_lock_window(tx_within_window, datum)
//   Void
// }

// test test_refund_expired() {
//   let funder = #"01010101010101010101010101010101010101010101010101010101"
//   let recipient = #"02020202020202020202020202020202020202020202020202020202"
//   let datum =
//     EscrowDatum {
//       funder,
//       recipient,
//       amount: 10_000_000,
//       recipient_stake: 0,
//       status: AwaitingRecipient,
//       dispute_deadline: 10000,
//       created_at: 1000,
//       funder_locked_at: Some(2000),
//       recipient_lock_deadline: Some(2000 + recipient_lock_window),
//       contract_hash: None,
//       ipfs_hash: None,
//     }
//   let tx_after_window =
//     Transaction {
//       ..placeholder,
//       extra_signatories: [funder],
//       validity_range: mock_interval(
//         Some(2000 + 72 * 60 * 60 * 1000),
//         Some(100000),
//       ),
//     }
//   trace recipient_lock_expired(tx_after_window, datum)
//   Void
// }
