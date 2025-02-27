import React from 'react';
import { StyleSheet, View, Image } from 'react-native';

export function AnimatedBackground() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/glitch.gif')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
}); 