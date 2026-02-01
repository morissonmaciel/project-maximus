import { createStore } from '@bunnix/redux';

export const notificationStore = createStore({
  notifications: [],
  isDialogOpen: false,
  currentNotification: null
}, {
  addNotification: (state, { notificationId, title, message }) => ({
    ...state,
    notifications: [...state.notifications, { notificationId, title, message, dismissed: false }],
    currentNotification: { notificationId, title, message },
    isDialogOpen: true
  }),
  dismissNotification: (state, notificationId) => ({
    ...state,
    notifications: state.notifications.map(n =>
      n.notificationId === notificationId ? { ...n, dismissed: true } : n
    ),
    isDialogOpen: false,
    currentNotification: null
  }),
  closeDialog: (state) => ({
    ...state,
    isDialogOpen: false,
    currentNotification: null
  })
});

// Mapped observables
export const currentNotification = notificationStore.state.map(s => s.currentNotification);
export const isNotificationDialogOpen = notificationStore.state.map(s => s.isDialogOpen);
