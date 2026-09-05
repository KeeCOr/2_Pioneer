# Pioneer — IARC Rating Questionnaire Guide

**Game:** Pioneer (v1.8.2)
**Developer:** Stoicent
**Platform:** Steam (Windows, Singleplayer)
**Date prepared:** 2026-09-05

---

## What is IARC?

The International Age Rating Coalition (IARC) is the rating system used by Steam and most digital storefronts. You complete a questionnaire through the Steam Developer portal, and IARC automatically generates ratings for ESRB (North America), PEGI (Europe), USK (Germany), ClassInd (Brazil), and others simultaneously.

Access the IARC questionnaire at:
`Steamworks > App Admin > [Your App] > Store Presence > Content Survey`

---

## Expected Rating Outcome

| Rating Body | Expected Rating | Descriptor |
|-------------|----------------|------------|
| ESRB | **E (Everyone)** | No applicable descriptor |
| PEGI | **PEGI 3** | No applicable descriptor |
| USK | **USK 0** | |
| ClassInd | **L (Livre / General)** | |
| ACB (Australia) | **G (General)** | |

Pioneer is a trade and fleet management simulation with no violence, combat, or mature content. It is one of the cleanest possible IARC profiles for a strategy game.

---

## IARC Questionnaire — Recommended Answers

### Section 1: Violence

**Does the game contain violence?**
- Select: **No**

**Justification:** Pioneer is a merchant trade simulation. Gameplay consists of buying and selling commodities across ports, managing fleet routes, hiring crew, and reading market price history. There is no combat system, no conflict between characters, and no violent imagery or events.

> **Note on "risk levels" per port:** Ports have associated risk levels (a design element for market volatility and trade difficulty). These are abstract economic modifiers — not depictions of piracy, battle, or harm. No violent event is shown to the player.

### Section 2: Sexual Content

**Does the game contain sexual content, nudity, or romantic themes?**
- Select: **No**

### Section 3: Language

**Does the game contain strong language, profanity, or crude humor?**
- Select: **No**

### Section 4: Drug and Alcohol References

**Does the game contain references to or depictions of drugs, alcohol, or tobacco?**
- Select: **No**
- Note: Tradeable goods (spices, cloth, and similar commodities) are historical maritime trade goods with no drug connotation in the game's context.

### Section 5: Horror / Fear

**Does the game contain horror elements, intense fear, or disturbing imagery?**
- Select: **No**

### Section 6: Gambling

**Does the game contain gambling mechanics, simulated gambling, or random reward mechanics that could be considered gambling?**
- Select: **No**

**Justification on market randomness:** Pioneer's dynamic market system (price micro-fluctuations, player-impact pricing, hourly market events) introduces economic uncertainty. This is a simulation mechanic — the player trades real in-game goods for in-game currency with no randomized reward purchase (no loot boxes, gacha, or real-money randomization). This does not meet the definition of simulated gambling under IARC guidelines.

### Section 7: Online Features

**Does the game support online multiplayer or user-generated content sharing?**
- Select: **No** — Pioneer is a fully offline, singleplayer game.

**Does the game collect personal data?**
- Select: **No**

### Section 8: In-App Purchases

**Does the game offer in-app purchases?**
- Select: **No**

---

## Content Summary for Rating Justification

Use this text in any freeform justification fields:

> Pioneer is a singleplayer, offline ocean trade and fleet management simulation. Players buy and sell commodities across 29 ports, manage crew and vessels, and navigate a dynamic economic system. There is no violence, combat, sexual content, profanity, horror, drug references, gambling mechanics, or in-app purchases. The dynamic market (price fluctuations and market events) is a simulation mechanic involving no real-money randomization. The game is entirely offline and collects no user data.

---

## Post-Rating Checklist

- [ ] IARC questionnaire submitted through Steamworks
- [ ] Rating certificate generated and stored (Steamworks saves this automatically)
- [ ] Rating icons displayed correctly on the Steam store page
- [ ] "Content Descriptors" field on store page confirmed (expect no descriptors for E/PEGI 3 with no violence)
- [ ] Privacy Policy URL entered in Steamworks App Admin
- [ ] Age-gating settings reviewed (not required for E/PEGI 3, confirm in Steamworks)

---

## Notes for Future Versions

If any of the following content is added in future updates, re-run the IARC questionnaire:

- Online multiplayer, leaderboards, or PvP features
- In-app purchases, premium currency, or loot boxes
- User accounts or data collection (e.g., cloud saves with analytics)
- Naval combat, piracy, or conflict mechanics with visual depiction
