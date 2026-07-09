# json-drop SDK feedback

## Context: how this app uses json-drop

The app is **Shared Expenses**, a single-page Preact frontend where 2+ people track shared spending and settle up balances. Today the data (`{ people, expenses, payments }`) lives in `localStorage` and gets imported/exported via JSON files. We're integrating json-drop so multiple people on separate devices can view and edit the same expense file, and so it persists across devices without manual import/export.

Usage pattern we're targeting (with the current API):

- The user enters their **json-drop server URL + project id + token** on the frontend (these are NOT baked into the bundle — they're stored in `localStorage` after the user pastes them).
- The user may have **multiple shared-expense "files"** (e.g. "Spain trip 2026", "Apartment with Ana"). Each file is the full `{ people, expenses, payments }` document. We store each file as **one path-addressed json-drop doc** under a per-app prefix, e.g. `shared-expenses/<slug>` within the project. The app lists docs under that prefix to let the user choose among existing files or create a new one.
- All edits (add expense, add person, add payment) are **client loads the whole doc → modifies in-memory → PUTs the whole doc back**. This is the load-modify-write pattern the current `set()` supports, and it's the pattern that makes #1 below a real problem.
- Reads are mostly anonymous (anyone with the project id can read public docs); writes require the token (owner) or a per-doc `access_secret` (for the `public_read_secret_write` mode).
- The app is single-document — there's no per-row update on the server; json-drop just holes one JSON blob per file. That's fine and intentional; it keeps the server simple.

Given that, here's what's missing or awkward in the SDK (v0.1.0) for this use case.

---

## Suggestions

### 1. Optimistic concurrency control (the big one)

Right now `doc(path).set(content)` is a blind full overwrite. For a shared file edited from two devices, the second save silently destroys the first's changes, and there's no way for the caller to even detect a stale read — `Doc` has no version field.

Suggest:
- Add `version` (or `etag`) to `Doc` returned by `get()` / `list()`.
- Accept `ifMatch` on `set()` / `delete()` → server returns `409 Conflict` on mismatch.
- SDK surfaces this as a stable error code (see #2) so the frontend can re-read, merge, and retry.

This is the difference between "the app will silently lose my data" and "safe to ship." One user editing a transaction while another adds a person is the canonical breakage.

### 2. Stable error codes on `JsonDropError`

Frontends want `switch (e.code)`, not `if (e.status === 401 && e.message === 'Not authenticated')`. Suggest adding a stable `code` field derived server-side:

```ts
code: 'unauthenticated' | 'not_found' | 'forbidden' | 'conflict' | 'rate_limited' | 'server'
```

`message` stays for humans. This pairs with #1 (conflict detection) and makes all error handling in the frontend branch cleanly.

### 3. `add()` / `set()` return a ref, not just data

Firebase's `addDoc` returns a `DocumentReference` you can read/update later. Currently every caller must extract `.id` or `.path` and pass it back to the right method — and there are two different ones (`collection.doc(id)` vs `db.doc(path)`), easy to confuse.

Suggest the result include a bound `ref`:
```ts
const note = await notes.add({ ... })   // { ...result, ref }
await note.ref.get()
await note.ref.set({ ... })
await note.ref.delete()
```
Lowest-effort DX win in the list.

### 4. `list()` ordering + prefix echo

For the "choose among existing files" UI we need predictable order. Currently ordering is undocumented, and `list()` returns `prefix: null` even when called via `collection('expenses').list()` — that echo could be used for grouping.

Suggest:
- Guarantee order server-side (e.g. `created_at DESC`) and document it, OR expose `list({ prefix, orderBy, limit, cursor })`.
- Echo the effective `prefix` back in the `ListDocsResult`.

### 5. `me()` shouldn't throw in guest mode

A token-less frontend (someone reading a public doc) wants to read without first calling `me()`, but the only way to know "am I authenticated?" is to call `me()` and catch — awkward. Suggest either:
- Add `db.isAuthenticated()` (cheap `/api/me` with HEAD), or
- Make `me()` return `null` on 401 instead of throwing.

Minor, but it removes a round-trip + try/catch boilerplate from every page load.

### 6. (Optional, bigger) `onSnapshot(path, cb)` live updates

Long-poll or SSE-backed, ref-callback like Firestore. This is what makes a shared expense file *feel* shared — the other person adds an expense and it appears live. Skip if v0.1; headline feature for v0.2.

---

## Recommended order

1. **#1 + #2 together** (cheap server-side, unblock everything frontend-side)
2. **#3** (front-end DX)
3. **#4** (needed before the file-picker UI is solid)
4. **#5** (10-minute change)
5. **#6** (whenever you want the real-time feel)

## Not worth adding

- `update()` / merge — read-modify-write in the client is fine until #1 ships.
- Transactions — overkill for a single-blob store.
- Generic typing of collection contents — cosmetic.