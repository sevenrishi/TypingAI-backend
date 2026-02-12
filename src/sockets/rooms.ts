import { Server, Socket } from 'socket.io';
type RoomState = {
  text: string;
  players: Record<
    string,
    { name: string; progress: number; wpm?: number; accuracy?: number; ready?: boolean; finished?: boolean }
  >;
  host?: string; // socket id of host
  raceStart?: number | null; // timestamp when race will start
  finishedPlayers?: string[]; // socket ids of finished players
};

const rooms: Record<string, RoomState> = {};

function emitRoomState(io: Server, room: string) {
  const state = rooms[room];
  if (!state) return;
  // send a sanitized state (players keyed by socket id, plus host)
  io.to(room).emit('room:state', {
    text: state.text,
    players: state.players,
    host: state.host,
    raceStart: state.raceStart || null,
    finishedPlayers: state.finishedPlayers || []
  });
}

function closeRoom(io: Server, room: string, reason: string) {
  const state = rooms[room];
  if (!state) return;
  io.to(room).emit('room:closed', { room, reason });
  Object.keys(state.players).forEach((id) => {
    const sock = io.sockets.sockets.get(id);
    sock?.leave(room);
  });
  delete rooms[room];
}

export function attachRoomHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    socket.on('room:create', ({ room, text, name }) => {
      rooms[room] = { text, players: {}, host: socket.id, raceStart: null, finishedPlayers: [] };
      rooms[room].players[socket.id] = { name: name || 'Anon', progress: 0, ready: false, finished: false } as any;
      socket.join(room);
      emitRoomState(io, room);
    });

    socket.on('room:join', ({ room, name }) => {
      const state = rooms[room];
      if (!state) return socket.emit('room:error', { error: 'Room not found' });
      if (state.raceStart) return socket.emit('room:error', { error: 'Battle already started. Please wait for the next round.' });
      state.players[socket.id] = { name: name || 'Anon', progress: 0, ready: false, finished: false } as any;
      socket.join(room);
      emitRoomState(io, room);
    });

    socket.on('room:progress', ({ room, progress, wpm, accuracy }) => {
      const state = rooms[room];
      if (!state) return;
      const p = state.players[socket.id];
      if (p) {
        p.progress = progress;
        p.wpm = wpm;
        p.accuracy = accuracy;
        
        // Mark as finished if progress is 100%
        if (progress >= 1.0 && !p.finished) {
          p.finished = true;
          if (!state.finishedPlayers) state.finishedPlayers = [];
          if (!state.finishedPlayers.includes(socket.id)) {
            state.finishedPlayers.push(socket.id);
          }
        }
      }

      // If all players have finished, mark race as ended
      const players = Object.values(state.players);
      if (players.length > 0 && players.every(player => player.finished)) {
        state.raceStart = null;
      }
      emitRoomState(io, room);
    });

    socket.on('player:ready', ({ room, ready }) => {
      const state = rooms[room];
      if (!state) return socket.emit('room:error', { error: 'Room not found' });
      const p = state.players[socket.id];
      if (p) {
        p.ready = !!ready;
      }
      emitRoomState(io, room);
    });

    // simple time sync responder for clients to compute clock offset
    socket.on('time:request', ({ clientSent }) => {
      socket.emit('time:response', { clientSent, serverTime: Date.now() });
    });

    socket.on('room:leave', ({ room }) => {
      const state = rooms[room];
      if (!state) return;
      const wasHost = state.host === socket.id;
      delete state.players[socket.id];
      socket.leave(room);
      // if host left, pick a new host
      // Remove from finished players list
      if (state.finishedPlayers) {
        state.finishedPlayers = state.finishedPlayers.filter(id => id !== socket.id);
      }
      const remainingPlayers = Object.keys(state.players);
      if (remainingPlayers.length === 0) {
        closeRoom(io, room, 'empty');
        return;
      }
      const allPlayersFinished = remainingPlayers.length > 0
        && remainingPlayers.every((id) => state.players[id]?.finished);
      if (wasHost && allPlayersFinished) {
        closeRoom(io, room, 'host-left');
        return;
      }
      if (wasHost) {
        state.host = remainingPlayers[0];
      }
      emitRoomState(io, room);
    });

    socket.on('race:start', ({ room }) => {
      const state = rooms[room];
      if (!state) return socket.emit('room:error', { error: 'Room not found' });
      // only host can start
      if (state.host !== socket.id) return socket.emit('room:error', { error: 'Only host can start the race' });
      // schedule race start a few seconds in the future for countdown sync
      const startAt = Date.now() + 5000; // 5s countdown
      state.raceStart = startAt;
      // Reset finished players for new race
      state.finishedPlayers = [];
      Object.values(state.players).forEach(p => p.finished = false);
      // Emit the latest room state (including text) first so clients have the script before countdown
      emitRoomState(io, room);
      io.to(room).emit('race:start', { room, startAt, host: state.host });
    });

    socket.on('race:reset', ({ room }) => {
      const state = rooms[room];
      if (!state) return socket.emit('room:error', { error: 'Room not found' });
      const p = state.players[socket.id];
      if (p) {
        p.ready = false;
        p.finished = false;
        p.progress = 0;
        p.wpm = 0;
        p.accuracy = 0;
      }
      if (state.finishedPlayers) {
        state.finishedPlayers = state.finishedPlayers.filter(id => id !== socket.id);
      }
      emitRoomState(io, room);
    });

    // allow host to set/update the room text (only host)
    socket.on('room:setText', ({ room, text }) => {
      const state = rooms[room];
      if (!state) return socket.emit('room:error', { error: 'Room not found' });
      if (state.host !== socket.id) return socket.emit('room:error', { error: 'Only host can set the script' });
      state.text = text;
      emitRoomState(io, room);
    });

    socket.on('disconnect', () => {
      for (const roomKey of Object.keys(rooms)) {
        const state = rooms[roomKey];
        if (state.players[socket.id]) {
          const wasHost = state.host === socket.id;
          delete state.players[socket.id];
          // transfer host if needed
          // Remove from finished players list
          if (state.finishedPlayers) {
            state.finishedPlayers = state.finishedPlayers.filter(id => id !== socket.id);
          }
          const remainingPlayers = Object.keys(state.players);
          if (remainingPlayers.length === 0) {
            closeRoom(io, roomKey, 'empty');
            continue;
          }
          const allPlayersFinished = remainingPlayers.length > 0
            && remainingPlayers.every((id) => state.players[id]?.finished);
          if (wasHost && allPlayersFinished) {
            closeRoom(io, roomKey, 'host-left');
            continue;
          }
          if (wasHost) {
            state.host = remainingPlayers.length ? remainingPlayers[0] : undefined;
            io.to(roomKey).emit('room:host', { host: state.host });
          }
          emitRoomState(io, roomKey);
        }
      }
    });
  });
}

