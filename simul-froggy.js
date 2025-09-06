/*
## Installation and Setup

Based on your original simulation file, stxer appears to be imported as:
import { SimulationBuilder } from "stxer";

To install and run:

1. First, make sure you have Node.js installed (https://nodejs.org/)

2. Install stxer:
   npm install stxer

3. Create a new project directory and initialize:
   mkdir froggy-simulation
   cd froggy-simulation
   npm init -y

4. Install dependencies:
   npm install stxer @stacks/transactions

5. Add "type": "module" to your package.json to enable ES6 imports

6. Create your simulation file (save this as simulate.js)

7. Run the simulation:
   node simulate.js

The simulation below deploys and tests the froggy-single-faktory-stxer contract which
references the real deployed contracts:
- froggy Token: SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity
- froggy Pool: SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.froggy-faktory-pool
*/

import fs from "node:fs";
import { uintCV, principalCV, ClarityVersion } from "@stacks/transactions";
import { SimulationBuilder } from "stxer";

// Define addresses (using your exact addresses)
const DEPLOYER = "SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM";
const froggy_PROVIDER = "SP3E8B51MF5E28BD82FM95VDSQ71VK4KFNZX7ZK2R";
const SBTC_USER_1 = "SP24MM95FEZJY3XWSBGZ5CT8DV04J6NVM5QA4WDXZ";
const SBTC_USER_2 = "SP3GS0VZBE15D528128G7FN3HXJQ20BXCG4CNPG64";
const SBTC_USER_3 = "SP2YS61K9JB3AR06S68JVFMFY4NFBE71EVF9T0R02"; // Additional user for depositor withdrawal test
const RANDOM_USER = "SP1K1A1PMGW2ZJCNF46NWZWHG8TS1D23EGH1KNK60"; // Someone not in the contract

SimulationBuilder.new()
  .withSender(DEPLOYER)

  // Deploy the froggy-single-faktory-stxer contract (which references the real contracts)
  .addContractDeploy({
    contract_name: "froggy-single-faktory-stxer",
    source_code: fs.readFileSync(
      "./contracts/froggy-single-faktory-stxer.clar",
      "utf8"
    ),
    clarity_version: ClarityVersion.Clarity3,
  })

  // Initialize the froggy pool using our deployed contract
  .withSender(froggy_PROVIDER)
  .addContractCall({
    contract_id: `${DEPLOYER}.froggy-single-faktory-stxer`,
    function_name: "initialize-pool",
    function_args: [uintCV(37000000000000)], // Your exact amount (froggy tokens)
  })

  // Check pool info after initialization
  .addEvalCode(`${DEPLOYER}.froggy-single-faktory-stxer`, "(get-pool-info)")

  // sBTC user 1 deposits for LP
  .withSender(SBTC_USER_1)
  .addContractCall({
    contract_id: `${DEPLOYER}.froggy-single-faktory-stxer`,
    function_name: "deposit-sbtc-for-lp",
    function_args: [uintCV(100000)], // LP amount parameter
  })

  // sBTC user 2 deposits for LP
  .withSender(SBTC_USER_2)
  .addContractCall({
    contract_id: `${DEPLOYER}.froggy-single-faktory-stxer`,
    function_name: "deposit-sbtc-for-lp",
    function_args: [uintCV(200000)], // LP amount parameter
  })

  // sBTC user 3 deposits for LP - this user will be withdrawn by depositor
  .withSender(SBTC_USER_3)
  .addContractCall({
    contract_id: `${DEPLOYER}.froggy-single-faktory-stxer`,
    function_name: "deposit-sbtc-for-lp",
    function_args: [uintCV(150000)], // LP amount parameter
  })

  // Check user LP tokens before any withdrawals
  .addEvalCode(
    `${DEPLOYER}.froggy-single-faktory-stxer`,
    `(get-user-lp-tokens '${SBTC_USER_1})`
  )
  .addEvalCode(
    `${DEPLOYER}.froggy-single-faktory-stxer`,
    `(get-user-lp-tokens '${SBTC_USER_2})`
  )
  .addEvalCode(
    `${DEPLOYER}.froggy-single-faktory-stxer`,
    `(get-user-lp-tokens '${SBTC_USER_3})`
  )

  // TEST: Random user tries to withdraw (should fail with ERR_NO_DEPOSIT)
  .withSender(RANDOM_USER)
  .addContractCall({
    contract_id: `${DEPLOYER}.froggy-single-faktory-stxer`,
    function_name: "withdraw-lp-tokens",
    function_args: [],
  })

  // TEST: User 1 withdraws normally
  .withSender(SBTC_USER_1)
  .addContractCall({
    contract_id: `${DEPLOYER}.froggy-single-faktory-stxer`,
    function_name: "withdraw-lp-tokens",
    function_args: [],
  })

  // Check user LP tokens after User 1 withdrawal
  .addEvalCode(
    `${DEPLOYER}.froggy-single-faktory-stxer`,
    `(get-user-lp-tokens '${SBTC_USER_1})`
  )

  // TEST: Random user tries to use depositor withdrawal function (should fail - not authorized)
  .withSender(RANDOM_USER)
  .addContractCall({
    contract_id: `${DEPLOYER}.froggy-single-faktory-stxer`,
    function_name: "withdraw-lp-tokens-depositor",
    function_args: [principalCV(SBTC_USER_2)],
  })

  // TEST: Depositor withdraws on behalf of User 3 (should succeed)
  .withSender(froggy_PROVIDER)
  .addContractCall({
    contract_id: `${DEPLOYER}.froggy-single-faktory-stxer`,
    function_name: "withdraw-lp-tokens-depositor",
    function_args: [principalCV(SBTC_USER_3)],
  })

  // Check User 3's LP tokens after depositor withdrawal (should be 0)
  .addEvalCode(
    `${DEPLOYER}.froggy-single-faktory-stxer`,
    `(get-user-lp-tokens '${SBTC_USER_3})`
  )

  // TEST: User 3 tries to withdraw after depositor already withdrew for them (should fail with ERR_NO_DEPOSIT)
  .withSender(SBTC_USER_3)
  .addContractCall({
    contract_id: `${DEPLOYER}.froggy-single-faktory-stxer`,
    function_name: "withdraw-lp-tokens",
    function_args: [],
  })

  // TEST: Depositor tries to withdraw for User 3 again (should fail with ERR_NO_DEPOSIT)
  .withSender(froggy_PROVIDER)
  .addContractCall({
    contract_id: `${DEPLOYER}.froggy-single-faktory-stxer`,
    function_name: "withdraw-lp-tokens-depositor",
    function_args: [principalCV(SBTC_USER_3)],
  })

  // TEST: User 2 withdraws normally (should still work)
  .withSender(SBTC_USER_2)
  .addContractCall({
    contract_id: `${DEPLOYER}.froggy-single-faktory-stxer`,
    function_name: "withdraw-lp-tokens",
    function_args: [],
  })

  // Check pool info after all withdrawals
  .addEvalCode(`${DEPLOYER}.froggy-single-faktory-stxer`, "(get-pool-info)")

  // TEST: Random user tries to withdraw remaining froggy tokens (should fail - not authorized)
  .withSender(RANDOM_USER)
  .addContractCall({
    contract_id: `${DEPLOYER}.froggy-single-faktory-stxer`,
    function_name: "withdraw-remaining-token",
    function_args: [],
  })

  // TEST: froggy provider withdraws remaining froggy tokens (should work)
  .withSender(froggy_PROVIDER)
  .addContractCall({
    contract_id: `${DEPLOYER}.froggy-single-faktory-stxer`,
    function_name: "withdraw-remaining-token",
    function_args: [],
  })

  // Test additional error cases:

  // TEST: Try froggy provider depositing sBTC (should fail - unauthorized)
  .withSender(froggy_PROVIDER)
  .addContractCall({
    contract_id: `${DEPLOYER}.froggy-single-faktory-stxer`,
    function_name: "deposit-sbtc-for-lp",
    function_args: [uintCV(5000)], // Should fail with ERR_UNAUTHORIZED
  })

  // TEST: Try double initialization (should fail)
  .withSender(froggy_PROVIDER)
  .addContractCall({
    contract_id: `${DEPLOYER}.froggy-single-faktory-stxer`,
    function_name: "initialize-pool",
    function_args: [uintCV(500000000000000)], // Should fail with ERR_ALREADY_INITIALIZED
  })

  // Check final pool info
  .addEvalCode(`${DEPLOYER}.froggy-single-faktory-stxer`, "(get-pool-info)")

  .run()
  .catch(console.error);

// all green: Using block height 3338128 hash 0x1997ebdfa6eba7e25c84342d6eb312c33f4a51391dc856501a797e0817c7f8c2 to run simulation.
// Simulation will be available at: https://stxer.xyz/simulations/mainnet/09a1e852e36d7cb3e63cc434bd7b133d
// node simul-froggy.js
