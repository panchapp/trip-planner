---
name: angular-client
description: Angular 21 best practices and coding guidelines for the app-client project. Use when generating, reviewing, or refactoring Angular components, services, directives, pipes, guards, interceptors, routes, templates, or styles in app-client. Applies to any Angular code creation or modification.
---

# Angular 21 Client — Code Patterns

> **Conventions reference**: `app-client/CLAUDE.md` (always loaded) covers project structure, naming, path aliases, and key patterns. This skill provides detailed code generation patterns and decision guidance.

## Styling — Tailwind v4 Only

**Mandatory**: Use Tailwind CSS v4 for ALL styling. Do NOT add custom CSS of any kind.

- No `styleUrl`, `styles`, or inline `style` blocks in components.
- No `.scss`, `.css`, or `.less` files.
- No `:host` rules, component-specific CSS, or custom style sheets.
- Style exclusively with Tailwind utility classes in templates: `class="flex gap-4 p-6 rounded-lg bg-slate-100"`.
- Use `@tailwind` directives only in the project's global Tailwind entry (e.g. `src/styles/tailwind.css`).
- Familiarize yourself with Tailwind v4 syntax and utilities — use `@apply` sparingly and only where the project already uses it in the global config.

### Rules

- Every component must be styled via Tailwind utility classes in its template.
- If you need a reusable pattern, use Tailwind's `@layer components` or `@apply` in the global Tailwind config — never in component-level style files.
- Do not create or reference `*.scss`, `*.css` (except the global `src/styles/tailwind.css`), or component `styleUrl`s.

## Components

```typescript
@Component({
  selector: 'app-user-card',
  templateUrl: './user-card.html',
  imports: [],
})
export class UserCard {
  readonly name = input.required<string>();
  readonly age = input<number>(0);

  readonly selected = output<string>();

  readonly isExpanded = signal(false);

  readonly displayName = computed(
    () => `${this.name()} (${this.age()})`,
  );

  toggle(): void {
    this.isExpanded.update((v) => !v);
  }
}
```

### Rules

- Use `signal()` for mutable local state, `computed()` for derived state.
- Use `input()` / `input.required()` for inputs — never `@Input()`.
- Use `output()` for outputs — never `@Output()` with `EventEmitter`.
- Do not use `protected` on component class members. Use `readonly` for template-bound fields; omit visibility for public methods and fields (TypeScript default is `public`). Use `private` only for members not referenced from the template.
- Keep components small and focused — extract logic into services.
- Use `OnPush` change detection strategy when mixing with libraries that don't use signals; otherwise zoneless handles it.

## Signal APIs

### Two-Way Binding with `model()`

Use `model()` to create a writable signal that supports two-way binding:

```typescript
@Component({
  selector: 'app-toggle',
  template: `<button
    class="px-4 py-2 rounded"
    (click)="checked.set(!checked())"
  >
    {{ checked() ? 'ON' : 'OFF' }}
  </button>`,
})
export class Toggle {
  readonly checked = model(false);
}
```

Parent binds with two-way syntax:

```html
<app-toggle [(checked)]="isEnabled" />
```

### Linked Signals with `linkedSignal()`

Use `linkedSignal()` for derived state that can be independently overridden:

```typescript
export class ItemList {
  readonly items = signal<Item[]>([]);
  readonly selectedItem = linkedSignal(() => this.items()[0]);

  select(item: Item): void {
    this.selectedItem.set(item);
  }
}
```

When `items` changes, `selectedItem` resets to the first item — but users can override it via `select()`.

### Signal Queries

Use signal-based queries instead of `@ViewChild` / `@ContentChild`:

```typescript
export class TabGroup {
  readonly tabHeader = viewChild.required<ElementRef>('header');
  readonly allPanels = viewChildren(TabPanel);

  readonly projectedContent = contentChild(CustomContent);
  readonly projectedItems = contentChildren(TabItem);
}
```

Access with `()` like any signal: `this.tabHeader().nativeElement`.

### Side Effects with `effect()`

Use `effect()` for imperative reactions to signal changes (logging, analytics, localStorage sync). Avoid using it for state derivation — use `computed()` or `linkedSignal()` instead.

```typescript
export class ThemeSwitcher {
  readonly theme = signal<'light' | 'dark'>('light');

  private readonly themeEffect = effect(() => {
    document.documentElement.setAttribute('data-theme', this.theme());
  });
}
```

### Decision Guide

| Need                              | Use                                    |
| --------------------------------- | -------------------------------------- |
| Read-only derived state           | `computed()`                           |
| Derived state with reset/override | `linkedSignal()`                       |
| Two-way binding (parent ↔ child)  | `model()`                              |
| Imperative side effect            | `effect()`                             |
| Query a child element/component   | `viewChild()` / `viewChildren()`       |
| Query projected content           | `contentChild()` / `contentChildren()` |

## Dependency Injection

Always use the `inject()` function. Never use constructor-based injection.

```typescript
export class UserService {
  private readonly http = inject(HttpClient);
}
```

## Templates

### Control Flow

Use the built-in control flow syntax — never `*ngIf`, `*ngFor`, or `*ngSwitch`.

```html
@if (isLoading()) {
<app-spinner />
} @else if (error()) {
<p class="text-red-600">{{ error() }}</p>
} @else { @for (item of items(); track item.id) {
<app-item-card [item]="item" />
} @empty {
<p>No items found.</p>
} } @switch (status()) { @case ('active') {
<span class="rounded px-2 py-1 bg-green-100 text-green-800">Active</span>
} @case ('inactive') {
<span class="rounded px-2 py-1 bg-slate-100">Inactive</span>
} @default {
<span class="rounded px-2 py-1 bg-slate-200">Unknown</span>
} }
```

### Template Rules

- Always call signals with `()` in templates: `{{ title() }}`, `[value]="count()"`.
- Always provide `track` in `@for` — prefer a unique identifier property.
- Self-close void components: `<app-icon />`, `<router-outlet />`.
- Prefer `@let` for intermediate template variables over complex expressions.

```html
@let fullName = firstName() + ' ' + lastName();
<h2>{{ fullName }}</h2>
```

## Routing

```typescript
export const routes: Routes = [
  {
    path: 'trips',
    loadChildren: () =>
      import('./features/trips/trips.routes').then((m) => m.routes),
  },
  { path: '', redirectTo: 'trips', pathMatch: 'full' },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found').then((m) => m.NotFound),
  },
];
```

### Routing Rules

- Lazy-load all feature routes with `loadChildren` or `loadComponent`.
- Use functional guards and resolvers — never class-based.
- Colocate feature routes in `<feature>.routes.ts` within the feature folder.

```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  return authService.isAuthenticated()
    ? true
    : inject(Router).createUrlTree(['/login']);
};
```

## Services & Data Fetching

### Signal-Based Services

```typescript
@Injectable({ providedIn: 'root' })
export class TripService {
  private readonly http = inject(HttpClient);
  private readonly _trips = signal<Trip[]>([]);

  readonly trips = this._trips.asReadonly();
}
```

### Async Data with `resource()` / `rxResource()`

Use `resource()` for async data fetching tied to signal inputs. Prefer this over manual `.subscribe()` calls:

```typescript
export class TripDetail {
  readonly tripId = input.required<string>();

  readonly tripResource = resource({
    request: () => this.tripId(),
    loader: async ({ request: id }) => {
      const response = await fetch(`/api/trips/${id}`);
      return response.json() as Promise<Trip>;
    },
  });
}
```

Use `rxResource()` when working with observables (e.g., `HttpClient`):

```typescript
export class TripDetail {
  private readonly http = inject(HttpClient);
  readonly tripId = input.required<string>();

  readonly tripResource = rxResource({
    request: () => this.tripId(),
    loader: ({ request: id }) => this.http.get<Trip>(`/api/trips/${id}`),
  });
}
```

Access in templates: `tripResource.value()`, `tripResource.isLoading()`, `tripResource.error()`.

### When to Use What

| Scenario                        | Pattern                                            |
| ------------------------------- | -------------------------------------------------- |
| Fetch data on signal change     | `resource()` / `rxResource()`                      |
| Bridge observable to template   | `toSignal()`                                       |
| Complex async event composition | RxJS operators + `toSignal()`                      |
| Manual HTTP call (e.g., POST)   | `HttpClient` + `takeUntilDestroyed()` in subscribe |

## RxJS

- RxJS is for **async operations**: HTTP, WebSocket, complex event composition.
- Do **not** use `BehaviorSubject` for local UI state — use `signal()` instead.
- Prefer `toSignal()` to bridge observables into the signal graph.
- Use `DestroyRef` + `takeUntilDestroyed()` for manual subscription cleanup.

```typescript
export class SearchResults {
  private readonly searchService = inject(SearchService);

  readonly results = toSignal(this.searchService.results$, {
    initialValue: [],
  });
}
```

## Forms

### Reactive Forms with Typed Form Groups

```typescript
@Component({
  selector: 'app-trip-form',
  templateUrl: './trip-form.html',
  imports: [ReactiveFormsModule],
})
export class TripForm {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
  }
}
```

### Form Template

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
  <label class="flex flex-col gap-1">
    Title
    <input formControlName="title" class="border rounded px-2 py-1" />
    @if (form.controls.title.errors?.['required']) {
    <span class="text-red-600 text-sm">Title is required</span>
    }
  </label>

  <button
    type="submit"
    [disabled]="form.invalid"
    class="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
  >
    Save
  </button>
</form>
```

### Form Rules

- Use `FormBuilder.nonNullable.group()` for typed, non-nullable form groups.
- Import `ReactiveFormsModule` in the component's `imports` array.
- Access typed controls via `form.controls.<name>` — avoid string-based `form.get('name')`.
- For dynamic forms, use `FormArray` with typed elements.
- Prefer reactive forms over template-driven forms for anything beyond trivial inputs.

## HTTP

Use `provideHttpClient(withInterceptors([...]))` in `app.config.ts`.

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
```

Functional interceptors:

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
```

## Error Recovery

- **Build fails**: Check `pnpm --filter app-client build` output. Common causes: missing imports, type errors, circular dependencies.
- **Lint errors**: Run `pnpm --filter app-client lint` after changes. Fix before committing.
- **Test failures**: Run `pnpm --filter app-client test` to verify. Update specs when component I/O changes.
- **Signal read in wrong context**: If you see "signal read from wrong context" errors, ensure signals are read inside reactive contexts (templates, `computed()`, `effect()`) or called explicitly with `()`.

## Quick Checklist

- [ ] Standalone component (no `NgModule`)
- [ ] `signal()` for state, `computed()` for derived, `linkedSignal()` for derived-writable
- [ ] `input()` / `output()` / `model()` for component I/O
- [ ] `inject()` for DI — no constructor injection
- [ ] Built-in control flow (`@if`, `@for`, `@switch`) — no structural directives
- [ ] `track` provided in every `@for`
- [ ] `resource()` / `rxResource()` for async data fetching — avoid bare `.subscribe()`
- [ ] Lazy-loaded routes with functional guards/resolvers
- [ ] RxJS for async only; signals for synchronous/UI state
- [ ] Reactive forms with `FormBuilder.nonNullable.group()`
- [ ] Tailwind v4 only — no custom CSS, SCSS, or component style files
- [ ] No `protected` on component members — `readonly` + default `public`, or `private` when not used from the template
- [ ] No `any` types
- [ ] Path aliases (`@core/`, `@shared/`, etc.) for all non-sibling imports — no `../` traversal
