#![no_std]
#![no_main]

extern crate alloc;
use alloc::string::ToString;

use casper_contract::{
    contract_api::{runtime, storage},
};

use casper_types::{
    contracts::{EntryPoints, NamedKeys},
    Key,
};

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[no_mangle]
pub extern "C" fn call() {
    let owner = runtime::get_named_arg::<Key>("owner");
    let relayer = runtime::get_named_arg::<Key>("relayer");

    let mut named_keys = NamedKeys::new();
    named_keys.insert("owner".to_string(), owner.into());
    named_keys.insert("relayer".to_string(), relayer.into());

    let entry_points = EntryPoints::new();

    let (contract_hash, _contract_version) =
        storage::new_contract(entry_points, Some(named_keys), None, None);

    runtime::put_key("escrow_contract", contract_hash.into());
}
