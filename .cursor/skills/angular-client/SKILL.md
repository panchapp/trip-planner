---
name: angular-client
description: Angular 21 best practices and coding guidelines for the app-client project. Use when generating, reviewing, or refactoring Angular components, services, directives, pipes, guards, interceptors, routes, templates, or styles in app-client. Applies to any Angular code creation or modification.
---

# Angular 21 Client — Code Patterns

> **Conventions reference**: `app-client/CLAUDE.md` (always loaded) covers project structure, naming, path aliases, and key patterns. This skill provides detailed code generation patterns and decision guidance.

## Components

```typescript
import { Component, signal, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-user-card',
  templateUrl: './user-card.html',
  styleUrl: './user-card.scss',
})
export class UserCard {
  readonly name = input.required<string>();
  readonly age = input<number>(0);

  readonly selected = output<string>();

  protected readonly isExpanded = signal(false);

  protected readonly displayName = computed(
    () => `${this.name()} (${this.age()})`,
  );

  protected toggle(): void {
    this.isExpanded.update((v) => !v);
  }
}
```

### Rules

- Use `signal()` for mutable local state, `computed()` for derived state.
- Use `input()` / `input.required()` for inputs — never `@Input()`.
- Use `output()` for outputs — never `@Output()` with `EventEmitter`.
- Mark template-accessed members `protected readonly` (signals) or `protected` (methods).
- Keep components small and focused — extract logic into services.
- Use `OnPush` change detection strategy when mixing with libraries that don't use signals; otherwise zoneless handles it.

## Signal APIs

### Two-Way Binding with `model()`

Use `model()` to create a writable signal that supports two-way binding:

```typescript
import { Component, model } from '@angular/core';

@Component({
  selector: 'app-toggle',
  template: `<button (click)="checked.set(!checked())">
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
import { linkedSignal, signal } from '@angular/core';

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
import {
  Component,
  viewChild,
  viewChildren,
  contentChild,
  contentChildren,
  ElementRef,
} from '@angular/core';

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
import { effect, signal } from '@angular/core';

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
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
<p class="error">{{ error() }}</p>
} @else { @for (item of items(); track item.id) {
<app-item-card [item]="item" />
} @empty {
<p>No items found.</p>
} } @switch (status()) { @case ('active') {
<span class="badge active">Active</span>
} @case ('inactive') {
<span class="badge">Inactive</span>
} @default {
<span class="badge">Unknown</span>
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
import { Routes } from '@angular/router';

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
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
import { resource } from '@angular/core';

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
import { inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';

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
import { toSignal } from '@angular/core/rxjs-interop';

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
import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-trip-form',
  templateUrl: './trip-form.html',
  imports: [ReactiveFormsModule],
})
export class TripForm {
  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
  });

  protected onSubmit(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
  }
}
```

### Form Template

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <label>
    Title
    <input formControlName="title" />
    @if (form.controls.title.errors?.['required']) {
    <span class="error">Title is required</span>
    }
  </label>

  <button type="submit" [disabled]="form.invalid">Save</button>
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
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '@core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
```

Functional interceptors:

```typescript
import { HttpInterceptorFn } from '@angular/common/http';

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
- [ ] SCSS styles, strict TypeScript, Vitest tests
- [ ] `protected` / `protected readonly` for template-bound members
- [ ] No `any` types
- [ ] Path aliases (`@core/`, `@shared/`, etc.) for all non-sibling imports — no `../` traversal
