import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface NightAnimationProps {
  starCount?: number;
  moonSize?: number;
  moonPosition?: { top?: number; right?: number; left?: number; bottom?: number };
}

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: Animated.Value;
}

const NightAnimation: React.FC<NightAnimationProps> = ({ 
  starCount = 50, 
  moonSize = 80,
  moonPosition = { top: 60, right: 40 }
}) => {
  // Stars state
  const [stars, setStars] = useState<Star[]>([]);
  
  // Moon animation values
  const moonOpacity = useRef(new Animated.Value(0.7)).current;
  const moonGlow = useRef(new Animated.Value(5)).current;
  
  // Initialize stars
  useEffect(() => {
    const initialStars: Star[] = [];
    
    for (let i = 0; i < starCount; i++) {
      initialStars.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * (height * 0.7), // Keep stars in the top 70% of screen
        size: 1 + Math.random() * 2, // Random size between 1-3
        opacity: new Animated.Value(0.1 + Math.random() * 0.7) // Random initial opacity
      });
    }
    
    setStars(initialStars);
  }, [starCount]);
  
  // Star twinkling animation
  useEffect(() => {
    stars.forEach(star => {
      // Create a random duration for twinkling
      const twinkleDuration = 1000 + Math.random() * 3000;
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(star.opacity, {
            toValue: 0.1 + Math.random() * 0.5,
            duration: twinkleDuration,
            useNativeDriver: true,
          }),
          Animated.timing(star.opacity, {
            toValue: 0.5 + Math.random() * 0.5,
            duration: twinkleDuration,
            useNativeDriver: true,
          })
        ])
      ).start();
    });
  }, [stars]);
  
  // Moon glow animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(moonGlow, {
          toValue: 8,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(moonGlow, {
          toValue: 5,
          duration: 3000,
          useNativeDriver: false,
        })
      ])
    ).start();
    
    // Moon subtle opacity changes
    Animated.loop(
      Animated.sequence([
        Animated.timing(moonOpacity, {
          toValue: 0.8,
          duration: 5000,
          useNativeDriver: false,
        }),
        Animated.timing(moonOpacity, {
          toValue: 0.7,
          duration: 5000,
          useNativeDriver: false,
        })
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Stars */}
      {stars.map(star => (
        <Animated.View
          key={`star-${star.id}`}
          style={[
            styles.star,
            {
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              opacity: star.opacity
            }
          ]}
        />
      ))}
      
      {/* Moon */}
      <Animated.View 
        style={[
          styles.moonContainer,
          moonPosition,
          {
            shadowOpacity: moonOpacity,
            shadowRadius: moonGlow
          }
        ]}
      >
        <View style={[styles.moon, { width: moonSize, height: moonSize, borderRadius: moonSize / 2 }]}>
          <View style={[styles.crater, { top: moonSize * 0.2, left: moonSize * 0.3, width: moonSize * 0.15, height: moonSize * 0.15 }]} />
          <View style={[styles.crater, { top: moonSize * 0.5, left: moonSize * 0.5, width: moonSize * 0.2, height: moonSize * 0.2 }]} />
          <View style={[styles.crater, { top: moonSize * 0.6, left: moonSize * 0.2, width: moonSize * 0.12, height: moonSize * 0.12 }]} />
        </View>
      </Animated.View>
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
  star: {
    position: 'absolute',
    backgroundColor: 'white',
  },
  moonContainer: {
    position: 'absolute',
    shadowColor: '#D6E4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
    elevation: 10,
  },
  moon: {
    backgroundColor: '#ECF0F9',
    borderColor: '#D6E4FF',
    borderWidth: 1,
    overflow: 'hidden',
  },
  crater: {
    position: 'absolute',
    backgroundColor: 'rgba(209, 218, 245, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 100,
  }
});

export default NightAnimation; 