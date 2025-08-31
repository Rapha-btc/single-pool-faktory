# Bob Single Faktory Test Suite

## Overview

This repository contains comprehensive test coverage for the Bob Single Faktory smart contract, a single-sided liquidity pool mechanism that allows users to deposit sBTC while the pool provider deposits BOB tokens to create balanced liquidity positions.

## Contract Architecture

The Bob Single Faktory contract implements a time-locked, single-sided liquidity pool with the following key features:

- **Single-sided deposits**: Users deposit sBTC, pool provider deposits BOB tokens
- **Time-based access control**: Entry period (3,024 blocks) and lock period (12,960 blocks)
- **Revenue sharing**: 60/40 split (60% to users, 40% to pool provider)
- **Depositor restrictions**: Pool provider cannot deposit to their own pool
- **Administrative controls**: Pool provider can perform withdrawals on behalf of users

## Test Coverage

### Core Functionality Tests (44 test cases)

#### 1. Initial State & Read-Only Functions (2 tests)

- **Empty pool validation**: Verifies contract returns proper initial state before pool initialization
- **Zero LP token balances**: Confirms all users start with zero LP token balances

#### 2. Input Validation & Error Handling (4 tests)

- **Zero amount rejection**: Tests rejection of zero amounts in calculations and initialization
- **Valid amount acceptance**: Ensures non-zero amounts pass input validation
- **Parameter validation**: Validates function parameter handling across all contract methods

#### 3. Pool Initialization (3 tests)

- **Successful initialization**: Tests pool creation with valid token amounts
- **State updates**: Verifies pool info is correctly updated after initialization
- **Double initialization prevention**: Ensures pools cannot be initialized twice (ERR_ALREADY_INITIALIZED)

#### 4. Deposit Functionality (5 tests)

- **Community user deposits**: Validates sBTC deposits from non-depositor users
- **Depositor exclusion**: Prevents pool provider from depositing to their own pool (ERR_UNAUTHORIZED)
- **Uninitialized pool rejection**: Blocks deposits on uninitialized pools (ERR_NOT_INITIALIZED)
- **LP token tracking**: Verifies user LP token balances are properly tracked
- **Pool state updates**: Confirms total LP tokens and token usage are updated correctly

#### 5. Time-Based Access Control (4 tests)

- **Entry period enforcement**: Blocks deposits after 3,024 blocks (ERR_TOO_LATE)
- **Lock period enforcement**: Prevents withdrawals before 12,960 blocks (ERR_STILL_LOCKED)
- **Unlock period access**: Allows withdrawals after lock period expires
- **Depositor token recovery**: Permits pool provider to withdraw unused tokens after entry period

#### 6. Withdrawal Functionality (5 tests)

- **User LP withdrawals**: Tests successful user LP token withdrawals with 60/40 split
- **Balance clearing**: Verifies user LP balances are zeroed after withdrawal
- **Non-existent token handling**: Prevents withdrawal of non-existent LP tokens (ERR_NO_DEPOSIT)
- **Depositor-assisted withdrawals**: Allows pool provider to withdraw on behalf of users
- **Unauthorized admin prevention**: Blocks non-depositors from performing admin withdrawals (ERR_UNAUTHORIZED)

#### 7. Multi-User Scenarios (2 tests)

- **Concurrent deposits**: Tests multiple users depositing simultaneously
- **User isolation**: Ensures one user's withdrawal doesn't affect another's balance

#### 8. Mathematical Operations & Constants (3 tests)

- **Percentage calculations**: Validates 60/40 revenue split calculations
- **Edge case handling**: Tests rounding with minimum amounts (1 unit)
- **Large amount precision**: Verifies calculations work correctly with large token amounts

#### 9. Edge Case Scenarios (3 tests)

- **Time boundary precision**: Tests deposits/withdrawals exactly at block boundaries
- **Entry period boundary**: Confirms deposits fail at exactly block 3,024
- **Unlock boundary**: Validates withdrawals succeed at exactly block 12,960

#### 10. State Consistency (2 tests)

- **Token accounting**: Verifies initial_tokens = token_used + token_available
- **LP token accounting**: Ensures total_lp_tokens equals sum of all user balances

#### 11. Principal & Access Control Validation (2 tests)

- **Principal distinction**: Confirms different users are recognized as separate principals
- **Transaction sender context**: Validates tx-sender context is handled correctly

#### 12. Uninitialized Pool Error Handling (4 tests)

- **Deposit blocking**: Prevents all deposit operations on uninitialized pools
- **Withdrawal blocking**: Blocks all withdrawal operations on uninitialized pools
- **Error code consistency**: Ensures proper ERR_NOT_INITIALIZED responses

#### 13. Error Code Consistency (1 test)

- **Standardized errors**: Validates all functions use consistent error codes across the contract

#### 14. Time Window Validation (2 tests)

- **Period relationships**: Confirms entry period < lock period mathematical relationships
- **Block progression**: Validates simnet block height progression works correctly

#### 15. Contract Configuration & Constants (2 tests)

- **Configuration accuracy**: Tests contract returns correct token and pool references
- **Time constant validation**: Verifies lock and entry period constants are properly set

## Access Control Matrix

| Operation                 | Depositor (Pool Provider)       | Community Users                      | Uninitialized Pool     |
| ------------------------- | ------------------------------- | ------------------------------------ | ---------------------- |
| Initialize Pool           | ✅ Allowed                      | ✅ Allowed (first-come-first-served) | N/A                    |
| Deposit sBTC              | ❌ ERR_UNAUTHORIZED             | ✅ Allowed (during entry period)     | ❌ ERR_NOT_INITIALIZED |
| Withdraw Own LP           | ✅ Allowed (after unlock)       | ✅ Allowed (after unlock)            | ❌ ERR_NOT_INITIALIZED |
| Admin Withdraw            | ✅ Allowed (after unlock)       | ❌ ERR_UNAUTHORIZED                  | ❌ ERR_NOT_INITIALIZED |
| Withdraw Remaining Tokens | ✅ Allowed (after entry period) | ❌ ERR_UNAUTHORIZED                  | ❌ ERR_NOT_INITIALIZED |

## Time-Based State Machine

```
Block 0: Pool Creation
  ↓
Block 0-3024: Entry Period (deposits allowed)
  ↓
Block 3024: Entry Period Ends (deposits blocked, remaining tokens withdrawable)
  ↓
Block 3024-12960: Lock Period (all LP tokens locked)
  ↓
Block 12960+: Unlock Period (LP token withdrawals allowed)
```

## Revenue Sharing Model

The contract implements a 60/40 revenue split on all LP token proceeds:

- **60%** goes to the community user who deposited sBTC
- **40%** goes to the pool provider who deposited BOB tokens
- Split applies to both sBTC and BOB token withdrawals from the underlying liquidity pool

## Error Codes

| Code | Constant                | Description                         |
| ---- | ----------------------- | ----------------------------------- |
| 403  | ERR_UNAUTHORIZED        | User lacks permission for operation |
| 404  | ERR_NOT_INITIALIZED     | Pool not initialized                |
| 405  | ERR_ALREADY_INITIALIZED | Pool already initialized            |
| 406  | ERR_INSUFFICIENT_AMOUNT | Amount too small                    |
| 407  | ERR_STILL_LOCKED        | Lock period not expired             |
| 408  | ERR_NO_DEPOSIT          | User has no LP tokens               |
| 409  | ERR_TOO_LATE            | Entry period expired                |

## Pre-Mainnet Testing

### Current Status: Simnet Testing Complete ✅

All 44 test cases pass successfully in the Clarinet simnet environment, covering:

- Complete contract lifecycle from initialization through withdrawals
- All access control scenarios and error conditions
- Time-based logic validation with block mining simulation
- Multi-user interaction patterns
- Mathematical precision of revenue splits
- State consistency and accounting validation

### Next Phase: STXer Simulations

Before mainnet deployment, extensive STXer simulations will be performed to validate:

- **Real network conditions**: Testing with actual Stacks blockchain timing and gas costs
- **Integration testing**: Validation with live sBTC and BOB token contracts
- **Performance under load**: Multi-user scenarios with realistic transaction volumes
- **Economic model validation**: Revenue split calculations with actual market conditions

### Mainnet Readiness Criteria

The contract will be considered mainnet-ready after:

- [ ] STXer simulation test suite passes (100% success rate)
- [ ] Economic model validation with real market data
- [ ] Gas optimization verification
- [ ] Final code review and documentation update

**Note:** Faktory dev will provide the final approval for mainnet deployment once STXer tests are successfully completed.

## Running Tests

```bash
# Run all tests
npm run test

# Run specific test suites
npm run test -- --filter "Deposit Functionality"
npm run test -- --filter "Time-Based Access Control"
npm run test -- --filter "Multi-User Scenarios"
```

## Contract Dependencies

- **sBTC Token**: Synthetic Bitcoin token for user deposits
- **BOB Token (built-on-bitcoin-stxcity)**: Pool provider deposits
- **Bob Faktory Pool**: Underlying AMM liquidity pool contract
- **Stacks Blockchain**: Time-lock mechanisms using burn-block-height

## Security Considerations

The test suite validates several critical security aspects:

- **Reentrancy protection**: All external calls are properly structured
- **Integer overflow prevention**: Mathematical operations are bounds-checked
- **Access control enforcement**: Principal-based permissions are strictly enforced
- **Time manipulation resistance**: Uses burn-block-height for immutable time references
- **State consistency**: All accounting invariants are maintained across operations

This comprehensive test coverage ensures the Bob Single Faktory contract operates securely and predictably across all supported scenarios.
