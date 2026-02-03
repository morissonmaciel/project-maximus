import Bunnix from '@bunnix/core';
import { App } from './app.js';
import { connect } from './lib/websocket.js';
import { installAllHandlers } from './ad-hoc/index.js';
import "@bunnix/components/styles.css";
import './styles/index.css';

// Install all WebSocket event handlers
installAllHandlers();

// Connect WebSocket
connect();

// Mount the app (direct render, no whenReady wrapper)
Bunnix.render(App, document.getElementById('root'));
