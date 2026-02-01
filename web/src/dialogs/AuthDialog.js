import Bunnix, { Show } from '@bunnix/core';
import { authStore, isAuthDialogOpen, pendingAuthRequest } from '../state/auth.js';
import { send } from '../lib/websocket.js';

const { div, h3, p, button, span } = Bunnix;

export function AuthDialog() {
  // Map the already-mapped observables (consistent with other components)
  const isOpen = isAuthDialogOpen.map(o => o);
  const pending = pendingAuthRequest.map(p => p);

  // Create a computed that combines both observables
  // This ensures the dialog renders when we have both isOpen=true AND a pending request
  const shouldShow = Bunnix.Compute([isOpen, pending], (open, req) => {
    return open && req !== null;
  });

  const handleApprove = () => {
    // Use .get() to access current value
    const req = pending.get();
    if (!req) {
      console.warn('[AuthDialog] No pending request on approve');
      return;
    }
    console.log('[AuthDialog] Approving request:', req.requestId);
    send({
      type: 'authResponse',
      requestId: req.requestId,
      authorized: true,
      reason: 'User approved'
    });
    authStore.closeDialog();
  };

  const handleDeny = () => {
    const req = pending.get();
    if (!req) {
      console.warn('[AuthDialog] No pending request on deny');
      return;
    }
    console.log('[AuthDialog] Denying request:', req.requestId);
    send({
      type: 'authResponse',
      requestId: req.requestId,
      authorized: false,
      reason: 'User denied'
    });
    authStore.closeDialog();
  };

  // Use Show with the computed shouldShow
  return Show(shouldShow, () => {
    // Get current value inside the render function
    const req = pending.get();
    if (!req) {
      console.warn('[AuthDialog] Dialog open but no pending request');
      return null;
    }

    console.log('[AuthDialog] Rendering dialog for request:', req.requestId);

    return div({ class: 'modal-overlay active' },
      div({ class: 'modal auth-dialog' },
        h3({ class: 'auth-title' }, '🔐 Authorization Required'),

        div({ class: 'auth-content' },
          p({ class: 'auth-reason' },
            span({ class: 'auth-label' }, 'Reason: '),
            req.reason
          ),
          p({ class: 'auth-details' },
            span({ class: 'auth-label' }, 'Tool: '),
            req.tool
          ),
          p({ class: 'auth-details' },
            span({ class: 'auth-label' }, 'Directory: '),
            req.targetDir
          )
        ),

        div({ class: 'modal-actions' },
          button({ class: 'modal-btn cancel', click: handleDeny }, 'Deny'),
          button({ class: 'modal-btn save', click: handleApprove }, 'Approve')
        )
      )
    );
  });
}
