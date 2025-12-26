#![no_std]

extern crate alloc;
use alloc::string::String;

pub mod contract_api {
    pub mod runtime {
        pub use casper_types::*;
        use casper_types::{account::AccountHash, bytesrepr::FromBytes, CLTyped, Key};
        
        pub fn get_caller() -> AccountHash {
            unimplemented!()
        }
        
        pub fn get_named_arg<T: CLTyped + FromBytes>(name: &str) -> T {
            unimplemented!()
        }
        
        pub fn get_key(name: &str) -> Option<Key> {
            unimplemented!()
        }
        
        pub fn get_main_purse() -> casper_types::URef {
            unimplemented!()
        }
        
        pub fn put_key(name: &str, key: Key) {
            unimplemented!()
        }
        
        pub fn ret<T: CLTyped + casper_types::bytesrepr::ToBytes>(value: T) -> ! {
            unimplemented!()
        }
        
        pub fn revert<E: Into<casper_types::ApiError>>(error: E) -> ! {
            unimplemented!()
        }
    }
    
    pub mod storage {
        pub use casper_types::*;
        use casper_types::{
            contracts::{ContractHash, ContractVersion, EntryPoints, NamedKeys},
            bytesrepr::{FromBytes, ToBytes},
            CLTyped, URef, ApiError
        };
        use alloc::string::String;
        
        pub fn new_contract(
            entry_points: EntryPoints,
            named_keys: Option<NamedKeys>,
            hash_name: Option<String>,
            uref_name: Option<String>,
        ) -> (ContractHash, ContractVersion) {
            unimplemented!()
        }
        
        pub fn new_dictionary(name: &str) -> Result<URef, ApiError> {
            unimplemented!()
        }
        
        pub fn dictionary_put<T: CLTyped + ToBytes>(
            uref: URef,
            key: &str,
            value: T,
        ) {
            unimplemented!()
        }
        
        pub fn dictionary_get<T: CLTyped + FromBytes>(
            uref: URef,
            key: &str,
        ) -> Result<Option<T>, ApiError> {
            unimplemented!()
        }
    }
    
    pub mod system {
        pub use casper_types::*;
        use casper_types::{account::AccountHash, URef, U512, ApiError};
        
        pub fn create_purse() -> URef {
            unimplemented!()
        }
        
        pub fn transfer_from_purse_to_purse(
            source: URef,
            target: URef,
            amount: U512,
            id: Option<u64>,
        ) -> Result<(), ApiError> {
            unimplemented!()
        }
        
        pub fn transfer_from_purse_to_account(
            source: URef,
            target: AccountHash,
            amount: U512,
            id: Option<u64>,
        ) -> Result<(), ApiError> {
            unimplemented!()
        }
    }
}

pub mod unwrap_or_revert {
    pub trait UnwrapOrRevert<T> {
        fn unwrap_or_revert(self) -> T;
    }
    
    impl<T, E> UnwrapOrRevert<T> for Result<T, E> {
        fn unwrap_or_revert(self) -> T {
            match self {
                Ok(value) => value,
                Err(_) => panic!("unwrap_or_revert failed"),
            }
        }
    }
    
    impl<T> UnwrapOrRevert<T> for Option<T> {
        fn unwrap_or_revert(self) -> T {
            match self {
                Some(value) => value,
                None => panic!("unwrap_or_revert failed"),
            }
        }
    }
}

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}
