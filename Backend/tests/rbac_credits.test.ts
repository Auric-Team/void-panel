import { describe, it, expect, beforeAll } from "bun:test";
import { initDatabase, db } from "../src/db/database.js";
import { AuthService } from "../src/services/authService.js";
import { UserService } from "../src/services/userService.js";
import { CreditService } from "../src/services/creditService.js";
import { KeyService } from "../src/services/keyService.js";
import { getCreditCostForDuration, CONFIG } from "../src/config/index.js";

describe("RBAC Hierarchy & Credit Billing System", () => {
  let ownerUser: any;
  let adminUser: any;
  let resellerUser: any;

  beforeAll(async () => {
    initDatabase();
    ownerUser = UserService.getUserById(1)!;
    adminUser = UserService.getUserById(2)!;
  });

  it("strictly enforces 24 hours key = 10 credits", () => {
    expect(getCreditCostForDuration(1)).toBe(10);
  });

  it("authenticates Owner, Admin, and Reseller with distinct roles", async () => {
    const ownerLogin = await AuthService.login(CONFIG.OWNER_USERNAME, CONFIG.OWNER_PASSWORD);
    expect(ownerLogin).not.toBeNull();
    expect(ownerLogin?.user.role).toBe("owner");

    const adminLogin = await AuthService.login(CONFIG.ADMIN_USERNAME, CONFIG.ADMIN_PASSWORD);
    expect(adminLogin).not.toBeNull();
    expect(adminLogin?.user.role).toBe("admin");

    const resellerLogin = await AuthService.login(CONFIG.RESELLER_USERNAME, CONFIG.RESELLER_PASSWORD);
    expect(resellerLogin).not.toBeNull();
    expect(resellerLogin?.user.role).toBe("reseller");
  });

  it("allows Admin to create a new Reseller with initial credits", () => {
    const randUser = "test_sub_reseller_" + Date.now().toString().slice(-4);
    const result = UserService.createUser(randUser, "password123", "reseller", 30, adminUser);

    expect(result.success).toBe(true);
    expect(result.user?.role).toBe("reseller");
    expect(result.user?.credits).toBe(30);
    resellerUser = result.user;
  });

  it("prevents Admin from creating another Admin or Owner", () => {
    const result = UserService.createUser("fake_admin_" + Date.now(), "password123", "admin", 0, adminUser);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Admins can only create Resellers");
  });

  it("prevents Reseller from creating any user", () => {
    const result = UserService.createUser("illegal_user", "password123", "reseller", 0, resellerUser);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Resellers cannot create users");
  });

  it("deducts 10 credits when Reseller generates a 24-hour (1 day) key", () => {
    const initialCredits = CreditService.getBalance(resellerUser.id);
    expect(initialCredits).toBe(30);

    const res = KeyService.createKey(1, "Reseller 24H Client Key", undefined, 3, resellerUser);
    expect(res.success).toBe(true);
    expect(res.creditCost).toBe(10);

    const afterCredits = CreditService.getBalance(resellerUser.id);
    expect(afterCredits).toBe(20);
  });

  it("fails key generation when Reseller has insufficient credits", () => {
    // Current credits: 20. Attempting a 7-day key (cost: 50 credits)
    const res = KeyService.createKey(7, "Should Fail Key", undefined, 3, resellerUser);
    expect(res.success).toBe(false);
    expect(res.error).toContain("Insufficient credit balance");

    // Balance remains intact
    expect(CreditService.getBalance(resellerUser.id)).toBe(20);
  });

  it("allows Owner to grant credits to Reseller directly", () => {
    const grant = CreditService.grantCredits(resellerUser.id, 100, ownerUser, "Owner topup");
    expect(grant.success).toBe(true);
    expect(grant.newBalance).toBe(120);

    // Now reseller has 120 credits and CAN generate the 7-day key (50 credits)
    const res = KeyService.createKey(7, "Now Allowed Key", undefined, 3, resellerUser);
    expect(res.success).toBe(true);
    expect(res.creditCost).toBe(50);
    expect(CreditService.getBalance(resellerUser.id)).toBe(70);
  });

  it("records transparent audit ledger of all credit actions", () => {
    const ledger = CreditService.getTransactions(resellerUser.id);
    expect(ledger.length).toBeGreaterThanOrEqual(3);
    expect(ledger.some((t) => t.type === "grant")).toBe(true);
    expect(ledger.some((t) => t.type === "key_create")).toBe(true);
  });

  it("allows Admin to transfer their own credits to Reseller", () => {
    const adminBefore = CreditService.getBalance(adminUser.id);
    const resellerBefore = CreditService.getBalance(resellerUser.id);

    const transferAmount = 40;
    const res = CreditService.grantCredits(resellerUser.id, transferAmount, adminUser, "Admin quota transfer");
    expect(res.success).toBe(true);

    const adminAfter = CreditService.getBalance(adminUser.id);
    const resellerAfter = CreditService.getBalance(resellerUser.id);

    expect(adminAfter).toBe(adminBefore - transferAmount);
    expect(resellerAfter).toBe(resellerBefore + transferAmount);
  });

  it("allows Owner and Admin to set and reset passwords with strict RBAC", async () => {
    // 1. Admin can reset their reseller's password
    const resetRes = UserService.resetPassword(resellerUser.id, "NewSecureResellerPass#2026", adminUser);
    expect(resetRes.success).toBe(true);

    // Reseller can now authenticate with new password
    const newLogin = await AuthService.login(resellerUser.username, "NewSecureResellerPass#2026");
    expect(newLogin).not.toBeNull();
    expect(newLogin?.user.id).toBe(resellerUser.id);

    // Old password fails
    const oldLogin = await AuthService.login(resellerUser.username, "password123");
    expect(oldLogin).toBeNull();

    // 2. Admin cannot reset Owner's password
    const illegalReset = UserService.resetPassword(ownerUser.id, "HackedOwnerPass#2026", adminUser);
    expect(illegalReset.success).toBe(false);
    expect(illegalReset.error).toContain("Permission denied");

    // 3. Owner can reset Admin's password
    const ownerResetAdmin = UserService.resetPassword(adminUser.id, "BrandNewAdminPass#2026", ownerUser);
    expect(ownerResetAdmin.success).toBe(true);

    const adminNewLogin = await AuthService.login("admin", "BrandNewAdminPass#2026");
    expect(adminNewLogin).not.toBeNull();

    // Restore admin password for other tests
    UserService.resetPassword(adminUser.id, "VoidAdmin#2026!Sec", ownerUser);
  });
});
