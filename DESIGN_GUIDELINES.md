# Secura Design Guidelines (Web & System) 🎨

These guidelines define the visual and interaction system for the Secura ecosystem, focusing on trust, clarity, and professional-grade security feedback.

## 💎 Design Philosophy: "Trust Through Transparency"
Secura's UI must feel robust but accessible. We use high-contrast typography, technical terminal-style logs, and clear visual state indicators (Vault, Progress Bars, Strength Indicators) to build user trust.

## 🎨 Color System (Security Focused)
- **Primary (Indigo):** `#575992` — Represents stability and depth.
- **Success (Emerald):** `#10B981` — Used for "Decryption Successful" and "Strong Password" states.
- **Warning (Amber):** `#F59E0B` — Used for "Medium Strength" passwords.
- **Danger (Rose):** `#EF4444` — Used for "Authentication Failed" or "Weak Password" states.
- **Background:** Soft light grey (`#F4F6FA`) or deep dark grey (`#0E1117`) for Dark Mode.

## 🧩 Core Components

### 1. The Security Vault (Modal)
The central interaction point for all security operations.
- **Overlay:** Glassmorphism (`backdrop-filter: blur(8px)`) to isolate the task.
- **Password Indicator:** Real-time entropy feedback via a 4-tier color-coded bar.
- **Technical Subtext:** Explicitly states "Zero-Knowledge" to reassure users.

### 2. The Security Console (Terminal)
Provides technical validation of background operations.
- **Aesthetic:** Dark background (`#111827`), mono font (`Space Mono`).
- **Interaction:** Newest logs appear at the top with a fading opacity for historical logs.
- **Rationale:** Proves the system is working without being intrusive.

### 3. System Capabilities Map (Roadmap)
A strategic UI element in Settings that creates an ecosystem vision.
- **Local Pill:** Green/Emerald indicating active and stable local features.
- **Mobile Pill:** Faded grey indicating "Coming Soon" or "Pro" features.
- **Objective:** Converts users by demonstrating the value of the mobile app.

## 📏 Spacing & Typography
- **Grid:** Standard 8dp baseline grid.
- **Typography:** Inter (Sans-serif) for general UI; Space Mono for technical data.
- **Scale:** Hero (32px), Headline (20px), Body (14px), Label (11px Caps).

## 🎭 Animations
- **Panel Slide:** Used for tab transitions to feel "app-like."
- **Vault Pulse:** A subtle glow when the Security Vault is active.
- **Toast Slide:** Toasts slide down from the top to ensure high visibility without blocking content.
