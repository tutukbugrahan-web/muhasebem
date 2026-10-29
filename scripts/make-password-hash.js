import crypto from "node:crypto";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
const rl = readline.createInterface({input, output});
try {
 const password = await rl.question("Yönetici parolası (en az 14 karakter): ");
 if (password.length < 14) throw new Error("Parola en az 14 karakter olmalı.");
 const salt = crypto.randomBytes(16);
 const hash = crypto.scryptSync(password, salt, 64);
 console.log("\nADMIN_PASSWORD_HASH=scrypt$" + salt.toString("hex") + "$" + hash.toString("hex"));
} finally { rl.close(); }
