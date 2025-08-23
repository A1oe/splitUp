#!/usr/bin/env python3
"""
Edge case tests for the splitUp algorithm
"""

from splitUp import simplifyDebts2, PersonNode, splitUpGroups

def test_empty_group():
    """Test Case 1: Empty group"""
    print("Test Case 1: Empty Group")
    result = simplifyDebts2([])
    print(f"Empty group result: {len(result)} people")
    assert len(result) == 0, "Empty group should return empty list"
    print("✓ PASS")

def test_single_person():
    """Test Case 2: Single person with no transactions"""
    print("Test Case 2: Single Person (No Transactions)")
    person = PersonNode("Alice")
    result = simplifyDebts2([person])
    print(f"Single person result: {len(result)} people")
    assert len(result) == 0, "Single person with no transactions should return empty list"
    print("✓ PASS")

def test_two_people_balanced():
    """Test Case 3: Two people, balanced"""
    print("Test Case 3: Two People (Balanced)")
    alice = PersonNode("Alice")
    bob = PersonNode("Bob")
    alice.addDebt(bob, 10.0)  # Bob owes Alice $10
    bob.addDebt(alice, 10.0)  # Alice owes Bob $10
    
    result = simplifyDebts2([alice, bob])
    print(f"Balanced two people result: {len(result)} people")
    transactions = sum(1 for p in result for amount in p.getOwersAndCreditors().values() if amount < 0)
    print(f"Transactions needed: {transactions}")
    assert transactions == 0, "Balanced people should need no transactions"
    print("✓ PASS")

def test_two_people_unbalanced():
    """Test Case 4: Two people, unbalanced"""
    print("Test Case 4: Two People (Unbalanced)")
    alice = PersonNode("Alice")
    bob = PersonNode("Bob")
    alice.addDebt(bob, 25.0)  # Bob owes Alice $25
    
    result = simplifyDebts2([alice, bob])
    transactions = 0
    for person in result:
        for creditor, amount in person.getOwersAndCreditors().items():
            if amount < 0:
                print(f"  {person.getName()} pays ${abs(amount)} to {creditor.getName()}")
                transactions += 1
    
    assert transactions == 1, "Unbalanced two people should need exactly 1 transaction"
    print("✓ PASS")

def test_large_decimals():
    """Test Case 5: Large amounts with decimals"""
    print("Test Case 5: Large Amounts with Decimals")
    alice = PersonNode("Alice")
    bob = PersonNode("Bob")
    charlie = PersonNode("Charlie")
    
    alice.addDebt(bob, 1234.56)
    bob.addDebt(charlie, 789.12)
    charlie.addDebt(alice, 445.44)
    
    original_balances = {
        "Alice": alice.getTotalMoney(),
        "Bob": bob.getTotalMoney(), 
        "Charlie": charlie.getTotalMoney()
    }
    
    result = simplifyDebts2([alice, bob, charlie])
    
    # Verify balances preserved
    for person in result:
        name = person.getName()
        if abs(person.getTotalMoney() - original_balances[name]) > 0.001:
            print(f"ERROR: Balance not preserved for {name}")
            assert False, "Balances must be preserved"
    
    print("Large decimal amounts handled correctly ✓ PASS")

def test_group_isolation():
    """Test Case 6: Multiple disconnected groups"""
    print("Test Case 6: Verify Group Isolation")
    # This tests that the grouping algorithm works correctly
    
    # Group 1: Alice <-> Bob
    alice1 = PersonNode("Alice")
    bob1 = PersonNode("Bob")
    alice1.addDebt(bob1, 10.0)
    
    # Group 2: Charlie <-> David  
    charlie2 = PersonNode("Charlie")
    david2 = PersonNode("David")
    charlie2.addDebt(david2, 20.0)
    
    all_people = [alice1, bob1, charlie2, david2]
    groups = splitUpGroups(all_people)
    
    print(f"Found {len(groups)} disconnected groups")
    assert len(groups) == 2, "Should find exactly 2 disconnected groups"
    
    for i, group in enumerate(groups):
        group_names = sorted([p.getName() for p in group])
        print(f"  Group {i+1}: {group_names}")
    
    print("✓ PASS")

def run_all_tests():
    """Run all edge case tests"""
    print("=== Edge Case Testing ===\n")
    
    test_empty_group()
    print()
    test_single_person()
    print()
    test_two_people_balanced()
    print()
    test_two_people_unbalanced()
    print()
    test_large_decimals()
    print()
    test_group_isolation()
    
    print("\n=== All Edge Cases Passed! ===")

if __name__ == "__main__":
    run_all_tests()