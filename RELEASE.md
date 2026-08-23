# Release Runbook — kv-netflix

How to ship an update to **all four distribution channels**. Every command
below is copy-paste ready. Paths assume the repo lives at
`/mnt/data/Package Center/kv-netflix` with siblings `spk/`, `spkrepo/`,
`.secrets.env` and `.venv-smb/` in `/mnt/data/Package Center`.

## The 4 channels users get updates from

| Channel | What | Who picks it up |
|---|---|---|
| GitHub Release (tag `v*` triggers CI) | `kv-netflix-mobile-*.apk` + TV APK | Android app in-app updater (also checks Forgejo) |
| Forgejo release (`git.khoavo.myds.me`) | same APKs, tagged with **app version** (`v1.4.x`) | Android app in-app updater |
| NAS Package Center (SPK) | `kvnetflix_x64-7.2_<ver>.spk` via spkrepo feed | DSM Package Center one-click update |
| Download site | stable-name files on `spk.khoavo.myds.me` linked from `pkg.khoavo.myds.me/package/kvnetflix` | manual downloaders |

## Versioning — three schemes, keep them straight

| What | Where | Example |
|---|---|---|
| Repo tag (GitHub Actions trigger) | git tag | `v9.2.1` |
| Android app version | `android-app/app/build.gradle.kts` → `versionCode` / `versionName`; also the Forgejo release tag | `13` / `1.4.2` |
| Docker image tag | `spk/apps/kvnetflix/build.conf` → `IMAGE_TAG` | `1.0.0-16` |
| SPK version | `build.conf` → `VERSION` | `1.0.0-17` |

Rule of thumb per release: bump `versionCode` (+1) and `versionName`
(+patch), then image = old SPK number, SPK = old SPK number + 1.

> ⚠️ The in-app updater compares remote tag vs installed `versionName`.
> Bump `versionCode`/`versionName` **before** tagging, or phones won't see
> the update.

## Step-by-step

```bash
cd "/mnt/data/Package Center/kv-netflix"
PC="/mnt/data/Package Center"
PY="$PC/.venv-smb/bin/python"

# 0. Bump versions + changelog
#    - android-app/app/build.gradle.kts : versionCode, versionName
#    - CHANGELOG.md entry
#    - spk/apps/kvnetflix/build.conf is bumped later by release.sh (don't edit)

# 1. Commit and push both remotes, then tag (tag drives APK builds)
git add -A && git commit -m "..."
git push origin main && git push github main
git tag -a v9.X.Y -m "..." && git push origin v9.X.Y && git push github v9.X.Y

# 2. Wait for "Release APKs" workflow to finish (~10 min), verify assets:
curl -s https://api.github.com/repos/vndangkhoa/kv-netflix/releases/tags/v9.X.Y \
  | python3 -c "import json,sys; [print(a['name']) for a in json.load(sys.stdin)['assets']]"

# 3. Create the Forgejo release (app-version tag) with both APKs.
#    Download APKs from GitHub first, then use $PY with requests +
#    FORGEJO_TOKEN from .secrets.env:
#      POST /api/v1/repos/vndangkhoa/kv-netflix/releases  {tag_name: "v1.4.Z"}
#      POST /api/v1/repos/.../releases/{id}/assets?name=NAME  (multipart field: attachment)
#    Asset names follow kv-netflix-mobile-v1.4.Z.apk / kv-netflix-tv-v1.4.Z.apk.

# 4. Build & push Docker image to all registries + release SPK +
#    activate build + mirror + clear DSM cache (one command):
cd "$PC/spk"
./ship.sh kvnetflix all <image-tag> <spk-ver>     # e.g. ./ship.sh kvnetflix all 1.0.0-16 1.0.0-17
#    Requires: docker running, .secrets.env present.

# 5. Mirror APKs to the download site under stable names + refresh page size labels:
"$PY" tools/kvfiles.py apk kvnetflix <phone.apk> <tv.apk> --restart

# 6. Verify everything:
#    - feed shows new SPK version:
curl -s "https://pkg.khoavo.myds.me/nas?arch=x86_64&major=7&minor=2&build=64570&language=enu" \
  | python3 -c "import json,sys; print([p['version'] for p in json.load(sys.stdin)['packages'] if p['package']=='kvnetflix'])"
#    - page labels match real file sizes:
curl -s https://pkg.khoavo.myds.me/package/kvnetflix | grep -o "Phone APK ([^)]*)"
```

## Gotchas (learned the hard way)

- **Page size labels are hardcoded text** in the spkrepo template. After
  changing any APK/SPK on the share run `kvfiles.py labels` (or use
  `kvfiles.py apk ... --restart`), or the page will lie about sizes.
- **The NAS serves its own copy** of templates at
  `/volume2/docker/spkrepo/templates-override/` — editing the local
  `Package Center/spkrepo/` checkout changes nothing until you push it to
  the share. `kvfiles.py labels` patches both.
- `origin` = Forgejo (`git.khoavo.myds.me`), `github` = GitHub. Push **both**;
  only GitHub runs the APK release workflow (CI/CD workflow was removed as
  useless — don't re-add it).
- Release builds are R8-minified since v9.2.1. New dependencies using
  reflection need rules in `android-app/app/proguard-rules.pro`.
- Backend deploys to the NAS require a Docker image push; the SPK only pins
  the tag name (`IMAGE_TAG`), so never reuse an existing image tag with
  different content.
- Streaming proxy contract (mobile app depends on it): `/api/stream?url=…`
  must pass through non-200 upstream responses untouched (dead CDNs return
  HTML that must NOT be rewritten as HLS playlists).

## Tools cheat-sheet

| Tool | Purpose |
|---|---|
| `spk/tools/kvfiles.py` | list/put/get/rm files on download share; `apk`, `labels`, `restart` commands |
| `spk/ship.sh` | `image` (build+push 3 registries), `spk` (bump+build+upload+activate+mirror), `all` |
| `spk/tools/ssh-run.py` | run shell commands on NAS over SSH (sudo handled) |
| `$PC/.venv-smb/bin/python` | interpreter with smbprotocol/paramiko/requests |
