import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import RainAnimation from './RainAnimation';

const { width, height } = Dimensions.get('window');

interface ThunderstormAnimationProps {
  rainCount?: number;
  lightning?: boolean;
  lightningFrequency?: number;
}

const ThunderstormAnimation: React.FC<ThunderstormAnimationProps> = ({ 
  rainCount = 100,
  lightning = true,
  lightningFrequency = 3000, // ms between lightning flashes (average)
}) => {
  // For the lightning flash overlay
  const [showLightning, setShowLightning] = useState(false);
  const lightningOpacity = useRef(new Animated.Value(0)).current;
  
  // Simpler lightning bolt state
  const [lightnings, setLightnings] = useState<{
    bolt1: {
      visible: boolean;
      x: number;
      width: number;
      opacity: Animated.Value;
    };
    bolt2: {
      visible: boolean;
      x: number;
      width: number;
      opacity: Animated.Value;
    };
    bolt3: {
      visible: boolean;
      x: number;
      width: number;
      opacity: Animated.Value;
    };
  }>({
    bolt1: {
      visible: false,
      x: width * 0.3,
      width: 3,
      opacity: new Animated.Value(0),
    },
    bolt2: {
      visible: false,
      x: width * 0.6,
      width: 2.5,
      opacity: new Animated.Value(0),
    },
    bolt3: {
      visible: false,
      x: width * 0.45,
      width: 2,
      opacity: new Animated.Value(0),
    },
  });
  
  // Create a lightning flash and bolt animation
  const createLightningFlash = () => {
    // Show lightning overlay
    setShowLightning(true);
    
    // Generate new random positions for bolts
    const newBolt1X = width * (0.3 + Math.random() * 0.4);
    const newBolt2X = width * (0.3 + Math.random() * 0.4);
    const newBolt3X = width * (0.3 + Math.random() * 0.4);
    
    // Update state with new positions and visibility
    setLightnings(prev => ({
      bolt1: {
        ...prev.bolt1,
        visible: true,
        x: newBolt1X,
        width: 2 + Math.random() * 1.5,
      },
      bolt2: {
        ...prev.bolt2,
        visible: Math.random() > 0.3, // 70% chance of second bolt
        x: newBolt2X,
        width: 1.5 + Math.random() * 1,
      },
      bolt3: {
        ...prev.bolt3,
        visible: Math.random() > 0.6, // 40% chance of third bolt
        x: newBolt3X,
        width: 1 + Math.random() * 1,
      },
    }));
    
    // Animate the flash background
    Animated.sequence([
      // Bright flash
      Animated.timing(lightningOpacity, {
        toValue: 0.7,
        duration: 30,
        useNativeDriver: true,
      }),
      // Quick dim
      Animated.timing(lightningOpacity, {
        toValue: 0.2,
        duration: 30,
        useNativeDriver: true,
      }),
      // Second flash
      Animated.timing(lightningOpacity, {
        toValue: 0.5,
        duration: 30,
        useNativeDriver: true,
      }),
      // Fade out
      Animated.timing(lightningOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowLightning(false);
      
      // Schedule next lightning with variable timing
      const nextDelay = lightningFrequency * (0.5 + Math.random() * 1.5);
      setTimeout(createLightningFlash, nextDelay);
    });
    
    // Animate the bolts with slight timing offset
    const animateBolt = (bolt: Animated.Value) => {
      return Animated.sequence([
        // Flash on
        Animated.timing(bolt, {
          toValue: 1,
          duration: 20,
          useNativeDriver: true,
        }),
        // Brief hold
        Animated.timing(bolt, {
          toValue: 1,
          duration: 20,
          useNativeDriver: true,
        }),
        // Partial fade
        Animated.timing(bolt, {
          toValue: 0.3,
          duration: 20,
          useNativeDriver: true,
        }),
        // Brief second flash
        Animated.timing(bolt, {
          toValue: 0.7,
          duration: 30,
          useNativeDriver: true,
        }),
        // Fade out
        Animated.timing(bolt, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
      ]);
    };
    
    // Animate each visible bolt with slight delay
    if (lightnings.bolt1.visible) {
      animateBolt(lightnings.bolt1.opacity).start();
    }
    
    if (lightnings.bolt2.visible) {
      setTimeout(() => {
        animateBolt(lightnings.bolt2.opacity).start();
      }, 30);
    }
    
    if (lightnings.bolt3.visible) {
      setTimeout(() => {
        animateBolt(lightnings.bolt3.opacity).start();
      }, 60);
    }
  };
  
  // Setup initial lightning on mount
  useEffect(() => {
    if (!lightning) return;
    
    const initialDelay = Math.random() * lightningFrequency * 0.5;
    const timer = setTimeout(createLightningFlash, initialDelay);
    
    return () => clearTimeout(timer);
  }, [lightning, lightningFrequency]);

  // Render simple lightning bolt
  const renderLightningBolt = (x: number, width: number, opacity: Animated.Value) => {
    // Simple zig-zag pattern
    const zigzag = 15;
    const segmentHeight = height * 0.5 / 5; // 5 segments in half the screen
    
    return (
      <Animated.View style={{ opacity }}>
        {/* Bolt glow - widens the bolt for better visibility */}
        <View
          style={[
            styles.lightningGlow,
            {
              left: x - width * 3,
              width: width * 6,
              height: height * 0.5,
            }
          ]}
        />
        
        {/* Main trunk */}
        <View
          style={[
            styles.lightningBolt,
            {
              left: x,
              width: width,
              height: height * 0.5,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
            }
          ]}
        />
        
        {/* Segment 1 - slight right bend */}
        <View
          style={[
            styles.lightningBolt,
            {
              left: x + zigzag * 0.3,
              top: segmentHeight,
              width: width,
              height: segmentHeight * 0.6,
              transform: [{ rotate: '15deg' }],
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
            }
          ]}
        />
        
        {/* Segment 2 - slight left bend */}
        <View
          style={[
            styles.lightningBolt,
            {
              left: x - zigzag * 0.5,
              top: segmentHeight * 2,
              width: width,
              height: segmentHeight * 0.7,
              transform: [{ rotate: '-20deg' }],
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
            }
          ]}
        />
        
        {/* Segment 3 - back right */}
        <View
          style={[
            styles.lightningBolt,
            {
              left: x + zigzag * 0.4,
              top: segmentHeight * 3,
              width: width,
              height: segmentHeight * 0.8,
              transform: [{ rotate: '25deg' }],
              backgroundColor: 'rgba(245, 250, 255, 0.9)',
            }
          ]}
        />
        
        {/* Branch - smaller offshoot */}
        <View
          style={[
            styles.lightningBolt,
            {
              left: x - zigzag * 0.6,
              top: segmentHeight * 2.5,
              width: width * 0.7,
              height: segmentHeight * 0.7,
              transform: [{ rotate: '-40deg' }],
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
            }
          ]}
        />
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Rain layer */}
      <RainAnimation count={rainCount} speed={4000} opacity={0.85} />
      
      {/* Lightning bolts */}
      {lightnings.bolt1.visible && renderLightningBolt(
        lightnings.bolt1.x, 
        lightnings.bolt1.width, 
        lightnings.bolt1.opacity
      )}
      
      {lightnings.bolt2.visible && renderLightningBolt(
        lightnings.bolt2.x, 
        lightnings.bolt2.width, 
        lightnings.bolt2.opacity
      )}
      
      {lightnings.bolt3.visible && renderLightningBolt(
        lightnings.bolt3.x, 
        lightnings.bolt3.width, 
        lightnings.bolt3.opacity
      )}
      
      {/* Lightning flash overlay */}
      {showLightning && (
        <Animated.View
          style={[
            styles.lightningOverlay,
            { opacity: lightningOpacity }
          ]}
        />
      )}
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
  lightningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  lightningBolt: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 10,
  },
  lightningGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 5,
  },
});

export default ThunderstormAnimation; 