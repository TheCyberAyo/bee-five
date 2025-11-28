import type { PostgrestError, RealtimeChannel } from '@supabase/supabase-js';
import { supabase, GamePlayer, GameState, GameMove, isSupabaseConfigured } from '../lib/supabase';

export interface RoomInfo {
  roomId: string;
  players: PlayerInfo[];
  isGameStarted: boolean;
  hostId: string;
}

export interface PlayerInfo {
  id: string;
  name: string;
  playerNumber: 1 | 2;
  isHost: boolean;
}

const extractStatusCode = (error: PostgrestError | null): number | undefined => {
  if (!error) {
    return undefined;
  }

  if (typeof error === 'object' && error !== null) {
    const statusValue = (error as unknown as Record<string, unknown>).status;
    if (typeof statusValue === 'number') {
      return statusValue;
    }

    const statusCodeValue = (error as unknown as Record<string, unknown>).statusCode;
    if (typeof statusCodeValue === 'number') {
      return statusCodeValue;
    }
  }

  return undefined;
};

const isPostgrestError = (value: unknown): value is PostgrestError => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as { code: unknown }).code === 'string'
  );
};

type GameStateUpdatePayload = {
  room_id: string;
  board_state: string;
  current_player: 1 | 2;
  winner: 0 | 1 | 2;
  is_game_active: boolean;
  updated_at: string;
  stop_game_requested_by?: 1 | 2 | null;
  next_first_player?: 1 | 2;
};

export class MultiplayerService {
  private roomId: string | null = null;
  private playerNumber: 1 | 2 = 1;
  private playerId: string | null = null;
  private databasePlayerId: string | null = null;
  private roomSubscription: RealtimeChannel | null = null;
  private playerSubscription: RealtimeChannel | null = null;
  private moveSubscription: RealtimeChannel | null = null;
  private gameStateSubscription: RealtimeChannel | null = null;
  private reconnectAttempts: Map<string, number> = new Map();
  private reconnectTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000;

  public onRoomUpdate?: (roomInfo: RoomInfo) => void;
  public onMove?: (move: GameMove) => void;
  public onGameStateUpdate?: (gameState: GameState) => void;
  public onPlayerJoined?: (player: GamePlayer) => void;
  public onPlayerLeft?: (playerId: string) => void;
  public onError?: (error: string) => void;
  public onConnectionStatusChange?: (isConnected: boolean) => void;
  public onStopGameRequested?: (requestedBy: 1 | 2) => void;
  public onStopGameRequestCancelled?: () => void;
  public onStopGameAccepted?: () => void;

  private generatePlayerId(): string {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  async createRoom(playerName: string): Promise<RoomInfo> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please check your deployment environment variables.');
    }

    if (!playerName || !playerName.trim()) {
      throw new Error('Player name is required');
    }

    try {
      this.playerId = this.generatePlayerId();
      const roomCode = this.generateRoomCode();
      
      const { data: room, error: roomError } = await supabase!
        .from('game_rooms')
        .insert({
          room_code: roomCode,
          host_id: this.playerId,
          status: 'waiting'
        })
        .select()
        .single();

      if (roomError) {
        let errorMessage = 'Failed to create room';
        const statusCode = extractStatusCode(roomError);

        if (roomError.code === '23505') {
          errorMessage = 'Room code already exists. Please try again.';
        } else if (roomError.code === 'PGRST301' || roomError.code === 'PGRST116') {
          errorMessage = 'Database connection error. Please check your Supabase configuration.';
        } else if (statusCode === 0 || statusCode === undefined) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (roomError.message) {
          errorMessage = `Failed to create room: ${roomError.message}`;
        }
        
        throw new Error(errorMessage);
      }

      if (!room) {
        throw new Error('Failed to create room: No room data returned from database');
      }
      
      const { data: player, error: playerError } = await supabase!
        .from('game_players')
        .insert({
          room_id: room.id,
          player_name: playerName.trim(),
          player_number: 1,
          is_host: true
        })
        .select()
        .single();

      if (playerError) {
        await supabase!.from('game_rooms').delete().eq('id', room.id);
        throw new Error(`Failed to add player: ${playerError.message || 'Database error'}`);
      }

      this.roomId = room.id;
      this.playerNumber = 1;
      this.databasePlayerId = player.id;

      this.setupSubscriptions(room.id);

      return {
        roomId: roomCode,
        players: [{
          id: this.playerId!,
          name: playerName.trim(),
          playerNumber: 1,
          isHost: true
        }],
        isGameStarted: false,
        hostId: this.playerId!
      };
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to create room. Please check your connection.';
      
      if (this.onError) {
        this.onError(errorMessage);
      }
      throw error;
    }
  }

  async joinRoom(roomCode: string, playerName: string): Promise<RoomInfo> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set up your Supabase credentials.');
    }

    const trimmedCode = roomCode.trim().toUpperCase();
    if (!trimmedCode || trimmedCode.length !== 6) {
      throw new Error('Room code must be 6 characters long');
    }

    if (!playerName.trim()) {
      throw new Error('Player name is required');
    }

    try {
      this.playerId = this.generatePlayerId();

      const { data: room, error: roomError } = await supabase!
        .from('game_rooms')
        .select('*')
        .eq('room_code', trimmedCode)
        .single();

      if (roomError) {
        if (roomError.code === 'PGRST116') {
          throw new Error('Room not found. Please check the room code and try again.');
        }
        throw new Error(`Failed to find room: ${roomError.message || 'Database error'}`);
      }

      if (!room) {
        throw new Error('Room not found. Please check the room code and try again.');
      }

      if (room.status !== 'waiting') {
        if (room.status === 'active') {
          throw new Error('This game has already started. Please ask the host to share a new room code.');
        } else if (room.status === 'finished') {
          throw new Error('This game has already finished. Please ask the host to create a new room.');
        }
        throw new Error(`Cannot join room: Room status is "${room.status}"`);
      }

      const { data: players, error: playersError } = await supabase!
        .from('game_players')
        .select('*')
        .eq('room_id', room.id);

      if (playersError) {
        throw new Error(`Failed to check room status: ${playersError.message || 'Database error'}`);
      }

      if (players && players.length >= 2) {
        throw new Error('Room is full. Please ask the host to create a new room.');
      }

      const { data: player, error: playerError } = await supabase!
        .from('game_players')
        .insert({
          room_id: room.id,
          player_name: playerName.trim(),
          player_number: 2,
          is_host: false
        })
        .select()
        .single();

      if (playerError) {
        if (playerError.code === '23505') {
          throw new Error('Could not join room. You may already be in this room.');
        } else if (playerError.code === '23503') {
          throw new Error('Room no longer exists. It may have been deleted.');
        }
        throw new Error(`Failed to join room: ${playerError.message || 'Database error'}`);
      }

      this.roomId = room.id;
      this.playerNumber = 2;
      this.databasePlayerId = player.id;

      this.setupSubscriptions(room.id);

      const { data: allPlayers } = await supabase!
        .from('game_players')
        .select('*')
        .eq('room_id', room.id);

      return {
        roomId: trimmedCode,
        players: allPlayers!.map(p => ({
          id: p.id,
          name: p.player_name,
          playerNumber: p.player_number,
          isHost: p.is_host
        })),
        isGameStarted: allPlayers!.length >= 2,
        hostId: room.host_id
      };
    } catch (error) {
      if (this.onError) {
        this.onError(error instanceof Error ? error.message : 'Failed to join room');
      }
      throw error;
    }
  }

  private setupSubscriptions(roomId: string, isRetry: boolean = false) {
    if (!isSupabaseConfigured()) {
      return;
    }

    this.cleanupSubscriptions();

    this.roomSubscription = supabase!
      .channel(`room:${roomId}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        () => {}
      )
      .subscribe((status) => {
        this.handleSubscriptionStatus('room', status, roomId);
      });

    this.playerSubscription = supabase!
      .channel(`players:${roomId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newPlayer = payload.new as GamePlayer;
          if (newPlayer.id !== this.databasePlayerId && this.onPlayerJoined) {
            this.onPlayerJoined(newPlayer);
          }
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const deletedPlayer = payload.old as GamePlayer;
          if (deletedPlayer.id !== this.databasePlayerId && this.onPlayerLeft) {
            this.onPlayerLeft(deletedPlayer.id);
          }
        }
      )
      .subscribe((status) => {
        this.handleSubscriptionStatus('players', status, roomId);
      });

    this.moveSubscription = supabase!
      .channel(`moves:${roomId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_moves', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const move = payload.new as GameMove;
          if (move.room_id !== this.roomId) {
            return;
          }
          if (move.player_number !== this.playerNumber && this.onMove) {
            this.onMove(move);
          }
        }
      )
      .subscribe((status) => {
        this.handleSubscriptionStatus('moves', status, roomId);
      });

    this.gameStateSubscription = supabase!
      .channel(`game_state:${roomId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_state', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const gameState = payload.new as GameState;
          const oldState = payload.old as GameState | undefined;
          
          if (gameState.stop_game_requested_by && 
              gameState.stop_game_requested_by !== this.playerNumber &&
              (!oldState || oldState.stop_game_requested_by !== gameState.stop_game_requested_by)) {
            if (this.onStopGameRequested) {
              this.onStopGameRequested(gameState.stop_game_requested_by);
            }
          } else if (!gameState.stop_game_requested_by && 
                     oldState && oldState.stop_game_requested_by) {
            if (this.onStopGameRequestCancelled) {
              this.onStopGameRequestCancelled();
            }
          }
          
          if (this.onGameStateUpdate) {
            this.onGameStateUpdate(gameState);
          }
        }
      )
      .subscribe((status) => {
        this.handleSubscriptionStatus('game_state', status, roomId);
      });

    if (!isRetry) {
      this.reconnectAttempts.clear();
    }
  }

  private handleSubscriptionStatus(channelName: string, status: string, roomId: string) {
    if (status === 'SUBSCRIBED') {
      this.reconnectAttempts.delete(channelName);
      const timeout = this.reconnectTimeouts.get(channelName);
      if (timeout) {
        clearTimeout(timeout);
        this.reconnectTimeouts.delete(channelName);
      }
      this.checkConnectionStatus();
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      this.attemptReconnect(channelName, roomId);
    }
  }

  private attemptReconnect(channelName: string, roomId: string) {
    const attempts = this.reconnectAttempts.get(channelName) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      if (this.onError) {
        this.onError(`Connection failed after ${this.maxReconnectAttempts} attempts. Please refresh.`);
      }
      if (this.onConnectionStatusChange) {
        this.onConnectionStatusChange(false);
      }
      return;
    }

    this.reconnectAttempts.set(channelName, attempts + 1);
    const delay = this.baseReconnectDelay * Math.pow(2, attempts);
    
    const timeout = setTimeout(() => {
      if (this.roomId === roomId) {
        this.setupSubscriptions(roomId, true);
      }
    }, delay);
    
    this.reconnectTimeouts.set(channelName, timeout);
  }

  private checkConnectionStatus() {
    const criticalChannels = ['moves', 'players'];
    const allConnected = criticalChannels.every(channel => 
      !this.reconnectAttempts.has(channel) || 
      this.reconnectAttempts.get(channel) === 0
    );
    
    if (this.onConnectionStatusChange) {
      this.onConnectionStatusChange(allConnected);
    }
  }

  private cleanupSubscriptions() {
    if (this.roomSubscription) {
      supabase?.removeChannel(this.roomSubscription);
      this.roomSubscription = null;
    }
    if (this.playerSubscription) {
      supabase?.removeChannel(this.playerSubscription);
      this.playerSubscription = null;
    }
    if (this.moveSubscription) {
      supabase?.removeChannel(this.moveSubscription);
      this.moveSubscription = null;
    }
    if (this.gameStateSubscription) {
      supabase?.removeChannel(this.gameStateSubscription);
      this.gameStateSubscription = null;
    }
    
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts.clear();
  }

  async sendMove(row: number, col: number): Promise<void> {
    if (!this.roomId || !isSupabaseConfigured()) {
      return;
    }

    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { error } = await supabase!
          .from('game_moves')
          .insert({
            room_id: this.roomId,
            player_number: this.playerNumber,
            row,
            col,
            timestamp: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          throw error;
        }
        
        return;
      } catch (error) {        
        if (isPostgrestError(error)) {
          if (error.code === '23505' || error.code === '23503') {
            break;
          }
        }
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    if (this.onError) {
      this.onError('Failed to send move after multiple attempts. Please check your connection.');
    }
  }

  async clearOldMoves(): Promise<void> {
    if (!this.roomId || !isSupabaseConfigured()) {
      return;
    }

    try {
      const { error } = await supabase!
        .from('game_moves')
        .delete()
        .eq('room_id', this.roomId);

      if (error) {
        console.error('Failed to clear old moves:', error);
      }
    } catch (error) {
      console.error('Error clearing old moves:', error);
    }
  }

  async updateGameState(
    board: (0 | 1 | 2)[][], 
    currentPlayer: 1 | 2, 
    winner: 0 | 1 | 2, 
    isGameActive: boolean,
    stopGameRequestedBy?: 1 | 2 | null,
    nextFirstPlayer?: 1 | 2
  ): Promise<void> {
    if (!this.roomId || !isSupabaseConfigured()) return;

    try {
      const { data: existingState } = await supabase!
        .from('game_state')
        .select('*')
        .eq('room_id', this.roomId)
        .single();

      const gameStateData: GameStateUpdatePayload = {
        room_id: this.roomId,
        board_state: JSON.stringify(board),
        current_player: currentPlayer,
        winner,
        is_game_active: isGameActive,
        updated_at: new Date().toISOString()
      };

      if (stopGameRequestedBy !== undefined) {
        gameStateData.stop_game_requested_by = stopGameRequestedBy;
      }

      if (nextFirstPlayer !== undefined) {
        gameStateData.next_first_player = nextFirstPlayer;
      } else if (!existingState) {
        gameStateData.next_first_player = 1;
      }

      if (existingState) {
        const { error } = await supabase!
          .from('game_state')
          .update(gameStateData)
          .eq('id', existingState.id);

        if (error) throw error;
      } else {
        const { error } = await supabase!
          .from('game_state')
          .insert(gameStateData);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Failed to update game state:', error);
      if (this.onError) {
        this.onError('Failed to update game state');
      }
    }
  }

  async resetGameState(alternateFirstPlayer: boolean = false): Promise<void> {
    if (!this.roomId || !isSupabaseConfigured()) {
      return;
    }

    try {
      await this.clearOldMoves();

      const currentState = await this.fetchGameState(this.roomId);
      let nextFirstPlayer: 1 | 2 = 1;

      if (alternateFirstPlayer && currentState) {
        nextFirstPlayer = currentState.next_first_player === 1 ? 2 : 1;
      } else if (currentState) {
        nextFirstPlayer = currentState.next_first_player || 1;
      }

      const emptyBoard = Array(10).fill(null).map(() => Array(10).fill(0));
      await this.updateGameState(
        emptyBoard, 
        nextFirstPlayer, 
        0, 
        true, 
        null,
        nextFirstPlayer
      );
    } catch (error) {
      console.error('Failed to reset game state:', error);
      if (this.onError) {
        this.onError('Failed to reset game state');
      }
    }
  }

  async requestStopGame(): Promise<void> {
    if (!this.roomId || !isSupabaseConfigured()) {
      return;
    }

    try {
      const { data: existingState } = await supabase!
        .from('game_state')
        .select('*')
        .eq('room_id', this.roomId)
        .single();

      if (existingState) {
        const { error } = await supabase!
          .from('game_state')
          .update({
            stop_game_requested_by: this.playerNumber,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingState.id);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Failed to request stop game:', error);
      if (this.onError) {
        this.onError('Failed to request stop game');
      }
    }
  }

  async cancelStopGameRequest(): Promise<void> {
    if (!this.roomId || !isSupabaseConfigured()) {
      return;
    }

    try {
      const { data: existingState } = await supabase!
        .from('game_state')
        .select('*')
        .eq('room_id', this.roomId)
        .single();

      if (existingState) {
        const { error } = await supabase!
          .from('game_state')
          .update({
            stop_game_requested_by: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingState.id);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Failed to cancel stop game request:', error);
      if (this.onError) {
        this.onError('Failed to cancel stop game request');
      }
    }
  }

  async acceptStopGame(): Promise<void> {
    if (!this.roomId || !isSupabaseConfigured()) {
      return;
    }

    try {
      const { data: existingState } = await supabase!
        .from('game_state')
        .select('*')
        .eq('room_id', this.roomId)
        .single();

      if (existingState) {
        const { error } = await supabase!
          .from('game_state')
          .update({
            is_game_active: false,
            stop_game_requested_by: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingState.id);

        if (error) throw error;

        if (this.onStopGameAccepted) {
          this.onStopGameAccepted();
        }
      }
    } catch (error) {
      console.error('Failed to accept stop game request:', error);
      if (this.onError) {
        this.onError('Failed to accept stop game');
      }
    }
  }

  async rejectStopGameRequest(): Promise<void> {
    await this.cancelStopGameRequest();
  }

  async leaveRoom(): Promise<void> {
    if (!isSupabaseConfigured()) {
      this.roomId = null;
      this.playerId = null;
      this.databasePlayerId = null;
      return;
    }

    this.cleanupSubscriptions();
    this.reconnectAttempts.clear();
    
    this.onMove = undefined;
    this.onPlayerJoined = undefined;
    this.onPlayerLeft = undefined;
    this.onGameStateUpdate = undefined;
    this.onError = undefined;
    this.onConnectionStatusChange = undefined;

    if (this.roomId && this.databasePlayerId) {
      await supabase!
        .from('game_players')
        .delete()
        .eq('id', this.databasePlayerId);
    }

    this.roomId = null;
    this.playerId = null;
    this.databasePlayerId = null;
  }

  private generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  getCurrentRoomId(): string | null {
    return this.roomId;
  }

  getPlayerNumber(): 1 | 2 {
    return this.playerNumber;
  }

  async fetchExistingMoves(roomId: string): Promise<GameMove[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data: moves, error } = await supabase!
        .from('game_moves')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch existing moves:', error);
        return [];
      }

      return moves || [];
    } catch (error) {
      console.error('Unexpected error fetching existing moves:', error);
      return [];
    }
  }

  async fetchGameState(roomId: string): Promise<GameState | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data: gameState, error } = await supabase!
        .from('game_state')
        .select('*')
        .eq('room_id', roomId)
        .single();

      if (error || !gameState) {
        if (error) {
          console.error('Failed to fetch game state:', error);
        }
        return null;
      }

      return gameState;
    } catch (error) {
      console.error('Unexpected error fetching game state:', error);
      return null;
    }
  }

  async recoverRoomFromCode(roomCode: string): Promise<void> {
    if (!isSupabaseConfigured() || this.roomId) {
      return;
    }

    try {
      const { data: room, error } = await supabase!
        .from('game_rooms')
        .select('id, status')
        .eq('room_code', roomCode.toUpperCase())
        .single();

      if (error || !room) {
        if (error) {
          console.error('Failed to recover room from code:', error);
        }
        return;
      }

      this.roomId = room.id;
      
      if (!this.moveSubscription) {
        this.setupSubscriptions(room.id);
      }
    } catch (error) {
      console.error('Unexpected error recovering room from code:', error);
    }
  }

  async retryConnections(): Promise<void> {
    if (!this.roomId || !isSupabaseConfigured()) {
      return;
    }

    this.reconnectAttempts.clear();
    this.setupSubscriptions(this.roomId);
    
    if (this.onConnectionStatusChange) {
      this.onConnectionStatusChange(false);
    }
  }

  isConnected(): boolean {
    const criticalChannels = ['moves', 'players'];
    return criticalChannels.every(channel => 
      !this.reconnectAttempts.has(channel) || 
      this.reconnectAttempts.get(channel) === 0
    );
  }
}

export const multiplayerService = new MultiplayerService();






