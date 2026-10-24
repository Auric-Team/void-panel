import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/Abhi/.gemini/antigravity-cli/brain/1e8c6a4b-1e86-40c5-9f45-d2d64751cff6/screenshots";
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE_URL = "http://localhost:3000";

async function run() {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  console.log("1. Visiting Login Page...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "01_login_page.png"), fullPage: true });

  // --- LOGIN AS OWNER ---
  console.log("2. Logging in as Owner...");
  await page.fill('input[type="text"]', "owner");
  await page.fill('input[type="password"]', "VoidMaster#2026!Sec");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Screenshot: Owner Dashboard
  console.log("3. Screenshot Owner Dashboard...");
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "02_owner_dashboard.png"), fullPage: true });

  // Screenshot: Owner Key Manager
  console.log("4. Screenshot Owner Key Manager...");
  await page.click('text="License Keys"');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "03_owner_keys.png"), fullPage: true });

  // Open Create Key Modal
  console.log("5. Screenshot Key Creation Modal...");
  await page.click('button:has-text("Generate Key")');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "04_create_key_modal.png") });
  await page.click('button:has-text("Cancel")');
  await page.waitForTimeout(400);

  // Screenshot: Users View (Admins & Resellers)
  console.log("6. Screenshot Owner Users View...");
  await page.click('text="Admins & Resellers"');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "05_owner_users.png"), fullPage: true });

  // Screenshot: Credits & Vouchers View
  console.log("7. Screenshot Owner Credits & Vouchers...");
  await page.click('text="Credits & Vouchers"');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "06_owner_credits_vouchers.png"), fullPage: true });

  // Screenshot: Blacklist & Bans
  console.log("8. Screenshot Owner Bans...");
  await page.click('text="Blacklist & Bans"');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "07_owner_bans.png"), fullPage: true });

  // Screenshot: System Settings
  console.log("9. Screenshot Owner Settings...");
  await page.click('text="System Settings"');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "08_owner_settings.png"), fullPage: true });

  // Logout Owner
  console.log("10. Logging out Owner...");
  await page.click('button:has-text("Logout")');
  await page.waitForURL(`${BASE_URL}/login`);

  // --- LOGIN AS RESELLER ---
  console.log("11. Logging in as Reseller...");
  await page.fill('input[type="text"]', "reseller");
  await page.fill('input[type="password"]', "VoidReseller#2026!Sec");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Reseller automatically lands on License Keys
  console.log("12. Screenshot Reseller Keys View...");
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "09_reseller_keys.png"), fullPage: true });

  // Reseller Credits view
  console.log("13. Screenshot Reseller Credits & Voucher Redeem...");
  await page.click('text="Credits & Vouchers"');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "10_reseller_credits.png"), fullPage: true });

  // Logout Reseller
  console.log("14. Logging out Reseller...");
  await page.click('button:has-text("Logout")');
  await page.waitForURL(`${BASE_URL}/login`);

  // --- LOGIN AS ADMIN ---
  console.log("15. Logging in as Admin...");
  await page.fill('input[type="text"]', "admin");
  await page.fill('input[type="password"]', "VoidAdmin#2026!Sec");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Admin Reseller Hub
  console.log("16. Screenshot Admin Reseller Hub...");
  await page.click('text="Resellers"');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "11_admin_resellers.png"), fullPage: true });

  // Admin Device Blacklist
  console.log("17. Screenshot Admin Device Blacklist...");
  await page.click('text="Device Blacklist"');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "12_admin_blacklist.png"), fullPage: true });

  await browser.close();
  console.log("All screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Screenshot capture error:", err);
  process.exit(1);
});
