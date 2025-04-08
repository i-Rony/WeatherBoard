import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SunAnimationProps {
  size?: number;
  color?: string;
  position?: { top?: number; right?: number; left?: number; bottom?: number };
}

const SunAnimation: React.FC<SunAnimationProps> = ({ 
  size = 120, 
  color = '#FFDC00',
  position = { top: 50, right: 50 }
}) => {
  // Animation values
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Setup animations on component mount
  useEffect(() => {
    // Continuous rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 30000, // 30 seconds for a full rotation
        useNativeDriver: true,
      })
    ).start();

    // Pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Convert rotation value to rotation degrees
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Define the sun rays
  const renderRays = () => {
    const rays = [];
    const rayCount = 12;
    const rayLength = size * 0.4;
    const rayWidth = 3;

    for (let i = 0; i < rayCount; i++) {
      const angle = (i * 360) / rayCount;
      rays.push(
        <View
          key={`ray-${i}`}
          style={[
            styles.ray,
            {
              backgroundColor: color,
              height: rayLength,
              width: rayWidth,
              transform: [
                { rotate: `${angle}deg` },
                { translateY: -rayLength / 2 },
              ],
            },
          ]}
        />
      );
    }

    return rays;
  };

  return (
    <View 
      style={[
        styles.container,
        position
      ]}
    >
      <Animated.View
        style={[
          styles.raysContainer,
          {
            width: size * 1.8,
            height: size * 1.8,
            transform: [
              { rotate: spin },
              { scale: pulseAnim }
            ],
          },
        ]}
      >
        {renderRays()}
      </Animated.View>

      <Animated.View
        style={[
          styles.sun,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  raysContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute',
    borderRadius: 5,
  },
  sun: {
    opacity: 0.9,
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 5,
  },
});

export default SunAnimation; 