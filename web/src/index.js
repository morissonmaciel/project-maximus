import Bunnix from '@bunnix/core';
import { App } from './app.js';
import { connect } from './lib/websocket.js';
import { installAllHandlers } from './ad-hoc/index.js';

// Install all WebSocket event handlers
installAllHandlers();

// Connect WebSocket
connect();

// Mount the app (direct render, no whenReady wrapper)
Bunnix.render(App, document.getElementById('root'));
