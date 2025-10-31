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
  private playerId: string | null = null;
  private roomSubscription: any = null;
  private moveSubscription: any = null;
  private gameStateSubscription: any = null;

  // Event handlers
  public onRoomUpdate?: (roomInfo: RoomInfo) => void;
  public onMove?: (move: GameMove) => void;
  public onGameStateUpdate?: (gameState: GameState) => void;
  public onPlayerJoined?: (player: GamePlayer) => void;
  public onPlayerLeft?: (playerId: string) => void;
  public onError?: (error: string) => void;

  // Generate a unique player ID
  private generatePlayerId(): string {
    return 'player_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  // Create a new game room
  async createRoom(playerName: string): Promise<RoomInfo> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set up your Supabase credentials in .env.local');
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

      if (roomError) throw roomError;

      // Add host as player
      const { data: player, error: playerError } = await supabase!
        .from('game_players')
        .insert({
          room_id: room.id,
          player_name: playerName,
          player_number: 1,
          is_host: true
        })
        .select()
        .single();

      if (playerError) throw playerError;

      this.roomId = room.id;
      this.playerNumber = 1;

      // Set up real-time subscriptions
      this.setupSubscriptions(room.id);

      return {
        roomId: roomCode,
        players: [{
          id: this.playerId!,
          name: playerName,
          playerNumber: 1,
          isHost: true
        }],
        isGameStarted: false,
        hostId: this.playerId!
      };
    } catch (error) {
      console.error('Error creating room:', error);
      if (this.onError) {
        this.onError('Failed to create room');
      }
      throw error;
    }
  }

  // Join an existing room
  async joinRoom(roomCode: string, playerName: string): Promise<RoomInfo> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please set up your Supabase credentials in .env.local');
    }

    try {
      this.playerId = this.generatePlayerId();

      // Find room by code
      const { data: room, error: roomError } = await supabase!
        .from('game_rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .single();

      if (roomError || !room) {
        throw new Error('Room not found');
      }

      // Check if room already has 2 players
      const { data: players } = await supabase!
        .from('game_players')
        .select('*')
        .eq('room_id', room.id);

      if (players && players.length >= 2) {
        throw new Error('Room is full');
      }

      // Add guest as player
      const { data: player, error: playerError } = await supabase!
        .from('game_players')
        .insert({
          room_id: room.id,
          player_name: playerName,
          player_number: 2,
          is_host: false
        })
        .select()
        .single();

      if (playerError) throw playerError;

      this.roomId = room.id;
      this.playerNumber = 2;

      // Set up real-time subscriptions
      this.setupSubscriptions(room.id);

      // Get all players
      const { data: allPlayers } = await supabase!
        .from('game_players')
        .select('*')
        .eq('room_id', room.id);

      return {
        roomId: roomCode,
        players: allPlayers!.map(p => ({
          id: player.id,
          name: p.player_name,
          playerNumber: p.player_number,
          isHost: p.is_host
        })),
        isGameStarted: allPlayers!.length >= 2,
        hostId: room.host_id
      };
    } catch (error) {
      console.error('Error joining room:', error);
      if (this.onError) {
        this.onError(error instanceof Error ? error.message : 'Failed to join room');
      }
      throw error;
    }
  }

  // Setup real-time subscriptions
  private setupSubscriptions(roomId: string) {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured, real-time features will not work');
      return;
    }

    // Subscribe to room updates
    this.roomSubscription = supabase!
      .channel(`room:${roomId}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          console.log('Room updated:', payload);
          // Handle room status changes
        }
      )
      .subscribe();

    // Subscribe to player changes
    this.moveSubscription = supabase!
      .channel(`moves:${roomId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_moves', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const move = payload.new as GameMove;
          // Only handle opponent moves
          if (move.player_number !== this.playerNumber && this.onMove) {
            this.onMove(move);
          }
        }
      )
      .subscribe();

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
      .subscribe();
  }

  // Send a move
  async sendMove(row: number, col: number): Promise<void> {
    if (!this.roomId) return;

    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const { error } = await supabase!
        .from('game_moves')
        .insert({
          room_id: this.roomId,
          player_number: this.playerNumber,
          row,
          col,
          timestamp: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending move:', error);
      if (this.onError) {
        this.onError('Failed to send move');
      }
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
      console.error('Error updating game state:', error);
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
      return;
    }

    // Unsubscribe from all channels
    if (this.roomSubscription) {
      await supabase!.removeChannel(this.roomSubscription);
    }
    if (this.moveSubscription) {
      await supabase!.removeChannel(this.moveSubscription);
    }
    if (this.gameStateSubscription) {
      await supabase!.removeChannel(this.gameStateSubscription);
    }

    // Remove player from database
    if (this.roomId && this.playerId) {
      await supabase!
        .from('game_players')
        .delete()
        .eq('room_id', this.roomId)
        .eq('id', this.playerId);
    }

    this.roomId = null;
    this.playerId = null;
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
}

export const multiplayerService = new MultiplayerService();


