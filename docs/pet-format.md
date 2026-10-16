# ChatGPT pet export

The default download is a single transparent PNG sprite sheet, **1536 × 1872 pixels**,
with eight columns and nine rows. Each frame is **192 × 208 pixels**. Upload this PNG
in ChatGPT web: **Settings → Personalization → Pet → Select pet → Upload pet**.
Availability depends on the account and workspace. ChatGPT's documented maximum is 20 MiB.

Source: [OpenAI's Pets guide](https://learn.chatgpt.com/docs/pets), checked October 16, 2026.

| Row | State | Frames |
| --- | --- | ---: |
| 0 | Idle | 6 |
| 1 | Run right | 8 |
| 2 | Run left | 8 |
| 3 | Wave | 4 |
| 4 | Jump | 5 |
| 5 | Failed | 8 |
| 6 | Waiting | 6 |
| 7 | Working | 6 |
| 8 | Review | 6 |

Each row starts at the left edge; unused cells remain completely transparent.
The sheet contains 57 occupied cells and 15 unused cells. The player and PNG exporter
use the same frame renderer, drawing the extracted Raft body, eyes and brows.
Animation adds squash, lean, gaze changes and a matching attached arm for waving.
The jump changes vertical position and returns to its resting baseline.

The installed first-party Pets plugin additionally accepts v2 sheets at 1536 × 2288,
adding sixteen clockwise look directions in rows 9 and 10. The renderer exposes this
as an optional API argument; the app downloads v1 because public web-upload docs
currently specify v1. No authenticated ChatGPT upload occurs inside this app.

ChatGPT desktop local pets and Codex local pets use a separate directory package
containing `pet.json` and the sprite sheet. This is different from ChatGPT web's
single-image upload. See the [official local package contract](https://github.com/openai/skills/blob/main/skills/.curated/hatch-pet/references/codex-pet-contract.md).

The app exports compatible geometry and original vector-derived motion. A successful
download does not prove acceptance or moderation by a particular ChatGPT account;
that requires uploading the resulting file in that account.
