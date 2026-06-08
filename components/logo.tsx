import { View, Image, StyleSheet, Text } from 'react-native';

interface LogoProps {
  size?: number;
  showText?: boolean;
}

export function Logo({ size = 72, showText = false }: LogoProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/spendwise.png')}
        style={{ width: size, height: size, borderRadius: size * 0.28 }}
        resizeMode="contain"
      />
      {showText && (
        <Text style={[styles.title, { fontSize: Math.min(size * 0.45, 34) }]}>SpendWise</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#4F46E5',
    marginTop: 12,
  },
});
