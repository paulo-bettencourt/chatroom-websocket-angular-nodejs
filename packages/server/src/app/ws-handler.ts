import { WsMessage } from '@websocket/types';
import { IncomingMessage } from 'http';
import { RawData, ServerOptions, WebSocket, WebSocketServer } from 'ws';

import { UserManager } from './user-manager';

export class WsHandler {
  private wsServer: WebSocketServer;
  private userManager: UserManager;

  initialize(options: ServerOptions): void {
    this.wsServer = new WebSocketServer(options);
    this.userManager = new UserManager();

    this.wsServer.on('listening', () =>
      console.log(`server listening on ${options.port}`)
    );
    this.wsServer.on('connection', (socket, request) => {
      this.userManager.sendToAll({
        event: 'chat',
        contents: 'new user joined',
      });
      this.onSocketConnect(socket, request);
    });
  }

  onSocketConnect(socket: WebSocket, request: IncomingMessage) {
    console.log('New websocket connection!');
    this.userManager.add(socket, request);

    socket.on('message', (data) => this.onSocketMessage(socket, data));
    socket.on('close', (code, reason) =>
      this.onSocketClosed(socket, code, reason)
    );
  }

  onSocketMessage(socket: WebSocket, data: RawData): void {
    const payload: WsMessage = JSON.parse(`${data}`);
    console.log(`Received: `, payload);

    switch (payload.event) {
      case 'chat': {
        this.userManager.relayChat(socket, payload);
        break;
      }
    }

    //    this.userManager.sendToAll(payload);
  }

  onSocketClosed(socket: WebSocket, code: number, reason: Buffer) {
    console.log(`Client has disconnected; code=${code}, reason=${reason}`);
    this.userManager.remove(socket);
  }
}
