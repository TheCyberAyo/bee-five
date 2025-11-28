import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';
import { multiplayerService, type RoomInfo } from '../services/multiplayerService';
import { isSupabaseConfigured } from '../lib/supabase';

interface MultiplayerLobbyProps {
  onGameStart: (roomInfo: RoomInfo, playerNumber: 1 | 2) => void;
  onBackToMenu: () => void;
}

export default function MultiplayerLobby({ onGameStart, onBackToMenu }: MultiplayerLobbyProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [lobbyMode, setLobbyMode] = useState<'menu' | 'create' | 'join' | 'waiting'>('menu');
  const [error, setError] = useState<string | null>(null);

  const transitioningToGameRef = useRef(false);
  const isCreatingOrJoiningRef = useRef(false);

  useEffect(() => {
    if (!currentRoom) {
      transitioningToGameRef.current = false;
    }
  }, [currentRoom]);

  useEffect(() => {
    return () => {
      const isTransitioning = transitioningToGameRef.current;
      const isInProgress = isCreatingOrJoiningRef.current;
      
      if (!isTransitioning && !isInProgress) {
        if (multiplayerService.getCurrentRoomId()) {
          multiplayerService.leaveRoom();
        }
      }
    };
  }, []);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsCreatingRoom(true);
    setError(null);
    isCreatingOrJoiningRef.current = true;

    try {
      const roomInfo = await multiplayerService.createRoom(playerName.trim());
      setCurrentRoom(roomInfo);
      setLobbyMode('waiting');
      
      multiplayerService.onPlayerJoined = (player) => {
        const updatedRoom: RoomInfo = {
          ...roomInfo,
          players: [
            ...roomInfo.players,
            {
              id: player.id,
              name: player.player_name,
              playerNumber: player.player_number,
              isHost: player.is_host
            }
          ],
          isGameStarted: true
        };
        setCurrentRoom(updatedRoom);
        transitioningToGameRef.current = true;
        onGameStart(updatedRoom, 1);
      };
      
      multiplayerService.onError = (errorMsg) => {
        setError(errorMsg);
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to create room. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      setIsCreatingRoom(false);
      isCreatingOrJoiningRef.current = false;
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setIsJoiningRoom(true);
    setError(null);
    isCreatingOrJoiningRef.current = true;

    try {
      const roomInfo = await multiplayerService.joinRoom(roomCode.trim(), playerName.trim());
      setCurrentRoom(roomInfo);
      setLobbyMode('waiting');
      
      transitioningToGameRef.current = true;
      onGameStart(roomInfo, 2);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join room. Please check the room code.';
      setError(errorMessage);
    } finally {
      setIsJoiningRoom(false);
      isCreatingOrJoiningRef.current = false;
    }
  };

  const handleLeaveRoom = () => {
    if (currentRoom) {
      multiplayerService.leaveRoom();
    }
    setCurrentRoom(null);
    setLobbyMode('menu');
  };

  const handleBackToMenu = () => {
    if (currentRoom) {
      handleLeaveRoom();
    }
    onBackToMenu();
  };

  const renderLobbyMenu = () => {
    const isConfigured = isSupabaseConfigured();
    
    return (
      <View style={styles.menuContainer}>
        <Text style={styles.title}>🐝 Direct Multiplayer 🐝</Text>

        {!isConfigured && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Supabase is not configured. Please check your environment variables.
            </Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          value={playerName}
          onChangeText={setPlayerName}
          maxLength={20}
          placeholderTextColor="#999"
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💻 Play directly with friends on the same network or different devices!
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.menuButton, styles.greenButton, (!playerName.trim() || !isConfigured) && styles.disabledButton]}
            onPress={() => setLobbyMode('create')}
            disabled={!playerName.trim() || !isConfigured}
          >
            <Text style={styles.buttonText}>🏠 Create Room</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuButton, styles.blueButton, (!playerName.trim() || !isConfigured) && styles.disabledButton]}
            onPress={() => setLobbyMode('join')}
            disabled={!playerName.trim() || !isConfigured}
          >
            <Text style={styles.buttonText}>🚪 Join Room</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    );
  };

  const renderCreateRoom = () => (
    <View style={styles.menuContainer}>
      <Text style={styles.subtitle}>Create New Room</Text>
      
      <Text style={styles.infoText}>
        Creating a room for: <Text style={styles.boldText}>{playerName}</Text>
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          💻 Direct Connection Mode
        </Text>
        <Text style={styles.infoTextSmall}>
          Share the room code with your friend to play together
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.menuButton, styles.greenButton, isCreatingRoom && styles.disabledButton]}
        onPress={handleCreateRoom}
        disabled={isCreatingRoom}
      >
        <Text style={styles.buttonText}>
          {isCreatingRoom ? '🔄 Creating...' : '🏠 Create Room'}
        </Text>
      </TouchableOpacity>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.menuButton, styles.grayButton]}
        onPress={() => {
          setError(null);
          setLobbyMode('menu');
        }}
      >
        <Text style={styles.buttonText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderJoinRoom = () => (
    <View style={styles.menuContainer}>
      <Text style={styles.subtitle}>Join Room</Text>
      
      <Text style={styles.infoText}>
        Joining as: <Text style={styles.boldText}>{playerName}</Text>
      </Text>

      <TextInput
        style={styles.roomCodeInput}
        placeholder="Enter room code"
        value={roomCode}
        onChangeText={(text) => setRoomCode(text.toUpperCase())}
        maxLength={6}
        autoCapitalize="characters"
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={[styles.menuButton, styles.blueButton, (isJoiningRoom || !roomCode.trim()) && styles.disabledButton]}
        onPress={handleJoinRoom}
        disabled={isJoiningRoom || !roomCode.trim()}
      >
        <Text style={styles.buttonText}>
          {isJoiningRoom ? '🔄 Joining...' : '🚪 Join Room'}
        </Text>
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <TouchableOpacity
        style={[styles.menuButton, styles.grayButton]}
        onPress={() => setLobbyMode('menu')}
      >
        <Text style={styles.buttonText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderWaitingRoom = () => {
    if (!currentRoom) return null;

    const hostPlayer = currentRoom.players.find(p => p.isHost);
    const guestPlayer = currentRoom.players.find(p => !p.isHost);

    return (
      <View style={styles.menuContainer}>
        <Text style={styles.subtitle}>
          Room: {currentRoom.roomId}
        </Text>

        <View style={styles.playersBox}>
          <Text style={styles.playersTitle}>Players ({currentRoom.players.length}/2)</Text>
          
          <View style={styles.playersRow}>
            <View style={styles.playerCard}>
              <Text style={styles.playerEmoji}>🐝</Text>
              <Text style={styles.playerName}>
                {hostPlayer?.name || 'Host'} (Host)
              </Text>
              <Text style={styles.playerInfo}>
                Player 1 - Black Pieces
              </Text>
            </View>

            <Text style={styles.vsText}>VS</Text>

            <View style={styles.playerCard}>
              {guestPlayer ? (
                <>
                  <Text style={styles.playerEmoji}>🐝</Text>
                  <Text style={styles.playerName}>
                    {guestPlayer.name}
                  </Text>
                  <Text style={styles.playerInfo}>
                    Player 2 - Yellow Pieces
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.playerEmoji, styles.waitingEmoji]}>⏳</Text>
                  <Text style={styles.waitingText}>
                    Waiting for player...
                  </Text>
                  <Text style={styles.roomCodeText}>
                    Share room code: <Text style={styles.boldText}>{currentRoom.roomId}</Text>
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {!guestPlayer && (
          <View style={styles.roomCodeBox}>
            <Text style={styles.roomCodeTitle}>📋 Share Room Code</Text>
            <Text style={styles.roomCodeDisplay}>{currentRoom.roomId}</Text>
            <Text style={styles.roomCodeHint}>
              Send this code to your friend so they can join!
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.menuButton, styles.redButton]}
          onPress={handleLeaveRoom}
        >
          <Text style={styles.buttonText}>🚪 Leave Room</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/BEE-FIVE.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <View style={styles.contentBox}>
          {lobbyMode === 'menu' && renderLobbyMenu()}
          {lobbyMode === 'create' && renderCreateRoom()}
          {lobbyMode === 'join' && renderJoinRoom()}
          {lobbyMode === 'waiting' && renderWaitingRoom()}

          <TouchableOpacity
            style={[styles.menuButton, styles.grayButton, styles.backButton]}
            onPress={handleBackToMenu}
          >
            <Text style={styles.buttonText}>← Back to Main Menu</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFC30B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 25,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#000000',
    borderBottomWidth: 2,
    borderBottomColor: '#FFC30B',
  },
  logoContainer: {
    width: 150,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contentBox: {
    backgroundColor: 'rgba(135, 206, 235, 0.95)',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 500,
    borderWidth: 4,
    borderColor: '#000',
  },
  menuContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    backgroundColor: '#fff',
    color: '#333',
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  roomCodeInput: {
    width: '100%',
    padding: 15,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    backgroundColor: '#fff',
    color: '#333',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 15,
  },
  menuButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  greenButton: {
    backgroundColor: '#4CAF50',
  },
  blueButton: {
    backgroundColor: '#2196F3',
  },
  grayButton: {
    backgroundColor: '#666',
  },
  redButton: {
    backgroundColor: '#f44336',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 20,
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffc107',
    marginBottom: 15,
    width: '100%',
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 15,
    width: '100%',
  },
  infoText: {
    color: '#2e7d32',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  infoTextSmall: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  errorBox: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#f44336',
    marginBottom: 15,
    width: '100%',
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  boldText: {
    fontWeight: 'bold',
  },
  playersBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    marginBottom: 20,
    width: '100%',
  },
  playersTitle: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  playersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  playerCard: {
    alignItems: 'center',
    flex: 1,
  },
  playerEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  waitingEmoji: {
    opacity: 0.3,
  },
  playerName: {
    fontWeight: 'bold',
    color: '#000',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  playerInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  vsText: {
    fontSize: 20,
    color: '#666',
    marginHorizontal: 10,
  },
  waitingText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 5,
  },
  roomCodeText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  roomCodeBox: {
    backgroundColor: 'rgba(255, 255, 0, 0.2)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFC30B',
    marginBottom: 20,
    width: '100%',
  },
  roomCodeTitle: {
    color: '#000',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  roomCodeDisplay: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 4,
  },
  roomCodeHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
