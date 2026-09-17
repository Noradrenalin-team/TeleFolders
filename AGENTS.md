## TeleFolders v1

Spec and work plan: [docs/tz/ТЗ.md](./docs/tz/ТЗ.md), [docs/tz/ПЛАН.md](./docs/tz/ПЛАН.md). Read them before starting a task from the plan.

**Layer rule:** `@mtcute/*` is imported only inside `src/telegram/`. A component never imports `@mtcute/*` directly — it calls a hook from `src/queries/`, which calls a function from `src/telegram/`. This keeps components mockable in Storybook and tests. `tsc`/lint should stay clean; `routeTree.gen.ts` and `src/paraglide/**` are generated and must not be hand-edited.

<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->
