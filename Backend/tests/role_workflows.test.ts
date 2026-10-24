import { describe, test, expect, beforeAll } from "bun:test";
import { AuthService } from "../src/services/authService.js";
import { UserService } from "../src/services/userService.js";
import { CreditService } from "../src/services/creditService.js";
import { KeyService } from "../src/services/keyService.js";
import { VoucherService } from "../src/services/voucherService.js";
import { BanService } from "../src/services/banService.js";
import { CONFIG } from "../src/config/index.js";

describe("Strict Multi-Role E2E Verification (Owner, Admin, Reseller)", () => {
  let ownerUser: any;
  let adminUser: any;
  let resellerUser: any;
  let secondResellerUser: any;

  beforeAll(async () => {
    // 1. Authenticate Owner
    const ownerAuth = await AuthService.login(CONFIG.OWNER_USERNAME, CONFIG.OWNER_PASSWORD);
    expect(ownerAuth).not.toBeNull();
    ownerUser = ownerAuth!.user;
    expect(ownerUser.role).toBe("owner");

    // 2. Authenticate Admin
    const adminAuth = await AuthService.login(CONFIG.ADMIN_USERNAME, CONFIG.ADMIN_PASSWORD);
    expect(adminAuth).not.toBeNull();
    adminUser = adminAuth!.user;
    expect(adminUser.role).toBe("admin");

    // 3. Authenticate Default Reseller
    const resAuth = await AuthService.login(CONFIG.RESELLER_USERNAME, CONFIG.RESELLER_PASSWORD);
    expect(resAuth).not.toBeNull();
    resellerUser = resAuth!.user;
    expect(resellerUser.role).toBe("reseller");
  });

  // =========================================================================
  // 1. RESELLER ROLE TESTING
  // =========================================================================
  describe("Reseller Role Permissions & Credit Economy", () => {
    test("Reseller starts with credits balance", () => {
      const balance = CreditService.getBalance(resellerUser.id);
      expect(balance).toBeGreaterThanOrEqual(0);
    });

    test("Reseller CANNOT create users or admins", () => {
      const res = UserService.createUser(
        "subreseller_illegal",
        "TestPass123!",
        "reseller",
        50,
        resellerUser
      );
      expect(res.success).toBe(false);
      expect(res.error).toContain("Resellers cannot create users");
    });

    test("Reseller generating 24h key deducts exactly 10 credits", () => {
      // Ensure reseller has at least 50 credits
      CreditService.grantCredits(resellerUser.id, 50, ownerUser, "Test setup");
      const balanceBefore = CreditService.getBalance(resellerUser.id);

      const keyRes = KeyService.createKey(1, "Test 24H Key", undefined, 3, resellerUser);
      expect(keyRes.success).toBe(true);
      expect(keyRes.creditCost).toBe(10);
      expect(keyRes.key?.duration_days).toBe(1);

      const balanceAfter = CreditService.getBalance(resellerUser.id);
      expect(balanceAfter).toBe(balanceBefore - 10);
    });

    test("Reseller CANNOT generate key if balance is insufficient", () => {
      // Create temporary poor reseller
      const poor = UserService.createUser(`poor_res_${Date.now()}`, "Pass123!", "reseller", 5, adminUser);
      expect(poor.success).toBe(true);
      const poorUser = poor.user!;

      // Attempt 24h key (costs 10 credits, user has 5)
      const res = KeyService.createKey(1, "Should Fail", undefined, 3, poorUser);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Insufficient credit balance");
    });

    test("Reseller only sees their own keys in key list (Role Scoping)", () => {
      // Reseller generates a key
      const myKey = KeyService.createKey(1, "Reseller Own Key", undefined, 3, resellerUser);
      expect(myKey.success).toBe(true);

      // Admin generates a key
      const adminKey = KeyService.createKey(1, "Admin Key", undefined, 3, adminUser);
      expect(adminKey.success).toBe(true);

      // Reseller queries keys
      const resellerKeys = KeyService.getAllKeys({}, resellerUser);
      const allKeyStrings = resellerKeys.map((k) => k.key_str);

      expect(allKeyStrings).toContain(myKey.key!.key_str);
      expect(allKeyStrings).not.toContain(adminKey.key!.key_str);
    });

    test("Reseller CANNOT reset HWID on keys owned by other users", () => {
      const adminKey = KeyService.createKey(1, "Admin Key", undefined, 3, adminUser);
      const resetRes = KeyService.resetHwid(adminKey.key!.id, resellerUser);
      expect(resetRes.success).toBe(false);
      expect(resetRes.message).toContain("Unauthorized");
    });

    test("Reseller CAN redeem gift vouchers to top up credits", () => {
      // Admin mints 100 credit voucher
      const voucherCode = `PROMO-RESELLER-${Date.now()}`;
      const voucherRes = VoucherService.create(voucherCode, 100, 1, undefined, adminUser.username);
      expect(voucherRes.success).toBe(true);

      const balBefore = CreditService.getBalance(resellerUser.id);
      const redeemRes = VoucherService.redeem(voucherCode, resellerUser);
      expect(redeemRes.success).toBe(true);

      const balAfter = CreditService.getBalance(resellerUser.id);
      expect(balAfter).toBe(balBefore + 100);
    });
  });

  // =========================================================================
  // 2. ADMIN ROLE TESTING
  // =========================================================================
  describe("Admin Role Permissions & Reseller Management", () => {
    test("Admin CAN create new Reseller with initial credits", () => {
      const uniqueName = `reseller_test_${Date.now()}`;
      const res = UserService.createUser(uniqueName, "Pass12345!", "reseller", 150, adminUser);
      expect(res.success).toBe(true);
      expect(res.user?.role).toBe("reseller");
      expect(res.user?.credits).toBe(150);
      secondResellerUser = res.user;
    });

    test("Admin CANNOT create another Admin or Owner", () => {
      const resAdmin = UserService.createUser("subadmin_test", "Pass12345!", "admin", 100, adminUser);
      expect(resAdmin.success).toBe(false);
      expect(resAdmin.error).toContain("Admins can only create Resellers");

      const resOwner = UserService.createUser("fakeowner_test", "Pass12345!", "owner", 100, adminUser);
      expect(resOwner.success).toBe(false);
    });

    test("Admin CAN reset password for a Reseller", async () => {
      const reset = UserService.resetPassword(secondResellerUser.id, "NewSecurePassword#2026", adminUser);
      expect(reset.success).toBe(true);

      // Verify login with new password
      const reLogin = await AuthService.login(secondResellerUser.username, "NewSecurePassword#2026");
      expect(reLogin).not.toBeNull();
    });

    test("Admin CAN transfer credits from their balance to a Reseller", () => {
      // Ensure Admin has credits
      CreditService.grantCredits(adminUser.id, 200, ownerUser, "Admin setup");
      const adminBalBefore = CreditService.getBalance(adminUser.id);
      const resBalBefore = CreditService.getBalance(secondResellerUser.id);

      const transfer = CreditService.transferCredits(
        adminUser.id,
        secondResellerUser.id,
        50,
        "Stock top-up",
        adminUser
      );
      expect(transfer.success).toBe(true);

      expect(CreditService.getBalance(adminUser.id)).toBe(adminBalBefore - 50);
      expect(CreditService.getBalance(secondResellerUser.id)).toBe(resBalBefore + 50);
    });

    test("Admin CAN ban problematic device HWIDs", () => {
      const badHwid = `hwid_malicious_${Date.now()}`;
      const ban = BanService.addBan("hwid", badHwid, "Caught memory dumping", adminUser.username);
      expect(ban.success).toBe(true);

      const check = BanService.isBanned(badHwid, "1.2.3.4");
      expect(check.banned).toBe(true);
    });
  });

  // =========================================================================
  // 3. OWNER ROLE TESTING
  // =========================================================================
  describe("Owner Role Master Super-Admin Permissions", () => {
    test("Owner CAN create Admins and Resellers freely", () => {
      const newAdminName = `admin_deputy_${Date.now()}`;
      const res = UserService.createUser(newAdminName, "DeputyAdminPass2026!", "admin", 500, ownerUser);
      expect(res.success).toBe(true);
      expect(res.user?.role).toBe("admin");
    });

    test("Owner key generation costs 0 credits (Unlimited Free Generation)", () => {
      const key = KeyService.createKey(30, "Owner VIP Key", undefined, 5, ownerUser);
      expect(key.success).toBe(true);
      expect(key.creditCost).toBe(0);
    });

    test("Owner CAN grant unlimited credits directly to any user", () => {
      const grant = CreditService.grantCredits(secondResellerUser.id, 5000, ownerUser, "Super grant");
      expect(grant.success).toBe(true);
      expect(CreditService.getBalance(secondResellerUser.id)).toBeGreaterThanOrEqual(5000);
    });

    test("Owner sees ALL keys from all users across the system", () => {
      const allKeys = KeyService.getAllKeys({}, ownerUser);
      expect(allKeys.length).toBeGreaterThan(0);
    });

    test("Owner CAN reset HWID on any key in the database", () => {
      // Find a key
      const keys = KeyService.getAllKeys({ limit: 1 }, ownerUser);
      if (keys.length > 0) {
        const reset = KeyService.resetHwid(keys[0].id, ownerUser);
        expect(reset.success).toBe(true);
      }
    });
  });
});
