use aiken/collection/list
use aiken/interval.{Finite}
use cardano/address.{Address}
use cardano/assets.{Value, from_lovelace, merge}
use cardano/transaction.{InlineDatum, OutputReference, Transaction, find_input}
use cocktail/vodka_address.{address_pub_key}
use cocktail/vodka_extra_signatories.{key_signed}
use cocktail/vodka_inputs.{inputs_at}
use cocktail/vodka_outputs.{outputs_at}
use cocktail/vodka_value.{get_all_value_to, value_geq}

// Constants
const arbitrator_stake_amount = 100_000_000

// 100 ADA in lovelace
const initial_reputation = 100

const reputation_penalty = 20

const reputation_reward = 10

// const stake_penalty_percentage = 10

// 10% penalty for misconduct
const min_reputation_for_active = 20

const max_reputation = 100

const min_stake_to_withdraw = 10_000_000

// 10 ADA minimum remaining stake
const min_stake_to_remain = 50_000_000

// 50 ADA must remain after withdrawal

// Types
pub type ArbitratorDatum {
  Uninitialized
  Registered {
    arbitrator: Address,
    stake_amount: Int,
    expertise: List<ByteArray>,
    metadata_ipfs_hash: ByteArray,
    registration_time: Int,
    reputation: Int,
    total_rewards: Int,
    // Total rewards earned
    total_penalties: Int,
    // Total penalties applied
    active_disputes: List<ByteArray>,
    // Active dispute IDs assigned
    resolved_disputes: List<ByteArray>,
    // Resolved dispute IDs
    withdrawals: List<WithdrawalRecord>,
    // History of withdrawals
    pending_withdrawal: Option<WithdrawalRequest>,
  }
}

pub type WithdrawalRequest {
  amount: Int,
  recipient: Address,
  requested_at: Int,
  withdrawal_id: ByteArray,
}

pub type WithdrawalRecord {
  amount: Int,
  recipient: Address,
  executed_at: Int,
  withdrawal_id: ByteArray,
}

pub type ArbitratorRedeemer {
  // Register as arbitrator with initial stake
  Register { expertise: List<ByteArray>, metadata_ipfs_hash: ByteArray }
  // Update arbitrator information
  UpdateInfo {
    new_expertise: Option<List<ByteArray>>,
    new_metadata_ipfs_hash: Option<ByteArray>,
  }
  // Request withdrawal of stake/rewards
  RequestWithdrawal {
    amount: Int,
    recipient: Address,
    withdrawal_id: ByteArray,
  }
  // Execute approved withdrawal
  ExecuteWithdrawal { withdrawal_id: ByteArray }
  // Cancel pending withdrawal
  CancelWithdrawal
  // Apply reward for successful dispute resolution
  ApplyReward { dispute_id: ByteArray, reward_amount: Int }
  // Apply penalty for misconduct
  ApplyPenalty {
    dispute_id: ByteArray,
    penalty_amount: Int,
    description: ByteArray,
  }
  // Assign arbitrator to dispute
  AssignToDispute { dispute_id: ByteArray }
  // Mark dispute as resolved
  ResolveDispute { dispute_id: ByteArray }
  // Unregister and withdraw all remaining stake
  Unregister
}

// Helper Functions
fn get_current_time(tx: Transaction) -> Int {
  let lower = tx.validity_range.lower_bound
  when lower.bound_type is {
    Finite(time) -> time
    _ -> 0
  }
}

fn has_minimum_stake(value: Value, min_amount: Int) -> Bool {
  value_geq(value, from_lovelace(min_amount))
}

fn calculate_available_withdrawal(
  stake_amount: Int,
  current_value: Value,
) -> Int {
  // Can withdraw if remaining stake is at least min_stake_to_remain
  let current_lovelace = get_lovelace_amount(current_value)
  if current_lovelace - min_stake_to_remain >= 0 {
    current_lovelace - min_stake_to_remain
  } else {
    0
  }
}

fn get_lovelace_amount(value: Value) -> Int {
  // Extract lovelace amount from Value
  // This is a simplified version - in practice you'd need to extract from the Value type
  0
  // Placeholder - implement based on your Value structure
}

fn validate_withdrawal_amount(
  stake_amount: Int,
  withdrawal_amount: Int,
  current_value: Value,
) -> Bool {
  let available = calculate_available_withdrawal(stake_amount, current_value)
  withdrawal_amount <= available && withdrawal_amount >= min_stake_to_withdraw
}

fn is_arbitrator_active(reputation: Int, stake_amount: Int) -> Bool {
  reputation >= min_reputation_for_active && stake_amount >= arbitrator_stake_amount
}

fn add_to_list_if_not_present(
  list: List<ByteArray>,
  item: ByteArray,
) -> List<ByteArray> {
  if list.has(list, item) {
    list
  } else {
    list.push(list, item)
  }
}

fn remove_from_list(list: List<ByteArray>, item: ByteArray) -> List<ByteArray> {
  list.filter(list, fn(element) { element != item })
}

// Main Validator
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
        // Initial registration requires creating UTxO with stake
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
            total_rewards: 0,
            total_penalties: 0,
            active_disputes: [],
            resolved_disputes: [],
            withdrawals: [],
            pending_withdrawal: None,
          }
        // Also check that output has at least the staked amount
        let output_has_stake =
          has_minimum_stake(output.value, arbitrator_stake_amount)
        stake_sufficient && is_datum_updated && output_has_stake
      }
      UpdateInfo { new_expertise, new_metadata_ipfs_hash } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum
        expect Registered {
          arbitrator,
          stake_amount,
          expertise: current_expertise,
          metadata_ipfs_hash: current_metadata,
          registration_time,
          reputation,
          total_rewards,
          total_penalties,
          active_disputes,
          resolved_disputes,
          withdrawals,
          pending_withdrawal,
        }: ArbitratorDatum = raw_input_datum
        expect output_datum: ArbitratorDatum = raw_output_datum
        // Must be signed by arbitrator
        expect Some(arbitrator_pubkey) = address_pub_key(arbitrator)
        let signed_by_arbitrator =
          key_signed(extra_signatories, arbitrator_pubkey)
        // Update fields if provided
        let updated_expertise =
          when new_expertise is {
            Some(expertise_list) -> expertise_list
            None -> current_expertise
          }
        let updated_metadata =
          when new_metadata_ipfs_hash is {
            Some(metadata_hash) -> metadata_hash
            None -> current_metadata
          }
        let is_datum_updated =
          output_datum == Registered {
            arbitrator,
            stake_amount,
            expertise: updated_expertise,
            metadata_ipfs_hash: updated_metadata,
            registration_time,
            reputation,
            total_rewards,
            total_penalties,
            active_disputes,
            resolved_disputes,
            withdrawals,
            pending_withdrawal,
          }
        // Value must be preserved
        let is_value_preserved =
          value_geq(output.value, input.output.value) && value_geq(
            input.output.value,
            output.value,
          )
        signed_by_arbitrator && is_datum_updated && is_value_preserved
      }
      RequestWithdrawal { amount, recipient, withdrawal_id } -> {
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
          total_rewards,
          total_penalties,
          active_disputes,
          resolved_disputes,
          withdrawals,
          pending_withdrawal: current_pending,
        }: ArbitratorDatum = raw_input_datum
        expect output_datum: ArbitratorDatum = raw_output_datum
        // Must be signed by arbitrator
        expect Some(arbitrator_pubkey) = address_pub_key(arbitrator)
        let signed_by_arbitrator =
          key_signed(extra_signatories, arbitrator_pubkey)
        // Check if there's already a pending withdrawal
        let no_pending_withdrawal =
          when current_pending is {
            None -> True
            Some(_) -> False
          }
        // Validate withdrawal amount
        let valid_amount =
          validate_withdrawal_amount(stake_amount, amount, input.output.value)
        let current_time = get_current_time(tx)
        let withdrawal_request =
          WithdrawalRequest {
            amount,
            recipient,
            requested_at: current_time,
            withdrawal_id,
          }
        let is_datum_updated =
          output_datum == Registered {
            arbitrator,
            stake_amount,
            expertise,
            metadata_ipfs_hash,
            registration_time,
            reputation,
            total_rewards,
            total_penalties,
            active_disputes,
            resolved_disputes,
            withdrawals,
            pending_withdrawal: Some(withdrawal_request),
          }
        // Value must be preserved (withdrawal not executed yet)
        let is_value_preserved =
          value_geq(output.value, input.output.value) && value_geq(
            input.output.value,
            output.value,
          )
        signed_by_arbitrator && no_pending_withdrawal && valid_amount && is_datum_updated && is_value_preserved
      }
      ExecuteWithdrawal { withdrawal_id } -> {
        expect ([input], []) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect Registered {
          arbitrator,
          stake_amount,
          expertise,
          metadata_ipfs_hash,
          registration_time,
          reputation,
          total_rewards,
          total_penalties,
          active_disputes,
          resolved_disputes,
          withdrawals,
          pending_withdrawal: current_pending,
        }: ArbitratorDatum = raw_input_datum
        // Must have a pending withdrawal
        expect Some(pending_request) = current_pending
        // Check withdrawal ID matches
        let valid_withdrawal_id = pending_request.withdrawal_id == withdrawal_id
        // Must be signed by arbitrator
        expect Some(arbitrator_pubkey) = address_pub_key(arbitrator)
        let signed_by_arbitrator =
          key_signed(extra_signatories, arbitrator_pubkey)
        // Check withdrawal is sent to correct recipient
        let recipient_received =
          get_all_value_to(outputs, pending_request.recipient)
        let withdrawal_sent =
          value_geq(recipient_received, from_lovelace(pending_request.amount))
        // Calculate new stake amount
        let new_stake_amount = stake_amount - pending_request.amount
        // Check remaining stake is sufficient
        let sufficient_remaining_stake = new_stake_amount >= min_stake_to_remain
        valid_withdrawal_id && signed_by_arbitrator && withdrawal_sent && sufficient_remaining_stake
      }
      CancelWithdrawal -> {
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
          total_rewards,
          total_penalties,
          active_disputes,
          resolved_disputes,
          withdrawals,
          pending_withdrawal: current_pending,
        }: ArbitratorDatum = raw_input_datum
        expect output_datum: ArbitratorDatum = raw_output_datum
        // Must have a pending withdrawal to cancel
        expect Some(_) = current_pending
        // Must be signed by arbitrator
        expect Some(arbitrator_pubkey) = address_pub_key(arbitrator)
        let signed_by_arbitrator =
          key_signed(extra_signatories, arbitrator_pubkey)
        let is_datum_updated =
          output_datum == Registered {
            arbitrator,
            stake_amount,
            expertise,
            metadata_ipfs_hash,
            registration_time,
            reputation,
            total_rewards,
            total_penalties,
            active_disputes,
            resolved_disputes,
            withdrawals,
            pending_withdrawal: None,
          }
        // Value must be preserved
        let is_value_preserved =
          value_geq(output.value, input.output.value) && value_geq(
            input.output.value,
            output.value,
          )
        signed_by_arbitrator && is_datum_updated && is_value_preserved
      }
      ApplyReward { dispute_id, reward_amount } -> {
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
          total_rewards,
          total_penalties,
          active_disputes,
          resolved_disputes,
          withdrawals,
          pending_withdrawal,
        }: ArbitratorDatum = raw_input_datum
        expect output_datum: ArbitratorDatum = raw_output_datum
        // Check arbitrator was assigned to this dispute
        let was_assigned =
          list.has(active_disputes, dispute_id) || list.has(
            resolved_disputes,
            dispute_id,
          )
        // Update reputation and rewards
        let new_reputation =
          if reputation + reputation_reward > max_reputation {
            max_reputation
          } else {
            reputation + reputation_reward
          }
        let new_total_rewards = total_rewards + reward_amount
        let new_stake_amount = stake_amount + reward_amount
        // Add to resolved disputes if not already there
        let updated_resolved_disputes =
          add_to_list_if_not_present(resolved_disputes, dispute_id)
        // Remove from active disputes
        let updated_active_disputes =
          remove_from_list(active_disputes, dispute_id)
        let is_datum_updated =
          output_datum == Registered {
            arbitrator,
            stake_amount: new_stake_amount,
            expertise,
            metadata_ipfs_hash,
            registration_time,
            reputation: new_reputation,
            total_rewards: new_total_rewards,
            total_penalties,
            active_disputes: updated_active_disputes,
            resolved_disputes: updated_resolved_disputes,
            withdrawals,
            pending_withdrawal,
          }
        // Output value should include the reward
        let expected_value =
          input.output.value |> merge(from_lovelace(reward_amount))
        let value_increased = value_geq(output.value, expected_value)
        was_assigned && is_datum_updated && value_increased
      }
      ApplyPenalty { dispute_id, penalty_amount, description } -> {
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
          total_rewards,
          total_penalties,
          active_disputes,
          resolved_disputes,
          withdrawals,
          pending_withdrawal,
        }: ArbitratorDatum = raw_input_datum
        expect output_datum: ArbitratorDatum = raw_output_datum
        // Check arbitrator was assigned to this dispute
        let was_assigned =
          list.has(active_disputes, dispute_id) || list.has(
            resolved_disputes,
            dispute_id,
          )
        // Apply penalty to reputation
        let new_reputation =
          if reputation - reputation_penalty < 0 {
            0
          } else {
            reputation - reputation_penalty
          }
        let new_total_penalties = total_penalties + penalty_amount
        let new_stake_amount = stake_amount - penalty_amount
        // Check if still active after penalty
        let still_active =
          is_arbitrator_active(new_reputation, new_stake_amount)
        // Add to resolved disputes
        let updated_resolved_disputes =
          add_to_list_if_not_present(resolved_disputes, dispute_id)
        let updated_active_disputes =
          remove_from_list(active_disputes, dispute_id)
        let is_datum_updated =
          output_datum == Registered {
            arbitrator,
            stake_amount: new_stake_amount,
            expertise,
            metadata_ipfs_hash,
            registration_time,
            reputation: new_reputation,
            total_rewards,
            total_penalties: new_total_penalties,
            active_disputes: updated_active_disputes,
            resolved_disputes: updated_resolved_disputes,
            withdrawals,
            pending_withdrawal,
          }
        // Output value should be reduced by penalty
        // Penalty ADA goes to treasury (you'd need to check it's sent to correct address)
        let value_reduced =
          value_geq(
            input.output.value,
            output.value |> merge(from_lovelace(penalty_amount)),
          )
        was_assigned && is_datum_updated && value_reduced && still_active
      }
      AssignToDispute { dispute_id } -> {
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
          total_rewards,
          total_penalties,
          active_disputes,
          resolved_disputes,
          withdrawals,
          pending_withdrawal,
        }: ArbitratorDatum = raw_input_datum
        expect output_datum: ArbitratorDatum = raw_output_datum
        // Check arbitrator is active
        let arbitrator_active = is_arbitrator_active(reputation, stake_amount)
        // Add dispute to active disputes if not already assigned
        let already_assigned =
          list.has(active_disputes, dispute_id) || list.has(
            resolved_disputes,
            dispute_id,
          )
        let updated_active_disputes =
          if already_assigned {
            active_disputes
          } else {
            list.push(active_disputes, dispute_id)
          }
        let is_datum_updated =
          output_datum == Registered {
            arbitrator,
            stake_amount,
            expertise,
            metadata_ipfs_hash,
            registration_time,
            reputation,
            total_rewards,
            total_penalties,
            active_disputes: updated_active_disputes,
            resolved_disputes,
            withdrawals,
            pending_withdrawal,
          }
        // Value must be preserved
        let is_value_preserved =
          value_geq(output.value, input.output.value) && value_geq(
            input.output.value,
            output.value,
          )
        arbitrator_active && !already_assigned && is_datum_updated && is_value_preserved
      }
      ResolveDispute { dispute_id } -> {
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
          total_rewards,
          total_penalties,
          active_disputes,
          resolved_disputes,
          withdrawals,
          pending_withdrawal,
        }: ArbitratorDatum = raw_input_datum
        expect output_datum: ArbitratorDatum = raw_output_datum
        // Check dispute is in active disputes
        let dispute_active = list.has(active_disputes, dispute_id)
        // Move from active to resolved
        let updated_active_disputes =
          remove_from_list(active_disputes, dispute_id)
        let updated_resolved_disputes =
          add_to_list_if_not_present(resolved_disputes, dispute_id)
        let is_datum_updated =
          output_datum == Registered {
            arbitrator,
            stake_amount,
            expertise,
            metadata_ipfs_hash,
            registration_time,
            reputation,
            total_rewards,
            total_penalties,
            active_disputes: updated_active_disputes,
            resolved_disputes: updated_resolved_disputes,
            withdrawals,
            pending_withdrawal,
          }
        // Value must be preserved
        let is_value_preserved =
          value_geq(output.value, input.output.value) && value_geq(
            input.output.value,
            output.value,
          )
        dispute_active && is_datum_updated && is_value_preserved
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
        // All remaining stake must be returned to arbitrator
        let arbitrator_received = get_all_value_to(outputs, arbitrator)
        let all_stake_returned =
          value_geq(arbitrator_received, from_lovelace(stake_amount))
        signed_by_arbitrator && all_stake_returned
      }
    }
  }

  else(_) {
    fail
  }
}
