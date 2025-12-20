#![no_std]
#![no_main]

extern crate alloc;

use alloc::{
    string::{String, ToString},
    vec::Vec,
};

use casper_contract::{
    contract_api::{runtime, storage, system},
    unwrap_or_revert::UnwrapOrRevert,
};

use casper_types::{
    contracts::{EntryPoint, EntryPointAccess, EntryPointType, EntryPoints, NamedKeys},
    CLType, CLValue, Key, Parameter, URef, U512, ApiError,
};

const OWNER_KEY_NAME: &str = "owner";
const RELAYER_KEY_NAME: &str = "relayer";
const ESCROWS_DICT_NAME: &str = "escrows";

fn get_escrows_uref() -> URef {
    let key = runtime::get_key(ESCROWS_DICT_NAME).unwrap_or_revert();
    key.into_uref().unwrap_or_revert()
}

#[no_mangle]
pub extern "C" fn create_escrow() {
    let escrow_id: String = runtime::get_named_arg("escrow_id");
    let recipient: Key = runtime::get_named_arg("recipient");
    let amount: U512 = runtime::get_named_arg("amount");

    let escrows_uref = get_escrows_uref();
    
    // Store escrow data as a simple tuple (recipient, amount, status)
    // Status: 0=Initiated, 1=Funded, 2=Settled, 3=Cancelled
    let escrow_data = (recipient, amount, 0u8);
    storage::dictionary_put(escrows_uref, &escrow_id, escrow_data);

    runtime::ret(CLValue::from_t(escrow_id).unwrap_or_revert());
}

#[no_mangle]
pub extern "C" fn fund_escrow() {
    let escrow_id: String = runtime::get_named_arg("escrow_id");
    let amount_paid: U512 = runtime::get_named_arg("amount");

    let escrows_uref = get_escrows_uref();
    let escrow_data: (Key, U512, u8) =
        storage::dictionary_get(escrows_uref, &escrow_id)
            .unwrap_or_revert()
            .unwrap_or_revert();

    let recipient = escrow_data.0;
    let required_amount = escrow_data.1;
    let status = escrow_data.2;

    // Verify escrow is in correct state (0 = Initiated)
    if status != 0 {
        runtime::revert(ApiError::User(4)); // Already funded or settled
    }

    // Verify correct amount
    if amount_paid < required_amount {
        runtime::revert(ApiError::User(1)); // Incorrect amount
    }

    // Create escrow purse to hold funds securely
    let escrow_purse = system::create_purse();
    
    // Transfer funds from caller's main purse to escrow purse
    let caller_purse = runtime::get_main_purse();
    system::transfer_from_purse_to_purse(
        caller_purse,
        escrow_purse,
        amount_paid,
        None
    ).unwrap_or_revert();

    // Update escrow status to Funded (1)
    let updated_escrow_data = (recipient, required_amount, 1u8);
    storage::dictionary_put(escrows_uref, &escrow_id, updated_escrow_data);
    
    // Store purse separately with a different key
    let mut purse_key = escrow_id.clone();
    purse_key.push_str("_purse");
    storage::dictionary_put(escrows_uref, &purse_key, escrow_purse);
}

#[no_mangle]
pub extern "C" fn settle_escrow() {
    let relayer: Key = runtime::get_key(RELAYER_KEY_NAME).unwrap_or_revert();
    if runtime::get_caller() != relayer.into_account().unwrap_or_revert() {
        runtime::revert(ApiError::User(2)); // Unauthorized
    }

    let escrow_id: String = runtime::get_named_arg("escrow_id");

    let escrows_uref = get_escrows_uref();
    let escrow_data: (Key, U512, u8) =
        storage::dictionary_get(escrows_uref, &escrow_id)
            .unwrap_or_revert()
            .unwrap_or_revert();

    let recipient = escrow_data.0;
    let amount = escrow_data.1;
    let status = escrow_data.2;

    if status != 1 {  // 1 = Funded
        runtime::revert(ApiError::User(3)); // Not funded
    }

    // Get the escrow purse
    let mut purse_key = escrow_id.clone();
    purse_key.push_str("_purse");
    let escrow_purse: URef = storage::dictionary_get(escrows_uref, &purse_key)
        .unwrap_or_revert()
        .unwrap_or_revert();

    // Transfer funds from escrow purse to recipient account
    system::transfer_from_purse_to_account(
        escrow_purse,
        recipient.into_account().unwrap_or_revert(),
        amount,
        None,
    ).unwrap_or_revert();

    // Update escrow status to Settled (2)
    let updated_escrow_data = (recipient, amount, 2u8);
    storage::dictionary_put(escrows_uref, &escrow_id, updated_escrow_data);
}

#[no_mangle]
pub extern "C" fn cancel_escrow() {
    let relayer: Key = runtime::get_key(RELAYER_KEY_NAME).unwrap_or_revert();
    if runtime::get_caller() != relayer.into_account().unwrap_or_revert() {
        runtime::revert(ApiError::User(2)); // Unauthorized
    }
    let escrow_id: String = runtime::get_named_arg("escrow_id");

    let escrows_uref = get_escrows_uref();
    let escrow_data: (Key, U512, u8) =
        storage::dictionary_get(escrows_uref, &escrow_id)
            .unwrap_or_revert()
            .unwrap_or_revert();

    let recipient = escrow_data.0;
    let amount = escrow_data.1;
    let status = escrow_data.2;

    // If escrow was funded, refund the sender
    if status == 1 {  // 1 = Funded
        let mut purse_key = escrow_id.clone();
        purse_key.push_str("_purse");
        let escrow_purse: URef = storage::dictionary_get(escrows_uref, &purse_key)
            .unwrap_or_revert()
            .unwrap_or_revert();
        let caller_purse = runtime::get_main_purse();
        
        // Refund to caller (relayer in this case, who can handle refund to original sender)
        system::transfer_from_purse_to_purse(
            escrow_purse,
            caller_purse,
            amount,
            None,
        ).unwrap_or_revert();
    }

    // Update escrow status to Cancelled (3)
    let updated_escrow_data = (recipient, amount, 3u8);
    storage::dictionary_put(escrows_uref, &escrow_id, updated_escrow_data);
}

#[no_mangle]
pub extern "C" fn call() {
    let owner = runtime::get_named_arg::<Key>(OWNER_KEY_NAME);
    let relayer = runtime::get_named_arg::<Key>(RELAYER_KEY_NAME);

    let mut named_keys = NamedKeys::new();
    named_keys.insert(OWNER_KEY_NAME.to_string(), owner.into());
    named_keys.insert(RELAYER_KEY_NAME.to_string(), relayer.into());

    let escrows_uref = storage::new_dictionary(ESCROWS_DICT_NAME).unwrap_or_revert();
    named_keys.insert(ESCROWS_DICT_NAME.to_string(), escrows_uref.into());

    let mut entry_points = EntryPoints::new();

    entry_points.add_entry_point(EntryPoint::new(
        "create_escrow",
        vec![
            Parameter::new("escrow_id", CLType::String),
            Parameter::new("recipient", CLType::Key),
            Parameter::new("amount", CLType::U512),
        ],
        CLType::String,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "fund_escrow",
        vec![
            Parameter::new("escrow_id", CLType::String),
            Parameter::new("amount", CLType::U512),
        ],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "settle_escrow",
        vec![Parameter::new("escrow_id", CLType::String)],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    entry_points.add_entry_point(EntryPoint::new(
        "cancel_escrow",
        vec![Parameter::new("escrow_id", CLType::String)],
        CLType::Unit,
        EntryPointAccess::Public,
        EntryPointType::Contract,
    ));

    let (contract_hash, _contract_version) =
        storage::new_contract(entry_points, Some(named_keys), None, None);

    runtime::put_key("escrow_contract", contract_hash.into());
}