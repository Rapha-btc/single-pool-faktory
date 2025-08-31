import fs from "node:fs";
import { uintCV, principalCV, ClarityVersion } from "@stacks/transactions";
import { SimulationBuilder } from "stxer";

// Define addresses (using your exact addresses)
const DEPLOYER = "SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM";
const BOB_PROVIDER = "SP38GBVK5HEJ0MBH4CRJ9HQEW86HX0H9AP1HZ3SVZ";
const SBTC_USER_1 = "SPHNEPXY2N25RTB6BMJGJXAH0XSHV55GZB2FC69D";
const SBTC_USER_2 = "SP3GS0VZBE15D528128G7FN3HXJQ20BXCG4CNPG64";
const SBTC_USER_3 = "SP3EMA3PNFKKF7C9DTPR6N5K21B8QFDGJP9B5FCGF"; // Additional user for depositor withdrawal test
const RANDOM_USER = "SP1K1A1PMGW2ZJCNF46NWZWHG8TS1D23EGH1KNK60"; // Someone not in the contract

SimulationBuilder.new()
  .withSender(DEPLOYER)

  // Use the real BOB contract instead of deploying
  // Real contract: SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity

  // Initialize the BOB pool using the real contract
  .withSender(BOB_PROVIDER)
  .addContractCall({
    contract_id:
      "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    function_name: "initialize-pool",
    function_args: [uintCV(1000000000000000)], // Your exact amount (BOB tokens)
  })

  // Check pool info after initialization
  .addEvalCode(
    "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    "(get-pool-info)"
  )

  // sBTC user 1 deposits for LP
  .withSender(SBTC_USER_1)
  .addContractCall({
    contract_id:
      "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    function_name: "deposit-sbtc-for-lp",
    function_args: [uintCV(100000000)], // LP amount parameter
  })

  // sBTC user 2 deposits for LP
  .withSender(SBTC_USER_2)
  .addContractCall({
    contract_id:
      "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    function_name: "deposit-sbtc-for-lp",
    function_args: [uintCV(200000000)], // LP amount parameter
  })

  // sBTC user 3 deposits for LP - this user will be withdrawn by depositor
  .withSender(SBTC_USER_3)
  .addContractCall({
    contract_id:
      "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    function_name: "deposit-sbtc-for-lp",
    function_args: [uintCV(150000000)], // LP amount parameter
  })

  // Check user LP tokens before any withdrawals
  .addEvalCode(
    "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    `(get-user-lp-tokens '${SBTC_USER_1})`
  )
  .addEvalCode(
    "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    `(get-user-lp-tokens '${SBTC_USER_2})`
  )
  .addEvalCode(
    "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    `(get-user-lp-tokens '${SBTC_USER_3})`
  )

  // TEST: Random user tries to withdraw (should fail with ERR_NO_DEPOSIT)
  .withSender(RANDOM_USER)
  .addContractCall({
    contract_id:
      "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    function_name: "withdraw-lp-tokens",
    function_args: [],
  })

  // TEST: User 1 withdraws normally
  .withSender(SBTC_USER_1)
  .addContractCall({
    contract_id:
      "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    function_name: "withdraw-lp-tokens",
    function_args: [],
  })

  // Check user LP tokens after User 1 withdrawal
  .addEvalCode(
    "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    `(get-user-lp-tokens '${SBTC_USER_1})`
  )

  // TEST: Random user tries to use depositor withdrawal function (should fail - not authorized)
  .withSender(RANDOM_USER)
  .addContractCall({
    contract_id:
      "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    function_name: "withdraw-lp-tokens-depositor",
    function_args: [principalCV(SBTC_USER_2)],
  })

  // TEST: Depositor withdraws on behalf of User 3 (should succeed)
  .withSender(BOB_PROVIDER)
  .addContractCall({
    contract_id:
      "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    function_name: "withdraw-lp-tokens-depositor",
    function_args: [principalCV(SBTC_USER_3)],
  })

  // Check User 3's LP tokens after depositor withdrawal (should be 0)
  .addEvalCode(
    "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    `(get-user-lp-tokens '${SBTC_USER_3})`
  )

  // TEST: User 3 tries to withdraw after depositor already withdrew for them (should fail with ERR_NO_DEPOSIT)
  .withSender(SBTC_USER_3)
  .addContractCall({
    contract_id:
      "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    function_name: "withdraw-lp-tokens",
    function_args: [],
  })

  // TEST: Depositor tries to withdraw for User 3 again (should fail with ERR_NO_DEPOSIT)
  .withSender(BOB_PROVIDER)
  .addContractCall({
    contract_id:
      "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    function_name: "withdraw-lp-tokens-depositor",
    function_args: [principalCV(SBTC_USER_3)],
  })

  // TEST: User 2 withdraws normally (should still work)
  .withSender(SBTC_USER_2)
  .addContractCall({
    contract_id:
      "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    function_name: "withdraw-lp-tokens",
    function_args: [],
  })

  // Check pool info after all withdrawals
  .addEvalCode(
    "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    "(get-pool-info)"
  )

  // TEST: Random user tries to withdraw remaining BOB tokens (should fail - not authorized)
  .withSender(RANDOM_USER)
  .addContractCall({
    contract_id:
      "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    function_name: "withdraw-remaining-token",
    function_args: [],
  })

  // TEST: BOB provider withdraws remaining BOB tokens (should work)
  .withSender(BOB_PROVIDER)
  .addContractCall({
    contract_id:
      "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    function_name: "withdraw-remaining-token",
    function_args: [],
  })

  // Test additional error cases:

  // TEST: Try BOB provider depositing sBTC (should fail - unauthorized)
  .withSender(BOB_PROVIDER)
  .addContractCall({
    contract_id:
      "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    function_name: "deposit-sbtc-for-lp",
    function_args: [uintCV(25000000)], // Should fail with ERR_UNAUTHORIZED
  })

  // TEST: Try double initialization (should fail)
  .withSender(BOB_PROVIDER)
  .addContractCall({
    contract_id:
      "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    function_name: "initialize-pool",
    function_args: [uintCV(500000000000000)], // Should fail with ERR_ALREADY_INITIALIZED
  })

  // Check final pool info
  .addEvalCode(
    "SP2VG7S0R4Z8PYNYCAQ04HCBX1MH75VT11VXCWQ6G.built-on-bitcoin-stxcity",
    "(get-pool-info)"
  )

  .run()
  .catch(console.error);
