import { useState, useRef, useEffect } from 'react';
import { Animated, Dimensions } from 'react-native';
import { DIMENSIONS } from '../constants/dimensions';

export function useBeeAnimations() {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = dimensions;
  
  // Bee positions (only small bees - bee3, bee4, bee5)
  const [bee3Pos, setBee3Pos] = useState({ x: 0, y: 0 });
  const [bee4Pos, setBee4Pos] = useState({ x: 0, y: 0 });
  const [bee5Pos, setBee5Pos] = useState({ x: 0, y: 0 });
  
  // Animation progress
  const bee3Progress = useRef(0);
  const bee4Progress = useRef(0);
  const bee5Progress = useRef(0);
  
  // Scale animations
  const bee3Scale = useRef(new Animated.Value(1)).current;
  const bee4Scale = useRef(new Animated.Value(1)).current;
  const bee5Scale = useRef(new Animated.Value(1)).current;
  const animationFrameRef = useRef(null);

  // Update dimensions
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Initialize and animate bees
  useEffect(() => {
    if (SCREEN_WIDTH === 0 || SCREEN_HEIGHT === 0) return;

    const centerX = SCREEN_WIDTH * 0.5;
    const centerY = SCREEN_HEIGHT * 0.5;
    const smallBeeOffset = DIMENSIONS.BEE_SMALL_OFFSET;

    // Initialize positions (only small bees)
    bee3Progress.current = 0;
    bee4Progress.current = 0;
    bee5Progress.current = 0;
    
    setBee3Pos({ x: centerX - smallBeeOffset, y: centerY - 150 - smallBeeOffset });
    setBee4Pos({ x: centerX - smallBeeOffset, y: centerY - smallBeeOffset });
    setBee5Pos({ x: centerX + 150 - smallBeeOffset, y: centerY - smallBeeOffset });

    // Animation loop
    let lastTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;

      // Bee 3: Circular path (small)
      bee3Progress.current += deltaTime / 7;
      if (bee3Progress.current >= 1) bee3Progress.current -= 1;
      const angle3 = bee3Progress.current * Math.PI * 2;
      const radius3 = Math.min(SCREEN_WIDTH * 0.25, SCREEN_HEIGHT * 0.2);
      setBee3Pos({
        x: centerX - SCREEN_WIDTH * 0.2 + radius3 * Math.cos(angle3) - smallBeeOffset,
        y: centerY - SCREEN_HEIGHT * 0.25 + radius3 * Math.sin(angle3) - smallBeeOffset,
      });

      // Bee 4: Figure-8 path (small)
      bee4Progress.current += deltaTime / 9;
      if (bee4Progress.current >= 1) bee4Progress.current -= 1;
      const t4 = bee4Progress.current * Math.PI * 2;
      const radiusX4 = SCREEN_WIDTH * 0.22;
      const radiusY4 = SCREEN_HEIGHT * 0.15;
      setBee4Pos({
        x: centerX - SCREEN_WIDTH * 0.15 + radiusX4 * Math.sin(t4) - smallBeeOffset,
        y: centerY + radiusY4 * Math.sin(t4) * Math.cos(t4) - smallBeeOffset,
      });

      // Bee 5: Circular path (small)
      bee5Progress.current += deltaTime / 6.5;
      if (bee5Progress.current >= 1) bee5Progress.current -= 1;
      const angle5 = bee5Progress.current * Math.PI * 2;
      const radius5 = Math.min(SCREEN_WIDTH * 0.2, SCREEN_HEIGHT * 0.18);
      setBee5Pos({
        x: centerX + SCREEN_WIDTH * 0.15 + radius5 * Math.cos(angle5) - smallBeeOffset,
        y: centerY - SCREEN_HEIGHT * 0.2 + radius5 * Math.sin(angle5) - smallBeeOffset,
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Buzzing animations
    const createBuzz = (scaleRef) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(scaleRef, {
            toValue: 1.15,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleRef, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const bee3Buzz = createBuzz(bee3Scale);
    const bee4Buzz = createBuzz(bee4Scale);
    const bee5Buzz = createBuzz(bee5Scale);

    bee3Buzz.start();
    bee4Buzz.start();
    bee5Buzz.start();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      bee3Buzz.stop();
      bee4Buzz.stop();
      bee5Buzz.stop();
    };
  }, [SCREEN_WIDTH, SCREEN_HEIGHT]);

  return {
    bee3Pos,
    bee4Pos,
    bee5Pos,
    bee3Scale,
    bee4Scale,
    bee5Scale,
  };
}

