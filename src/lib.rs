use borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::LookupMap;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault};

type Balance = u128;

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct TokenMetadata {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: Balance,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct EduCoin {
    /// Account balances
    pub balances: LookupMap<AccountId, Balance>,
    /// Total supply of tokens
    pub total_supply: Balance,
    /// Token metadata
    pub metadata: TokenMetadata,
    /// Owner of the contract
    pub owner: AccountId,
}

#[near_bindgen]
impl EduCoin {
    #[init]
    pub fn new(owner_id: AccountId, total_supply: Balance) -> Self {
        let mut balances = LookupMap::new(b"b".to_vec());
        balances.insert(&owner_id, &total_supply);
        
        Self {
            balances,
            total_supply,
            metadata: TokenMetadata {
                name: "EduCoin".to_string(),
                symbol: "EDU".to_string(),
                decimals: 18,
                total_supply,
            },
            owner: owner_id,
        }
    }

    /// Get balance of an account
    pub fn get_balance(&self, account_id: AccountId) -> Balance {
        self.balances.get(&account_id).unwrap_or(0)
    }

    /// Transfer tokens from one account to another
    pub fn transfer(&mut self, receiver_id: AccountId, amount: Balance) {
        let sender_id = env::predecessor_account_id();
        let sender_balance = self.get_balance(sender_id.clone());
        
        assert!(sender_balance >= amount, "Insufficient balance");
        
        // Update balances
        self.balances.insert(&sender_id, &(sender_balance - amount));
        let receiver_balance = self.get_balance(receiver_id.clone());
        self.balances.insert(&receiver_id, &(receiver_balance + amount));
        
        env::log_str(&format!("Transferred {} EDU from {} to {}", amount, sender_id, receiver_id));
    }

    /// Mint new tokens (only owner)
    pub fn mint(&mut self, account_id: AccountId, amount: Balance) {
        assert_eq!(env::predecessor_account_id(), self.owner, "Only owner can mint");
        
        let current_balance = self.get_balance(account_id.clone());
        self.balances.insert(&account_id, &(current_balance + amount));
        self.total_supply += amount;
        
        env::log_str(&format!("Minted {} EDU to {}", amount, account_id));
    }

    /// Get token metadata
    pub fn get_metadata(&self) -> TokenMetadata {
        self.metadata.clone()
    }

    /// Get total supply
    pub fn get_total_supply(&self) -> Balance {
        self.total_supply
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::{accounts, VMContextBuilder};
    use near_sdk::{testing_env, VMContext};

    fn get_context(predecessor_account_id: AccountId) -> VMContext {
        VMContextBuilder::new()
            .predecessor_account_id(predecessor_account_id)
            .build()
    }

    #[test]
    fn test_new() {
        let context = get_context(accounts(0));
        testing_env!(context);
        let contract = EduCoin::new(accounts(0), 1000);
        assert_eq!(contract.get_balance(accounts(0)), 1000);
    }

    #[test]
    fn test_transfer() {
        let context = get_context(accounts(0));
        testing_env!(context);
        let mut contract = EduCoin::new(accounts(0), 1000);
        contract.transfer(accounts(1), 100);
        assert_eq!(contract.get_balance(accounts(0)), 900);
        assert_eq!(contract.get_balance(accounts(1)), 100);
    }
}
