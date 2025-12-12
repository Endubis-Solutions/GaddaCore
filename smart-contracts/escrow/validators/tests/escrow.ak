use cardano/address.{Address}
use cardano/assets.{add, from_lovelace}
use cardano/transaction.{Transaction}
use escrow.{
  ActiveEscrow, CancelTrade, CompleteTrade, EscrowDatum, Initiation, MValue,
  RecipientDeposit, recipient_lock_window,
}
use mocktail.{
  complete, invalid_hereafter, mocktail_tx, required_signer_hash, tx_in,
  tx_in_inline_datum, tx_out, tx_out_inline_datum,
}
use mocktail/virgin_address.{mock_pub_key_address, mock_script_address}
use mocktail/virgin_key_hash.{mock_pub_key_hash}
use mocktail/virgin_output_reference.{mock_tx_hash, mock_utxo_ref}

// New fixed values for testing
const test_deadline = 1765659600000

// Arbitrary future timestamp
const test_created_at = 1672531200000

// Hex for "test/ipfs/hash"
const test_ipfs_url = "746573742f697066732f68617368"

// =========================================================================
// TYPES
// =========================================================================

type CancelTestCase {
  is_at_initiation: Bool,
  is_initiator_received_value: Bool,
  is_recipient_received_value: Bool,
  is_initiator_signed: Bool,
  is_recipient_signed: Bool,
}

type RecipientDepositTestCase {
  is_datum_updated: Bool,
  is_value_deposited: Bool,
  is_value_deposited_within_max_cap: Bool,
  is_correct_recipient_address: Bool,
  is_recipient_signed: Bool,
  is_within_lock_window: Bool,
  is_stake_maintained: Bool,
}

type CompleteTestCase {
  is_initiator_signed: Bool,
  is_initiator_received_value: Bool,
  is_recipient_signed: Bool,
  is_recipient_received_value: Bool,
}

// =========================================================================
// MOCK ASSETS (Lovelace Only)
// =========================================================================

const initiator_lock_ada: Int = 5_000_000

const recipient_deposit_ada: Int = 1_000_000

fn initiator_assets() -> MValue {
  // Initiator's 5 ADA lock
  [Pair("", [Pair("", initiator_lock_ada)])]
}

fn recipient_deposit_assets() -> MValue {
  // Recipient's 1 ADA deposit
  [Pair("", [Pair("", recipient_deposit_ada)])]
}

fn initiator_address() -> Address {
  mock_pub_key_address(0, None)
}

fn recipient_address() -> Address {
  mock_pub_key_address(1, None)
}

fn wrong_recipient_address() -> Address {
  mock_pub_key_address(2, None)
}

// =========================================================================
// DATUM HELPERS
// =========================================================================

fn initiation_datum() -> EscrowDatum {
  Initiation {
    initiator: initiator_address(),
    initiator_assets: initiator_assets(),
    recipient: recipient_address(),
    deadline: test_deadline,
    contract_ipfs_url: test_ipfs_url,
    created_at: test_created_at,
  }
}

fn active_datum(recipient: Address, recipient_assets: MValue) -> EscrowDatum {
  ActiveEscrow {
    initiator: initiator_address(),
    initiator_assets: initiator_assets(),
    recipient,
    recipient_assets,
    deadline: test_deadline,
    contract_ipfs_url: test_ipfs_url,
    created_at: test_created_at,
  }
}

// =========================================================================
// CANCELTRADE TESTS
// =========================================================================

fn get_cancel_test_tx(test_case: CancelTestCase) -> Transaction {
  let CancelTestCase {
    is_at_initiation,
    is_initiator_received_value,
    is_recipient_received_value,
    is_initiator_signed,
    is_recipient_signed,
  } = test_case

  let initiator_output_value =
    if is_initiator_received_value {
      // Initiator gets their 5 ADA back
      from_lovelace(initiator_lock_ada)
    } else {
      from_lovelace(1)
    }

  let recipient_output_value =
    if is_recipient_received_value {
      // Recipient gets their 1 ADA back (if ActiveEscrow)
      from_lovelace(recipient_deposit_ada)
    } else {
      from_lovelace(1)
    }

  let input_value =
    if !is_at_initiation {
      // If ActiveEscrow: 5 ADA + Recipient's 1 ADA
      from_lovelace(initiator_lock_ada + recipient_deposit_ada)
    } else {
      // If Initiation: Only 5 ADA
      from_lovelace(initiator_lock_ada)
    }

  mocktail_tx()
    |> tx_in(
        True,
        mock_tx_hash(0),
        1,
        input_value,
        mock_script_address(0, None),
      )
    |> tx_in_inline_datum(is_at_initiation, initiation_datum())
    |> tx_in_inline_datum(
        !is_at_initiation,
        active_datum(recipient_address(), recipient_deposit_assets()),
      )
    |> tx_out(True, initiator_address(), initiator_output_value)
    |> tx_out(True, recipient_address(), recipient_output_value)
    |> required_signer_hash(is_initiator_signed, mock_pub_key_hash(0))
    |> required_signer_hash(is_recipient_signed, mock_pub_key_hash(1))
    |> complete()
}

test success_cancel_at_initiation() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CancelTrade
  let test_case =
    CancelTestCase {
      is_at_initiation: True,
      is_initiator_received_value: True,
      is_recipient_received_value: False,
      // Recipient has no assets to receive
      is_initiator_signed: True,
      is_recipient_signed: False,
    }

  let tx = get_cancel_test_tx(test_case)
  escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test success_cancel_at_active_with_initiator_signed() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CancelTrade
  let test_case =
    CancelTestCase {
      is_at_initiation: False,
      is_initiator_received_value: True,
      // Initiator gets 5 ADA back
      is_recipient_received_value: True,
      // Recipient gets 1 ADA back
      is_initiator_signed: True,
      is_recipient_signed: False,
    }

  let tx = get_cancel_test_tx(test_case)
  escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

// =========================================================================
// RECIPIENTDEPOSIT TESTS
// =========================================================================

fn get_deposit_test_tx(
  test_case: RecipientDepositTestCase,
  recipient_addr: Address,
) -> Transaction {
  let RecipientDepositTestCase {
    is_datum_updated,
    is_value_deposited,
    is_value_deposited_within_max_cap,
    is_correct_recipient_address: _,
    is_recipient_signed,
    is_within_lock_window,
    is_stake_maintained,
  } = test_case
  let input_value = from_lovelace(initiator_lock_ada)

  // Initiator's 5 ADA
  let deposit_assets =
    if is_value_deposited {
      recipient_deposit_assets()
    } else {
      // Placeholder for asset check failure
      [Pair("", [Pair("", 1)])]
    }

  let output_value =
    if is_value_deposited {
      // Add Lovelace deposit to the initiator's 5 ADA lock
      input_value |> add("", "", recipient_deposit_ada)
    } else {
      // If value is NOT deposited, we just return the input_value
      input_value
    }

  // Set output value to fail the value_length check (only relevant if using non-ADA assets, but kept for completeness)
  let output_value =
    if is_value_deposited_within_max_cap {
      output_value
    } else {
      // Add enough assets to exceed the 9-asset limit (mix Lovelace with tokens to fail)
      output_value
        |> add("p1", "n1", 1)
        |> add("p2", "n2", 1)
        |> add("p3", "n3", 1)
        |> add("p4", "n4", 1)
        |> add("p5", "n5", 1)
        |> add("p6", "n6", 1)
        |> add("p7", "n7", 1)
        |> add("p8", "n8", 1)
        |> add("p9", "n9", 1)
    }

  let output_value =
    if is_stake_maintained {
      // Use the correctly calculated value (6M Lovelace or higher)
      output_value
    } else {
      // Intentionally set to a value below the min stake (e.g., 1 Lovelace)
      from_lovelace(1)
    }

  let time_ms =
    if is_within_lock_window {
      test_created_at + recipient_lock_window - 1000
    } else {
      test_created_at + recipient_lock_window + 1000
    }

  mocktail_tx()
    |> invalid_hereafter(True, time_ms)
    |> required_signer_hash(is_recipient_signed, mock_pub_key_hash(1))
    |> tx_in(
        True,
        mock_tx_hash(0),
        1,
        input_value,
        mock_script_address(0, None),
      )
    |> tx_in_inline_datum(True, initiation_datum())
    |> tx_out(True, mock_script_address(0, None), output_value)
    |> tx_out_inline_datum(
        is_datum_updated,
        active_datum(recipient_addr, deposit_assets),
      )
    |> tx_out_inline_datum(!is_datum_updated, initiation_datum())
    |> complete()
}

test success_deposit_signed_by_recipient() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer =
    RecipientDeposit {
      recipient: recipient_address(),
      recipient_assets: recipient_deposit_assets(),
    }
  let test_case =
    RecipientDepositTestCase {
      is_datum_updated: True,
      is_value_deposited: True,
      is_value_deposited_within_max_cap: True,
      is_correct_recipient_address: True,
      is_recipient_signed: True,
      is_within_lock_window: True,
      is_stake_maintained: True,
    }

  let tx = get_deposit_test_tx(test_case, recipient_address())
  escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_deposit_without_recipient_signature() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer =
    RecipientDeposit {
      recipient: recipient_address(),
      recipient_assets: recipient_deposit_assets(),
    }
  let test_case =
    RecipientDepositTestCase {
      is_datum_updated: True,
      is_value_deposited: True,
      is_value_deposited_within_max_cap: True,
      is_correct_recipient_address: True,
      is_recipient_signed: False,
      is_within_lock_window: True,
      is_stake_maintained: True,
    }

  let tx = get_deposit_test_tx(test_case, recipient_address())
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_deposit_with_wrong_redeemer_address() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer =
    RecipientDeposit {
      // Sending a different address in the redeemer
      recipient: wrong_recipient_address(),
      recipient_assets: recipient_deposit_assets(),
    }
  let test_case =
    RecipientDepositTestCase {
      is_datum_updated: True,
      is_value_deposited: True,
      is_value_deposited_within_max_cap: True,
      is_correct_recipient_address: False,
      is_recipient_signed: True,
      is_within_lock_window: True,
      is_stake_maintained: True,
    }

  let tx = get_deposit_test_tx(test_case, recipient_address())
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_deposit_after_lock_window() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer =
    RecipientDeposit {
      recipient: recipient_address(),
      recipient_assets: recipient_deposit_assets(),
    }
  let test_case =
    RecipientDepositTestCase {
      is_datum_updated: True,
      is_value_deposited: True,
      is_value_deposited_within_max_cap: True,
      is_correct_recipient_address: True,
      is_recipient_signed: True,
      is_within_lock_window: False,
      is_stake_maintained: True,
    }

  let tx = get_deposit_test_tx(test_case, recipient_address())
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test fail_deposit_below_min_stake() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer =
    RecipientDeposit {
      recipient: recipient_address(),
      recipient_assets: recipient_deposit_assets(),
    }
  let test_case =
    RecipientDepositTestCase {
      is_datum_updated: True,
      is_value_deposited: True,
      is_value_deposited_within_max_cap: True,
      is_correct_recipient_address: True,
      is_recipient_signed: True,
      is_within_lock_window: True,
      is_stake_maintained: False,
    }

  let tx = get_deposit_test_tx(test_case, recipient_address())
  !escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

test success_deposit_min_stake_maintained() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer =
    RecipientDeposit {
      recipient: recipient_address(),
      recipient_assets: recipient_deposit_assets(),
    }
  let test_case =
    RecipientDepositTestCase {
      is_datum_updated: True,
      is_value_deposited: True,
      is_value_deposited_within_max_cap: True,
      is_correct_recipient_address: True,
      is_recipient_signed: True,
      is_within_lock_window: True,
      is_stake_maintained: True,
    }

  let tx = get_deposit_test_tx(test_case, recipient_address())
  escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}

// =========================================================================
// COMPLETETRADE TESTS
// =========================================================================

fn get_complete_test_tx(test_case: CompleteTestCase) -> Transaction {
  let CompleteTestCase {
    is_initiator_signed,
    is_initiator_received_value,
    is_recipient_signed,
    is_recipient_received_value,
  } = test_case
  let input_datum =
    active_datum(recipient_address(), recipient_deposit_assets())

  let input_value = from_lovelace(initiator_lock_ada + recipient_deposit_ada)

  // 5 ADA + 1 ADA = 6 ADA total lock
  // Initiator expects Recipient's Assets (1 ADA)
  let initiator_output_value =
    if is_initiator_received_value {
      from_lovelace(recipient_deposit_ada)
    } else {
      from_lovelace(1)
    }

  // Recipient expects Initiator's Assets (5 ADA)
  let recipient_output_value =
    if is_recipient_received_value {
      from_lovelace(initiator_lock_ada)
    } else {
      from_lovelace(1)
    }

  mocktail_tx()
    |> required_signer_hash(is_initiator_signed, mock_pub_key_hash(0))
    |> required_signer_hash(is_recipient_signed, mock_pub_key_hash(1))
    |> tx_in(
        True,
        mock_tx_hash(0),
        1,
        input_value,
        mock_script_address(0, None),
      )
    |> tx_in_inline_datum(True, input_datum)
    |> tx_out(True, initiator_address(), initiator_output_value)
    |> tx_out(True, recipient_address(), recipient_output_value)
    |> complete()
}

test success_complete() {
  let output_reference = mock_utxo_ref(0, 1)
  let unused_mock_datum = Some(initiation_datum())
  let redeemer = CompleteTrade
  let test_case =
    CompleteTestCase {
      is_initiator_signed: True,
      is_initiator_received_value: True,
      is_recipient_signed: True,
      is_recipient_received_value: True,
    }

  let tx = get_complete_test_tx(test_case)
  escrow.escrow.spend(unused_mock_datum, redeemer, output_reference, tx)
}
