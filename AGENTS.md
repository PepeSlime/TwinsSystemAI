<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Characters are shared team data in the Cloud `characters` table (no login, open RLS for anon by design as an internal tool) with files in the private `characters` bucket via long-lived signed URLs; all access goes through src/lib/store.ts. Scale settings stay per-browser in localStorage.
- Scale math lives in src/lib/scale.ts with tests alongside; keep formulas there.
