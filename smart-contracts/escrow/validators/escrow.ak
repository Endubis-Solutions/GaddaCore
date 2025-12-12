use cardano/address.{Address}
use cardano/assets.{
  AssetName, PolicyId, Value, from_asset_list, from_lovelace, merge,
}
use cardano/transaction.{InlineDatum, OutputReference, Transaction, find_input}
use cocktail.{valid_before}
use cocktail/vodka_address.{address_pub_key, compare_address}
use cocktail/vodka_extra_signatories.{
  all_key_signed, key_signed, one_of_keys_signed,
}
use cocktail/vodka_inputs.{inputs_at}
use cocktail/vodka_outputs.{outputs_at}
use cocktail/vodka_value.{get_all_value_to, value_geq}

// 7 * 24 hours in miliseconds
pub const recipient_lock_window = 7 * 24 * 60 * 60 * 1000

// 5 ADA in lovelace
pub const recipient_min_stake = 5_000_000

pub type MValue =
  Pairs<PolicyId, Pairs<AssetName, Int>>

pub type EscrowDatum {
  Initiation {
    initiator: Address,
    initiator_assets: MValue,
    recipient: Address,
    deadline: Int,
    contract_ipfs_url: ByteArray,
    created_at: Int,
  }
  ActiveEscrow {
    initiator: Address,
    initiator_assets: MValue,
    recipient: Address,
    recipient_assets: MValue,
    deadline: Int,
    contract_ipfs_url: ByteArray,
    created_at: Int,
  }
  InitiatorDispute {
    initiator: Address,
    initiator_assets: MValue,
    recipient: Address,
    recipient_assets: MValue,
    deadline: Int,
    contract_ipfs_url: ByteArray,
    created_at: Int,
    initiator_dispute_raised_at: Int,
    initiator_case_ipfs_url: ByteArray,
  }
  RecipientDispute {
    initiator: Address,
    initiator_assets: MValue,
    recipient: Address,
    recipient_assets: MValue,
    deadline: Int,
    contract_ipfs_url: ByteArray,
    created_at: Int,
    initiator_dispute_raised_at: Int,
    initiator_case_ipfs_url: ByteArray,
    recipient_dispute_raised_at: Int,
    recipient_case_ipfs_url: ByteArray,
  }
}

// NEW: Counter for resolution votes

pub type EscrowRedeemer {
  RecipientDeposit { recipient: Address, recipient_assets: MValue }
  CancelTrade
  CompleteTrade
  RaiseInitiatorDispute {
    initiator_dispute_raised_at: Int,
    initiator_case_ipfs_url: ByteArray,
  }

  SubmitRecipientEvidence {
    recipient_dispute_raised_at: Int,
    recipient_case_ipfs_url: ByteArray,
  }
}

// Removed DisputeResolution redeemer as vote_count field was removed

validator escrow {
  spend(
    _datum: Option<EscrowDatum>,
    redeemer: EscrowRedeemer,
    input: OutputReference,
    tx: Transaction,
  ) {
    let Transaction { inputs, outputs, extra_signatories, .. } = tx
    expect Some(own_input) = find_input(inputs, input)
    let own_address = own_input.output.address
    when redeemer is {
      RecipientDeposit { recipient, recipient_assets } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum

        // Pattern match the input datum with the new structure
        expect Initiation {
          initiator,
          initiator_assets,
          recipient: locked_recipient,
          deadline,
          contract_ipfs_url,
          created_at,
        }: EscrowDatum = raw_input_datum

        expect output_datum: EscrowDatum = raw_output_datum

        let is_correct_recipient_address =
          compare_address(recipient, locked_recipient) == Equal
        expect Some(recipient_pub_key) = address_pub_key(recipient)
        let is_signed_by_recipient =
          key_signed(extra_signatories, recipient_pub_key)
        let recipient_lock_deadline = created_at + recipient_lock_window
        // ! problematic
        let is_within_lock_window = is_before(tx, recipient_lock_deadline)
        // STATE TRANSITION: Datum updates to ActiveEscrow, passing through flattened fields
        let is_datum_updated =
          output_datum == ActiveEscrow {
            initiator,
            recipient,
            initiator_assets,
            recipient_assets,
            deadline,
            contract_ipfs_url,
            created_at,
          }
        // VALUE CHECK
        let is_value_deposited =
          value_geq(
            output.value,
            input.output.value
              |> merge(recipient_assets |> from_asset_list()),
          )
        let is_stake_maintained =
          has_minimum_ada(output.value, recipient_min_stake)
        is_correct_recipient_address && is_value_deposited && is_stake_maintained
      }
      CancelTrade -> {
        expect ([input], []) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect input_datum: EscrowDatum = raw_input_datum
        when input_datum is {
          Initiation { initiator, .. } -> {
            expect Some(pub_key) = address_pub_key(initiator)
            key_signed(extra_signatories, pub_key)
          }

          ActiveEscrow {
            initiator,
            recipient,
            initiator_assets,
            recipient_assets,
            deadline,
            contract_ipfs_url,
            created_at,
          } -> {
            // <<-- TRACE/USE HERE
            trace deadline
            trace contract_ipfs_url
            trace created_at

            let initiator_received = get_all_value_to(outputs, initiator)
            let recipient_received = get_all_value_to(outputs, recipient)
            let is_initiator_received_value =
              value_geq(
                initiator_received,
                initiator_assets |> from_asset_list(),
              )
            let is_recipient_received_value =
              value_geq(
                recipient_received,
                recipient_assets |> from_asset_list(),
              )
            expect Some(initiator_pub_key) = address_pub_key(initiator)
            expect Some(recipient_pub_key) = address_pub_key(recipient)
            let is_any_party_signed =
              one_of_keys_signed(
                extra_signatories,
                [initiator_pub_key, recipient_pub_key],
              )
            is_any_party_signed && is_initiator_received_value && is_recipient_received_value
          }

          InitiatorDispute {
            initiator,
            recipient,
            initiator_assets,
            recipient_assets,
            // Capture only the required fields for refund/signature check
            ..
          } -> False

          RecipientDispute {
            initiator,
            recipient,
            initiator_assets,
            recipient_assets,
            // Capture only the required fields for refund/signature check
            ..
          } -> False
        }
      }

      CompleteTrade -> {
        expect ([input], []) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect ActiveEscrow {
          initiator,
          recipient,
          initiator_assets,
          recipient_assets,
          deadline,
          contract_ipfs_url,
          created_at,
        }: EscrowDatum = raw_input_datum
        trace deadline
        trace contract_ipfs_url
        trace created_at

        let initiator_received = get_all_value_to(outputs, initiator)
        let recipient_received = get_all_value_to(outputs, recipient)

        let is_initiator_received_value =
          value_geq(initiator_received, recipient_assets |> from_asset_list())

        let is_recipient_received_value =
          value_geq(recipient_received, initiator_assets |> from_asset_list())
        expect Some(initiator_pub_key) = address_pub_key(initiator)
        expect Some(recipient_pub_key) = address_pub_key(recipient)
        let is_both_parties_signed =
          all_key_signed(
            extra_signatories,
            [initiator_pub_key, recipient_pub_key],
          )
        is_both_parties_signed && is_initiator_received_value && is_recipient_received_value
      }

      RaiseInitiatorDispute {
        initiator_dispute_raised_at,
        initiator_case_ipfs_url,
      } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum

        // 1. INPUT DATUM CHECK: Must be ActiveEscrow state
        expect ActiveEscrow {
          initiator,
          initiator_assets,
          recipient,
          recipient_assets,
          deadline,
          contract_ipfs_url,
          created_at,
        }: EscrowDatum = raw_input_datum

        expect output_datum: EscrowDatum = raw_output_datum

        // 2. SIGNATURE CHECK: Must be signed by the initiator
        expect Some(initiator_pub_key) = address_pub_key(initiator)
        let is_signed_by_initiator =
          key_signed(extra_signatories, initiator_pub_key)

        // 3. STATE TRANSITION: ActiveEscrow -> InitiatorDispute
        let is_datum_updated =
          output_datum == InitiatorDispute {
            initiator,
            initiator_assets,
            recipient,
            recipient_assets,
            deadline,
            contract_ipfs_url,
            created_at,
            initiator_dispute_raised_at,
            initiator_case_ipfs_url,
          }

        // 4. VALUE CHECK: Value must be preserved
        let is_output_geq_input = value_geq(output.value, input.output.value)
        let is_input_geq_output = value_geq(input.output.value, output.value)
        let is_value_preserved = is_output_geq_input && is_input_geq_output
        let is_stake_maintained =
          has_minimum_ada(output.value, recipient_min_stake)

        is_signed_by_initiator && is_datum_updated && is_value_preserved && is_stake_maintained
      }

      SubmitRecipientEvidence {
        recipient_dispute_raised_at,
        recipient_case_ipfs_url,
      } -> {
        expect ([input], [output]) =
          (inputs_at(inputs, own_address), outputs_at(outputs, own_address))
        expect InlineDatum(raw_input_datum) = input.output.datum
        expect InlineDatum(raw_output_datum) = output.datum

        // 1. INPUT DATUM CHECK: Must be InitiatorDispute state
        expect InitiatorDispute {
          initiator,
          initiator_assets,
          recipient: locked_recipient,
          recipient_assets,
          deadline,
          contract_ipfs_url,
          created_at,
          initiator_dispute_raised_at,
          initiator_case_ipfs_url,
        }: EscrowDatum = raw_input_datum

        expect output_datum: EscrowDatum = raw_output_datum

        // 2. SIGNATURE CHECK: Must be signed by the recipient
        expect Some(recipient_pub_key) = address_pub_key(locked_recipient)
        let is_signed_by_recipient =
          key_signed(extra_signatories, recipient_pub_key)

        // 3. STATE TRANSITION: InitiatorDispute -> RecipientDispute
        let is_datum_updated =
          output_datum == RecipientDispute {
            initiator,
            initiator_assets,
            recipient: locked_recipient,
            recipient_assets,
            deadline,
            contract_ipfs_url,
            created_at,
            initiator_dispute_raised_at,
            // Preserve initiator's data
            initiator_case_ipfs_url,
            // Preserve initiator's data
            recipient_dispute_raised_at,
            // New recipient data
            recipient_case_ipfs_url,
          }

        // New recipient data
        // 4. VALUE CHECK: Value must be preserved
        let is_output_geq_input = value_geq(output.value, input.output.value)
        let is_input_geq_output = value_geq(input.output.value, output.value)
        let is_value_preserved = is_output_geq_input && is_input_geq_output
        let is_stake_maintained =
          has_minimum_ada(output.value, recipient_min_stake)

        is_signed_by_recipient && is_datum_updated && is_value_preserved && is_stake_maintained
      }
    }
  }

  else(_) {
    fail
  }
}

// Helper functions
fn is_before(tx: Transaction, deadline: Int) -> Bool {
  valid_before(tx.validity_range, deadline)
}

fn has_minimum_ada(value: Value, min_lovelace: Int) -> Bool {
  let required_lovelace = from_lovelace(min_lovelace)
  value_geq(value, required_lovelace)
}
