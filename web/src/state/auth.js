import { createStore } from '@bunnix/redux';

export const authStore = createStore({
  pendingRequest: null,
  isDialogOpen: false
}, {
  setPendingRequest: (state, { requestId, tool, targetDir, reason }) => ({
    ...state,
    pendingRequest: { requestId, tool, targetDir, reason },
    isDialogOpen: true
  }),

  closeDialog: (state) => ({
    ...state,
    pendingRequest: null,
    isDialogOpen: false
  }),

  clearPending: (state) => ({
    ...state,
    pendingRequest: null
  })
});

export const isAuthDialogOpen = authStore.state.map(s => s.isDialogOpen);
export const pendingAuthRequest = authStore.state.map(s => s.pendingRequest);
