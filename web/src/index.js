import Bunnix from '@bunnix/core';
import { App } from './app.js';
import { connect } from './ws/client.js';
import { installWsHandlers } from './ws/handlers.js';
import "@bunnix/components/styles.css";
import './styles/index.css';

// Install WebSocket event handlers
installWsHandlers();

// Connect WebSocket
connect();

// Mount the app (direct render, no whenReady wrapper)
Bunnix.render(App, document.getElementById('root'));
