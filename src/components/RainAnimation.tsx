import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface RainAnimationProps {
  count?: number;
  speed?: number;
  opacity?: number;
}

const RainAnimation: React.FC<RainAnimationProps> = ({ 
  count = 50, 
  speed = 3000, 
  opacity = 0.7 
}) => {
  // Array to store raindrop animations
  const raindrops = useRef<{
    x: number;
    y: Animated.Value;
    length: number;
    opacity: number;
    speed: number;
  }[]>([]).current;

  // Initialize raindrops once on component mount
  useEffect(() => {
    // Clear any existing raindrops (for hot reload)
    raindrops.length = 0;
    
    // Create a bunch of raindrops
    for (let i = 0; i < count; i++) {
      createRaindrop(i, count);
    }
  }, [count]);

  // Function to create a raindrop with random properties
  const createRaindrop = (index: number, totalDrops: number) => {
    const x = Math.random() * width;
    const length = 10 + Math.random() * 20; // Random length between 10 and 30
    const dropOpacity = (0.4 + Math.random() * 0.6) * opacity; // Random opacity
    const dropSpeed = speed * (0.7 + Math.random() * 0.6); // Random speed
    
    // Distribute initial positions throughout the screen height
    // This ensures some raindrops are already visible when component mounts
    const initialY = (index / totalDrops) * (height + 200) - 200;
    const yAnimation = new Animated.Value(initialY);
    
    // Add to raindrops array
    const raindrop = {
      x,
      y: yAnimation,
      length,
      opacity: dropOpacity,
      speed: dropSpeed
    };
    
    raindrops.push(raindrop);
    
    // Start animation - use the calculated initial position
    animateRaindrop(raindrop, initialY);
  };

  // Function to animate a raindrop falling
  const animateRaindrop = (raindrop: {
    y: Animated.Value;
    speed: number;
  }, initialY = -30) => {
    // Calculate remaining distance to bottom based on initial position
    const remainingDistance = height + 100 - initialY;
    const adjustedDuration = raindrop.speed * (remainingDistance / (height + 130));
    
    Animated.timing(raindrop.y, {
      toValue: height + 100, // Move beyond bottom of screen
      duration: adjustedDuration, // Adjust duration based on starting position
      useNativeDriver: true,
      easing: (t) => t, // Linear easing
    }).start(() => {
      // Reset raindrop position to top when it goes off screen
      raindrop.y.setValue(-30);
      // Animate again - now with full duration
      Animated.timing(raindrop.y, {
        toValue: height + 100,
        duration: raindrop.speed,
        useNativeDriver: true,
        easing: (t) => t,
      }).start(() => {
        raindrop.y.setValue(-30);
        animateRaindrop(raindrop);
      });
    });
  };

  return (
    <View style={styles.container}>
      {raindrops.map((drop, index) => (
        <Animated.View
          key={`raindrop-${index}`}
          style={[
            styles.raindrop,
            {
              left: drop.x,
              height: drop.length,
              opacity: drop.opacity,
              transform: [{ translateY: drop.y }]
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
  },
  raindrop: {
    position: 'absolute',
    width: 2.5,
    backgroundColor: 'white',
    borderRadius: 1,
    shadowColor: 'white',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});

export default RainAnimation; 