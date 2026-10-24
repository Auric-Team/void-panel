import { describe, test, expect } from "bun:test";
import { initDatabase, db } from "../src/db/database.js";
import { CONFIG } from "../src/config/index.js";
import { AuthService } from "../src/services/authService.js";

describe("Environment Variable (.env) Synchronization Suite", () => {
  test("Loads CONFIG from environment variables", () => {
    expect(CONFIG.PORT).toBeDefined();
    expect(CONFIG.OWNER_USERNAME).toBeDefined();
    expect(CONFIG.OWNER_PASSWORD).toBeDefined();
    expect(CONFIG.ADMIN_USERNAME).toBeDefined();
    expect(CONFIG.ADMIN_PASSWORD).toBeDefined();
    expect(CONFIG.RESELLER_USERNAME).toBeDefined();
    expect(CONFIG.RESELLER_PASSWORD).toBeDefined();
  });

  test("Synchronizes Owner credentials in SQLite with CONFIG / .env", async () => {
    initDatabase();

    const owner = db.query("SELECT id, username, role, password_hash FROM users WHERE role = 'owner'").get() as any;
    expect(owner).toBeDefined();
    expect(owner.username).toBe(CONFIG.OWNER_USERNAME);

    // Verify password matches CONFIG.OWNER_PASSWORD
    const matches = Bun.password.verifySync(CONFIG.OWNER_PASSWORD, owner.password_hash);
    expect(matches).toBe(true);

    // Verify login via AuthService succeeds with .env credentials
    const loginRes = await AuthService.login(CONFIG.OWNER_USERNAME, CONFIG.OWNER_PASSWORD);
    expect(loginRes).not.toBeNull();
    expect(loginRes!.user.username).toBe(CONFIG.OWNER_USERNAME);
    expect(loginRes!.user.role).toBe("owner");
  });

  test("Synchronizes Admin credentials with CONFIG / .env", async () => {
    const admin = db.query("SELECT id, username, role, password_hash FROM users WHERE role = 'admin'").get() as any;
    expect(admin).toBeDefined();
    expect(admin.username).toBe(CONFIG.ADMIN_USERNAME);

    const matches = Bun.password.verifySync(CONFIG.ADMIN_PASSWORD, admin.password_hash);
    expect(matches).toBe(true);

    const loginRes = await AuthService.login(CONFIG.ADMIN_USERNAME, CONFIG.ADMIN_PASSWORD);
    expect(loginRes).not.toBeNull();
  });

  test("Synchronizes Reseller credentials with CONFIG / .env", async () => {
    const reseller = db.query("SELECT id, username, role, password_hash FROM users WHERE role = 'reseller'").get() as any;
    expect(reseller).toBeDefined();
    expect(reseller.username).toBe(CONFIG.RESELLER_USERNAME);

    const matches = Bun.password.verifySync(CONFIG.RESELLER_PASSWORD, reseller.password_hash);
    expect(matches).toBe(true);

    const loginRes = await AuthService.login(CONFIG.RESELLER_USERNAME, CONFIG.RESELLER_PASSWORD);
    expect(loginRes).not.toBeNull();
  });
});
