# 20Q prototype

This is a separate, browser-only experiment served at `/20Q`. It is not linked to the existing Solo or Together modes and makes no API/database requests. The original SSBD home page and gameplay are unchanged.

The starter knowledge base contains 78 possible answers and 26 attributes. Its values and questions were adapted from [FergusGriggs/20q](https://github.com/FergusGriggs/20q) (MIT, copyright 2018 FergusGriggs). The source is a small experimental dataset, not a general-purpose AI model. Some answers may be unreliable and the game cannot guess objects missing from its knowledge base. The original license is included in `src/client/twentyq/LICENSE-FergusGriggs.txt` and copied to the public `/20Q/LICENSE.txt` route.

### Isolation and removal

All gameplay logic, data, HTML, styles, and service worker live in `src/client/twentyq/`. The only changes outside that directory are the static build outputs in `scripts/build.mjs`, the two route rewrites and two headers in `vercel.json`, and independent tests. Remove those hooks and this directory to remove the experiment. The original game code, root service worker, Supabase, and Family API are untouched.

The /20Q client has a separate service worker scoped to `/20Q` so its offline cache cannot control the main game. It precaches its own static HTML, JS, CSS, and license after the first successful online visit. The core reasoning runs on-device with no API.
