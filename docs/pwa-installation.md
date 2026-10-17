# SSBD installed-app release and acceptance

SSBD shares a single PWA across iPhone, iPad, Android phones/tablets and Mac.
Its icon opens standalone with existing game state, colour and voice settings.
Install controls are offered only in browser mode; installed windows do not show them.

## Installation

- iOS/iPadOS: Safari > Share > Add to Home Screen > Add. Keep **Open as Web App**
  enabled if the platform offers it. Recent iOS versions also support this from
  other browsers' Share menus.
- Android: Chrome > Install app (native prompt if eligible), or browser menu >
  Install app / Add to Home screen.
- Mac Safari: File > Add to Dock; open from Dock, Spotlight or Applications.
  Chrome desktop also has Install app in its browser menu.
- Chromium app shortcuts include Don't Tell Me (Pam), a dedicated `/mom/` document.

## Offline and updates

- Solo and Pam preserve their existing offline gameplay and local save behaviour.
- Family / Play Together always uses the live API and needs an internet connection.
- Audio is never automatically downloaded merely by opening the web page. When
  music successfully plays **in an installed app**, its MP3 is cached in a
  separate versioned cache, unless the browser reports Data Saver is enabled.
  The worker honours audio byte-range requests for playback without internet.
  Failed media caching never prevents normal gameplay.
- The worker uses network-first navigation and versioned shells. The Home screen
  offers Reload on updates; Pam now shows a dismissible Update notification,
  without suddenly refreshing an active question.
- Audio still follows iOS/Android browser user-gesture rules; install cannot
  bypass system autoplay restrictions.

## QA requirements

Run `npm run build`, the dedicated browser PWA suite and existing offline/update
browser tests with PostgreSQL when available. Test Chrome phone/tablet viewports,
desktop, offline re-open, app icons, fixed viewport widths, source update, audio
byte-range responses, and all documented entrypoints.

Real-device sign-off is still required for OS-level Add to Home Screen, Safari
Add to Dock, background/audio interruptions, device orientation/keyboard
behaviour and standalone launches. WebKit/Chromium emulation is meaningful
regression coverage but is not a physical-device certification.

Pam's audio settings script and resume helper are also explicitly precached to avoid
relying on incidental browser HTTP-cache hits during a cold offline launch.
