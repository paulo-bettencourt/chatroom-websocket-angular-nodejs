import {
  ChatMessage,
  ChatRelayMessage,
  LoginMessage,
  SystemNotice,
  User,
  UserListMessage,
  WsMessage,
} from '@websocket/types';
import { IncomingMessage } from 'http';
import { WebSocket } from 'ws';

let currId = 0;
export class UserManager {
  private sockets = new Map<WebSocket, User>();

  add(socket: WebSocket, request: IncomingMessage) {
    // localhost:8080/?name=Jane
    const fullUrl = new URL(request.headers.host + request.url);
    const name = fullUrl.searchParams.get('name');
    const user: User = {
      name,
      id: currId++,
    };

    const systemNotice: SystemNotice = {
      event: 'systemNotice',
      contents: `${name} has joined the cat`,
    };

    this.sendToAll(systemNotice);

    const loginMessage: LoginMessage = {
      user,
      event: 'login',
    };
    socket.send(JSON.stringify(loginMessage));

    this.sockets.set(socket, user);
    this.sendUserListToAll();
  }

  remove(socket: WebSocket) {
    const name = this.sockets.get(socket).name;
    this.sockets.delete(socket);
    const systemNotice: SystemNotice = {
      event: 'systemNotice',
      contents: `${name} has left the cat`,
    };

    this.sendToAll(systemNotice);
    this.sendUserListToAll();
  }

  send(socket: WebSocket, message: WsMessage) {
    const data = JSON.stringify(message);
    socket.send(data);
  }

  sendToAll(message: WsMessage) {
    const data = JSON.stringify(message);

    Array.from(this.sockets.keys()).forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    });
  }

  relayChat(from: WebSocket, chatMsg: ChatMessage) {
    const relayMsg: ChatRelayMessage = {
      event: 'chatRelay',
      contents: chatMsg.contents,
      author: this.sockets.get(from),
    };
    this.sendToAll(relayMsg);
  }

  sendUserListToAll() {
    const message: UserListMessage = {
      event: 'userList',
      user: Array.from(this.sockets.values()),
    };
    this.sendToAll(message);
  }
}
