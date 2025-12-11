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
use cocktail/vodka_value.{get_all_value_to, value_geq, value_length}

// 24 hours in miliseconds
pub const recipient_lock_window = 24 * 60 * 60 * 1000

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
}

pub type EscrowRedeemer {
  RecipientDeposit { recipient: Address, recipient_assets: MValue }
  CancelTrade
  CompleteTrade
}

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

        expect Some(recipient_pub_key) = address_pub_key(locked_recipient)
        let is_signed_by_recipient =
          key_signed(extra_signatories, recipient_pub_key)

        let recipient_lock_deadline = created_at + recipient_lock_window
        let is_within_lock_window = is_before(tx, recipient_lock_deadline)

        // STATE TRANSITION: Datum updates to ActiveEscrow, passing through flattened fields
        let is_datum_updated =
          output_datum == ActiveEscrow {
            initiator,
            recipient: locked_recipient,
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

        let is_output_value_clean = value_length(output.value) <= 9
        is_datum_updated && is_value_deposited && is_output_value_clean && is_correct_recipient_address && is_signed_by_recipient
      }
      //  && is_within_lock_window && is_stake_maintained
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
