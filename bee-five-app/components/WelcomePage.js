import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WelcomePage({ onGameModeSelect }) {
  const glRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  const onContextCreate = (gl) => {
    glRef.current = gl;
    
    if (!gl) return;
    
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0xFFC30B); // Yellow background
    rendererRef.current = renderer;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    camera.position.y = 1;
    cameraRef.current = camera;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create 3D title "Bee-Five"
    const createTitle = () => {
      const titleGroup = new THREE.Group();

      // Create "Bee" text geometry (simplified as boxes for mobile compatibility)
      const beeGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.1);
      const beeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFC30B,
        metalness: 0.3,
        roughness: 0.4
      });
      
      const beeMesh = new THREE.Mesh(beeGeometry, beeMaterial);
      beeMesh.position.set(-0.5, 0.5, 0);
      titleGroup.add(beeMesh);

      // Create "Five" text geometry
      const fiveGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.1);
      const fiveMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x000000,
        metalness: 0.3,
        roughness: 0.4
      });
      
      const fiveMesh = new THREE.Mesh(fiveGeometry, fiveMaterial);
      fiveMesh.position.set(0.5, 0.5, 0);
      titleGroup.add(fiveMesh);

      // Add decorative bee emoji (as a sphere)
      const beeEmojiGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const beeEmojiMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFD700,
        metalness: 0.5,
        roughness: 0.3
      });
      
      const beeEmoji1 = new THREE.Mesh(beeEmojiGeometry, beeEmojiMaterial);
      beeEmoji1.position.set(-1.2, 0.5, 0);
      titleGroup.add(beeEmoji1);

      const beeEmoji2 = new THREE.Mesh(beeEmojiGeometry, beeEmojiMaterial);
      beeEmoji2.position.set(1.2, 0.5, 0);
      titleGroup.add(beeEmoji2);

      titleGroup.position.set(0, 1.5, 0);
      return titleGroup;
    };

    // Create floating particles/bees
    const createParticles = () => {
      const particles = new THREE.Group();
      const particleCount = 20;
      
      for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshStandardMaterial({ 
          color: 0xFFD700,
          emissive: 0xFFC30B,
          emissiveIntensity: 0.5
        });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.set(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        );
        
        particle.userData = {
          speed: Math.random() * 0.02 + 0.01,
          rotationSpeed: Math.random() * 0.02 + 0.01
        };
        
        particles.add(particle);
      }
      
      return particles;
    };

    // Create background hexagons (honeycomb pattern)
    const createHoneycomb = () => {
      const honeycomb = new THREE.Group();
      const hexCount = 15;
      
      for (let i = 0; i < hexCount; i++) {
        const shape = new THREE.Shape();
        const radius = 0.3;
        const sides = 6;
        
        for (let j = 0; j < sides; j++) {
          const angle = (j / sides) * Math.PI * 2;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          if (j === 0) {
            shape.moveTo(x, y);
          } else {
            shape.lineTo(x, y);
          }
        }
        shape.closePath();
        
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshStandardMaterial({ 
          color: 0xFFD700,
          transparent: true,
          opacity: 0.1,
          side: THREE.DoubleSide
        });
        
        const hex = new THREE.Mesh(geometry, material);
        hex.position.set(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          -2 - Math.random() * 3
        );
        hex.rotation.z = Math.random() * Math.PI;
        
        hex.userData = {
          rotationSpeed: (Math.random() - 0.5) * 0.01
        };
        
        honeycomb.add(hex);
      }
      
      return honeycomb;
    };

    const title = createTitle();
    scene.add(title);

    const particles = createParticles();
    scene.add(particles);

    const honeycomb = createHoneycomb();
    scene.add(honeycomb);

    setIsReady(true);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Rotate title
      if (title) {
        title.rotation.y += 0.01;
        title.position.y = 1.5 + Math.sin(Date.now() * 0.001) * 0.1;
      }

      // Animate particles
      particles.children.forEach((particle) => {
        particle.rotation.x += particle.userData.rotationSpeed;
        particle.rotation.y += particle.userData.rotationSpeed;
        particle.position.y += particle.userData.speed;
        if (particle.position.y > 5) {
          particle.position.y = -5;
        }
      });

      // Animate honeycomb
      honeycomb.children.forEach((hex) => {
        hex.rotation.z += hex.userData.rotationSpeed;
      });

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  };

  return (
    <View style={styles.container}>
      <GLView
        style={StyleSheet.absoluteFill}
        onContextCreate={onContextCreate}
      />
      
      {/* UI Overlay */}
      <View style={styles.overlay}>
        {/* Title - shown as React Native text over 3D scene */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>🐝 Bee-Five 🐝</Text>
          <Text style={styles.subtitle}>
            Your favourite version of{' '}
            <Text style={styles.connectFive}>CONNECT-FIVE</Text>!
          </Text>
        </View>

        {/* Menu Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.takeTurnsButton]}
            onPress={() => onGameModeSelect && onGameModeSelect('local')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonEmoji}>👥</Text>
            <Text style={styles.buttonText}>Take Turns</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.aiButton]}
            onPress={() => onGameModeSelect && onGameModeSelect('ai')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonEmoji}>🤖</Text>
            <Text style={styles.buttonText}>AI Game</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.onlineButton]}
            onPress={() => onGameModeSelect && onGameModeSelect('online')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonEmoji}>🌐</Text>
            <Text style={styles.buttonText}>Online Multiplayer</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🐝 © 2025 Bee-Five. Product of MindGrind 🐝
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFC30B',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFC30B',
    textShadowColor: '#000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  connectFive: {
    fontWeight: '900',
    color: '#ff4d4f',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buttonContainer: {
    alignItems: 'center',
    gap: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
    minWidth: 250,
    borderWidth: 3,
    borderColor: '#FFC30B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  takeTurnsButton: {
    backgroundColor: '#4CAF50',
  },
  aiButton: {
    backgroundColor: '#2196F3',
  },
  onlineButton: {
    backgroundColor: '#FF9800',
  },
  buttonEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});

