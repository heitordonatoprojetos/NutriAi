const required = [
  'expo-camera',
  'expo-notifications',
  'expo-file-system',
  'expo-sharing',
  'expo-print',
  '@react-native-async-storage/async-storage',
  'expo-linear-gradient',
];

const missing = [];
for (const pkg of required) {
  try {
    require.resolve(pkg);
  } catch {
    missing.push(pkg);
  }
}

if (missing.length) {
  console.error('\n[NutriAI] Dependências ausentes detectadas:');
  missing.forEach((m) => console.error(` - ${m}`));
  console.error('\nExecute: npm install\n');
  process.exit(1);
}

console.log('[NutriAI] Dependências nativas ok.');
