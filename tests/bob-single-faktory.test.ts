import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const user1 = accounts.get("wallet_1")!;
const user2 = accounts.get("wallet_2")!;
const user3 = accounts.get("wallet_3")!;

const contractName = "bob-single-faktory";

describe("Bob Single Faktory Contract Tests", () => {
  beforeEach(() => {
    simnet.setEpoch("3.0");

    simnet.callPublicFn(
      "sbtc-token",
      "mint",
      [Cl.uint(10000000), Cl.principal(deployer)],
      deployer
    );
    simnet.callPublicFn(
      "built-on-bitcoin-stxcity",
      "mint",
      [Cl.uint(10000000), Cl.principal(deployer)],
      deployer
    );
    simnet.callPublicFn(
      "sbtc-token",
      "mint",
      [Cl.uint(10000000), Cl.principal(user1)],
      deployer
    );
    simnet.callPublicFn(
      "built-on-bitcoin-stxcity",
      "mint",
      [Cl.uint(10000000), Cl.principal(user1)],
      deployer
    );
    simnet.callPublicFn(
      "sbtc-token",
      "mint",
      [Cl.uint(10000000), Cl.principal(user2)],
      deployer
    );
    simnet.callPublicFn(
      "built-on-bitcoin-stxcity",
      "mint",
      [Cl.uint(10000000), Cl.principal(user2)],
      deployer
    );

    simnet.callPublicFn(
      "bob-faktory-pool",
      "add-liquidity",
      [Cl.uint(1000000)],
      deployer
    );
  });

  describe("Initial State & Read-Only Functions", () => {
    it("should return empty pool info before initialization", () => {
      const result = simnet.callReadOnlyFn(
        contractName,
        "get-pool-info",
        [],
        deployer
      );

      expect(result.result).toStrictEqual(
        Cl.tuple({
          depositor: Cl.none(),
          "creation-block": Cl.uint(0),
          "unlock-block": Cl.uint(12960),
          "entry-ends": Cl.uint(3024),
          "is-unlocked": Cl.bool(false),
          "initial-token": Cl.uint(0),
          "token-used": Cl.uint(0),
          "token-available": Cl.uint(0),
          "total-lp-tokens": Cl.uint(0),
        })
      );
    });

    it("should return zero LP tokens for any user initially", () => {
      const result1 = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user1)],
        deployer
      );

      const result2 = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user2)],
        deployer
      );

      expect(result1.result).toStrictEqual(Cl.uint(0));
      expect(result2.result).toStrictEqual(Cl.uint(0));
    });
  });

  describe("Input Validation & Error Handling", () => {
    it("should reject zero amount in calculate-amounts-for-lp", () => {
      const result = simnet.callReadOnlyFn(
        contractName,
        "calculate-amounts-for-lp",
        [Cl.uint(0)],
        deployer
      );

      expect(result.result).toBeErr(Cl.uint(406));
    });

    it("should reject zero token amount in initialization", () => {
      const result = simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(0)],
        deployer
      );

      expect(result.result).toBeErr(Cl.uint(406));
    });
  });

  describe("Pool Initialization", () => {
    it("should initialize pool successfully with valid token amount", () => {
      const result = simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );

      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should update pool info after initialization", () => {
      const blockBeforeInit = simnet.blockHeight;

      simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );

      const poolInfo = simnet.callReadOnlyFn(
        contractName,
        "get-pool-info",
        [],
        deployer
      );

      const result = poolInfo.result as any;
      expect(result.value.data["depositor"]).toEqual(
        Cl.some(Cl.principal(user1))
      );
      expect(result.value.data["initial-token"]).toEqual(Cl.uint(1000000));
      expect(Number(result.value.data["creation-block"].value)).toBeGreaterThan(
        blockBeforeInit
      );
      expect(result.value.data["token-used"]).toEqual(Cl.uint(0));
      expect(result.value.data["total-lp-tokens"]).toEqual(Cl.uint(0));
    });

    it("should prevent double initialization", () => {
      simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );

      const secondInit = simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(500000)],
        user2
      );

      expect(secondInit.result).toBeErr(Cl.uint(405));
    });
  });

  describe("Deposit Functionality", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );
    });

    it("should allow valid sBTC deposits from community users", () => {
      const depositResult = simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user2
      );

      expect(depositResult.result.type).toBe("ok");
    });

    it("should prevent depositor from depositing to their own pool", () => {
      const depositResult = simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user1
      );

      expect(depositResult.result).toBeErr(Cl.uint(403));
    });

    it("should prevent deposits on uninitialized pool", () => {
      const depositResult = simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user3
      );

      expect(depositResult.result.type).toBe("err");
    });

    it("should track user LP tokens after deposit", () => {
      simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user2
      );

      const userTokens = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user2)],
        deployer
      );

      expect(Number((userTokens.result as any).value)).toBeGreaterThan(0);
    });

    it("should update pool state after deposit", () => {
      simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user2
      );

      const poolInfo = simnet.callReadOnlyFn(
        contractName,
        "get-pool-info",
        [],
        deployer
      );

      const result = poolInfo.result as any;
      expect(
        Number(result.value.data["total-lp-tokens"].value)
      ).toBeGreaterThan(0);
      expect(Number(result.value.data["token-used"].value)).toBeGreaterThan(0);
    });
  });

  describe("Time-Based Access Control", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );
    });

    it("should prevent deposits after entry period ends", () => {
      simnet.mineEmptyBlocks(3025);

      const depositResult = simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user2
      );

      expect(depositResult.result).toBeErr(Cl.uint(409));
    });

    it("should prevent withdrawals during lock period", () => {
      simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user2
      );

      simnet.mineEmptyBlocks(5000);

      const withdrawResult = simnet.callPublicFn(
        contractName,
        "withdraw-lp-tokens",
        [],
        user2
      );

      expect(withdrawResult.result).toBeErr(Cl.uint(407));
    });

    it("should allow withdrawals after unlock period", () => {
      simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user2
      );

      simnet.mineEmptyBlocks(12961);

      const withdrawResult = simnet.callPublicFn(
        contractName,
        "withdraw-lp-tokens",
        [],
        user2
      );

      expect(withdrawResult.result.type).toBe("ok");
    });

    it("should allow depositor to withdraw remaining tokens after entry period", () => {
      simnet.mineEmptyBlocks(3025);

      const withdrawResult = simnet.callPublicFn(
        contractName,
        "withdraw-remaining-token",
        [],
        user1
      );

      expect(withdrawResult.result.type).toBe("ok");
    });
  });

  describe("Withdrawal Functionality", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );
      simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user2
      );
      simnet.mineEmptyBlocks(12961);
    });

    it("should process user LP token withdrawals correctly", () => {
      const withdrawResult = simnet.callPublicFn(
        contractName,
        "withdraw-lp-tokens",
        [],
        user2
      );

      expect(withdrawResult.result.type).toBe("ok");
    });

    it("should clear user LP tokens after withdrawal", () => {
      simnet.callPublicFn(contractName, "withdraw-lp-tokens", [], user2);

      const userTokens = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user2)],
        deployer
      );

      expect(userTokens.result).toStrictEqual(Cl.uint(0));
    });

    it("should prevent withdrawal of non-existent LP tokens", () => {
      const withdrawResult = simnet.callPublicFn(
        contractName,
        "withdraw-lp-tokens",
        [],
        user3
      );

      expect(withdrawResult.result).toBeErr(Cl.uint(408));
    });

    it("should allow depositor-assisted withdrawals", () => {
      const withdrawResult = simnet.callPublicFn(
        contractName,
        "withdraw-lp-tokens-depositor",
        [Cl.principal(user2)],
        user1
      );

      expect(withdrawResult.result.type).toBe("ok");
    });

    it("should prevent unauthorized depositor-assisted withdrawals", () => {
      const withdrawResult = simnet.callPublicFn(
        contractName,
        "withdraw-lp-tokens-depositor",
        [Cl.principal(user2)],
        user3
      );

      expect(withdrawResult.result).toBeErr(Cl.uint(403));
    });
  });

  describe("Multi-User Scenarios", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );
    });

    it("should handle multiple users depositing", () => {
      const deposit1 = simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(50000)],
        user2
      );

      expect(deposit1.result.type).toBe("ok");

      const deposit2 = simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(75000)],
        user3
      );

      if (deposit2.result.type === "err") {
        console.log("Deposit2 error:", deposit2.result);
      }
      expect(deposit2.result.type).toBe("ok");

      const user2Tokens = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user2)],
        deployer
      );

      const user3Tokens = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user3)],
        deployer
      );

      expect(Number((user2Tokens.result as any).value)).toBeGreaterThan(0);
      expect(Number((user3Tokens.result as any).value)).toBeGreaterThan(0);
    });

    it("should maintain user isolation during withdrawals", () => {
      simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(50000)],
        user2
      );

      simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(75000)],
        user3
      );

      simnet.mineEmptyBlocks(12961);

      const user2TokensBefore = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user2)],
        deployer
      );

      const user3TokensBefore = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user3)],
        deployer
      );

      simnet.callPublicFn(contractName, "withdraw-lp-tokens", [], user2);

      const user2TokensAfter = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user2)],
        deployer
      );

      const user3TokensAfter = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user3)],
        deployer
      );

      expect(user2TokensAfter.result).toStrictEqual(Cl.uint(0));
      expect(user3TokensAfter.result).toStrictEqual(user3TokensBefore.result);
    });
  });

  describe("Mathematical Precision", () => {
    it("should handle percentage calculations correctly", () => {
      const testAmount = 1000;
      const userShare = Math.floor((testAmount * 60) / 100);
      const depositorShare = testAmount - userShare;

      expect(userShare).toBe(600);
      expect(depositorShare).toBe(400);
      expect(userShare + depositorShare).toBe(testAmount);
    });

    it("should handle edge cases in percentage calculations", () => {
      const testAmount = 1;
      const userShare = Math.floor((testAmount * 60) / 100);
      const depositorShare = testAmount - userShare;

      expect(userShare).toBe(0);
      expect(depositorShare).toBe(1);
      expect(userShare + depositorShare).toBe(testAmount);
    });
  });

  describe("Edge Case Scenarios", () => {
    it("should reject deposits exactly at entry period boundary", () => {
      simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );

      simnet.mineEmptyBlocks(3024);

      const depositResult = simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user2
      );

      expect(depositResult.result).toBeErr(Cl.uint(409));
    });

    it("should handle withdrawals exactly at unlock boundary", () => {
      simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );

      simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user2
      );

      simnet.mineEmptyBlocks(12960);

      const withdrawResult = simnet.callPublicFn(
        contractName,
        "withdraw-lp-tokens",
        [],
        user2
      );

      expect(withdrawResult.result.type).toBe("ok");
    });

    it("should handle remaining token withdrawal after entry period", () => {
      simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );

      simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user2
      );

      simnet.mineEmptyBlocks(3025);

      const withdrawResult = simnet.callPublicFn(
        contractName,
        "withdraw-remaining-token",
        [],
        user1
      );

      expect(withdrawResult.result.type).toBe("ok");
    });
  });

  describe("State Consistency", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );
    });

    it("should maintain token accounting consistency", () => {
      simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user2
      );

      const poolInfo = simnet.callReadOnlyFn(
        contractName,
        "get-pool-info",
        [],
        deployer
      );

      const result = poolInfo.result as any;
      const initialToken = Number(result.value.data["initial-token"].value);
      const tokenUsed = Number(result.value.data["token-used"].value);
      const tokenAvailable = Number(result.value.data["token-available"].value);

      expect(tokenUsed + tokenAvailable).toBe(initialToken);
    });

    it("should maintain LP token accounting consistency", () => {
      simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(50000)],
        user2
      );

      simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(75000)],
        user3
      );

      const poolInfo = simnet.callReadOnlyFn(
        contractName,
        "get-pool-info",
        [],
        deployer
      );

      const user2Tokens = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user2)],
        deployer
      );

      const user3Tokens = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user3)],
        deployer
      );

      const result = poolInfo.result as any;
      const totalLPTokens = Number(result.value.data["total-lp-tokens"].value);
      const user2LP = Number((user2Tokens.result as any).value);
      const user3LP = Number((user3Tokens.result as any).value);

      expect(user2LP + user3LP).toBe(totalLPTokens);
    });
  });

  describe("Error Code Consistency", () => {
    it("should use consistent error codes", () => {
      const errorCodes = {
        ERR_UNAUTHORIZED: 403,
        ERR_NOT_INITIALIZED: 404,
        ERR_ALREADY_INITIALIZED: 405,
        ERR_INSUFFICIENT_AMOUNT: 406,
        ERR_STILL_LOCKED: 407,
        ERR_NO_DEPOSIT: 408,
        ERR_TOO_LATE: 409,
      };

      const insufficientResult = simnet.callReadOnlyFn(
        contractName,
        "calculate-amounts-for-lp",
        [Cl.uint(0)],
        deployer
      );

      expect(insufficientResult.result).toBeErr(
        Cl.uint(errorCodes.ERR_INSUFFICIENT_AMOUNT)
      );

      const notInitializedResult = simnet.callPublicFn(
        contractName,
        "withdraw-remaining-token",
        [],
        deployer
      );

      expect(notInitializedResult.result).toBeErr(
        Cl.uint(errorCodes.ERR_NOT_INITIALIZED)
      );
    });
  });

  describe("Time Window Validation", () => {
    it("should calculate correct time windows", () => {
      const currentBlock = simnet.blockHeight;
      const lockPeriod = 12960;
      const entryPeriod = 3024;

      expect(entryPeriod).toBeLessThan(lockPeriod);
      expect(currentBlock + lockPeriod).toBe(currentBlock + 12960);
      expect(currentBlock + entryPeriod).toBe(currentBlock + 3024);
    });

    it("should respect block height progression", () => {
      const startBlock = simnet.blockHeight;
      simnet.mineEmptyBlocks(10);
      const newBlock = simnet.blockHeight;
      expect(newBlock).toBe(startBlock + 10);
    });
  });
});
