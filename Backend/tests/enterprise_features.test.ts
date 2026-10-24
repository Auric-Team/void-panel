import { describe, it, expect, beforeAll } from "bun:test";
import { initDatabase, db } from "../src/db/database.js";
import { BanService } from "../src/services/banService.js";
import { AnnouncementService } from "../src/services/announcementService.js";
import { SettingsService } from "../src/services/settingsService.js";
import { VoucherService } from "../src/services/voucherService.js";
import { KeyService } from "../src/services/keyService.js";
import { UserService } from "../src/services/userService.js";
import { CreditService } from "../src/services/creditService.js";

describe("Enterprise Production Features & Security Architecture", () => {
  let resellerUser: any;
  let testKeyStr: string;

  beforeAll(() => {
    initDatabase();
    resellerUser = UserService.getUserById(3)!; // reseller
    const kRes = KeyService.createKey(30, "Security Test Key");
    testKeyStr = kRes.key!.key_str;
  });

  // 1. Blacklist & Device Bans
  it("detects and rejects banned HWID devices instantly", () => {
    const badHwid = "HWID-PIRATE-CRACKER-999";
    const banRes = BanService.addBan("hwid", badHwid, "Cracking attempt caught by anti-tamper", "admin");
    expect(banRes.success).toBe(true);

    const check = KeyService.verify(testKeyStr, badHwid);
    expect(check.status).toBe("banned");
    expect(check.message).toContain("DEVICE BLACKLISTED");

    // Remove ban
    BanService.removeBan(banRes.ban!.id);
    const checkAfter = KeyService.verify(testKeyStr, badHwid);
    expect(checkAfter.status).not.toBe("banned");
  });

  // 2. Announcements & Live Broadcasts
  it("broadcasts live announcements to authenticating game clients", () => {
    const ann = AnnouncementService.create("Server Network Boost", "Latency reduced to 2ms globally", "info");
    expect(ann.id).toBeDefined();

    const freshKey = KeyService.createKey(1, "Announcement Test Key").key!;
    const res = KeyService.verify(freshKey.key_str, "HWID-CLEAN-PLAYER-01");
    expect(res.announcement).toBeDefined();
    expect(res.announcement?.title).toBe("Server Network Boost");

    // Clean up
    AnnouncementService.delete(ann.id);
  });

  // 3. Maintenance Mode Killswitch
  it("enforces emergency remote maintenance killswitch", () => {
    SettingsService.updateSettings({ maintenance_mode: true, maintenance_message: "Void Emergency Maintenance" });

    const res = KeyService.verify(testKeyStr, "HWID-SOME-DEVICE");
    expect(res.status).toBe("maintenance");
    expect(res.message).toContain("Void Emergency Maintenance");

    // Restore
    SettingsService.updateSettings({ maintenance_mode: false });
    const resAfter = KeyService.verify(testKeyStr, "HWID-SOME-DEVICE");
    expect(resAfter.status).not.toBe("maintenance");
  });

  // 4. OTA Client Version Enforcer
  it("enforces client minimum version requirements", () => {
    SettingsService.updateSettings({ min_version: "2.0.0", current_version: "2.6.0" });

    // Client running outdated v1.2.0
    const resOld = KeyService.verify(testKeyStr, "HWID-VERSION-TEST", undefined, undefined, "127.0.0.1", "1.2.0");
    expect(resOld.status).toBe("update_required");
    expect(resOld.updateUrl).toBeDefined();

    // Client running modern v2.6.0
    const resNew = KeyService.verify(testKeyStr, "HWID-VERSION-TEST", undefined, undefined, "127.0.0.1", "2.6.0");
    expect(resNew.status).not.toBe("update_required");
  });

  // 5. Gift Vouchers & Credit Redemption
  it("allows resellers to redeem gift voucher codes for instant credit top-up", () => {
    const vCode = "VOID-TEST-PROMO-" + Date.now();
    const vRes = VoucherService.create(vCode, 150, 1, undefined, "owner");
    expect(vRes.success).toBe(true);

    const initialCredits = CreditService.getBalance(resellerUser.id);
    const redeemRes = VoucherService.redeem(vCode, resellerUser);

    expect(redeemRes.success).toBe(true);
    expect(redeemRes.creditsAdded).toBe(150);
    expect(redeemRes.newBalance).toBe(initialCredits + 150);

    // Duplicate redemption rejected
    const repeatRes = VoucherService.redeem(vCode, resellerUser);
    expect(repeatRes.success).toBe(false);
    expect(repeatRes.error).toContain("already redeemed");
  });

  // 6. Bulk Key Operations
  it("performs bulk pause, activate, and extend operations seamlessly", () => {
    const k1 = KeyService.createKey(1, "Bulk 1").key!;
    const k2 = KeyService.createKey(1, "Bulk 2").key!;

    // Bulk Pause
    const bulkPause = KeyService.bulkAction("pause", [k1.id, k2.id]);
    expect(bulkPause.success).toBe(true);
    expect(bulkPause.affected).toBe(2);

    expect(KeyService.getKeyById(k1.id)?.status).toBe("paused");
    expect(KeyService.getKeyById(k2.id)?.status).toBe("paused");

    // Bulk Activate
    const bulkAct = KeyService.bulkAction("activate", [k1.id, k2.id]);
    expect(bulkAct.success).toBe(true);
    expect(KeyService.getKeyById(k1.id)?.status).toBe("active");

    // Bulk Delete
    const bulkDel = KeyService.bulkAction("delete", [k1.id, k2.id]);
    expect(bulkDel.success).toBe(true);
    expect(KeyService.getKeyById(k1.id)).toBeNull();
  });
});
