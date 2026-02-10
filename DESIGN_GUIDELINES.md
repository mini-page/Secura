# SFSS Mobile Design Guidelines

These guidelines define the visual and interaction system for the Secure File Storage System (SFSS) mobile app. The aesthetic targets a modern, expressive, material-inspired experience suited for React Native and small screens.

## 1. Design Principles
- Clarity first: every screen should communicate its purpose in the first 3 seconds.
- Focused surfaces: one primary action per screen; secondary actions are clearly subordinate.
- Calm security: visual tone should feel trustworthy, precise, and deliberate.
- Motion with meaning: motion communicates cause and effect, never decoration.
- Consistency through tokens: colors, spacing, and typography must use the defined scale.

## 2. Layout Grid and Spacing
- Base spacing unit: `4dp`.
- Standard spacing scale: `4, 8, 12, 16, 20, 24, 32, 40, 48`.
- Screen padding: `20dp` horizontal, `24dp` top, `32dp` bottom.
- Section spacing: `24dp` between major sections, `12dp` between related items.
- Card padding: `16dp` content padding with `12dp` vertical spacing between elements.
- List item height: minimum `56dp`, preferred `64dp` for touch comfort.
- Touch target minimum: `48dp` height and width.

## 3. Layout Structure
- Use a single-column layout for all primary screens.
- Avoid complex grids; use cards and stacked sections.
- Allow content to breathe, avoid crowding near the bottom safe area.
- Floating Action Button is optional; avoid if a primary button fits naturally.

## 4. Color System and theme
- Use a light theme as default; dark theme can be added later.
- Base palette:
- `Primary`: `#1E6FFF`
- `Primary 700`: `#1453CC`
- `Primary 50`: `#E8F0FF`
- `Surface`: `#FFFFFF`
- `Surface Variant`: `#F5F7FB`
- `Background`: `#F3F5F9`
- `Text Primary`: `#0F172A`
- `Text Secondary`: `#475569`
- `Text Tertiary`: `#94A3B8`
- `Success`: `#16A34A`
- `Warning`: `#F59E0B`
- `Error`: `#DC2626`
- `Outline`: `#E2E8F0`
- `Focus`: `#93C5FD`
- Use color to signal state, not decoration.
- Primary color should appear in key actions, links, and active states only.
- Error states must use both color and text for accessibility.

## 5. Typography
- Font family: use a variable sans family with crisp geometry. Suggested: `Manrope` or `Space Grotesk`.
- If custom fonts are not available, fallback to `System`.
- Type scale:
- `Display`: 28 / 34, weight 700
- `Title`: 22 / 28, weight 600
- `Subtitle`: 18 / 24, weight 600
- `Body`: 16 / 24, weight 400
- `Body Emphasis`: 16 / 24, weight 600
- `Caption`: 13 / 18, weight 500
- `Overline`: 11 / 16, weight 600, uppercase, letter spacing 0.6
- Headings should use sentence case, not all caps.

## 6. Icons
- Use outline-style icons with subtle rounding.
- Icon sizes:
- `20dp` for inline actions
- `24dp` for primary actions
- `28dp` for feature highlights
- Always pair icons with labels for non-obvious actions.

## 7. Buttons
- Primary button:
- Height: `48dp`
- Corner radius: `12dp`
- Padding: `16dp` horizontal
- Fill: `Primary`
- Text: `Surface`
- Elevation: subtle (2dp)
- Secondary button:
- Height: `48dp`
- Corner radius: `12dp`
- Border: `1dp` `Outline`
- Text: `Text Primary`
- Background: `Surface`
- Tertiary button:
- Text-only, no background
- Color: `Primary`
- Button states:
- Default, Pressed, Disabled, Loading
- Pressed: darken fill by 8 percent, reduce elevation
- Disabled: reduce opacity to 40 percent
- Loading: replace label with inline spinner, keep width fixed

## 8. Inputs and Forms
- Text field height: `52dp`.
- Corner radius: `12dp`.
- Background: `Surface`.
- Border: `1dp` `Outline`.
- Focus: `2dp` `Focus` ring, border changes to `Primary`.
- Label style: `Caption` above field, `Text Secondary`.
- Error text: `Caption` with `Error` color, below field.
- Use inline helper text for password requirements.

## 9. Cards and Surfaces
- Default card:
- Radius: `16dp`
- Background: `Surface`
- Border: `1dp` `Outline`
- Shadow: soft 4dp blur, 10 percent opacity
- Use cards for file list items, activity logs, and permission summaries.

## 10. Lists
- List items are full-width.
- Use `12dp` vertical spacing between list items.
- Each item should have:
- Primary text, secondary text, trailing action.
- Trailing action is a `...` menu or icon button, never multiple icons.

## 11. Navigation
- Use bottom tabs for 3 to 5 primary sections.
- Recommended sections:
- Files
- Upload
- Activity
- Settings
- App bar:
- Height `56dp`
- Title in `Title` style
- Single leading icon for back
- Avoid multiple action icons; max 2 actions.

## 12. Motion and Micro-Interactions
- Standard animation duration: `180ms`.
- Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Page transitions: subtle slide in from right, 12dp offset + fade.
- Button press: scale down to 0.98 and return on release.
- List item press: ripple or highlight `Primary 50`.
- Upload progress:
- Use a linear progress bar with percentage label.
- Use smooth updates every 100ms if available.

## 13. Feedback and States
- Empty state:
- Icon, short message, and primary action.
- Example: "No files yet. Upload your first file."
- Success state:
- Show subtle success banner for 3 seconds.
- Error state:
- Use a dismissible error banner.
- Always include a user-facing remedy if possible.

## 14. Security Signals
- Use a small lock icon near file items to indicate encrypted.
- Use "Encrypted" as a badge, not a large label.
- Display last access timestamp in file details.

## 15. Accessibility
- Text contrast: minimum 4.5:1.
- Touch targets: minimum 48dp.
- Provide text alternatives for icons.
- Support dynamic type up to 120 percent without truncation.

## 16. Do and Do Not
- Do use whitespace to reduce cognitive load.
- Do show one primary action per screen.
- Do keep the language short and direct.
- Do Not use dense tables in mobile views.
- Do Not use multiple accent colors on the same screen.
- Do Not animate large background gradients.

## 17. Component Inventory
- Primary Button
- Secondary Button
- Tertiary Text Button
- Text Field
- Password Field with visibility toggle
- File List Item
- File Detail Card
- Activity Log Item
- Permission Badge
- Success Banner
- Error Banner
- Progress Bar

## 18. Content Voice
- Tone: precise, calm, confident.
- Use short verbs for actions: "Upload", "Download", "Remove".
- Avoid jargon in UI; security terms can appear in detail views only.

## 19. Example Screens
- Login
- Register
- Files List
- File Details
- Upload
- Activity
- Admin: Users
- Admin: Audit Logs
