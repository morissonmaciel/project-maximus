import Bunnix, { Show } from '@bunnix/core';
import { currentNotification, isNotificationDialogOpen, notificationStore } from '../state/notification.js';
import { send } from '../lib/websocket.js';

const { div, h3, p, button } = Bunnix;

export function NotificationDialog() {
  const isOpen = isNotificationDialogOpen.map(o => o);
  const notification = currentNotification.map(n => n);

  const shouldShow = Bunnix.Compute([isOpen, notification], (open, notif) => {
    return open && notif !== null;
  });

  return Show(shouldShow, () => {
    const notif = notification.get();
    if (!notif) return null;

    return div({ class: 'modal-overlay active' },
      div({ class: 'modal notification-dialog' },
        h3({}, notif.title),
        p({}, notif.message),
        div({ class: 'modal-actions' },
          button({
            class: 'modal-btn save',
            click: () => handleDismiss(notif.notificationId)
          }, 'Dismiss')
        )
      )
    );
  });
}

function handleDismiss(notificationId) {
  notificationStore.dismissNotification(notificationId);

  // Notify gateway that notification was dismissed
  send({
    type: 'notificationDismissed',
    notificationId
  });
}
