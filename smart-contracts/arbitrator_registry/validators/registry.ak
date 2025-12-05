use aiken/collection/list
use aiken/interval.{Finite}
use aiken/primitive/string.{to_bytearray}
use cardano/address.{Address, from_verification_key}
use cardano/assets.{Value, from_lovelace}
use cardano/transaction.{
  InlineDatum, Output, OutputReference, Transaction, find_input, placeholder,
}
use cocktail/vodka_address.{address_pub_key}
use cocktail/vodka_extra_signatories.{key_signed}
use cocktail/vodka_inputs.{inputs_at}
use cocktail/vodka_outputs.{outputs_at}
use cocktail/vodka_value.{get_all_value_to, value_geq}
use mocktail.{mock_interval}

// Constants
const arbitrator_stake_amount = 100_000_000

// 100 ADA in lovelace
const initial_reputation = 100

const reputation_penalty = 20

const stake_penalty_percentage = 10

// 10% penalty
const min_reputation_for_active = 20

const max_reputation = 100

// Types
pub type ArbitratorDatum {
  Registered {
    arbitrator: Address,
    stake_amount: Int,
    expertise: List<ByteArray>,
    // Changed to List for multiple expertise areas
    metadata_ipfs_hash: ByteArray,
    registration_time: Int,
    reputation: Int,
    active: Bool,
    // Track participation
    disputes_voted: List<ByteArray>,
    // List of dispute IDs
    disputes_skipped: List<ByteArray>,
  }
}

// List of dispute IDs where didn't vote

pub type ArbitratorRedeemer {
  // Register with initial expertise list
  Register { expertise: List<ByteArray>, metadata_ipfs_hash: ByteArray }
  // Add new expertise area
  AddExpertise { new_expertise: ByteArray }
  // Remove expertise area
  RemoveExpertise { expertise_to_remove: ByteArray }
  Unregister
  UpdateReputation { delta: Int }
  Penalize { dispute_id: ByteArray }
  RecordVote { dispute_id: ByteArray }
}

// Helper Functions
fn get_current_time(tx: Transaction) -> Int {
  let lower = tx.validity_range.lower_bound
  when lower.bound_type is {
    Finite(time) -> time
    _ -> 0
  }
}

// Check minimum stake of 100 ADA
fn has_minimum_stake(value: Value, min_amount: Int) -> Bool {
  value_geq(value, from_lovelace(min_amount))
}

// Check if arbitrator has specific expertise
fn has_expertise(expertise_list: List<ByteArray>, area: ByteArray) -> Bool {
  list.has(expertise_list, area)
}

// Add expertise if not already present
fn add_expertise(
  expertise_list: List<ByteArray>,
  new_area: ByteArray,
) -> List<ByteArray> {
  if has_expertise(expertise_list, new_area) {
    expertise_list
  } else {
    // Already exists, no change
    list.push(expertise_list, new_area)
  }
}

// Remove expertise if present
fn remove_expertise(
  expertise_list: List<ByteArray>,
  area_to_remove: ByteArray,
) -> List<ByteArray> {
  list.filter(expertise_list, fn(area) { area != area_to_remove })
}

// Arbitrator Registry Validator
validator arbitrator_registry {
  spend(
    datum: Option<ArbitratorDatum>,
    redeemer: ArbitratorRedeemer,
    input: OutputReference,
    tx: Transaction,
  ) {
    let Transaction { inputs, outputs, extra_signatories, .. } = tx
    expect Some(own_input) = find_input(inputs, input)
    let own_address = own_input.output.address
    when redeemer is {
      Register { expertise, metadata_ipfs_hash } -> {
        expect ([], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        // Check minimum stake of 100 ADA
        let stake_sufficient =
          has_minimum_stake(own_input.output.value, arbitrator_stake_amount)
        expect InlineDatum(raw_output_datum) = output.datum
        expect output_datum: ArbitratorDatum = raw_output_datum
        let current_time = get_current_time(tx)
        let is_datum_updated =
          output_datum == Registered {
            arbitrator: own_address,
            stake_amount: arbitrator_stake_amount,
            expertise,
            metadata_ipfs_hash,
            registration_time: current_time,
            reputation: initial_reputation,
            active: True,
            disputes_voted: [],
            disputes_skipped: [],
          }
        stake_sufficient && is_datum_updated
      }
      AddExpertise { new_expertise } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum
        expect Registered {
          arbitrator,
          stake_amount,
          expertise,
          metadata_ipfs_hash,
          registration_time,
          reputation,
          active,
          disputes_voted,
          disputes_skipped,
        }: ArbitratorDatum = raw_input_datum
        expect output_datum: ArbitratorDatum = raw_output_datum
        // Must be signed by arbitrator
        expect Some(arbitrator_pubkey) = address_pub_key(arbitrator)
        let signed_by_arbitrator =
          key_signed(extra_signatories, arbitrator_pubkey)
        // Add new expertise
        let updated_expertise = add_expertise(expertise, new_expertise)
        let is_datum_updated =
          output_datum == Registered {
            arbitrator,
            stake_amount,
            expertise: updated_expertise,
            metadata_ipfs_hash,
            registration_time,
            reputation,
            active,
            disputes_voted,
            disputes_skipped,
          }
        signed_by_arbitrator && is_datum_updated
      }
      RemoveExpertise { expertise_to_remove } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum
        expect Registered {
          arbitrator,
          stake_amount,
          expertise,
          metadata_ipfs_hash,
          registration_time,
          reputation,
          active,
          disputes_voted,
          disputes_skipped,
        }: ArbitratorDatum = raw_input_datum
        expect output_datum: ArbitratorDatum = raw_output_datum
        // Must be signed by arbitrator
        expect Some(arbitrator_pubkey) = address_pub_key(arbitrator)
        let signed_by_arbitrator =
          key_signed(extra_signatories, arbitrator_pubkey)
        // Remove expertise
        let updated_expertise = remove_expertise(expertise, expertise_to_remove)
        let is_datum_updated =
          output_datum == Registered {
            arbitrator,
            stake_amount,
            expertise: updated_expertise,
            metadata_ipfs_hash,
            registration_time,
            reputation,
            active,
            disputes_voted,
            disputes_skipped,
          }
        signed_by_arbitrator && is_datum_updated
      }
      Unregister -> {
        expect ([input], []) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect Registered { arbitrator, stake_amount, .. }: ArbitratorDatum =
          raw_input_datum
        // Only arbitrator can unregister themselves
        expect Some(arbitrator_pubkey) = address_pub_key(arbitrator)
        let signed_by_arbitrator =
          key_signed(extra_signatories, arbitrator_pubkey)
        // Stake must be returned (minus any penalties that would be applied separately)
        let arbitrator_received = get_all_value_to(outputs, arbitrator)
        let stake_returned =
          value_geq(arbitrator_received, from_lovelace(stake_amount))
        signed_by_arbitrator && stake_returned
      }
      UpdateReputation { delta } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum
        expect Registered {
          arbitrator,
          stake_amount,
          expertise,
          metadata_ipfs_hash,
          registration_time,
          reputation,
          active,
          disputes_voted,
          disputes_skipped,
        }: ArbitratorDatum = raw_input_datum
        expect output_datum: ArbitratorDatum = raw_output_datum
        // Only admin or the arbitrator themselves can update reputation
        // For now, allow any update (in production, add admin check)
        let new_reputation = reputation + delta
        let updated_reputation =
          if new_reputation < 0 {
            0
          } else if new_reputation > max_reputation {
            max_reputation
          } else {
            new_reputation
          }
        let is_datum_updated =
          output_datum == Registered {
            arbitrator,
            stake_amount,
            expertise,
            metadata_ipfs_hash,
            registration_time,
            reputation: updated_reputation,
            active: updated_reputation > min_reputation_for_active,
            disputes_voted,
            disputes_skipped,
          }
        is_datum_updated
      }
      RecordVote { dispute_id } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum
        expect Registered {
          arbitrator,
          stake_amount,
          expertise,
          metadata_ipfs_hash,
          registration_time,
          reputation,
          active,
          disputes_voted,
          disputes_skipped,
        }: ArbitratorDatum = raw_input_datum
        expect output_datum: ArbitratorDatum = raw_output_datum
        // Add dispute to voted list
        let updated_voted = list.push(disputes_voted, dispute_id)
        let is_datum_updated =
          output_datum == Registered {
            arbitrator,
            stake_amount,
            expertise,
            metadata_ipfs_hash,
            registration_time,
            reputation,
            active,
            disputes_voted: updated_voted,
            disputes_skipped,
          }
        is_datum_updated
      }
      Penalize { dispute_id } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum
        expect Registered {
          arbitrator,
          stake_amount,
          expertise,
          metadata_ipfs_hash,
          registration_time,
          reputation,
          active,
          disputes_voted,
          disputes_skipped,
        }: ArbitratorDatum = raw_input_datum
        expect output_datum: ArbitratorDatum = raw_output_datum
        // Check if arbitrator skipped this dispute
        let skipped_this_dispute =
          list.has(disputes_skipped, dispute_id) || !list.has(
            disputes_voted,
            dispute_id,
          )
        if skipped_this_dispute {
          // Apply penalties
          let penalty_amount = stake_amount * stake_penalty_percentage / 100
          let new_stake = stake_amount - penalty_amount
          let new_reputation = reputation - reputation_penalty
          let updated_skipped = list.push(disputes_skipped, dispute_id)
          let is_datum_updated =
            output_datum == Registered {
              arbitrator,
              stake_amount: new_stake,
              expertise,
              metadata_ipfs_hash,
              registration_time,
              reputation: new_reputation,
              active: new_reputation > min_reputation_for_active && new_stake >= arbitrator_stake_amount,
              disputes_voted,
              disputes_skipped: updated_skipped,
            }
          // Penalty ADA should go to treasury (you need to implement this)
          is_datum_updated
        } else {
          False
        }
      }
    }
    // Can't penalize if they voted
  }

  else(_) {
    fail
  }
}
