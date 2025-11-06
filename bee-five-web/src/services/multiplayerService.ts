import { supabase, GameRoom, GamePlayer, GameState, GameMove, isSupabaseConfigured } from '../lib/supabase';

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

export class MultiplayerService {
  private roomId: string | null = null;
  private playerNumber: 1 | 2 = 1;
  private playerId: string | null = null; // Client-generated ID
  private databasePlayerId: string | null = null; // Database UUID for the player record
  private roomSubscription: any = null;
  private playerSubscription: any = null;
  private moveSubscription: any = null;
  private gameStateSubscription: any = null;
  private reconnectAttempts: Map<string, number> = new Map();
  private reconnectTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000; // 1 second

  // Event handlers
  public onRoomUpdate?: (roomInfo: RoomInfo) => void;
  public onMove?: (move: GameMove) => void;
  public onGameStateUpdate?: (gameState: GameState) => void;
  public onPlayerJoined?: (player: GamePlayer) => void;
  public onPlayerLeft?: (playerId: string) => void;
  public onError?: (error: string) => void;
  public onConnectionStatusChange?: (isConnected: boolean) => void;

  // Generate a unique player ID
  private generatePlayerId(): string {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  // Create a new game room
  async createRoom(playerName: string): Promise<RoomInfo> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please check your deployment environment variables.');
    }

    // Validate player name
    if (!playerName || !playerName.trim()) {
      throw new Error('Player name is required');
    }

    try {
      this.playerId = this.generatePlayerId();
      const roomCode = this.generateRoomCode();
      
      // Create room in database
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
        // Provide more specific error messages based on error code
        let errorMessage = 'Failed to create room';
        
        if (roomError.code === '23505') {
          errorMessage = 'Room code already exists. Please try again.';
        } else if (roomError.code === 'PGRST301' || roomError.code === 'PGRST116') {
          errorMessage = 'Database connection error. Please check your Supabase configuration.';
        } else if (roomError.code === '42P01') {
          errorMessage = 'Database table not found. Please run the database setup script.';
        } else if (roomError.code === 'PGRST302') {
          errorMessage = 'Permission denied. Please check your Row Level Security policies.';
        } else if ((roomError as any).statusCode === 401) {
          errorMessage = 'Authentication failed. Please check your Supabase API key in deployment settings.';
        } else if ((roomError as any).statusCode === 403) {
          errorMessage = 'Permission denied. Please check your Row Level Security policies.';
        } else if ((roomError as any).statusCode === 0 || (roomError as any).statusCode === undefined) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (roomError.message) {
          errorMessage = `Failed to create room: ${roomError.message}`;
        } else if (roomError.details) {
          errorMessage = `Failed to create room: ${roomError.details}`;
        } else if (roomError.hint) {
          errorMessage = `Failed to create room: ${roomError.hint}`;
        } else if (roomError.code) {
          errorMessage = `Failed to create room (Error code: ${roomError.code}). Please check your database setup.`;
        }
        
        throw new Error(errorMessage);
      }

      if (!room) {
        throw new Error('Failed to create room: No room data returned from database');
      }
      
      // Add host as player
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
        // Clean up room if player creation fails
        await supabase!.from('game_rooms').delete().eq('id', room.id);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to add player';
        if (playerError.code === '23505') {
          errorMessage = 'Player already exists in this room.';
        } else if (playerError.code === '23503') {
          errorMessage = 'Room reference error. Please try creating a new room.';
        } else if (playerError.code === 'PGRST301') {
          errorMessage = 'Database connection error. Please check your Supabase configuration.';
        } else if (playerError.code === '42P01') {
          errorMessage = 'Database table not found. Please run the database setup script.';
        } else if (playerError.message) {
          errorMessage = `Failed to add player: ${playerError.message}`;
        } else {
          errorMessage = `Failed to add player: ${playerError.code || 'Unknown database error'}`;
        }
        
        throw new Error(errorMessage);
      }

      this.roomId = room.id;
      this.playerNumber = 1;
      this.databasePlayerId = player.id;

      // Set up real-time subscriptions
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

  // Join an existing room
  async joinRoom(roomCode: string, playerName: string): Promise<RoomInfo> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set up your Supabase credentials in .env.local');
    }

    // Validate room code format
    const trimmedCode = roomCode.trim().toUpperCase();
    if (!trimmedCode || trimmedCode.length !== 6) {
      throw new Error('Room code must be 6 characters long');
    }

    // Validate player name
    if (!playerName.trim()) {
      throw new Error('Player name is required');
    }

    try {
      this.playerId = this.generatePlayerId();

      // Find room by code
      const { data: room, error: roomError } = await supabase!
        .from('game_rooms')
        .select('*')
        .eq('room_code', trimmedCode)
        .single();

      if (roomError) {
        // Provide more helpful error messages
        if (roomError.code === 'PGRST116') {
          throw new Error('Room not found. Please check the room code and try again.');
        }
        throw new Error(`Failed to find room: ${roomError.message || roomError.code || 'Database error'}`);
      }

      if (!room) {
        throw new Error('Room not found. Please check the room code and try again.');
      }

      // Check if room status allows joining
      if (room.status !== 'waiting') {
        if (room.status === 'active') {
          throw new Error('This game has already started. Please ask the host to share a new room code.');
        } else if (room.status === 'finished') {
          throw new Error('This game has already finished. Please ask the host to create a new room.');
        }
        throw new Error(`Cannot join room: Room status is "${room.status}"`);
      }

      // Check if room already has 2 players
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

      // Add guest as player
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
        // Check for common database errors
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

      // Set up real-time subscriptions
      this.setupSubscriptions(room.id);

      // Get all players
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

  // Setup real-time subscriptions with retry logic
  private setupSubscriptions(roomId: string, isRetry: boolean = false) {
    if (!isSupabaseConfigured()) {
      return;
    }

    // Clear any existing subscriptions first
    this.cleanupSubscriptions();

    // Subscribe to room updates
    this.roomSubscription = supabase!
      .channel(`room:${roomId}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        () => {
          // Handle room status changes
        }
      )
      .subscribe((status) => {
        this.handleSubscriptionStatus('room', status, roomId);
      });

    // Subscribe to player joins and leaves
    this.playerSubscription = supabase!
      .channel(`players:${roomId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newPlayer = payload.new as GamePlayer;
          // Only notify if it's not the current player (check database ID)
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

    // Subscribe to move changes
    this.moveSubscription = supabase!
      .channel(`moves:${roomId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_moves', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const move = payload.new as GameMove;
          
          // Verify roomId matches (safety check)
          if (move.room_id !== this.roomId) {
            return;
          }
          
          // Only handle opponent moves
          if (move.player_number !== this.playerNumber && this.onMove) {
            this.onMove(move);
          }
        }
      )
      .subscribe((status) => {
        this.handleSubscriptionStatus('moves', status, roomId);
      });

    // Subscribe to game state changes
    this.gameStateSubscription = supabase!
      .channel(`game_state:${roomId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_state', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const gameState = payload.new as GameState;
          if (this.onGameStateUpdate) {
            this.onGameStateUpdate(gameState);
          }
        }
      )
      .subscribe((status) => {
        this.handleSubscriptionStatus('game_state', status, roomId);
      });

    // Track subscription status
    if (!isRetry) {
      this.reconnectAttempts.clear();
    }
  }

  // Handle subscription status with retry logic
  private handleSubscriptionStatus(channelName: string, status: string, roomId: string) {
    if (status === 'SUBSCRIBED') {
      // Successfully subscribed - reset retry counter
      this.reconnectAttempts.delete(channelName);
      const timeout = this.reconnectTimeouts.get(channelName);
      if (timeout) {
        clearTimeout(timeout);
        this.reconnectTimeouts.delete(channelName);
      }
      
      // Check if all critical channels are connected
      this.checkConnectionStatus();
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      // Connection failed - attempt to reconnect
      this.attemptReconnect(channelName, roomId);
    }
  }

  // Attempt to reconnect with exponential backoff
  private attemptReconnect(channelName: string, roomId: string) {
    const attempts = this.reconnectAttempts.get(channelName) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      if (this.onError) {
        this.onError(`Connection failed after ${this.maxReconnectAttempts} attempts. Please refresh the page.`);
      }
      if (this.onConnectionStatusChange) {
        this.onConnectionStatusChange(false);
      }
      return;
    }

    this.reconnectAttempts.set(channelName, attempts + 1);
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = this.baseReconnectDelay * Math.pow(2, attempts);
    
    const timeout = setTimeout(() => {
      if (this.roomId === roomId) { // Only reconnect if still in the same room
        this.setupSubscriptions(roomId, true);
      }
    }, delay);
    
    this.reconnectTimeouts.set(channelName, timeout);
  }

  // Check overall connection status
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

  // Cleanup subscriptions
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
    
    // Clear all reconnect timeouts
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts.clear();
  }

  // Send a move with retry logic
  async sendMove(row: number, col: number): Promise<void> {
    if (!this.roomId || !isSupabaseConfigured()) {
      return;
    }

    const maxRetries = 3;
    let lastError: any = null;

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
        
        // Success - return early
        return;
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error && typeof error === 'object' && 'code' in error) {
          const errorCode = (error as any).code;
          if (errorCode === '23505' || errorCode === '23503') {
            // Unique constraint violation or foreign key violation - don't retry
            break;
          }
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    // All retries failed
    if (this.onError) {
      this.onError('Failed to send move after multiple attempts. Please check your connection.');
    }
  }

  // Update game state
  async updateGameState(board: (0 | 1 | 2)[][], currentPlayer: 1 | 2, winner: 0 | 1 | 2, isGameActive: boolean): Promise<void> {
    if (!this.roomId || !isSupabaseConfigured()) return;

    try {
      // Get existing game state or create new one
      const { data: existingState } = await supabase!
        .from('game_state')
        .select('*')
        .eq('room_id', this.roomId)
        .single();

      const gameStateData = {
        room_id: this.roomId,
        board_state: JSON.stringify(board),
        current_player: currentPlayer,
        winner,
        is_game_active: isGameActive,
        updated_at: new Date().toISOString()
      };

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
      if (this.onError) {
        this.onError('Failed to update game state');
      }
    }
  }

  // Leave the room
  async leaveRoom(): Promise<void> {
    if (!isSupabaseConfigured()) {
      this.roomId = null;
      this.playerId = null;
      this.databasePlayerId = null;
      return;
    }

    // Cleanup subscriptions and timeouts
    this.cleanupSubscriptions();
    this.reconnectAttempts.clear();
    
    // Clear event handlers
    this.onMove = undefined;
    this.onPlayerJoined = undefined;
    this.onPlayerLeft = undefined;
    this.onGameStateUpdate = undefined;
    this.onError = undefined;
    this.onConnectionStatusChange = undefined;

    // Remove player from database (use database UUID, not client ID)
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

  // Generate room code
  private generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Get current room info
  getCurrentRoomId(): string | null {
    return this.roomId;
  }

  getPlayerNumber(): 1 | 2 {
    return this.playerNumber;
  }

  // Fetch existing moves for a room (used when joining)
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
        return [];
      }

      return moves || [];
    } catch (error) {
      return [];
    }
  }

  // Fetch current game state
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
        return null;
      }

      return gameState;
    } catch (error) {
      return null;
    }
  }

  // Recovery method: restore roomId from room code (for Fast Refresh issues)
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
        return;
      }

      this.roomId = room.id;
      
      // Also restore subscriptions if they're missing
      if (!this.moveSubscription) {
        this.setupSubscriptions(room.id);
      }
    } catch (error) {
      // Silent fail for recovery
    }
  }

  // Manually retry connections (useful for UI retry buttons)
  async retryConnections(): Promise<void> {
    if (!this.roomId || !isSupabaseConfigured()) {
      return;
    }

    // Reset retry counters
    this.reconnectAttempts.clear();
    
    // Re-establish subscriptions
    this.setupSubscriptions(this.roomId);
    
    if (this.onConnectionStatusChange) {
      this.onConnectionStatusChange(false); // Set to connecting state
    }
  }

  // Check if currently connected
  isConnected(): boolean {
    // Check if critical subscriptions exist and haven't failed
    const criticalChannels = ['moves', 'players'];
    return criticalChannels.every(channel => 
      !this.reconnectAttempts.has(channel) || 
      this.reconnectAttempts.get(channel) === 0
    );
  }
}

export const multiplayerService = new MultiplayerService();


