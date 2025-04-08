import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface SnowAnimationProps {
  count?: number;
  speed?: number;
  opacity?: number;
}

const SnowAnimation: React.FC<SnowAnimationProps> = ({ 
  count = 50, 
  speed = 8000, 
  opacity = 0.8 
}) => {
  // Array to store snowflake animations
  const snowflakes = useRef<{
    x: Animated.Value;
    y: Animated.Value;
    size: number;
    opacity: number;
    speed: number;
    swayAmount: number;
    rotation: Animated.Value;
  }[]>([]).current;

  // Initialize snowflakes once on component mount
  useEffect(() => {
    // Clear any existing snowflakes (for hot reload)
    snowflakes.length = 0;
    
    // Create a bunch of snowflakes
    for (let i = 0; i < count; i++) {
      createSnowflake(i, count);
    }
  }, [count]);

  // Function to create a snowflake with random properties
  const createSnowflake = (index: number, totalFlakes: number) => {
    const initialX = Math.random() * width;
    const size = 3 + Math.random() * 7; // Slightly larger random size between 3 and 10
    const flakeOpacity = (0.7 + Math.random() * 0.3) * opacity; // Higher opacity
    const flakeSpeed = speed * (0.8 + Math.random() * 0.4); // More consistent speed, slightly slower
    const swayAmount = 40 + Math.random() * 60; // Reduced sway amount for gentler movement
    
    // Distribute snowflakes throughout the screen
    const initialY = (index / totalFlakes) * (height + 300) - 300;
    
    const xAnimation = new Animated.Value(initialX);
    const yAnimation = new Animated.Value(initialY);
    const rotationAnimation = new Animated.Value(0);
    
    // Add to snowflakes array
    const snowflake = {
      x: xAnimation,
      y: yAnimation,
      size,
      opacity: flakeOpacity,
      speed: flakeSpeed,
      swayAmount,
      rotation: rotationAnimation
    };
    
    snowflakes.push(snowflake);
    
    // Start animations
    animateSnowflakeFall(snowflake, initialY);
    animateSnowflakeSway(snowflake);
    animateSnowflakeRotation(snowflake);
  };

  // Function to animate a snowflake falling
  const animateSnowflakeFall = (snowflake: {
    y: Animated.Value;
    speed: number;
  }, initialY = -20) => {
    // Calculate remaining distance to bottom based on initial position
    const remainingDistance = height + 50 - initialY;
    const adjustedDuration = snowflake.speed * (remainingDistance / (height + 70));
    
    Animated.timing(snowflake.y, {
      toValue: height + 50, // Move beyond bottom of screen
      duration: adjustedDuration, // Adjusted duration
      useNativeDriver: true,
      easing: (t) => Math.sin((t * Math.PI) / 2), // Gentle easing - starts slow, accelerates gradually
    }).start(() => {
      // Reset snowflake position to top when it goes off screen
      snowflake.y.setValue(-20);
      // Animate again with full duration
      Animated.timing(snowflake.y, {
        toValue: height + 50,
        duration: snowflake.speed,
        useNativeDriver: true,
        easing: (t) => Math.sin((t * Math.PI) / 2), // Gentle easing
      }).start(() => {
        snowflake.y.setValue(-20);
        animateSnowflakeFall(snowflake);
      });
    });
  };

  // Function to animate a snowflake swaying left to right
  const animateSnowflakeSway = (snowflake: {
    x: Animated.Value;
    swayAmount: number;
  }) => {
    // Create a random starting point for the sway
    const startPosition = Math.random() * width;
    const duration1 = 5000 + Math.random() * 4000; // Longer sway durations for gentler movement
    const duration2 = 5000 + Math.random() * 4000;
    
    // Create a sequence that sways left and right from the current position
    Animated.loop(
      Animated.sequence([
        Animated.timing(snowflake.x, {
          toValue: startPosition - (snowflake.swayAmount / 2),
          duration: duration1,
          useNativeDriver: true,
          easing: (t) => Math.sin(t * Math.PI), // Smoother sine wave
        }),
        Animated.timing(snowflake.x, {
          toValue: startPosition + (snowflake.swayAmount / 2),
          duration: duration2,
          useNativeDriver: true,
          easing: (t) => Math.sin(t * Math.PI),
        })
      ])
    ).start();
  };
  
  // Function to animate snowflake rotation
  const animateSnowflakeRotation = (snowflake: {
    rotation: Animated.Value;
  }) => {
    // Rotate snowflakes more slowly for a more subtle effect
    Animated.loop(
      Animated.timing(snowflake.rotation, {
        toValue: 1,
        duration: 10000 + Math.random() * 8000, // Much slower rotation
        useNativeDriver: true,
      })
    ).start();
  };

  return (
    <View style={styles.container}>
      {snowflakes.map((flake, index) => {
        // Convert rotation value to degrees
        const spin = flake.rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });
        
        return (
          <Animated.View
            key={`snowflake-${index}`}
            style={[
              styles.snowflakeContainer,
              {
                transform: [
                  { translateX: flake.x },
                  { translateY: flake.y },
                  { rotate: spin },
                  { scale: flake.size / 10 } // Scale based on size
                ],
                opacity: flake.opacity
              }
            ]}
          >
            {/* Simple snowflake shape */}
            <View style={styles.snowflakeCross}>
              <View style={styles.snowflakeVertical} />
              <View style={styles.snowflakeHorizontal} />
              <View style={[styles.snowflakeDiagonal, { transform: [{ rotate: '45deg' }] }]} />
              <View style={[styles.snowflakeDiagonal, { transform: [{ rotate: '135deg' }] }]} />
            </View>
          </Animated.View>
        );
      })}
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
  snowflakeContainer: {
    position: 'absolute',
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snowflakeCross: {
    width: 10,
    height: 10,
    position: 'relative',
  },
  snowflakeVertical: {
    position: 'absolute',
    left: '50%',
    width: 2,
    height: 10,
    marginLeft: -1,
    backgroundColor: 'white',
  },
  snowflakeHorizontal: {
    position: 'absolute',
    top: '50%',
    width: 10,
    height: 2,
    marginTop: -1,
    backgroundColor: 'white',
  },
  snowflakeDiagonal: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 10,
    height: 2,
    marginLeft: -5,
    marginTop: -1,
    backgroundColor: 'white',
  },
  snowflake: {
    position: 'absolute',
    backgroundColor: 'white',
    shadowColor: 'white',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
});

export default SnowAnimation; 