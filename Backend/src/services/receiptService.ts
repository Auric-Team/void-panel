import { db, uploadsReceiptsDir, isTestEnv } from "../db/database.js";
import { CreditService } from "./creditService.js";
import { join } from "path";
import { mkdirSync, writeFileSync, unlinkSync, existsSync, readdirSync } from "fs";
import type { PaymentReceiptRecord, UserPublicProfile } from "../types/index.js";

const backendUploadsReceiptsDir = join(import.meta.dir, "../../uploads/receipts");

function ensureReceiptDirs() {
  try {
    mkdirSync(uploadsReceiptsDir, { recursive: true });
  } catch {}
  try {
    mkdirSync(backendUploadsReceiptsDir, { recursive: true });
  } catch {}
}

export const ReceiptService = {
  writeReceiptFilesToDisk(r: PaymentReceiptRecord) {
    if (isTestEnv) return;
    ensureReceiptDirs();
    const safeNo = r.receipt_no.replace(/[^a-zA-Z0-9_-]/g, "_");

    const txtLines = [
      "================================================",
      "        VOID LICENSE HUB — PAYMENT RECEIPT      ",
      "================================================",
      `Receipt No      : ${r.receipt_no}`,
      `Date Issued     : ${new Date(r.created_at).toISOString()}`,
      `Status          : ${r.status.toUpperCase()}`,
      "------------------------------------------------",
      `Account         : @${r.username}`,
      `Customer Name   : ${r.customer_name || r.username}`,
      `Issued By       : @${r.issued_by_name}`,
      "------------------------------------------------",
      `Item / Summary  : ${r.keys_summary}`,
      r.key_str ? `License Key(s)  : ${r.key_str}` : null,
      `Credits Granted : +${r.credits_granted} CR`,
      `Amount Paid     : ${Number(r.amount_paid || 0).toFixed(2)} ${r.currency}`,
      `Payment Method  : ${r.payment_method}`,
      `Transaction Ref : ${r.transaction_ref || "N/A"}`,
      r.note ? `Memo / Note     : ${r.note}` : null,
      "================================================",
      "   1 KEY = 1 DEVICE HARDWARE LOCK GUARANTEED    ",
      "================================================",
    ]
      .filter(Boolean)
      .join("\n");

    const jsonStr = JSON.stringify(r, null, 2);

    for (const dir of [uploadsReceiptsDir, backendUploadsReceiptsDir]) {
      try {
        writeFileSync(join(dir, `${safeNo}.txt`), txtLines, "utf8");
        writeFileSync(join(dir, `${safeNo}.json`), jsonStr, "utf8");

        if (r.proof_image && r.proof_image.startsWith("data:image/")) {
          const match = r.proof_image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          if (match) {
            const ext = match[1] === "jpeg" ? "jpg" : match[1];
            const buf = Buffer.from(match[2], "base64");
            writeFileSync(join(dir, `${safeNo}-proof.${ext}`), buf);
          }
        }
      } catch (err) {
        console.error("[RECEIPT DISK SYNC ERROR]", err);
      }
    }
  },

  removeReceiptFilesFromDisk(receiptNo: string) {
    const safeNo = receiptNo.replace(/[^a-zA-Z0-9_-]/g, "_");
    for (const dir of [uploadsReceiptsDir, backendUploadsReceiptsDir]) {
      for (const suffix of [".txt", ".json", "-proof.png", "-proof.jpg", "-proof.webp"]) {
        const p = join(dir, `${safeNo}${suffix}`);
        try {
          if (existsSync(p)) unlinkSync(p);
        } catch {}
      }
    }
  },

  syncAllReceiptsToDisk() {
    if (isTestEnv) return;
    ensureReceiptDirs();
    const all = db.query("SELECT * FROM payment_receipts ORDER BY id ASC").all() as PaymentReceiptRecord[];
    const validPrefixes = new Set(all.map((r) => r.receipt_no.replace(/[^a-zA-Z0-9_-]/g, "_")));

    for (const dir of [uploadsReceiptsDir, backendUploadsReceiptsDir]) {
      try {
        for (const f of readdirSync(dir)) {
          const base = f.replace(/(-proof)?\.(txt|json|png|jpg|webp)$/i, "");
          if (!validPrefixes.has(base)) {
            try {
              unlinkSync(join(dir, f));
            } catch {}
          }
        }
      } catch {}
    }

    for (const r of all) {
      this.writeReceiptFilesToDisk(r);
    }
  },

  getReceipts(currentUser: UserPublicProfile): PaymentReceiptRecord[] {
    if (currentUser.role === "reseller") {
      return db
        .query("SELECT * FROM payment_receipts WHERE user_id = ? OR LOWER(username) = LOWER(?) ORDER BY id DESC")
        .all(currentUser.id, currentUser.username) as PaymentReceiptRecord[];
    }
    return db.query("SELECT * FROM payment_receipts ORDER BY id DESC").all() as PaymentReceiptRecord[];
  },

  getReceiptById(id: number): PaymentReceiptRecord | null {
    return (db.query("SELECT * FROM payment_receipts WHERE id = ?").get(id) as PaymentReceiptRecord) || null;
  },

  createReceipt(
    payload: Record<string, any>,
    issuer: UserPublicProfile
  ): { success: boolean; receipt?: PaymentReceiptRecord; error?: string } {
    const now = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNo = `VOID-RCP-${new Date(now).getFullYear()}-${String(now).slice(-4)}${randomSuffix}`;

    const rawUserId = payload.userId ?? payload.user_id;
    let targetUserId: number | null = rawUserId ? Number(rawUserId) : null;
    let targetUsername = (payload.username || "").trim();

    if (targetUserId) {
      const u = db.query("SELECT id, username FROM users WHERE id = ?").get(targetUserId) as any;
      if (u) {
        targetUsername = u.username;
      }
    } else if (targetUsername) {
      const u = db.query("SELECT id, username FROM users WHERE LOWER(username) = LOWER(?)").get(targetUsername) as any;
      if (u) {
        targetUserId = u.id;
        targetUsername = u.username;
      }
    }

    const rawCustomerName = payload.customerName ?? payload.customer_name;
    if (!targetUsername) {
      targetUsername = rawCustomerName?.trim() || issuer.username;
    }

    const creditsGranted = Math.max(0, Number(payload.creditsGranted ?? payload.credits_granted) || 0);
    const amountPaid = Math.max(0, Number(payload.amountPaid ?? payload.amount_paid) || 0);
    const currency = (payload.currency || "USD").toUpperCase();
    const paymentMethod = (payload.paymentMethod ?? payload.payment_method ?? "UPI / Crypto").trim();
    const transactionRef = (
      payload.transactionRef ??
      payload.transaction_ref ??
      `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
    ).trim();
    const status = payload.status || "paid";
    const customerName = (rawCustomerName || targetUsername).trim();
    const keysSummary = (
      payload.keysSummary ??
      payload.keys_summary ??
      (creditsGranted > 0 ? `${creditsGranted} Credits Top-Up` : "License Key Settlement")
    ).trim();
    const note = (payload.note || "").trim();
    const proofImage = (payload.proofImage ?? payload.proof_image ?? "").trim();
    const keyStr = (payload.keyStr ?? payload.key_str ?? "").trim();
    const autoGrant = Boolean(payload.autoGrantCredits ?? payload.auto_grant_credits);

    // Optional automatic credit transfer on receipt creation
    if (autoGrant && targetUserId && creditsGranted > 0 && (issuer.role === "owner" || issuer.role === "admin")) {
      const grantRes = CreditService.grantCredits(
        targetUserId,
        creditsGranted,
        issuer,
        `Payment Receipt ${receiptNo} (${amountPaid} ${currency} via ${paymentMethod})`
      );
      if (!grantRes.success) {
        return { success: false, error: grantRes.error || "Failed to grant credits for receipt" };
      }
    }

    const res = db.run(
      `INSERT INTO payment_receipts (
        receipt_no, user_id, username, customer_name, amount_paid, currency, credits_granted, keys_summary, payment_method, transaction_ref, proof_image, key_str, status, note, issued_by_id, issued_by_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receiptNo,
        targetUserId,
        targetUsername,
        customerName,
        amountPaid,
        currency,
        creditsGranted,
        keysSummary,
        paymentMethod,
        transactionRef,
        proofImage,
        keyStr,
        status,
        note,
        issuer.id,
        issuer.username,
        now,
      ]
    );

    const created = this.getReceiptById(Number(res.lastInsertRowid));
    if (created) {
      this.writeReceiptFilesToDisk(created);
    }
    return { success: true, receipt: created! };
  },

  deleteReceipt(id: number, currentUser: UserPublicProfile): boolean {
    const rec = this.getReceiptById(id);
    if (!rec) return false;
    if (currentUser.role === "reseller" && rec.issued_by_id !== currentUser.id) {
      return false;
    }
    db.run("DELETE FROM payment_receipts WHERE id = ?", [id]);
    this.removeReceiptFilesFromDisk(rec.receipt_no);
    return true;
  },

  deleteAllReceipts(currentUser: UserPublicProfile): number {
    if (currentUser.role === "owner") {
      const all = db.query("SELECT receipt_no FROM payment_receipts").all() as { receipt_no: string }[];
      for (const r of all) this.removeReceiptFilesFromDisk(r.receipt_no);
      const count = all.length;
      db.run("DELETE FROM payment_receipts");
      return count;
    }
    const mine = db
      .query("SELECT receipt_no FROM payment_receipts WHERE issued_by_id = ?")
      .all(currentUser.id) as { receipt_no: string }[];
    for (const r of mine) this.removeReceiptFilesFromDisk(r.receipt_no);
    const count = mine.length;
    db.run("DELETE FROM payment_receipts WHERE issued_by_id = ?", [currentUser.id]);
    return count;
  },
};
