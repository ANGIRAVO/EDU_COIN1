import Debug "mo:base/Debug";
import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Nat "mo:base/Nat";
import Iter "mo:base/Iter";

actor {
  // Simple HashMap to store balances
  private stable var balanceEntries : [(Principal, Nat)] = [];
  private var balances = HashMap.fromIter<Principal, Nat>(balanceEntries.vals(), 16, Principal.equal, Principal.hash);

  // Initialize with some demo balance
  system func preupgrade() {
    balanceEntries := balances.entries() |> Iter.toArray(_);
  };

  system func postupgrade() {
    balanceEntries := [];
  };

  // Get balance of a principal
  public query func getBalance(user: Principal) : async Nat {
    switch (balances.get(user)) {
      case (?balance) { balance };
      case null { 1000 }; // Default balance for demo
    }
  };

  // Transfer tokens between principals
  public func transfer(to: Principal, amount: Nat) : async Result.Result<(), Text> {
    let caller = msg.caller;
    let fromBalance = switch (balances.get(caller)) {
      case (?balance) { balance };
      case null { 1000 }; // Default balance
    };
    
    if (fromBalance < amount) {
      return #err("Insufficient balance");
    };
    
    let toBalance = switch (balances.get(to)) {
      case (?balance) { balance };
      case null { 0 };
    };
    
    balances.put(caller, fromBalance - amount);
    balances.put(to, toBalance + amount);
    
    #ok(())
  };

  // Mint new tokens (for demo purposes)
  public func mint(amount: Nat) : async Result.Result<(), Text> {
    let caller = msg.caller;
    let currentBalance = switch (balances.get(caller)) {
      case (?balance) { balance };
      case null { 1000 };
    };
    
    balances.put(caller, currentBalance + amount);
    #ok(())
  };

  // Get current timestamp
  public query func getTime() : async Int {
    Time.now()
  };
};
