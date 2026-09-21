# Defense in Depth

Tracking against https://github.com/jaredwray/agentic/blob/main/skills/security/defense-in-depth-nodejs/SKILL.md.

Profile: npm library · public

## 1. Security docs

- [x] `SECURITY.md` present — contact info + "How this repository is secured" summary — PR #175
- [x] `DEFENSE_IN_DEPTH.md` present (this file) — PR #175

## 2. CODEOWNERS and cloud bootstrap

- [ ] `.github/CODEOWNERS` covers `/.github/`, `/.vscode/`, `/.cursor/`, `/.devcontainer/`, `/scripts/` with owners the maintainer names (PR pending)
- [x] Codespaces and Cursor Cloud Agents bootstrap Aikido Safe Chain via scripts/setup-cloud-environment.sh (--ci shims, frozen lockfile) — PR #185
- [x] Dev Container `image` pinned by digest (`name:<tag>@sha256:<digest>`; not a floating tag) — PR #208

## 3. Dependencies (pnpm)

- [x] `packageManager: pnpm@11.3+` pinned in `package.json` — verified `pnpm@12.4.1+sha512.2e81e399d73fe8390dab25e06aa788ab7a5908248d2f5a370f82b481147a6a7a367bf8048f9a6fdb6460f21a66f0542dedb8b94ca2c8723596741920b1656d4c`
- [x] 7-day cooldown: `minimumReleaseAge: 10080`, `minimumReleaseAgeStrict: true`, `minimumReleaseAgeIgnoreMissingTime: false`; no first-party `minimumReleaseAgeExclude` — PR #186
- [x] `trustPolicy: no-downgrade`; no first-party `trustPolicyExclude` — PR #187
- [x] Lifecycle scripts blocked: `strictDepBuilds: true`, `dangerouslyAllowAllBuilds: false`, `allowBuilds: {}` baseline — verified (third-party `allowBuilds` exceptions: esbuild, sharp, unrs-resolver, workerd)
- [x] `blockExoticSubdeps: true` — verified
- [x] Lockfile committed; CI installs with `pnpm install --frozen-lockfile` — verified
- [x] No `.github/dependabot.yml`; other dependency-update tools (if any) open PRs only — never auto-merge — verified

## 4. GitHub Actions

- [x] `permissions: contents: read` (or `{}` + per-job grants) on every workflow — verified
- [x] No `contents: write` except jobs whose purpose is mutating the repo (GitHub Release, Changesets version PR); generated output is a workflow artifact, never committed back from CI — verified
- [x] Every action pinned to a full commit SHA (`npx actions-up`) — PR #188
- [x] Every job installs Socket Firewall (`SocketDev/action` SHA-pinned, `firewall-version` pinned); `pnpm install` / `npm install` run as `sfw pnpm install` / `sfw npm install` — PR #189
- [x] `.github/workflows/check-workflows.yaml` lints workflows with zizmor on every PR — PR #190
- [ ] Workflow `name:` and job `name:` contain no spaces (kebab-case) so they can be set as required status checks (PR pending)
- [x] `persist-credentials: false` on checkouts that don't push — PR #191
- [x] No `pull_request_target` on workflows that run untrusted PR code — verified
- [x] Artifact-publishing workflows disable `actions/setup-node` default caching (`package-manager-cache: false`) to prevent cache poisoning — PR #192
- [x] No npm tokens (or other registry credentials) in Actions secrets — verified (no npm/registry tokens in workflow YAML; publish uses OIDC `id-token`)

## 5. npm publishing — npm libraries only

- [x] OIDC trusted publishing configured **stage-only** on npmjs.com for the publish workflow — it can stage, never publish live (manual) — verified (maintainer)
- [x] `.github/workflows/release.yaml` packs then stages with `pnpm stage publish ./packed/*.tgz --no-git-checks` — PR #193
- [x] Maintainer promotes staged versions with 2FA (manual) — verified (maintainer)
- [x] Drydock connected — staged releases reviewed before promotion (manual) — verified (maintainer)
- [x] No direct publish rights: package requires 2FA and disallows tokens (manual) — verified (maintainer)
- [x] `package.json` `repository.url` accurate so provenance maps to this repo — verified

## 6. Security tooling

- [x] Aikido runs on every build — verified (Aikido Security GitHub app on pull requests)
- [x] Aikido release gate: the release workflow's stage-publish job `needs:` a passing `scan-release` — PR #194
- [x] Socket reviews every PR that changes dependencies — verified (Socket Security GitHub app on pull requests)

## 7. Repository lockdown

- [x] Phishing-resistant 2FA (passkeys / hardware keys) on the GitHub and npm accounts (manual) — verified (maintainer)
- [x] Recovery codes stored offline in a password manager (manual) — verified (maintainer)
- [x] `lockdown-repo.sh` applied by a repo admin (never committed to this repo) — PR #195. Latest `--check` (`--required-checks "test,zizmor"`, `--allowed-actions "codecov/*,cloudflare/*"`) still fails the branch ruleset: it has no owner `pull_request` bypass. The tag ruleset has no repository-admin bypass. Remaining settings were unreadable here (non-admin token, HTTP 403). Admin re-apply is still required.
