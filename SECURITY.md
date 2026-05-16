# Secura Security Policy 🛡️

## 🔐 Zero-Knowledge Philosophy
Secura is designed around the principle of **Zero-Knowledge Privacy**. We believe that your sensitive data and the keys required to unlock it should never touch our servers in plaintext.

## 🛠️ Cryptographic Standards
The Secura Web Client implements a robust local security layer:

| Component | Standard | Implementation Detail |
| :--- | :--- | :--- |
| **Encryption** | AES-256-GCM | Authenticated encryption ensures both confidentiality and integrity. |
| **Key Derivation** | PBKDF2-HMAC-SHA256 | 100,000 iterations ensure high computational cost for attackers. |
| **Salt** | CSPRNG | Every file uses a unique 16-byte cryptographically secure random salt. |
| **IV/Nonce** | CSPRNG | 12-byte unique Initialization Vector for GCM mode. |

### The ".secura" Container Format
Encrypted files are packaged into a portable container:
`[SALT (16B)] [IV (12B)] [CIPHERTEXT (variable)]`
This structure allows for portable, password-only restoration across any Secura-compatible device.

## 🎭 Plausible Deniability (Decoy Protocol)
To address physical threats and coercion, Secura implements a **Decoy Vault**:
- Users can configure a secondary **Decoy Password**.
- If the Decoy Password is used in the vault modal, the system performs a "Fake Restoration."
- It simulates technical processing but triggers a realistic integrity error, protecting the existence of the real vault.

## 🔎 Threat Modeling
1.  **Server Compromise:** If the Django backend is breached, attackers only gain access to metadata (filenames, sizes). No plaintext files or encryption keys are stored on the server.
2.  **Brute Force:** Mitigated by 100k PBKDF2 iterations and local password strength enforcement.
3.  **Local Theft:** Data is encrypted at rest in the user's Downloads or local storage.

## 🛡️ Reporting a Vulnerability
We welcome responsible disclosure. If you find a security flaw:
1.  **Do Not** disclose it publicly.
2.  Email a detailed report to the maintenance team.
3.  Include a proof-of-concept (PoC) if possible.

Secura is a research and final-year project intended to demonstrate advanced security architectures.
