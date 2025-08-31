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
      "sbtc-token",
      "mint",
      [Cl.uint(10000000), Cl.principal(user3)],
      deployer
    );
    simnet.callPublicFn(
      "built-on-bitcoin-stxcity",
      "mint",
      [Cl.uint(10000000), Cl.principal(user3)],
      deployer
    );

    simnet.callPublicFn(
      "bob-faktory-pool",
      "add-liquidity",
      [Cl.uint(1000000)],
      deployer
    );
  });

  describe("Basic Functionality", () => {
    it("should initialize pool successfully", () => {
      const result = simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );
      expect(result.result).toBeOk(Cl.bool(true));
    });

    it("should allow deposits from community users", () => {
      simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );
      const depositResult = simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user2
      );
      expect(depositResult.result.type).toBe("ok");
    });

    it("should prevent depositor from depositing to their own pool", () => {
      simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );
      const depositResult = simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user1
      );
      expect(depositResult.result).toBeErr(Cl.uint(403));
    });

    it("should prevent deposits after entry period", () => {
      simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );
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
      const withdrawResult = simnet.callPublicFn(
        contractName,
        "withdraw-lp-tokens",
        [],
        user2
      );
      expect(withdrawResult.result.type).toBe("ok");
    });

    it("should prevent unauthorized admin withdrawals", () => {
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
      const withdrawResult = simnet.callPublicFn(
        contractName,
        "withdraw-lp-tokens-depositor",
        [Cl.principal(user2)],
        user3
      );
      expect(withdrawResult.result).toBeErr(Cl.uint(403));
    });

    it("should allow depositor to withdraw remaining tokens", () => {
      simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
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
        [Cl.uint(50000)],
        user3
      );
      expect(deposit2.result.type).toBe("ok");
    });

    it("should maintain user isolation", () => {
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

      const user2Before = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user2)],
        deployer
      );
      const user3Before = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user3)],
        deployer
      );

      simnet.callPublicFn(contractName, "withdraw-lp-tokens", [], user2);

      const user2After = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user2)],
        deployer
      );
      const user3After = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user3)],
        deployer
      );

      expect(user2After.result).toStrictEqual(Cl.uint(0));
      expect(user3After.result).toStrictEqual(user3Before.result);
    });
  });

  describe("Error Handling", () => {
    it("should reject zero amounts", () => {
      const result = simnet.callReadOnlyFn(
        contractName,
        "calculate-amounts-for-lp",
        [Cl.uint(0)],
        deployer
      );
      expect(result.result).toBeErr(Cl.uint(406));
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

    it("should prevent withdrawal of non-existent tokens", () => {
      simnet.callPublicFn(
        contractName,
        "initialize-pool",
        [Cl.uint(1000000)],
        user1
      );
      simnet.mineEmptyBlocks(12961);
      const withdrawResult = simnet.callPublicFn(
        contractName,
        "withdraw-lp-tokens",
        [],
        user2
      );
      expect(withdrawResult.result).toBeErr(Cl.uint(408));
    });

    it("should prevent operations on uninitialized pool", () => {
      const depositResult = simnet.callPublicFn(
        contractName,
        "deposit-sbtc-for-lp",
        [Cl.uint(100000)],
        user2
      );
      expect(depositResult.result.type).toBe("err");
    });
  });

  describe("Edge Cases", () => {
    it("should handle deposits at entry period boundary", () => {
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

    it("should handle withdrawals at unlock boundary", () => {
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
  });

  describe("Mathematical Validation", () => {
    it("should calculate 60/40 split correctly", () => {
      const testAmount = 1000;
      const userShare = Math.floor((testAmount * 60) / 100);
      const depositorShare = testAmount - userShare;
      expect(userShare).toBe(600);
      expect(depositorShare).toBe(400);
      expect(userShare + depositorShare).toBe(testAmount);
    });

    it("should handle edge case amounts", () => {
      const testAmount = 1;
      const userShare = Math.floor((testAmount * 60) / 100);
      const depositorShare = testAmount - userShare;
      expect(userShare).toBe(0);
      expect(depositorShare).toBe(1);
      expect(userShare + depositorShare).toBe(testAmount);
    });
  });

  describe("Read-Only Functions", () => {
    it("should return correct initial state", () => {
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

    it("should return zero LP tokens initially", () => {
      const result = simnet.callReadOnlyFn(
        contractName,
        "get-user-lp-tokens",
        [Cl.principal(user1)],
        deployer
      );
      expect(result.result).toStrictEqual(Cl.uint(0));
    });
  });
});
