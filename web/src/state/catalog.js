import { createStore } from '@bunnix/redux';

export const catalogStore = createStore({
  providers: []
}, {
  setCatalog: (state, { catalog }) => ({
    ...state,
    providers: catalog?.providers || []
  })
});

export const providersCatalog = catalogStore.state.map(s => s.providers);

export function setCatalog(catalog) {
  catalogStore.setCatalog({ catalog });
}
