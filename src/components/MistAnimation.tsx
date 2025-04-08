import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface MistAnimationProps {
  density?: number;
  speed?: number;
  opacity?: number;
}

const MistAnimation: React.FC<MistAnimationProps> = ({ 
  density = 5, 
  speed = 15000,
  opacity = 0.7
}) => {
  // Create arrays to store mist layers
  const mistLayers = useRef<{
    position: Animated.ValueXY;
    scale: number;
    opacity: number;
  }[]>([]).current;

  // Create initial mist layers
  useEffect(() => {
    // Clear existing layers (for hot reload)
    mistLayers.length = 0;
    
    // Create multiple mist layers with different speeds and positions
    for (let i = 0; i < density; i++) {
      const mistScale = 0.6 + Math.random() * 0.7; // Random size
      const mistOpacity = (0.2 + Math.random() * 0.3) * opacity; // Random opacity
      const initialX = Math.random() * width * 0.5; // Start at different positions
      
      // Add layer
      mistLayers.push({
        position: new Animated.ValueXY({ x: initialX - width, y: Math.random() * height * 0.8 }),
        scale: mistScale,
        opacity: mistOpacity
      });
      
      // Animate each layer separately
      animateMistLayer(i);
    }
  }, [density]);
  
  // Function to animate a single mist layer
  const animateMistLayer = (index: number) => {
    const layer = mistLayers[index];
    const layerSpeed = speed * (0.7 + Math.random() * 0.6); // Slightly random speed
    
    // Move mist horizontally across the screen
    Animated.loop(
      Animated.sequence([
        Animated.timing(layer.position.x, {
          toValue: width + 100, // Move beyond right edge
          duration: layerSpeed,
          useNativeDriver: true,
          easing: (t) => t, // Linear movement
        }),
        // Reset to left of screen
        Animated.timing(layer.position.x, {
          toValue: -width - 100, // Start from left of screen
          duration: 0, // Instant reset
          useNativeDriver: true,
        })
      ])
    ).start();
  };

  return (
    <View style={styles.container}>
      {mistLayers.map((layer, index) => (
        <Animated.View
          key={`mist-${index}`}
          style={[
            styles.mistLayer,
            {
              opacity: layer.opacity,
              transform: [
                { translateX: layer.position.x },
                { translateY: layer.position.y },
                { scale: layer.scale }
              ]
            }
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  mistLayer: {
    position: 'absolute',
    width: width * 2, // Make wider than screen
    height: 150,
    backgroundColor: 'white',
    borderRadius: 150,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
});

export default MistAnimation; 