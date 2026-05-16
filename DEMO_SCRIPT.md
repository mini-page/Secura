# Secura (SFSS) Official Demo Script 🎬

This script guides you through a professional demonstration of the Secura ecosystem, highlighting the "Work Wow" factors.

## 🏗️ Part 1: The Gateway (Auth & Brand)
1.  **Splash Screen:** Open the web app. Highlight the brand splash screen that establishes Secura as a professional security product.
2.  **Login:** Sign in using **Google OAuth**. Explain that while identity is cloud-managed, file security is local.
3.  **Guest Mode:** Mention that Secura supports local-only guest sessions for immediate privacy.

## 🔐 Part 2: The Security Vault (Local Sandbox)
1.  **Encryption:** Drag a sensitive PDF into the "Encrypt & Secure" dropzone.
2.  **The Vault Modal:** Show the **Security Vault** modal. Type a weak password (red bar), then a strong one (green bar). 
3.  **Technical Feedback:** Point to the **Security Console** (Terminal). Show the PBKDF2 iterations and AES block processing logs.
4.  **Zero-Knowledge:** Explain that the password you just typed **never left the browser memory**.
5.  **Metadata Sync:** Open the Django Admin or Cloud Dashboard. Show that the backend recorded the file metadata and checksum, but has **zero access** to the file itself.

## 🎭 Part 3: Plausible Deniability (The Decoy)
1.  **Setup:** Go to Settings. Set a **Decoy Password** (e.g., "12345").
2.  **Duress Demo:** Go back to the Decrypt tool. Select the `.secura` file.
3.  **Fake Restore:** Type the decoy password "12345". 
4.  **Result:** Show the system simulating processing and then failing with a realistic "Integrity Error." 
5.  **Strategic Rationale:** Explain that this protects users who are forced to unlock their vault.

## 📊 Part 4: Ecosystem Roadmap
1.  **The Mirror Concept:** Point to the "Recent Imports" section. Explain that this is a mirror of their local vault.
2.  **Conversion:** Show the **System Capabilities Map** in Settings.
3.  **The Pitch:** "The Web app is your secure sandbox. If you want these files synced to Google Drive or protected by FaceID, download the **Secura Mobile App**."

## 🎓 Summary for Examiners
- **Innovation:** Shifted from server-side storage to a Zero-Knowledge architectural model.
- **Functionality:** Real working PBKDF2, Decoy protocols, and metadata mirroring.
- **Usability:** High-polish UI with professional security feedback loops.
