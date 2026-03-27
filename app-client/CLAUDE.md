# App Client — Angular 21

## Quick Start

```bash
pnpm --filter app-client start   # dev server
pnpm --filter app-client test    # run tests
pnpm --filter app-client build   # production build
pnpm --filter app-client lint    # lint
```

## Architecture

- **Standalone components only** — no `NgModule`
- **Zoneless change detection** — zone.js is excluded; never depend on Zone.js side effects
- Bootstrap via `bootstrapApplication` with `ApplicationConfig` and function-based providers

## Project Structure

```
src/app/
├── app.ts / app.html / app.scss   # Root component
├── app.config.ts                  # ApplicationConfig with providers
├── app.routes.ts                  # Top-level route definitions
├── core/                          # Singleton services, interceptors, guards
├── shared/                        # Reusable components, directives, pipes, models
└── features/                      # Feature folders (lazy-loaded)
```

## Naming Conventions

Angular 21 drops the `.component` suffix in file and class names.

| Artifact    | File name              | Class/function name |
| ----------- | ---------------------- | ------------------- |
| Component   | `user-profile.ts`      | `UserProfile`       |
| Template    | `user-profile.html`    | —                   |
| Styles      | `user-profile.scss`    | —                   |
| Service     | `auth.service.ts`      | `AuthService`       |
| Guard (fn)  | `auth.guard.ts`        | `authGuard`         |
| Interceptor | `auth.interceptor.ts`  | `authInterceptor`   |
| Pipe        | `truncate.pipe.ts`     | `TruncatePipe`      |
| Directive   | `tooltip.directive.ts` | `TooltipDirective`  |
| Model/type  | `user.model.ts`        | `User`              |
| Routes      | `<feature>.routes.ts`  | `routes`            |
| Spec        | `<name>.spec.ts`       | —                   |

## Key Patterns

### Signals & Reactivity

- `signal()` for mutable local state, `computed()` for derived state
- `input()` / `input.required()` for inputs — never `@Input()`
- `output()` for outputs — never `@Output()` with `EventEmitter`
- Mark template-accessed members `protected readonly` (signals) or `protected` (methods)

### Dependency Injection

Always use `inject()` — never constructor-based injection.

### Templates

- Built-in control flow (`@if`, `@for`, `@switch`) — never `*ngIf`, `*ngFor`, `*ngSwitch`
- Always provide `track` in `@for`
- Call signals with `()` in templates: `{{ title() }}`
- Use `@let` for intermediate template variables

### Routing

- Lazy-load all feature routes with `loadChildren` or `loadComponent`
- Functional guards and resolvers — never class-based
- Colocate feature routes in `<feature>.routes.ts`

### Services

- `providedIn: 'root'` for singletons
- Expose state as readonly signals; mutate only internally
- RxJS for async (HTTP, WebSocket); signals for synchronous/UI state
- Use `resource()` / `rxResource()` for async data fetching tied to signal inputs

### HTTP

- `provideHttpClient(withInterceptors([...]))` in `app.config.ts`
- Functional interceptors

## Path Aliases

| Alias         | Maps to              |
| ------------- | -------------------- |
| `@app/*`      | `src/app/*`          |
| `@core/*`     | `src/app/core/*`     |
| `@shared/*`   | `src/app/shared/*`   |
| `@features/*` | `src/app/features/*` |
| `@env/*`      | `src/environments/*` |

Always use path aliases for cross-boundary imports. Relative imports are fine only for sibling/child files within the same folder.

## Styles

- **SCSS** for all component and global styles
- `styleUrl: './component.scss'` (singular)
- Global styles in `src/styles/styles.scss`
- Prettier: `printWidth: 100`, `singleQuote: true`

## TypeScript

- Strict mode (`strict: true`, `strictTemplates`, `strictInjectionParameters`)
- No `any` — use `unknown` and narrow
- `interface` for data shapes; `type` for unions/intersections

## Testing

- **Vitest** — not Karma/Jasmine
- Test files colocated as `*.spec.ts`
- Focus on component behavior, not DOM structure
