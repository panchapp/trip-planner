import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { User } from '@shared/models/user.model';

const initialState = {
  user: null as User | null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ user }) => ({
    isAuthenticated: () => user() !== null,
  })),
  withMethods((store) => ({
    setUser(user: User | null): void {
      patchState(store, { user });
    },
  })),
);
