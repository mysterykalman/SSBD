# SSBD as a standalone PWA

One codebase supports iPhone, iPad, Android phones/tablets and Mac. The app's
installed home-screen or Dock icon opens a standalone window.

## Installation

- iPhone / iPad: Safari > Share > Add to Home Screen > Add.
- Android: Chrome > Install app prompt, or menu > Install app / Add to Home screen.
- macOS Safari: File > Add to Dock, then launch from Dock, Spotlight or Applications.
  Chrome desktop uses its address-bar or browser-menu Install app control.

SSBD's Install app header action launches the native browser prompt when supported;
otherwise it shows device-specific instructions. It never interrupts play with an
automatic prompt. It hides after standalone installation. Pam's separate page also
supports installation and service worker registration.

## Guarantees and limits

- Solo keeps its existing offline-first gameplay, local save/resume and update prompt.
- Family / Play Together needs a network connection. Do not cache /api responses.
- Music follows browser user-gesture and autoplay restrictions. Offline audio is not
  guaranteed despite offline Solo gameplay working.
- No Supabase changes or new secret keys are needed.
- The app is installed from the existing production domain, without app stores.

## QA

Automated tests: manifest, Apple metadata, both shell pages, install dialog,
standalone detection and cached offline help. Run `npm run check`.
Device acceptance still requires manual testing on Safari iOS/iPadOS/macOS and
Android Chrome: icon, launch, portrait/landscape, music, navigation, updates,
Solo resume, and all four game modes.
