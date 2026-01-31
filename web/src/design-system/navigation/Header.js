import Bunnix from '@bunnix/core';
import { isConnected, providerReady } from '../../state/connection.js';
import { openSettings } from '../../state/settings.js';
import LogoSmall from "../../images/maximus-medium.png";
import './Header.css';

const { div, img, h2, button } = Bunnix;

// Status Header Component
export function Header() {
  const connected = isConnected.map(c => c);
  const ready = providerReady.map(r => r);

  const statusClass = Bunnix.Compute([connected, ready], (c, r) => {
    if (!c) return 'status-disconnected';
    if (!r) return 'status-configuring';
    return 'status-ready';
  });

  const statusText = Bunnix.Compute([connected, ready], (c, r) => {
    if (!c) return 'Disconnected';
    if (!r) return 'Configuring';
    return 'Ready';
  });

  return div({ class: 'header' },
    div({ class: 'logo' },
      img({ src: LogoSmall, alt: 'Maximus Logo', class: 'logo-image' }),
      h2({ class: 'logo-text' }, 'Maximus')
    ),
    div({ class: 'status-container' },
      button({ class: 'settings-btn', click: openSettings }, 'Settings')
    )
  );
}
