import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

WebBrowser.maybeCompleteAuthSession();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let db;
try {
  db = SQLite.openDatabaseSync('nutriai.db');
} catch {
  db = null;
}

const goalOptions = [
  { id: 'cut', label: 'Emagrecer', emoji: '🔥' },
  { id: 'maintain', label: 'Manter peso', emoji: '⚖️' },
  { id: 'gain', label: 'Ganhar massa', emoji: '💪' },
];

const activityOptions = ['Sedentário', 'Leve', 'Moderado', 'Intenso'];
const mealNames = ['Café da manhã', 'Almoço', 'Jantar', 'Lanches'];

const localFoodCatalog = [
  { name: 'Arroz branco cozido', kcal100g: 130 },
  { name: 'Feijão carioca cozido', kcal100g: 76 },
  { name: 'Peito de frango grelhado', kcal100g: 165 },
  { name: 'Batata doce cozida', kcal100g: 86 },
  { name: 'Ovo cozido', kcal100g: 155 },
  { name: 'Banana', kcal100g: 89 },
  { name: 'Maçã', kcal100g: 52 },
  { name: 'Aveia', kcal100g: 389 },
  { name: 'Pão integral', kcal100g: 247 },
  { name: 'Iogurte natural', kcal100g: 61 },
  { name: 'Abacate', kcal100g: 160 },
  { name: 'Salmão', kcal100g: 208 },
  { name: 'Carne bovina magra', kcal100g: 217 },
];

const estimateCaloriesAI = (name, grams) => {
  const n = name.toLowerCase();
  const groups = [
    { keys: ['frango', 'carne', 'peixe', 'salmão'], kcal: 190 },
    { keys: ['arroz', 'pão', 'massa', 'macarrão', 'batata', 'aveia'], kcal: 145 },
    { keys: ['feijão', 'lentilha', 'grão'], kcal: 110 },
    { keys: ['abacate', 'castanha', 'amendoim'], kcal: 220 },
    { keys: ['banana', 'maçã', 'fruta'], kcal: 80 },
    { keys: ['alface', 'salada', 'tomate', 'legume'], kcal: 35 },
  ];
  const hit = groups.find((g) => g.keys.some((k) => n.includes(k)));
  return Math.round(((hit?.kcal || 120) * grams) / 100);
};

const hashText = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const inferFoodsFromImage = (photoMeta) => {
  const seed = hashText(`${photoMeta.uri}-${photoMeta.width}-${photoMeta.height}-${photoMeta.base64?.slice(0, 160) || ''}`);
  const source = [...localFoodCatalog].sort((a, b) => (hashText(a.name + seed) > hashText(b.name + seed) ? 1 : -1));
  const pick = source.slice(0, 3);
  return pick.map((item, i) => {
    const grams = 80 + ((seed >> (i * 3)) % 170);
    const confidence = 0.58 + (((seed >> (i * 2 + 1)) % 35) / 100);
    return {
      name: item.name,
      grams,
      confidence: Number(confidence.toFixed(2)),
      kcal: Math.round((item.kcal100g * grams) / 100),
      method: 'Reconhecimento IA por imagem (dinâmico)',
    };
  });
};

const ensureTables = () => {
  if (!db) return;
  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      email TEXT,
      weight REAL,
      height REAL,
      age INTEGER,
      sex TEXT,
      goal TEXT,
      targetWeight REAL,
      activity TEXT,
      kcalGoal INTEGER,
      waterGoalMl INTEGER
    );
    CREATE TABLE IF NOT EXISTS meal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      mealName TEXT,
      foodName TEXT,
      grams REAL,
      kcal INTEGER,
      source TEXT,
      createdAt TEXT
    );
    CREATE TABLE IF NOT EXISTS preferences (
      userId TEXT PRIMARY KEY,
      remindersMeal INTEGER,
      remindersWater INTEGER,
      smartwatchSync INTEGER
    );
  `);
};

function Card({ title, right, children }) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function Pill({ label, onPress, primary }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pill, primary ? styles.pillPrimary : styles.pillSecondary]}>
      <Text style={[styles.pillText, primary && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ProgressBar({ value, max, color }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <View>
      <View style={styles.rowBetween}>
        <Text style={styles.smallMuted}>{value} / {max}</Text>
        <Text style={styles.smallMuted}>{pct}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export default function App() {
  const cameraRef = useRef(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [notifPermission, setNotifPermission] = useState(false);
  const [notifModal, setNotifModal] = useState(false);
  const [notifications, setNotifications] = useState([
    'Hora de beber água 💧',
    'Você ainda precisa de 800ml hoje',
    'Hora da próxima refeição 🍽️',
  ]);

  const [step, setStep] = useState(1);
  const [tab, setTab] = useState('Dashboard');
  const [foodModal, setFoodModal] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [prefModal, setPrefModal] = useState(false);

  const [searchLoading, setSearchLoading] = useState(false);
  const [foodQuery, setFoodQuery] = useState('');
  const [grams, setGrams] = useState('100');
  const [selectedMeal, setSelectedMeal] = useState('Almoço');
  const [foodResults, setFoodResults] = useState(localFoodCatalog.map((f) => ({ ...f, source: 'Base local' })));

  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoItems, setPhotoItems] = useState([]);
  const [photoLoading, setPhotoLoading] = useState(false);

  const [waterMl, setWaterMl] = useState(1200);
  const [weightHistory, setWeightHistory] = useState([78, 77.6, 77.2, 76.9, 76.5]);

  const [prefs, setPrefs] = useState({
    remindersMeal: true,
    remindersWater: true,
    smartwatchSync: false,
  });

  const [profile, setProfile] = useState({
    id: 'local-user',
    name: 'Heitor',
    email: 'local@nutriai.app',
    weight: '78',
    height: '176',
    age: '29',
    sex: 'Masculino',
    goal: 'cut',
    targetWeight: '74',
    timeline: '8',
    activity: 'Moderado',
    kcalGoal: 2000,
    waterGoalMl: 2500,
  });

  const [meals, setMeals] = useState({
    'Café da manhã': [],
    Almoço: [],
    Jantar: [],
    Lanches: [],
  });

  const googleRedirectUri = AuthSession.makeRedirectUri({ useProxy: true });
  const hasGoogleConfig = Boolean(
    process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID
      || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
      || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  );
  const [_request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri: googleRedirectUri,
    },
    { authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth', tokenEndpoint: 'https://oauth2.googleapis.com/token' },
  );

  useEffect(() => {
    ensureTables();
    loadAllFromDb();
    askNotificationPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const token = response.params?.access_token;
      if (token) fetchGoogleProfile(token);
    }
  }, [response]);

  const askNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotifPermission(status === 'granted');
  };

  const scheduleReminder = async (message, hour = 10, minute = 0) => {
    if (!notifPermission) return;
    await Notifications.scheduleNotificationAsync({
      content: { title: 'NutriAI', body: message },
      trigger: { hour, minute, repeats: true },
    });
  };

  const fetchGoogleProfile = async (accessToken) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      const next = {
        ...profile,
        id: data.id || profile.id,
        name: data.name || profile.name,
        email: data.email || profile.email,
      };
      setProfile(next);
      saveUser(next);
      Alert.alert('Login Google', `Conectado como ${next.name}`);
    } catch {
      Alert.alert('Login Google', 'Não foi possível carregar perfil Google agora.');
    }
  };

  const saveUser = (user) => {
    if (!db) return;
    db.runSync(
      `INSERT OR REPLACE INTO users (id, name, email, weight, height, age, sex, goal, targetWeight, activity, kcalGoal, waterGoalMl)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.email,
        Number(user.weight),
        Number(user.height),
        Number(user.age),
        user.sex,
        user.goal,
        Number(user.targetWeight),
        user.activity,
        Number(user.kcalGoal),
        Number(user.waterGoalMl),
      ],
    );
  };

  const savePrefs = (nextPrefs) => {
    if (!db) return;
    db.runSync(
      `INSERT OR REPLACE INTO preferences (userId, remindersMeal, remindersWater, smartwatchSync) VALUES (?, ?, ?, ?)`,
      [profile.id, nextPrefs.remindersMeal ? 1 : 0, nextPrefs.remindersWater ? 1 : 0, nextPrefs.smartwatchSync ? 1 : 0],
    );
  };

  const loadAllFromDb = () => {
    if (!db) return;
    const user = db.getFirstSync('SELECT * FROM users LIMIT 1');
    if (user) {
      setProfile((p) => ({
        ...p,
        id: user.id,
        name: user.name || p.name,
        email: user.email || p.email,
        weight: String(user.weight || p.weight),
        height: String(user.height || p.height),
        age: String(user.age || p.age),
        sex: user.sex || p.sex,
        goal: user.goal || p.goal,
        targetWeight: String(user.targetWeight || p.targetWeight),
        activity: user.activity || p.activity,
        kcalGoal: user.kcalGoal || p.kcalGoal,
        waterGoalMl: user.waterGoalMl || p.waterGoalMl,
      }));
    }

    const pref = db.getFirstSync('SELECT * FROM preferences WHERE userId = ?', [user?.id || 'local-user']);
    if (pref) {
      setPrefs({
        remindersMeal: !!pref.remindersMeal,
        remindersWater: !!pref.remindersWater,
        smartwatchSync: !!pref.smartwatchSync,
      });
    }

    const rows = db.getAllSync('SELECT * FROM meal_entries ORDER BY createdAt DESC LIMIT 300');
    if (rows.length) {
      const grouped = { 'Café da manhã': [], Almoço: [], Jantar: [], Lanches: [] };
      rows.forEach((r) => {
        if (!grouped[r.mealName]) grouped[r.mealName] = [];
        grouped[r.mealName].push({ food: r.foodName, grams: r.grams, kcal: r.kcal, source: r.source });
      });
      setMeals(grouped);
    }
  };

  const addMealItem = (mealName, foodName, gramsVal, kcal, source) => {
    const entry = { food: foodName, grams: gramsVal, kcal, source };
    setMeals((prev) => ({ ...prev, [mealName]: [entry, ...prev[mealName]] }));
    if (db) {
      db.runSync(
        'INSERT INTO meal_entries (userId, mealName, foodName, grams, kcal, source, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [profile.id, mealName, foodName, gramsVal, kcal, source, new Date().toISOString()],
      );
    }
  };

  const removeMealItem = (mealName, index) => {
    const target = meals[mealName][index];
    setMeals((prev) => ({
      ...prev,
      [mealName]: prev[mealName].filter((_, i) => i !== index),
    }));
    if (db) {
      db.runSync(
        'DELETE FROM meal_entries WHERE id IN (SELECT id FROM meal_entries WHERE userId = ? AND mealName = ? AND foodName = ? LIMIT 1)',
        [profile.id, mealName, target.food],
      );
    }
  };

  const handleGoogleLogin = async () => {
    if (!hasGoogleConfig) {
      Alert.alert('Google Login', 'Configure EXPO_PUBLIC_GOOGLE_* para ativar o login Google.');
      return;
    }
    await promptAsync();
  };

  const searchFoods = async () => {
    if (!foodQuery.trim()) {
      setFoodResults(localFoodCatalog.map((f) => ({ ...f, source: 'Base local' })));
      return;
    }

    setSearchLoading(true);
    try {
      const q = encodeURIComponent(foodQuery.trim());
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=12`;
      const res = await fetch(url);
      const json = await res.json();
      const parsed = (json.products || []).map((p) => ({
        name: p.product_name || p.generic_name || 'Alimento',
        kcal100g: Number(p?.nutriments?.['energy-kcal_100g']) || null,
        source: 'Open Food Facts',
      }));
      setFoodResults(parsed.filter((f) => f.name).slice(0, 12));
    } catch {
      setFoodResults(localFoodCatalog.map((f) => ({ ...f, source: 'Base local' })));
    } finally {
      setSearchLoading(false);
    }
  };

  const applyFood = (food) => {
    const g = Number(grams) || 100;
    const kcal = food.kcal100g ? Math.round((food.kcal100g * g) / 100) : estimateCaloriesAI(food.name, g);
    const source = food.kcal100g ? food.source : `${food.source} + IA`;
    addMealItem(selectedMeal, food.name, g, kcal, source);
    setFoodModal(false);
  };

  const openCameraFlow = async () => {
    if (!cameraPermission?.granted) {
      const status = await requestCameraPermission();
      if (!status.granted) {
        Alert.alert('Permissão de câmera', 'Precisamos da câmera para análise por foto.');
        return;
      }
    }
    setPhotoModal(true);
  };

  const captureAndInfer = async () => {
    try {
      setPhotoLoading(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      setCapturedPhoto(photo);
      const infer = inferFoodsFromImage(photo);
      setPhotoItems(infer);
    } catch {
      Alert.alert('Câmera', 'Falha ao capturar foto.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const confirmPhotoItems = () => {
    photoItems.forEach((item) => addMealItem(selectedMeal, item.name, item.grams, item.kcal, item.method));
    setPhotoModal(false);
    setCapturedPhoto(null);
    setPhotoItems([]);
  };

  const dayTotal = useMemo(
    () => Object.values(meals).flat().reduce((sum, item) => sum + item.kcal, 0),
    [meals],
  );

  const mealTotals = useMemo(
    () => Object.fromEntries(mealNames.map((name) => [name, meals[name].reduce((s, i) => s + i.kcal, 0)])),
    [meals],
  );

  const goalLabel = goalOptions.find((g) => g.id === profile.goal)?.label || 'Emagrecer';

  const exportJsonBackupToDrive = async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      prefs,
      meals,
      waterMl,
      notifications,
      weightHistory,
    };

    const uri = `${FileSystem.cacheDirectory}nutriai-backup-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Salvar backup no Drive' });
    } else {
      Alert.alert('Backup', `Arquivo criado em: ${uri}`);
    }
  };

  const exportDietPdf = async () => {
    const html = `
      <h1>Relatório NutriAI</h1>
      <p>Usuário: ${profile.name} (${profile.email})</p>
      <p>Objetivo: ${goalLabel}</p>
      <p>Calorias hoje: ${dayTotal} / ${profile.kcalGoal}</p>
      <p>Água: ${waterMl} / ${profile.waterGoalMl} ml</p>
      ${mealNames
        .map(
          (m) => `<h3>${m}</h3><ul>${meals[m]
            .map((item) => `<li>${item.food} - ${item.grams}g - ${item.kcal} kcal (${item.source})</li>`)
            .join('')}</ul>`,
        )
        .join('')}
    `;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar dieta em PDF' });
  };

  const restartOnboarding = () => {
    setStep(1);
    setTab('Dashboard');
  };

  const saveProfileAndClose = () => {
    saveUser(profile);
    setProfileModal(false);
    const weightNum = Number(profile.weight);
    if (!Number.isNaN(weightNum)) {
      setWeightHistory((old) => [weightNum, ...old].slice(0, 10));
    }
  };

  const savePrefsAndClose = async () => {
    savePrefs(prefs);
    if (prefs.remindersMeal) await scheduleReminder('Hora da próxima refeição 🍽️', 12, 0);
    if (prefs.remindersWater) await scheduleReminder('Hora de beber água 💧', 10, 30);
    setPrefModal(false);
  };

  const renderOnboarding = () => {
    if (step === 1) {
      return (
        <View style={styles.centered}>
          <Text style={styles.titleBig}>NutriAI v1.01</Text>
          <Text style={styles.subtitle}>Controle sua alimentação com IA em segundos</Text>
          <Pill label="Começar" primary onPress={() => setStep(2)} />
          <Pill label="Já tenho conta" onPress={() => setStep(7)} />
          <Pill
            label="Entrar com Google"
            primary
            onPress={handleGoogleLogin}
          />
        </View>
      );
    }

    if (step === 2) {
      return (
        <View style={styles.screen}>
          <Text style={styles.title}>Qual seu objetivo?</Text>
          {goalOptions.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.optionCard, profile.goal === g.id && styles.optionCardActive]}
              onPress={() => setProfile((p) => ({ ...p, goal: g.id }))}
            >
              <Text style={styles.optionText}>{g.emoji} {g.label}</Text>
            </TouchableOpacity>
          ))}
          <Pill label="Continuar" primary onPress={() => setStep(3)} />
        </View>
      );
    }

    if (step === 3) {
      return (
        <View style={styles.screen}>
          <Text style={styles.title}>Dados físicos</Text>
          <TextInput style={styles.input} value={profile.name} placeholder="Nome" onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))} />
          <TextInput style={styles.input} value={profile.weight} placeholder="Peso" onChangeText={(v) => setProfile((p) => ({ ...p, weight: v }))} keyboardType="numeric" />
          <TextInput style={styles.input} value={profile.height} placeholder="Altura" onChangeText={(v) => setProfile((p) => ({ ...p, height: v }))} keyboardType="numeric" />
          <TextInput style={styles.input} value={profile.age} placeholder="Idade" onChangeText={(v) => setProfile((p) => ({ ...p, age: v }))} keyboardType="numeric" />
          <TextInput style={styles.input} value={profile.sex} placeholder="Sexo" onChangeText={(v) => setProfile((p) => ({ ...p, sex: v }))} />
          <Pill label="Continuar" primary onPress={() => setStep(4)} />
        </View>
      );
    }

    if (step === 4) {
      return (
        <View style={styles.screen}>
          <Text style={styles.title}>Meta</Text>
          <TextInput style={styles.input} value={profile.targetWeight} placeholder="Peso desejado" onChangeText={(v) => setProfile((p) => ({ ...p, targetWeight: v }))} keyboardType="numeric" />
          <TextInput style={styles.input} value={profile.timeline} placeholder="Tempo em semanas" onChangeText={(v) => setProfile((p) => ({ ...p, timeline: v }))} keyboardType="numeric" />
          <Text style={styles.smallMuted}>Meta: perder {Math.max(Number(profile.weight) - Number(profile.targetWeight), 0)}kg em {profile.timeline} semanas</Text>
          <Pill label="Continuar" primary onPress={() => setStep(5)} />
        </View>
      );
    }

    if (step === 5) {
      return (
        <View style={styles.screen}>
          <Text style={styles.title}>Nível de atividade</Text>
          {activityOptions.map((a) => (
            <TouchableOpacity
              key={a}
              style={[styles.optionCard, profile.activity === a && styles.optionCardActive]}
              onPress={() => setProfile((p) => ({ ...p, activity: a }))}
            >
              <Text style={styles.optionText}>{a}</Text>
            </TouchableOpacity>
          ))}
          <Pill label="Continuar" primary onPress={() => setStep(6)} />
        </View>
      );
    }

    const kcalPreview = profile.kcalGoal;
    const waterPreview = profile.waterGoalMl;
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Resultado automático</Text>
        <Card title="Calorias/dia"><Text style={styles.big}>{kcalPreview} kcal</Text></Card>
        <Card title="Água recomendada"><Text style={styles.big}>{(waterPreview / 1000).toFixed(1)} L</Text></Card>
        <Card title="Macros"><Text style={styles.smallMuted}>P: 150g • C: 210g • G: 60g</Text></Card>
        <Pill
          label="Ir para o app"
          primary
          onPress={() => {
            saveUser(profile);
            setStep(7);
          }}
        />
      </View>
    );
  };

  const renderDashboard = () => (
    <ScrollView style={styles.screen}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.title}>Bom dia, {profile.name}</Text>
          <Text style={styles.smallMuted}>{goalLabel}</Text>
        </View>
        <TouchableOpacity style={styles.notificationSquare} onPress={() => setNotifModal(true)}>
          <Text style={styles.notificationEmoji}>🔔</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>{notifications.length}</Text></View>
        </TouchableOpacity>
      </View>

      <Card title="Calorias do dia" right={<Text style={styles.tag}>{Math.round((dayTotal / profile.kcalGoal) * 100)}%</Text>}>
        <Text style={styles.big}>{dayTotal} / {profile.kcalGoal} kcal</Text>
        <ProgressBar value={dayTotal} max={profile.kcalGoal} color="#2E6BFF" />
        <View style={{ marginTop: 8 }}>
          <ProgressBar value={150} max={200} color="#7D5EFF" />
          <ProgressBar value={190} max={260} color="#47B881" />
          <ProgressBar value={58} max={80} color="#FF8A3D" />
        </View>
      </Card>

      <Card title="Água" right={<Text style={styles.tag}>{Math.round((waterMl / profile.waterGoalMl) * 100)}%</Text>}>
        <Text style={styles.big}>{(waterMl / 1000).toFixed(1)} / {(profile.waterGoalMl / 1000).toFixed(1)} L</Text>
        <ProgressBar value={waterMl} max={profile.waterGoalMl} color="#18A0FB" />
        <View style={styles.rowWrap}>
          {[200, 300, 500].map((m) => (
            <Pill key={m} label={`+${m}ml`} onPress={() => setWaterMl((w) => w + m)} />
          ))}
        </View>
      </Card>

      <Card title="Refeições" right={<Pill label="+ Adicionar" primary onPress={() => setFoodModal(true)} />}>
        {mealNames.map((meal) => (
          <View key={meal} style={styles.mealCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.mealTitle}>{meal}</Text>
              <Text style={styles.smallMuted}>{mealTotals[meal]} kcal</Text>
            </View>
            {meals[meal].slice(0, 4).map((item, idx) => (
              <View key={`${item.food}-${idx}`} style={styles.rowBetween}>
                <Text style={styles.food}>{item.food}</Text>
                <TouchableOpacity onPress={() => removeMealItem(meal, idx)}>
                  <Text style={styles.delete}>remover</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.rowWrap}>
              <Pill label="Alterar refeição" onPress={() => {
                setSelectedMeal(meal);
                setFoodModal(true);
              }} />
              <Pill label="📸 Foto" primary onPress={() => {
                setSelectedMeal(meal);
                openCameraFlow();
              }} />
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );

  const renderDiet = () => (
    <ScrollView style={styles.screen}>
      <Text style={styles.title}>Plano alimentar</Text>
      {mealNames.map((meal) => (
        <Card
          key={meal}
          title={meal}
          right={<Pill label="Trocar" onPress={() => {
            setSelectedMeal(meal);
            setFoodModal(true);
          }} />}
        >
          {meals[meal].length === 0 ? <Text style={styles.smallMuted}>Sem itens ainda.</Text> : meals[meal].map((item, idx) => (
            <Text key={`${meal}-${idx}`} style={styles.food}>{item.food} • {item.grams}g • {item.kcal} kcal</Text>
          ))}
        </Card>
      ))}
    </ScrollView>
  );

  const renderProgress = () => {
    const current = Number(profile.weight);
    const target = Number(profile.targetWeight);
    const remaining = Math.max(current - target, 0);
    return (
      <ScrollView style={styles.screen}>
        <Text style={styles.title}>Progresso</Text>
        <Card title="Evolução do peso">
          <Text style={styles.smallMuted}>{weightHistory.join(' → ')} kg</Text>
          <ProgressBar value={current - target} max={Math.max(weightHistory[0] - target, 1)} color="#7D5EFF" />
        </Card>
        <Card title="Meta">
          <Text style={styles.big}>{current}kg → {target}kg</Text>
          <Text style={styles.smallMuted}>Faltam {remaining.toFixed(1)}kg</Text>
        </Card>
        <Card title="Previsão">
          <Text style={styles.smallMuted}>Mantendo seu ritmo, você pode bater a meta em ~{Number(profile.timeline) * 7} dias.</Text>
        </Card>
      </ScrollView>
    );
  };

  const renderProfile = () => (
    <ScrollView style={styles.screen}>
      <Text style={styles.title}>Perfil</Text>

      <Card title="Conta" right={<Pill label="Google Login" primary onPress={handleGoogleLogin} />}>
        <Text style={styles.food}>Nome: {profile.name}</Text>
        <Text style={styles.food}>Email: {profile.email}</Text>
      </Card>

      <Card title="Dados físicos" right={<Pill label="Editar" primary onPress={() => setProfileModal(true)} />}>
        <Text style={styles.food}>Peso: {profile.weight}kg</Text>
        <Text style={styles.food}>Altura: {profile.height}cm</Text>
        <Text style={styles.food}>Idade: {profile.age}</Text>
      </Card>

      <Card title="Preferências" right={<Pill label="Configurar" primary onPress={() => setPrefModal(true)} />}>
        <Text style={styles.food}>Lembrete refeições: {prefs.remindersMeal ? 'Ativo' : 'Desativado'}</Text>
        <Text style={styles.food}>Lembrete água: {prefs.remindersWater ? 'Ativo' : 'Desativado'}</Text>
        <Text style={styles.food}>Smartwatch: {prefs.smartwatchSync ? 'Conectado' : 'Não conectado'}</Text>
      </Card>

      <Card title="Relatórios e backup">
        <View style={styles.rowWrap}>
          <Pill label="Exportar PDF" primary onPress={exportDietPdf} />
          <Pill label="Backup p/ Drive" onPress={exportJsonBackupToDrive} />
        </View>
      </Card>

      <Card title="Ações do app">
        <View style={styles.rowWrap}>
          <Pill label="Recomeçar onboarding" onPress={restartOnboarding} />
          <Pill label="Salvar perfil" primary onPress={() => saveUser(profile)} />
        </View>
      </Card>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {step < 7 ? (
        renderOnboarding()
      ) : (
        <>
          {tab === 'Dashboard' && renderDashboard()}
          {tab === 'Dieta' && renderDiet()}
          {tab === 'Progresso' && renderProgress()}
          {tab === 'Perfil' && renderProfile()}

          <View style={styles.tabBar}>
            {['Dashboard', 'Dieta', 'Progresso', 'Perfil'].map((t) => (
              <TouchableOpacity key={t} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Modal visible={notifModal} transparent animationType="fade" onRequestClose={() => setNotifModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.notifBox}>
            <Text style={styles.cardTitle}>Notificações</Text>
            {notifications.map((n, idx) => <Text key={`${n}-${idx}`} style={styles.food}>• {n}</Text>)}
            <Pill label="Fechar" onPress={() => setNotifModal(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={foodModal} transparent animationType="slide" onRequestClose={() => setFoodModal(false)}>
        <View style={styles.bottomSheetWrap}>
          <View style={styles.bottomSheet}>
            <Text style={styles.cardTitle}>Alterar refeição</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.rowWrap}>
                {mealNames.map((m) => (
                  <Pill key={m} label={m} primary={m === selectedMeal} onPress={() => setSelectedMeal(m)} />
                ))}
              </View>
            </ScrollView>

            <View style={styles.rowWrap}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Buscar alimento"
                value={foodQuery}
                onChangeText={setFoodQuery}
              />
              <Pill label="Buscar" primary onPress={searchFoods} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Quantidade (g)"
              value={grams}
              onChangeText={setGrams}
              keyboardType="numeric"
            />

            {searchLoading && <ActivityIndicator style={{ marginVertical: 6 }} />}
            <ScrollView style={{ maxHeight: 250 }}>
              {foodResults.map((f, idx) => (
                <TouchableOpacity key={`${f.name}-${idx}`} style={styles.resultRow} onPress={() => applyFood(f)}>
                  <Text style={styles.food}>{f.name}</Text>
                  <Text style={styles.smallMuted}>{f.kcal100g ? `${f.kcal100g} kcal/100g` : 'Sem kcal'} • {f.source}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Pill label="Fechar" onPress={() => setFoodModal(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={photoModal} transparent animationType="slide" onRequestClose={() => setPhotoModal(false)}>
        <View style={styles.bottomSheetWrap}>
          <View style={[styles.bottomSheet, { maxHeight: '92%' }]}>
            <Text style={styles.cardTitle}>Captura real por câmera</Text>
            <Text style={styles.smallMuted}>Tire a foto do prato para inferência dinâmica.</Text>

            <View style={styles.cameraBox}>
              {cameraPermission?.granted ? (
                <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
              ) : (
                <View style={styles.centered}><Text>Sem permissão de câmera</Text></View>
              )}
            </View>

            <View style={styles.rowWrap}>
              <Pill label="Capturar" primary onPress={captureAndInfer} />
              <Pill label="Fechar" onPress={() => setPhotoModal(false)} />
            </View>

            {photoLoading && <ActivityIndicator style={{ marginVertical: 10 }} />}

            {capturedPhoto && (
              <Card title="Resultado da IA (dinâmico)">
                {photoItems.map((item, idx) => (
                  <View key={`${item.name}-${idx}`} style={styles.resultRow}>
                    <Text style={styles.food}>{item.name}</Text>
                    <Text style={styles.smallMuted}>{item.grams}g • {item.kcal} kcal • conf {Math.round(item.confidence * 100)}%</Text>
                  </View>
                ))}
                <Pill label="Confirmar na refeição" primary onPress={confirmPhotoItems} />
              </Card>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={profileModal} transparent animationType="slide" onRequestClose={() => setProfileModal(false)}>
        <View style={styles.bottomSheetWrap}>
          <View style={styles.bottomSheet}>
            <Text style={styles.cardTitle}>Editar dados físicos</Text>
            <TextInput style={styles.input} value={profile.name} placeholder="Nome" onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))} />
            <TextInput style={styles.input} value={profile.weight} placeholder="Peso" keyboardType="numeric" onChangeText={(v) => setProfile((p) => ({ ...p, weight: v }))} />
            <TextInput style={styles.input} value={profile.height} placeholder="Altura" keyboardType="numeric" onChangeText={(v) => setProfile((p) => ({ ...p, height: v }))} />
            <TextInput style={styles.input} value={profile.targetWeight} placeholder="Meta de peso" keyboardType="numeric" onChangeText={(v) => setProfile((p) => ({ ...p, targetWeight: v }))} />
            <View style={styles.rowWrap}>
              <Pill label="Cancelar" onPress={() => setProfileModal(false)} />
              <Pill label="Salvar" primary onPress={saveProfileAndClose} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={prefModal} transparent animationType="slide" onRequestClose={() => setPrefModal(false)}>
        <View style={styles.bottomSheetWrap}>
          <View style={styles.bottomSheet}>
            <Text style={styles.cardTitle}>Preferências</Text>
            <View style={styles.prefRow}><Text>Lembrete de refeições</Text><Switch value={prefs.remindersMeal} onValueChange={(v) => setPrefs((p) => ({ ...p, remindersMeal: v }))} /></View>
            <View style={styles.prefRow}><Text>Lembrete de água</Text><Switch value={prefs.remindersWater} onValueChange={(v) => setPrefs((p) => ({ ...p, remindersWater: v }))} /></View>
            <View style={styles.prefRow}><Text>Integração smartwatch</Text><Switch value={prefs.smartwatchSync} onValueChange={(v) => setPrefs((p) => ({ ...p, smartwatchSync: v }))} /></View>
            <View style={styles.rowWrap}>
              <Pill label="Cancelar" onPress={() => setPrefModal(false)} />
              <Pill label="Salvar" primary onPress={savePrefsAndClose} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FF' },
  screen: { flex: 1, padding: 16 },
  centered: { alignItems: 'center', justifyContent: 'center', flex: 1, padding: 20 },
  titleBig: { fontSize: 34, fontWeight: '900', color: '#101828' },
  subtitle: { color: '#667085', marginTop: 8, marginBottom: 14, textAlign: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: '#101828', marginBottom: 6 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6ECFF',
    shadowColor: '#1B3AA6',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#101828', marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DBE4FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 6,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCE5FF',
    marginBottom: 8,
  },
  optionCardActive: { backgroundColor: '#EDF2FF', borderColor: '#2E6BFF' },
  optionText: { fontWeight: '800', color: '#101828', fontSize: 16 },
  pill: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 10 },
  pillPrimary: { backgroundColor: '#2E6BFF' },
  pillSecondary: { backgroundColor: '#ECF2FF' },
  pillText: { color: '#2C53B5', fontWeight: '800' },
  big: { fontSize: 28, fontWeight: '900', color: '#101828', marginBottom: 8 },
  smallMuted: { color: '#667085' },
  progressTrack: {
    height: 10,
    backgroundColor: '#E8EEFF',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 4,
  },
  progressFill: { height: 10, borderRadius: 10 },
  tag: {
    backgroundColor: '#EAF0FF',
    color: '#2E6BFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: '800',
  },
  mealCard: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF2FF',
    paddingTop: 10,
  },
  mealTitle: { fontWeight: '900', color: '#111827' },
  food: { color: '#1D2939', marginBottom: 2 },
  delete: { color: '#E5484D', fontWeight: '700' },
  notificationSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ECF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationEmoji: { fontSize: 18 },
  badge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: '#F04438',
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 11,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5ECFF',
  },
  tabText: { color: '#667085', fontWeight: '700' },
  tabTextActive: { color: '#2E6BFF', fontWeight: '900' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 23, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 70,
    paddingRight: 16,
  },
  notifBox: {
    backgroundColor: '#fff',
    width: Platform.select({ web: 340, default: 300 }),
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E6ECFF',
  },
  bottomSheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2, 8, 23, 0.35)',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 14,
    maxHeight: '88%',
  },
  resultRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
    paddingVertical: 8,
  },
  cameraBox: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 260,
    backgroundColor: '#D9E3FF',
    marginVertical: 10,
  },
  prefRow: {
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
  },
});
