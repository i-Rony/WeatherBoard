import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface CloudAnimationProps {
  count?: number;
  color?: string;
}

interface Cloud {
  id: number;
  position: Animated.ValueXY;
  scale: number;
  opacity: number;
  type: number; // Cloud shape type
}

// Array of different cloud path shapes
const cloudShapes = [
  "M25,60 L75,60 C93,60 100,45 100,35 C100,25 93,15 84,15 C84,9 80,0 65,0 C50,0 40,15 35,15 C20,15 0,25 0,45 C0,55 10,60 25,60 Z", // Original cloud
  "M20,50 L80,50 C95,50 100,40 100,30 C100,20 90,10 75,15 C75,5 65,0 55,0 C40,0 35,10 30,10 C15,10 0,20 0,35 C0,45 7,50 20,50 Z", // Wider cloud
  "M30,40 L70,40 C85,40 90,30 85,20 C80,10 70,5 60,10 C60,5 50,0 40,5 C30,10 20,5 15,10 C5,15 0,25 5,30 C10,35 20,40 30,40 Z"  // Smaller, rounder cloud
];

const CloudAnimation: React.FC<CloudAnimationProps> = ({ 
  count = 3, 
  color = 'rgba(255, 255, 255, 0.8)' 
}) => {
  // Use state to manage clouds
  const [clouds, setClouds] = useState<Cloud[]>([]);
  
  // Initialize clouds once on component mount
  useEffect(() => {
    const initialClouds: Cloud[] = [];
    
    // Create different sized clouds with variable positioning
    for (let i = 0; i < count; i++) {
      const scale = 0.7 + Math.random() * 0.8; // Larger range for cloud size
      const opacity = 0.6 + Math.random() * 0.4; // Variable opacity
      
      // Distribute clouds across the screen width
      const segment = width / count;
      const randomOffset = segment * 0.4; // 40% of segment for random positioning
      const initialX = (i * segment) + (Math.random() * randomOffset) - (width * 0.1);
      
      // Better vertical distribution
      const initialY = (Math.random() * (height / 3)) * (1 - (i % 2) * 0.5); // Alternate heights
      
      // Select a random cloud shape
      const type = Math.floor(Math.random() * cloudShapes.length);
      
      initialClouds.push({
        id: i,
        position: new Animated.ValueXY({ x: initialX, y: initialY }),
        scale,
        opacity,
        type
      });
    }
    
    setClouds(initialClouds);
  }, [count]);
  
  // Start animations when clouds are created
  useEffect(() => {
    clouds.forEach(cloud => {
      // Calculate random duration between 40-80 seconds for a full screen traverse (slower clouds)
      const duration = 40000 + Math.random() * 40000;
      
      // Start moving the cloud from current position to off screen right
      Animated.loop(
        Animated.sequence([
          // Move right
          Animated.timing(cloud.position.x, {
            toValue: width + 150, // Move further off screen
            duration: duration,
            useNativeDriver: true,
          }),
          // Reset position
          Animated.timing(cloud.position.x, {
            toValue: -150,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      ).start();
    });
  }, [clouds]);

  return (
    <View style={styles.container}>
      {clouds.map(cloud => (
        <Animated.View
          key={`cloud-${cloud.id}`}
          style={[
            styles.cloudContainer,
            {
              opacity: cloud.opacity,
              transform: [
                { translateX: cloud.position.x },
                { translateY: cloud.position.y },
                { scale: cloud.scale }
              ]
            }
          ]}
        >
          <Svg width={120} height={70} viewBox="0 0 100 60">
            <Path
              d={cloudShapes[cloud.type]}
              fill={color}
            />
          </Svg>
        </Animated.View>
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
  cloudContainer: {
    position: 'absolute',
    // Add a subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
});

export default CloudAnimation; 