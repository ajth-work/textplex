# TextPlex PWA and Mobile App Path

## Purpose

TextPlex should remain a web-first product while keeping a practical path toward dedicated iOS and Android apps. The preferred evolution is:

```text
Next.js website
      │
      ▼
Mobile-responsive TextPlex
      │
      ▼
TextPlex PWA
Installable + offline reading
      │
      ▼
Capacitor mobile shell
       ├── iOS app
       └── Android app
```

Most of the work in the first two phases is useful later. The goal is to solve mobile layout, offline books, authentication, progress sync, and caching before adding store distribution, signing, review, and native tooling.

## What a TextPlex PWA would be

A Progressive Web App is the existing website enhanced so that a user can install it from Safari or Chrome:

```text
textplex.com
     ↓
Add to Home Screen
     ↓
TextPlex icon on the phone
     ↓
App-style window without normal browser controls
```

The PWA can provide an app-like experience without an App Store or Google Play submission. A properly designed PWA can support, where the platform and browser permit it:

- Home-screen installation
- Full-screen or app-style presentation
- Offline reading
- Cached books, pages, images, and audio
- Local settings and reading position
- Background resource caching
- Notifications
- Audio playback and pronunciation
- File importing
- Share functionality
- Automatic web-application updates

The exact native capability set varies between iOS and Android browsers, so PWA support should be treated as progressive enhancement rather than a promise of identical platform behavior.

## PWA update model

The main advantage is the update path:

```text
Change TextPlex code
        ↓
Push to GitHub
        ↓
Deploy the website
        ↓
Installed PWA receives the new web version
        ↓
No App Store submission
No Google Play submission
```

This makes the PWA a strong intermediate product. It also gives TextPlex a way to test mobile usage and offline behavior before committing to store-specific release work.

## Offline reading and synchronization

A downloaded TextPlex book should eventually behave approximately like this:

```text
TextPlex server
      ↓
Download book package
      ↓
┌──────────────────────────┐
│       User's phone       │
│                          │
│ Book metadata            │
│ Pages and images         │
│ Vocabulary data          │
│ Audio, when available    │
│ Reading position         │
└──────────────────────────┘
      ↓
Works without internet
      ↓
Reconnect
      ↓
Sync reading progress and learning events
```

Book truth should remain separate from learner truth:

- Book content, page data, images, and lexical annotations remain book data.
- Reading sessions, word interactions, exposure, and progress remain user-profile data.
- Offline events need a local queue and conflict-safe synchronization when connectivity returns.

## Website, PWA, and store app comparison

| Capability | Website | PWA | Capacitor/store app |
|---|---:|---:|---:|
| Mobile UI | Yes | Yes | Yes |
| Home-screen icon | No | Yes | Yes |
| Automatic web-code updates | Yes | Yes | Limited |
| Offline reading | Possible | Strong fit | Strong fit |
| Notifications | Limited | Platform-dependent | Stronger |
| Local files | Limited | Better | Strong |
| Native APIs | No | Limited | Yes |
| App Store distribution | No | Not normally | Yes |
| Google Play distribution | No | Not normally | Yes |
| Deep operating-system integration | No | Limited | Stronger |

## The later Capacitor path

Capacitor can package a web-focused application for iOS and Android while providing access to native APIs when needed. TextPlex would retain a shared web UI and add a native project around it rather than building two unrelated applications.

The expected release flow would be:

```text
Push a change
      ↓
Run web, API, and mobile checks
      ↓
Deploy the website
      ↓
Build iOS and Android artifacts automatically
      ↓
Upload iOS build to App Store Connect/TestFlight
      ↓
Upload Android App Bundle to Google Play testing
      ↓
Review and roll out the store releases
```

This can be automated with CI, but store publication is not simply an import from the website. Apple and Google still require platform-specific signed builds, release metadata, testing, and distribution steps.

## Which changes update immediately later

Once TextPlex has packaged apps, changes fall into two categories:

| Change | Website | Installed app |
|---|---|---|
| API responses and server-side data | Immediate after deployment | Immediate when the app requests the API |
| Book catalog and hosted content | Immediate after deployment | Immediate, subject to local cache rules |
| React components, styles, and navigation bundled into the app | Immediate | Requires a new mobile build |
| Native permissions and integrations | Not applicable | Requires a new mobile build and store distribution |
| App-shell security or offline-cache behavior | Not applicable | Requires a new mobile build and store distribution |

The mobile app can be designed to receive server-side content and API improvements quickly, but it should not be assumed that arbitrary new application code can bypass store review. The native package remains a versioned, signed artifact.

## Store-readiness considerations

A simple remote website wrapper would be easy to build but is a weak long-term strategy. Apple says an app should provide features, content, and UI beyond a repackaged website, and Google Play expects stable, meaningful app functionality. TextPlex should therefore offer a genuine mobile reading experience before submitting a store app.

Potential store-specific value for TextPlex includes:

- Offline book and page access
- Fast tap-to-define reader interactions
- Native audio and pronunciation behavior
- Reading-progress synchronization
- Share-sheet integration
- Deep links to books, pages, and saved vocabulary
- Reading reminders or notifications
- Mobile-specific reader controls

## Preparation work for the current web app

The current architecture already has useful foundations: a separate API boundary, configurable API origins, Supabase authentication, and static-export support. Future work should preserve these boundaries and add:

1. Stable API contracts that work for web, PWA, and mobile clients.
2. Server-authoritative progress rather than treating browser storage as the source of truth.
3. A mobile-safe book download and cache format instead of relying on direct access to server files.
4. A local offline-event queue with retry and conflict handling.
5. Responsive reader controls designed for narrow screens and touch.
6. A clear separation between shared web UI and native integrations.
7. A future `apps/mobile/` project or equivalent Capacitor project.
8. CI workflows that build and test the web app and, later, produce iOS and Android artifacts.

## Recommended decision

Do not start with App Store or Google Play packaging. Make the existing Next.js app excellent on mobile, then add PWA support and offline reading. Once that experience is valuable and stable, add Capacitor as a native shell for the specific capabilities and distribution benefits that the PWA cannot provide.

This approach keeps one product experience, makes web updates immediate, minimizes duplicated UI work, and leaves a credible path to dedicated marketplace apps.

## References

- [Capacitor documentation](https://capacitorjs.com/docs)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple App Store Connect: Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)
- [Google Play: Functionality, Content, and User Experience](https://support.google.com/googleplay/android-developer/answer/9898783)
- [Google Play: Update or unpublish your app](https://support.google.com/googleplay/android-developer/answer/9859350)
