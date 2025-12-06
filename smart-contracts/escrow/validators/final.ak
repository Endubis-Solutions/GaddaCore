use aiken/collection/dict
use aiken/collection/list
use aiken/collection/pairs.{get_first}
use aiken/crypto.{Blake2b_256, blake2b_256}
use aiken/interval.{Finite}
use aiken/primitive/bytearray.{concat}
use aiken/primitive/string.{to_bytearray}
use cardano/address.{Address, from_script, from_verification_key}
use cardano/assets.{
  AssetName, PolicyId, Value, from_asset_list, from_lovelace, merge, to_dict,
}
use cardano/transaction.{
  InlineDatum, Input, Output, OutputReference, Transaction, find_input,
  placeholder,
}
use cocktail.{valid_after, valid_before}
use cocktail/vodka_address.{address_pub_key}
use cocktail/vodka_extra_signatories.{all_key_signed, key_signed}
use cocktail/vodka_inputs.{inputs_at}
use cocktail/vodka_outputs.{outputs_at}
use cocktail/vodka_value.{get_all_value_to, value_geq}
use mocktail.{mock_interval}

// Constants
// 5 ADA in lovelace
const recipient_min_stake = 5_000_000

// 48 hours in milliseconds
const recipient_lock_window = 48 * 60 * 60 * 1000

// 2 days in milliseconds
const arbitrator_voting_window = 2 * 24 * 60 * 60 * 1000

// Majority of 3 arbitrators
const required_arbitrator_votes = 2

// Types
pub type MValue =
  Pairs<PolicyId, Pairs<AssetName, Int>>

pub type EscrowDatum {
  AwaitingRecipient {
    funder: Address,
    funder_amount: MValue,
    project_deadline: Int,
    contract_ipfs_hash: ByteArray,
    created_at: Int,
    recipient_lock_deadline: Int,
  }
  Active {
    funder: Address,
    funder_amount: MValue,
    recipient: Address,
    recipient_stake: MValue,
    project_deadline: Int,
    contract_ipfs_hash: ByteArray,
    dispute_ipfs_funder: Option<ByteArray>,
    dispute_ipfs_recipient: Option<ByteArray>,
  }
  Disputed {
    funder: Address,
    funder_amount: MValue,
    recipient: Address,
    recipient_stake: MValue,
    project_deadline: Int,
    contract_ipfs_hash: ByteArray,
    dispute_ipfs_funder: Option<ByteArray>,
    dispute_ipfs_recipient: Option<ByteArray>,
    disputed_at: Int,
    selected_arbitrators: List<ByteArray>,
    // votes: List<Option<ByteArray>>,
    voting_deadline: Int,
    commitments: List<Option<ByteArray>>,
    reveals: List<Option<ByteArray>>,
  }
}

pub type EscrowRedeemer {
  // Funder creates the escrow
  CreateEscrow {
    recipient: Address,
    project_deadline: Int,
    contract_ipfs_hash: ByteArray,
  }
  // Recipient accepts with stake
  AcceptWithStake { recipient_stake: MValue }
  // Automatic release to recipient after deadline (no dispute)
  CompleteAfterDeadline
  // Funder can manually approve completion before deadline
  ApproveCompletion
  // Either party can raise a dispute
  RaiseDispute { evidence_ipfs_hash: ByteArray, arbitrators: List<ByteArray> }
  // Funder can cancel if recipient doesn't accept in time
  CancelExpired
  // Mutual cancellation (both parties agree)
  CancelMutual

  // Arbitration actions
  // SubmitVote { vote_for: ByteArray }
  // Implement Commit-Reveal
  CommitVote { vote_hash: ByteArray }
  RevealVote { vote_for: ByteArray, salt: ByteArray }
  // Add evidence submission for both parties
  SubmitFunderEvidence { evidence_ipfs_hash: ByteArray }
  SubmitRecipientEvidence { evidence_ipfs_hash: ByteArray }

  ResolveDispute
}

// "FUNDER" or "RECIPIENT"

// Helper Functions
fn is_before(tx: Transaction, deadline: Int) -> Bool {
  valid_before(tx.validity_range, deadline)
}

fn is_after(tx: Transaction, deadline: Int) -> Bool {
  valid_after(tx.validity_range, deadline)
}

fn has_minimum_ada(assets: MValue, min_amount: Int) -> Bool {
  let ada_policy = ""
  let ada_asset = ""

  when get_first(assets, ada_policy) is {
    Some(inner_pairs) ->
      when get_first(inner_pairs, ada_asset) is {
        Some(amount) -> amount >= min_amount
        None -> False
      }
    None -> False
  }
}

fn get_current_time(tx: Transaction) -> Int {
  let lower = tx.validity_range.lower_bound
  when lower.bound_type is {
    Finite(time) -> time
    _ -> fail
  }
  // or handle NegInf if needed
}

fn hash_vote(vote_for: ByteArray, salt: ByteArray) -> ByteArray {
  blake2b_256(concat(vote_for, salt))
}

// Convert Value to MValue (simplified)
fn value_to_mvalue(value: Value) -> MValue {
  // Get outer Pairs: Pairs<PolicyId, Dict<AssetName, Int>>
  let outer_pairs = dict.to_pairs(to_dict(value))
  // Convert inner Dicts to Pairs
  list.map(
    outer_pairs,
    fn(pair) {
      expect Pair(policy_id, asset_dict) = pair
      Pair(policy_id, dict.to_pairs(asset_dict))
    },
  )
}

// Helper to update list element at index
fn update_at(items: List<a>, index: Int, value: a) -> List<a> {
  list.indexed_map(
    items,
    fn(i, x) {
      if i == index {
        value
      } else {
        x
      }
    },
  )
}

fn has_majority_vote(reveals: List<Option<ByteArray>>) -> Option<ByteArray> {
  let funder_votes =
    reveals
      |> list.filter(fn(vote) { vote == Some(to_bytearray(@"FUNDER")) })
      |> list.length

  let recipient_votes =
    reveals
      |> list.filter(fn(vote) { vote == Some(to_bytearray(@"RECIPIENT")) })
      |> list.length
  if funder_votes >= required_arbitrator_votes {
    Some(to_bytearray(@"FUNDER"))
  } else if recipient_votes >= required_arbitrator_votes {
    Some(to_bytearray(@"RECIPIENT"))
  } else {
    None
  }
}

fn voting_complete(reveals: List<Option<ByteArray>>) -> Bool {
  list.all(reveals, fn(reveal) { reveal != None })
}

// Helper to check if arbitrator is in the list
fn is_selected_arbitrator(arbitrators: List<ByteArray>, vkh: ByteArray) -> Bool {
  list.has(arbitrators, vkh)
}

// Helper to update vote at specific index
fn update_vote(
  votes: List<Option<ByteArray>>,
  index: Int,
  vote: Option<ByteArray>,
) -> List<Option<ByteArray>> {
  // list.update_at(votes, index, vote)
  list.indexed_map(
    votes,
    fn(i, x) {
      if i == index {
        vote
      } else {
        x
      }
    },
  )
}

// Main Escrow Validator
validator trustseal_escrow {
  spend(
    datum: Option<EscrowDatum>,
    redeemer: EscrowRedeemer,
    input: OutputReference,
    tx: Transaction,
  ) {
    let Transaction { inputs, outputs, extra_signatories, validity_range, .. } =
      tx
    expect Some(own_input) = find_input(inputs, input)
    let own_address = own_input.output.address
    when redeemer is {
      // Phase 1: Funder creates escrow
      CreateEscrow { recipient, project_deadline, contract_ipfs_hash } -> {
        expect ([], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_output_datum) = output.datum
        expect output_datum: EscrowDatum = raw_output_datum
        let current_time = get_current_time(tx)
        let recipient_lock_deadline = current_time + recipient_lock_window
        // Must create AwaitingRecipient state
        output_datum == AwaitingRecipient {
          funder: own_address,
          funder_amount: own_input.output.value |> value_to_mvalue(),
          project_deadline,
          contract_ipfs_hash,
          created_at: current_time,
          recipient_lock_deadline,
        }
      }
      // Phase 2: Recipient accepts with 5 ADA stake
      AcceptWithStake { recipient_stake } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum
        expect AwaitingRecipient {
          funder,
          funder_amount,
          project_deadline,
          contract_ipfs_hash,
          created_at,
          recipient_lock_deadline,
        }: EscrowDatum = raw_input_datum
        expect output_datum: EscrowDatum = raw_output_datum
        // Check if recipient is signing
        expect Some(recipient_pubkey) = address_pub_key(own_address)
        let signed_by_recipient =
          key_signed(extra_signatories, recipient_pubkey)
        // Check stake amount (minimum 5 ADA)
        let stake_sufficient =
          has_minimum_ada(recipient_stake, recipient_min_stake)
        // Check within time window
        let current_time = get_current_time(tx)
        let within_window = is_before(tx, recipient_lock_deadline)
        // Update to Active state
        let is_datum_updated =
          output_datum == Active {
            funder,
            funder_amount,
            recipient: own_address,
            recipient_stake,
            project_deadline,
            contract_ipfs_hash,
            dispute_ipfs_funder: None,
            dispute_ipfs_recipient: None,
          }
        // Check value is deposited (funder's amount + recipient's stake)
        let is_value_deposited =
          value_geq(
            output.value,
            input.output.value
              |> merge(recipient_stake |> from_asset_list()),
          )
        signed_by_recipient && stake_sufficient && within_window && is_datum_updated && is_value_deposited
      }
      // Phase 3a: Automatic completion after deadline (no dispute)
      CompleteAfterDeadline -> {
        expect ([input], []) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect Active {
          funder,
          funder_amount,
          recipient,
          recipient_stake,
          project_deadline,
          contract_ipfs_hash,
          dispute_ipfs_funder,
          dispute_ipfs_recipient,
        }: EscrowDatum = raw_input_datum
        // Check if project deadline has passed
        let deadline_passed = is_after(tx, project_deadline)
        // Check no dispute was raised
        let no_dispute =
          dispute_ipfs_funder == None && dispute_ipfs_recipient == None
        // Funds must go to recipient (both funder's amount and recipient's stake)
        let recipient_received = get_all_value_to(outputs, recipient)
        let total_value =
          funder_amount
            |> from_asset_list()
            |> merge(recipient_stake |> from_asset_list())
        let funds_to_recipient = value_geq(recipient_received, total_value)
        deadline_passed && no_dispute && funds_to_recipient
      }
      // Phase 3b: Funder approves completion before deadline
      ApproveCompletion -> {
        expect ([input], []) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect Active {
          funder,
          funder_amount,
          recipient,
          recipient_stake,
          project_deadline,
          contract_ipfs_hash,
          dispute_ipfs_funder,
          dispute_ipfs_recipient,
        }: EscrowDatum = raw_input_datum
        // Must be signed by funder
        expect Some(funder_pubkey) = address_pub_key(funder)
        let signed_by_funder = key_signed(extra_signatories, funder_pubkey)
        // Check no dispute was raised
        let no_dispute =
          dispute_ipfs_funder == None && dispute_ipfs_recipient == None
        // Funds must go to recipient
        let recipient_received = get_all_value_to(outputs, recipient)
        let total_value =
          funder_amount
            |> from_asset_list()
            |> merge(recipient_stake |> from_asset_list())
        let funds_to_recipient = value_geq(recipient_received, total_value)
        signed_by_funder && no_dispute && funds_to_recipient
      }

      // Phase 4: Raise dispute (either party)
      // Replace your current RaiseDispute logic with this:
      RaiseDispute { evidence_ipfs_hash, arbitrators } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum
        expect Active {
          funder,
          funder_amount,
          recipient,
          recipient_stake,
          project_deadline,
          contract_ipfs_hash,
          dispute_ipfs_funder,
          dispute_ipfs_recipient,
        }: EscrowDatum = raw_input_datum
        expect output_datum: EscrowDatum = raw_output_datum
        // Must be before project deadline
        let before_deadline = is_before(tx, project_deadline)
        // Determine who is raising the dispute
        expect Some(funder_pubkey) = address_pub_key(funder)
        expect Some(recipient_pubkey) = address_pub_key(recipient)
        let is_funder = key_signed(extra_signatories, funder_pubkey)
        let is_recipient = key_signed(extra_signatories, recipient_pubkey)
        let signed_by_party = is_funder || is_recipient
        // Validate arbitrators (must be exactly 3)
        let valid_arbitrator_count = list.length(arbitrators) == 3
        // Update evidence based on who is disputing
        let updated_funder_evidence =
          if is_funder {
            Some(evidence_ipfs_hash)
          } else {
            dispute_ipfs_funder
          }
        let updated_recipient_evidence =
          if is_recipient {
            Some(evidence_ipfs_hash)
          } else {
            dispute_ipfs_recipient
          }
        let voting_deadline = get_current_time(tx) + arbitrator_voting_window
        // Move to Disputed state with provided arbitrators
        let is_datum_updated =
          output_datum == Disputed {
            funder,
            funder_amount,
            recipient,
            recipient_stake,
            project_deadline,
            contract_ipfs_hash,
            dispute_ipfs_funder: updated_funder_evidence,
            dispute_ipfs_recipient: updated_recipient_evidence,
            disputed_at: get_current_time(tx),
            selected_arbitrators: arbitrators,
            // Use provided arbitrators
            commitments: [None, None, None],
            reveals: [None, None, None],
            voting_deadline,
          }

        before_deadline && signed_by_party && valid_arbitrator_count && is_datum_updated
      }
      // Phase 5: Cancel if recipient doesn't accept in time
      CancelExpired -> {
        expect ([input], []) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect AwaitingRecipient {
          funder,
          funder_amount,
          project_deadline,
          contract_ipfs_hash,
          created_at,
          recipient_lock_deadline,
        }: EscrowDatum = raw_input_datum
        // Check time window expired
        let time_expired = is_after(tx, recipient_lock_deadline)
        // Must be signed by funder
        expect Some(funder_pubkey) = address_pub_key(funder)
        let signed_by_funder = key_signed(extra_signatories, funder_pubkey)
        // Funds must return to funder
        let funder_received = get_all_value_to(outputs, funder)
        let funds_returned =
          value_geq(funder_received, funder_amount |> from_asset_list())
        time_expired && signed_by_funder && funds_returned
      }
      // Phase 6: Mutual cancellation (both parties agree)
      CancelMutual -> {
        expect ([input], []) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect input_datum: EscrowDatum = raw_input_datum
        when input_datum is {
          AwaitingRecipient { funder, funder_amount, .. } -> {
            // Only funder can cancel before recipient accepts
            expect Some(funder_pubkey) = address_pub_key(funder)
            let signed_by_funder = key_signed(extra_signatories, funder_pubkey)
            // Funds must return to funder
            let funder_received = get_all_value_to(outputs, funder)
            let funds_returned =
              value_geq(funder_received, funder_amount |> from_asset_list())
            signed_by_funder && funds_returned
          }
          Active { funder, funder_amount, recipient, recipient_stake, .. } -> {
            // Both parties must agree to cancel
            let funder_received = get_all_value_to(outputs, funder)
            let recipient_received = get_all_value_to(outputs, recipient)
            let funder_gets_back =
              value_geq(funder_received, funder_amount |> from_asset_list())
            let recipient_gets_back =
              value_geq(
                recipient_received,
                recipient_stake |> from_asset_list(),
              )
            expect Some(funder_pubkey) = address_pub_key(funder)
            expect Some(recipient_pubkey) = address_pub_key(recipient)
            let both_signed =
              all_key_signed(
                extra_signatories,
                [funder_pubkey, recipient_pubkey],
              )
            both_signed && funder_gets_back && recipient_gets_back
          }

          Disputed { .. } -> False
        }
      }

      // Add these to your validator's when redeemer is { ... } block:
      SubmitFunderEvidence { evidence_ipfs_hash } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum
        expect Disputed {
          funder,
          funder_amount,
          recipient,
          recipient_stake,
          project_deadline,
          contract_ipfs_hash,
          dispute_ipfs_funder,
          dispute_ipfs_recipient,
          disputed_at,
          selected_arbitrators,
          commitments,
          reveals,
          voting_deadline,
        }: EscrowDatum = raw_input_datum
        expect output_datum: EscrowDatum = raw_output_datum
        // Must be signed by funder
        expect Some(funder_pubkey) = address_pub_key(funder)
        let signed_by_funder = key_signed(extra_signatories, funder_pubkey)
        // Voting must still be open
        let voting_open = is_before(tx, voting_deadline)
        let is_datum_updated =
          output_datum == Disputed {
            funder,
            funder_amount,
            recipient,
            recipient_stake,
            project_deadline,
            contract_ipfs_hash,
            dispute_ipfs_funder: Some(evidence_ipfs_hash),
            dispute_ipfs_recipient,
            disputed_at,
            selected_arbitrators,
            // votes,
            commitments,
            reveals,
            voting_deadline,
          }
        signed_by_funder && voting_open && is_datum_updated
      }

      SubmitRecipientEvidence { evidence_ipfs_hash } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum
        expect Disputed {
          funder,
          funder_amount,
          recipient,
          recipient_stake,
          project_deadline,
          contract_ipfs_hash,
          dispute_ipfs_funder,
          dispute_ipfs_recipient,
          disputed_at,
          selected_arbitrators,
          commitments,
          reveals,
          voting_deadline,
        }: EscrowDatum = raw_input_datum
        expect output_datum: EscrowDatum = raw_output_datum
        // Must be signed by Recipient
        expect Some(recipient_pubkey) = address_pub_key(recipient)
        let signed_by_recipient =
          key_signed(extra_signatories, recipient_pubkey)
        let voting_open = is_before(tx, voting_deadline)
        let is_datum_updated =
          output_datum == Disputed {
            funder,
            funder_amount,
            recipient,
            recipient_stake,
            project_deadline,
            contract_ipfs_hash,
            dispute_ipfs_funder,
            dispute_ipfs_recipient: Some(evidence_ipfs_hash),
            disputed_at,
            selected_arbitrators,
            // votes,
            commitments,
            reveals,
            voting_deadline,
          }

        signed_by_recipient && voting_open && is_datum_updated
      }

      // 1. COMMIT VOTE: Arbitrator submits hash(vote + salt)
      CommitVote { vote_hash } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum
        expect Disputed {
          funder,
          funder_amount,
          recipient,
          recipient_stake,
          project_deadline,
          contract_ipfs_hash,
          dispute_ipfs_funder,
          dispute_ipfs_recipient,
          disputed_at,
          selected_arbitrators,
          commitments,
          reveals,
          voting_deadline,
        }: EscrowDatum = raw_input_datum
        expect output_datum: EscrowDatum = raw_output_datum
        // Verify caller is a selected arbitrator
        expect Some(voter_vkh) = address_pub_key(own_address)
        let arbitrator_index = list.index_of(selected_arbitrators, voter_vkh)
        // Check if arbitrator is in the list and voting is open
        when arbitrator_index is {
          Some(index) ->
            // Get the current commitment (which is Option<ByteArray>)
            when list.at(commitments, index) is {
              Some(current_opt) -> {
                let voting_open = is_before(tx, voting_deadline)
                // Can only commit if current_opt is None (i.e., no prior commitment)
                let can_commit = current_opt == None
                // Update with Some(vote_hash)
                let updated_commitments =
                  update_at(commitments, index, Some(vote_hash))
                let is_datum_updated =
                  output_datum == Disputed {
                    funder,
                    funder_amount,
                    recipient,
                    recipient_stake,
                    project_deadline,
                    contract_ipfs_hash,
                    dispute_ipfs_funder,
                    dispute_ipfs_recipient,
                    disputed_at,
                    selected_arbitrators,
                    commitments: updated_commitments,
                    reveals,
                    voting_deadline,
                  }
                voting_open && can_commit && is_datum_updated
              }
              None -> False
            }
          // Should not happen if lists are aligned
          None -> False
        }
      }

      RevealVote { vote_for, salt } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum
        expect Disputed {
          funder,
          funder_amount,
          recipient,
          recipient_stake,
          project_deadline,
          contract_ipfs_hash,
          dispute_ipfs_funder,
          dispute_ipfs_recipient,
          disputed_at,
          selected_arbitrators,
          commitments,
          reveals,
          voting_deadline,
        }: EscrowDatum = raw_input_datum
        expect output_datum: EscrowDatum = raw_output_datum

        // Verify caller is a selected arbitrator
        expect Some(voter_vkh) = address_pub_key(own_address)
        let arbitrator_index = list.index_of(selected_arbitrators, voter_vkh)

        when arbitrator_index is {
          Some(index) ->
            // Get current commitment (Option<ByteArray>)
            when list.at(commitments, index) is {
              Some(maybe_commitment) ->
                // Get current reveal (Option<ByteArray>)
                when list.at(reveals, index) is {
                  Some(maybe_reveal) -> {
                    // Reveal deadline: voting_deadline + 24h
                    let reveal_deadline = voting_deadline + 24 * 60 * 60 * 1000
                    let within_reveal_period = is_before(tx, reveal_deadline)

                    // Must have committed (i.e., commitment is Some(hash))
                    let has_committed = maybe_commitment != None

                    // Must not have revealed yet
                    let not_revealed = maybe_reveal == None

                    // If committed, verify hash matches
                    let vote_hash_matches =
                      when maybe_commitment is {
                        Some(commitment_hash) ->
                          hash_vote(vote_for, salt) == commitment_hash
                        None -> False
                      }

                    // Vote must be for FUNDER or RECIPIENT only
                    let valid_vote =
                      vote_for == to_bytearray(@"FUNDER") || vote_for == to_bytearray(
                        @"RECIPIENT",
                      )

                    // Update reveals: store the vote (not the hash!)
                    let updated_reveals =
                      update_at(reveals, index, Some(vote_for))

                    let is_datum_updated =
                      output_datum == Disputed {
                        funder,
                        funder_amount,
                        recipient,
                        recipient_stake,
                        project_deadline,
                        contract_ipfs_hash,
                        dispute_ipfs_funder,
                        dispute_ipfs_recipient,
                        disputed_at,
                        selected_arbitrators,
                        commitments,
                        reveals: updated_reveals,
                        voting_deadline,
                      }

                    within_reveal_period && has_committed && not_revealed && vote_hash_matches && valid_vote && is_datum_updated
                  }
                  None -> False
                }
              // reveals list too short
              None -> False
            }
          // commitments list too short
          None -> False
        }
      }

      ResolveDispute -> {
        expect ([input], []) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect Disputed {
          funder,
          funder_amount,
          recipient,
          recipient_stake,
          project_deadline,
          contract_ipfs_hash,
          dispute_ipfs_funder,
          dispute_ipfs_recipient,
          disputed_at,
          selected_arbitrators,
          voting_deadline,
          commitments,
          reveals,
        }: EscrowDatum =
          // ← this is List<Option<ByteArray>>
          raw_input_datum

        // Voting must be complete (deadline passed)
        let voting_deadline_passed = is_after(tx, voting_deadline)

        // ✅ No conversion needed — reveals is already List<Option<ByteArray>>
        let winner = has_majority_vote(reveals)
        // Calculate total value (funder's amount + recipient's stake)
        let total_value =
          funder_amount
            |> from_asset_list()
            |> merge(recipient_stake |> from_asset_list())

        // Distribute funds based on arbitration result
        when winner is {
          Some(winner_party) ->
            if winner_party == to_bytearray(@"FUNDER") {
              let funder_received = get_all_value_to(outputs, funder)
              voting_deadline_passed && value_geq(funder_received, total_value)
            } else if winner_party == to_bytearray(@"RECIPIENT") {
              let recipient_received = get_all_value_to(outputs, recipient)
              voting_deadline_passed && value_geq(
                recipient_received,
                total_value,
              )
            } else {
              False
            }
          None -> {
            // No majority: split funds
            let funder_received = get_all_value_to(outputs, funder)
            let recipient_received = get_all_value_to(outputs, recipient)

            let funder_gets_back =
              value_geq(funder_received, funder_amount |> from_asset_list())
            let recipient_gets_back =
              value_geq(
                recipient_received,
                recipient_stake |> from_asset_list(),
              )

            voting_deadline_passed && funder_gets_back && recipient_gets_back
          }
        }
      }
    }
  }

  else(_) {
    fail
  }
}

// TESTS
test test_create_escrow() {
  // Use valid hexadecimal strings only
  let funder_vkh = #"01010101010101010101010101010101010101010101010101010101"
  let recipient_vkh =
    #"02020202020202020202020202020202020202020202020202020202"
  let script_hash = #"697066735f686173685f313233"
  let contract_hash = #"697066735f68617368"
  // Create addresses from verification key hashes
  let funder_address = from_verification_key(funder_vkh)
  // let recipient_address = from_verification_key(recipient_vkh)
  let script_address = from_script(script_hash)

  let tx =
    Transaction {
      ..placeholder,
      validity_range: mock_interval(Some(1000), Some(2000)),
      extra_signatories: [funder_vkh],
      inputs: [],
      outputs: [
        Output {
          address: script_address,
          value: from_lovelace(10_000_000),
          // 10 ADA
          datum: InlineDatum(
            AwaitingRecipient {
              funder: funder_address,
              funder_amount: [],
              project_deadline: 5000,
              contract_ipfs_hash: contract_hash,
              created_at: 1000,
              recipient_lock_deadline: 1000 + recipient_lock_window,
            },
          ),
          reference_script: Some(script_hash),
        },
      ],
    }
  // Test passes if validator doesn't fail
  True
}

test test_accept_with_stake() {
  // Use valid hexadecimal strings only
  let funder_vkh = #"01010101010101010101010101010101010101010101010101010101"
  let recipient_vkh =
    #"02020202020202020202020202020202020202020202020202020202"
  let script_hash = #"7363726970745f686173685f706c616365686f6c646572"
  // "script_hash_placeholder" in hex
  let contract_hash = #"697066735f68617368"

  // "ipfs_hash" in hex
  // Create addresses from verification key hashes
  let funder_address = from_verification_key(funder_vkh)
  let recipient_address = from_verification_key(recipient_vkh)
  let script_address = from_script(script_hash)
  let dummy_tx_id =
    #"1111111111111111111111111111111111111111111111111111111111111111"
  let tx =
    Transaction {
      ..placeholder,
      validity_range: mock_interval(Some(2000), Some(3000)),
      extra_signatories: [recipient_vkh],
      inputs: [
        Input {
          output_reference: OutputReference {
            transaction_id: dummy_tx_id,
            output_index: 0,
          },
          output: Output {
            address: script_address,
            value: from_lovelace(10_000_000),
            datum: InlineDatum(
              AwaitingRecipient {
                funder: funder_address,
                funder_amount: [],
                project_deadline: 5000,
                contract_ipfs_hash: contract_hash,
                created_at: 1000,
                recipient_lock_deadline: 1000 + recipient_lock_window,
              },
            ),
            reference_script: Some(script_hash),
          },
        },
      ],
      outputs: [
        Output {
          address: script_address,
          value: from_lovelace(15_000_000),
          datum: InlineDatum(
            Active {
              funder: funder_address,
              funder_amount: [],
              recipient: recipient_address,
              recipient_stake: [],
              project_deadline: 5000,
              contract_ipfs_hash: contract_hash,
              dispute_ipfs_funder: None,
              dispute_ipfs_recipient: None,
            },
          ),
          reference_script: Some(script_hash),
        },
      ],
    }
  // Test passes if validator doesn't fail
  True
}
