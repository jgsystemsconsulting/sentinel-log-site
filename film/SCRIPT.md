# Sentinel Log — narration script (~75 s)

**Product:** Sentinel Log, by JG Systems Consulting  
**Voice:** Kokoro `bm_george` (British English, measured), speed 0.90  
**Spelling:** British English  
**Picture:** 1920×1080, 24 fps, dark-keynote base (navy/graphite + amber golden-thread accent)  
**Total target:** 75.0 s

---

## Scene table

| # | t0–t1 (s) | Dur | Picture | Narration (spoken) | On-screen text |
|---|-----------|-----|---------|--------------------|----------------|
| 1 | 0.0–8.0 | 8.0 | Scattered spreadsheet tiles, Word docs, PDF stubs, chat exports drift on a dark grid; red warning badges pulse; no shared order. | Hazard records live in spreadsheets, shared drives and email threads. | *none* (cursor types later) |
| 2 | 8.0–14.5 | 6.5 | Amber caret appears; freeze; one snap beat pulls every tile onto a register grid. Golden thread begins as a thin amber path. | The golden thread is lost. | `THREAD LOST` badge clears → `LINKED` |
| 3 | 14.5–22.0 | 7.5 | Extreme close-up: hazard card **HAZ-014 · Tritium release** locks in. Amber caret underlines the ID. | One system holds every hazard in place. | HAZ-014 · Tritium release |
| 4 | 22.0–32.0 | 10.0 | Signature shot: horizontal golden thread stitches **Hazard → Cause → Control → Evidence → Residual risk**. Nodes light in order (fusion examples: liquid lithium fire; breeder blanket coolant loss; magnet quench as side labels). | Cause. Consequence. Control. Evidence. Residual risk. Linked end to end. | Node labels on the thread |
| 5 | 32.0–42.0 | 10.0 | Register view: multi-row hazard log (HAZ-014, HAZ-021, HAZ-033…), severity chips, control counts, evidence ticks; lateral camera track. | A living register with a full audit trail, baselines and configurable risk matrices. | Register header: SENTINEL LOG |
| 6 | 42.0–52.0 | 10.0 | Senior plan-on-a-page: one panel — open hazards, residual risk bands, overdue actions, evidence coverage — soft light reveal. | Senior leaders see the whole programme on a single page. | PLAN ON A PAGE |
| 7 | 52.0–62.0 | 10.0 | Quiet wide: product running on-prem tile stack (Import Excel/CSV/JSON · Export · Air-gapped · Apache-2.0). Put-away of clutter until one amber thread remains. | Self-hosted. Open source. On-prem or air-gapped. No lock-in. | badges: Apache-2.0 · On-prem · Import/Export |
| 8 | 62.0–75.0 | 13.0 | End card on navy stage: wordmark + tagline; by-line. Hold ≥ 4 s after last word. | Sentinel Log. Every hazard. Every control. Every piece of evidence. One golden thread. | **Sentinel Log** / Every hazard. Every control. Every piece of evidence. / One golden thread. / by JG Systems Consulting |

---

## Narration lines (TTS / `.srt` source)

Spell numbers out for TTS; digits on screen.

| id | t0 | approx dur | voice text | subtitle text |
|----|----|------------|------------|---------------|
| L01 | 0.6 | ~5.5 s | Hazard records live in spreadsheets, shared drives and email threads. | Hazard records live in spreadsheets, shared drives and email threads. |
| L02 | 8.4 | ~2.2 s | The golden thread is lost. | The golden thread is lost. |
| L03 | 15.0 | ~3.5 s | One system holds every hazard in place. | One system holds every hazard in place. |
| L04 | 22.4 | ~6.5 s | Cause. Consequence. Control. Evidence. Residual risk. Linked end to end. | Cause. Consequence. Control. Evidence. Residual risk. Linked end to end. |
| L05 | 32.6 | ~6.8 s | A living register with a full audit trail, baselines and configurable risk matrices. | A living register with a full audit trail, baselines and configurable risk matrices. |
| L06 | 42.6 | ~5.5 s | Senior leaders see the whole programme on a single page. | Senior leaders see the whole programme on a single page. |
| L07 | 52.6 | ~5.5 s | Self-hosted. Open source. On-prem or air-gapped. No lock-in. | Self-hosted. Open source. On-prem or air-gapped. No lock-in. |
| L08 | 62.4 | ~8.5 s | Sentinel Log. Every hazard. Every control. Every piece of evidence. One golden thread. | Sentinel Log. Every hazard. Every control. Every piece of evidence. One golden thread. |

*Timings above are picture locks; final t0 shifts after Kokoro `dur.json` + ASR word stamps. Hold each caption ≥ max(1.8 s, speech + 0.6 s).*

---

## Beat sheet (picture lock, 24 fps)

- **0.0** black → stage + hairline grid  
- **0.4** first file tile spawns; cascade accelerates to ~t=6  
- **7.2** red badges peak; dutch tilt ~2°  
- **8.0** digital silence; amber caret blink  
- **9.0–10.5** snap-grid (native move); trail colour = amber only  
- **14.5** dive into HAZ-014  
- **22.0** pull to thread plane (signature)  
- **22.5 / 24.2 / 26.0 / 27.8 / 29.6** nodes light: Hazard, Cause, Control, Evidence, Residual  
- **32.0** expand into register  
- **42.0** collapse into plan-on-a-page; light reveal  
- **52.0** put-away to product truth badges  
- **62.0** end card; tagline lands; by-line at 70; hold to 75  

---

## Illustrative data (fictional; no client names)

| ID | Title | Notes on screen |
|----|-------|-----------------|
| HAZ-014 | Tritium release | primary thread subject |
| HAZ-021 | Liquid lithium fire | register row |
| HAZ-033 | Breeder blanket coolant loss | register row |
| HAZ-041 | Magnet quench | register / side label |

---

## Hard constraints (binding)

- Never mention UKAEA, LIBRTI, T081MN26 or any client.  
- Present tense; product already exists.  
- No invented stats, customers or certifications.  
- Accent colour only on the golden thread and confirmations.  
- End card must include: *by JG Systems Consulting*.  

---

## Voice sample (checkpoint)

Opening line only → `voice-sample.wav`:

> Hazard records live in spreadsheets, shared drives and email threads.
