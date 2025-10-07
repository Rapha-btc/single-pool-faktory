/*
## Installation and Setup

Based on your original simulation file, stxer appears to be imported as:
import { SimulationBuilder } from "stxer";

To install and run:

1. First, make sure you have Node.js installed (https://nodejs.org/)

2. Install stxer:
   npm install stxer

3. Create a new project directory and initialize:
   mkdir bob-simulation
   cd bob-simulation
   npm init -y

4. Install dependencies:
   npm install stxer @stacks/transactions

5. Add "type": "module" to your package.json to enable ES6 imports

6. Create your simulation file (save this as simulate.js)

7. Run the simulation:
   node simulate.js

The simulation below deploys and tests the skullcoin-single-faktory-stxer contract which
references the real deployed contracts:
- BOB Token: SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity
- BOB Pool: SPV9K21TBFAK4KNRJXF5DFP8N7W46G4V9RCJDC22.bob-faktory-pool
*/

import fs from "node:fs";
import { uintCV, principalCV, ClarityVersion } from "@stacks/transactions";
import { SimulationBuilder } from "stxer";

// Define addresses (using your exact addresses)
const DEPLOYER = "SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM";
const BOB_PROVIDER = "SP3YJJ4G1JW7JFNF3FT8QG61A8C5S2C88ACW0KWQQ"; // "SP38GBVK5HEJ0MBH4CRJ9HQEW86HX0H9AP1HZ3SVZ";
const SBTC_USER_1 = "SP2QGMXH21KFDX99PWNB7Z7WNQ92TWFAECEEK10GE";
const SBTC_USER_2 = "SP200B8M2FJ77FW2SAR5CKFPM75SDQRRD5QVZA7BQ"; // "SP3GS0VZBE15D528128G7FN3HXJQ20BXCG4CNPG64";
const SBTC_USER_3 = "SP2YS61K9JB3AR06S68JVFMFY4NFBE71EVF9T0R02"; // Additional user for depositor withdrawal test
const RANDOM_USER = "SP1K1A1PMGW2ZJCNF46NWZWHG8TS1D23EGH1KNK60"; // Someone not in the contract

SimulationBuilder.new()
  .withSender(DEPLOYER)

  // Deploy the skullcoin-single-faktory-stxer contract (which references the real contracts)
  .addContractDeploy({
    contract_name: "skullcoin-single-faktory-stxer",
    source_code: fs.readFileSync(
      "./contracts/skullcoin-single-faktory-stxer.clar",
      "utf8"
    ),
    clarity_version: ClarityVersion.Clarity3,
  })

  // Initialize the BOB pool using our deployed contract
  .withSender(BOB_PROVIDER)
  .addContractCall({
    contract_id: `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    function_name: "initialize-pool",
    function_args: [uintCV(300000000000000)], // Your exact amount (BOB tokens)
  })

  // Check pool info after initialization
  .addEvalCode(`${DEPLOYER}.skullcoin-single-faktory-stxer`, "(get-pool-info)")

  // sBTC user 1 deposits for LP
  .withSender(SBTC_USER_1)
  .addContractCall({
    contract_id: `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    function_name: "deposit-sbtc-for-lp",
    function_args: [uintCV(100000)], // LP amount parameter
  })

  // sBTC user 2 deposits for LP
  .withSender(SBTC_USER_2)
  .addContractCall({
    contract_id: `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    function_name: "deposit-sbtc-for-lp",
    function_args: [uintCV(200000)], // LP amount parameter
  })

  // sBTC user 3 deposits for LP - this user will be withdrawn by depositor
  .withSender(SBTC_USER_3)
  .addContractCall({
    contract_id: `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    function_name: "deposit-sbtc-for-lp",
    function_args: [uintCV(150000)], // LP amount parameter
  })

  // Check user LP tokens before any withdrawals
  .addEvalCode(
    `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    `(get-user-lp-tokens '${SBTC_USER_1})`
  )
  .addEvalCode(
    `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    `(get-user-lp-tokens '${SBTC_USER_2})`
  )
  .addEvalCode(
    `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    `(get-user-lp-tokens '${SBTC_USER_3})`
  )

  // TEST: Random user tries to withdraw (should fail with ERR_NO_DEPOSIT)
  .withSender(RANDOM_USER)
  .addContractCall({
    contract_id: `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    function_name: "withdraw-lp-tokens",
    function_args: [],
  })

  // TEST: User 1 withdraws normally
  .withSender(SBTC_USER_1)
  .addContractCall({
    contract_id: `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    function_name: "withdraw-lp-tokens",
    function_args: [],
  })

  // Check user LP tokens after User 1 withdrawal
  .addEvalCode(
    `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    `(get-user-lp-tokens '${SBTC_USER_1})`
  )

  // TEST: Random user tries to use depositor withdrawal function (should fail - not authorized)
  .withSender(RANDOM_USER)
  .addContractCall({
    contract_id: `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    function_name: "withdraw-lp-tokens-depositor",
    function_args: [principalCV(SBTC_USER_2)],
  })

  // TEST: Depositor withdraws on behalf of User 3 (should succeed)
  .withSender(BOB_PROVIDER)
  .addContractCall({
    contract_id: `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    function_name: "withdraw-lp-tokens-depositor",
    function_args: [principalCV(SBTC_USER_3)],
  })

  // Check User 3's LP tokens after depositor withdrawal (should be 0)
  .addEvalCode(
    `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    `(get-user-lp-tokens '${SBTC_USER_3})`
  )

  // TEST: User 3 tries to withdraw after depositor already withdrew for them (should fail with ERR_NO_DEPOSIT)
  .withSender(SBTC_USER_3)
  .addContractCall({
    contract_id: `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    function_name: "withdraw-lp-tokens",
    function_args: [],
  })

  // TEST: Depositor tries to withdraw for User 3 again (should fail with ERR_NO_DEPOSIT)
  .withSender(BOB_PROVIDER)
  .addContractCall({
    contract_id: `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    function_name: "withdraw-lp-tokens-depositor",
    function_args: [principalCV(SBTC_USER_3)],
  })

  // TEST: User 2 withdraws normally (should still work)
  .withSender(SBTC_USER_2)
  .addContractCall({
    contract_id: `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    function_name: "withdraw-lp-tokens",
    function_args: [],
  })

  // Check pool info after all withdrawals
  .addEvalCode(`${DEPLOYER}.skullcoin-single-faktory-stxer`, "(get-pool-info)")

  // TEST: Random user tries to withdraw remaining BOB tokens (should fail - not authorized)
  .withSender(RANDOM_USER)
  .addContractCall({
    contract_id: `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    function_name: "withdraw-remaining-token",
    function_args: [],
  })

  // TEST: BOB provider withdraws remaining BOB tokens (should work)
  .withSender(BOB_PROVIDER)
  .addContractCall({
    contract_id: `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    function_name: "withdraw-remaining-token",
    function_args: [],
  })

  // Test additional error cases:

  // TEST: Try BOB provider depositing sBTC (should fail - unauthorized)
  .withSender(BOB_PROVIDER)
  .addContractCall({
    contract_id: `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    function_name: "deposit-sbtc-for-lp",
    function_args: [uintCV(5000)], // Should fail with ERR_UNAUTHORIZED
  })

  // TEST: Try double initialization (should fail)
  .withSender(BOB_PROVIDER)
  .addContractCall({
    contract_id: `${DEPLOYER}.skullcoin-single-faktory-stxer`,
    function_name: "initialize-pool",
    function_args: [uintCV(500000000000000)], // Should fail with ERR_ALREADY_INITIALIZED
  })

  // Check final pool info
  .addEvalCode(`${DEPLOYER}.skullcoin-single-faktory-stxer`, "(get-pool-info)")

  .run()
  .catch(console.error);

// This product can never exist without your support!

// We receive sponsorship funds with:
// SP212Y5JKN59YP3GYG07K3S8W5SSGE4KH6B5STXER

// Feedbacks and feature requests are welcome.
// To get in touch: contact@stxer.xyz
// // --------------------------------
// Using block height 4016362 hash 0x265bf113050d9e6c36f6520ca31a3e941dd7898e7720bdfab2373232f3da62ff to run simulation.
// Simulation will be available at: https://stxer.xyz/simulations/mainnet/9a7f24c9946d04cf33f4270a6c26202b

// Using block height 4016457 hash 0x0f7b1030ec92e9b224da2ce6660dfa742a75cba313920d2c024e1545df4a4c4c to run simulation.
// Simulation will be available at: https://stxer.xyz/simulations/mainnet/03e1922ca1e3443d61eb4c4a091ab6f8
