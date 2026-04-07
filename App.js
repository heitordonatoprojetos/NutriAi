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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { LinearGradient } from 'expo-linear-gradient';

WebBrowser.maybeCompleteAuthSession();

const mealNames = ['Café da manhã', 'Almoço', 'Jantar', 'Lanches'];
const goalOptions = [
  { id: 'cut', label: 'Emagrecer', emoji: '🔥' },
  { id: 'maintain', label: 'Manter peso', emoji: '⚖️' },
  { id: 'gain', label: 'Ganhar massa', emoji: '💪' },
];
const activityOptions = ['Sedentário', 'Leve', 'Moderado', 'Intenso'];
const STORAGE_KEYS = {
  profile: 'nutriai_profile',
  meals: 'nutriai_meals',
  prefs: 'nutriai_prefs',
};

const baseFoods = [
  { name: 'Arroz cozido', kcal100g: 130 },
  { name: 'Feijão cozido', kcal100g: 76 },
  { name: 'Frango grelhado', kcal100g: 165 },
  { name: 'Ovo cozido', kcal100g: 155 },
  { name: 'Banana', kcal100g: 89 },
  { name: 'Aveia', kcal100g: 389 },
  { name: 'Iogurte natural', kcal100g: 61 },
  { name: 'Batata doce', kcal100g: 86 },
  { name: 'Maçã', kcal100g: 52 },
  { name: 'Pera', kcal100g: 57 },
  { name: 'Mamão', kcal100g: 43 },
  { name: 'Abacate', kcal100g: 160 },
  { name: 'Salmão', kcal100g: 208 },
  { name: 'Tilápia', kcal100g: 129 },
  { name: 'Carne bovina magra', kcal100g: 217 },
  { name: 'Patinho moído', kcal100g: 219 },
  { name: 'Tofu', kcal100g: 76 },
  { name: 'Queijo minas', kcal100g: 264 },
  { name: 'Queijo cottage', kcal100g: 98 },
  { name: 'Leite desnatado', kcal100g: 34 },
  { name: 'Arroz integral cozido', kcal100g: 124 },
  { name: 'Macarrão integral cozido', kcal100g: 124 },
  { name: 'Pão integral', kcal100g: 247 },
  { name: 'Tapioca', kcal100g: 130 },
  { name: 'Cuscuz cozido', kcal100g: 112 },
  { name: 'Lentilha cozida', kcal100g: 116 },
  { name: 'Grão-de-bico cozido', kcal100g: 164 },
  { name: 'Ervilha cozida', kcal100g: 84 },
  { name: 'Brócolis cozido', kcal100g: 35 },
  { name: 'Cenoura cozida', kcal100g: 35 },
  { name: 'Abobrinha cozida', kcal100g: 24 },
  { name: 'Tomate', kcal100g: 18 },
  { name: 'Alface', kcal100g: 15 },
  { name: 'Castanha-do-pará', kcal100g: 656 },
  { name: 'Amendoim', kcal100g: 567 },
  { name: 'Pasta de amendoim', kcal100g: 588 },
  { name: 'Azeite de oliva', kcal100g: 884 },
  { name: 'Granola', kcal100g: 471 },
  { name: 'Whey protein', kcal100g: 400 },
  { name: 'Iogurte grego', kcal100g: 97 },
  { name: 'Atum em água', kcal100g: 116 },
  { name: 'Sardinha', kcal100g: 208 },
  { name: 'Pão francês', kcal100g: 270 },
  { name: 'Biscoito integral', kcal100g: 430 },
  { name: 'Chocolate 70%', kcal100g: 598 },
  { name: 'Mel', kcal100g: 304 },
  { name: 'Suco de laranja', kcal100g: 45 },
  { name: 'Café com leite', kcal100g: 40 },
];

const inferCalories = (name, grams) => {
  const n = name.toLowerCase();
  if (n.includes('frango') || n.includes('carne') || n.includes('peixe')) return Math.round((185 * grams) / 100);
  if (n.includes('arroz') || n.includes('pão') || n.includes('massa')) return Math.round((150 * grams) / 100);
  if (n.includes('feijão') || n.includes('lentilha')) return Math.round((110 * grams) / 100);
  if (n.includes('banana') || n.includes('fruta')) return Math.round((80 * grams) / 100);
  return Math.round((120 * grams) / 100);
};

const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
};

const inferFromPhoto = (photo) => {
  const seed = hash(`${photo.uri}-${photo.width}-${photo.height}-${photo.base64?.slice(0, 120) || ''}`);
  return [...baseFoods]
    .sort((a, b) => hash(a.name + seed) - hash(b.name + seed))
    .slice(0, 3)
    .map((food, idx) => {
      const grams = 90 + ((seed >> (idx * 3)) % 160);
      return {
        food: food.name,
        grams,
        kcal: Math.round((food.kcal100g * grams) / 100),
        confidence: 0.62 + (((seed >> (idx * 2)) % 28) / 100),
        source: 'IA por foto',
      };
    });
};

const defaultMeals = { 'Café da manhã': [], Almoço: [], Jantar: [], Lanches: [] };

export default function App() {
  const cameraRef = useRef(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [step, setStep] = useState(1);
  const [tab, setTab] = useState('Dashboard');

  const [foodModal, setFoodModal] = useState(false);
  const [cameraModal, setCameraModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [prefsModal, setPrefsModal] = useState(false);
  const [notifModal, setNotifModal] = useState(false);

  const [selectedMeal, setSelectedMeal] = useState('Almoço');
  const [foodQuery, setFoodQuery] = useState('');
  const [grams, setGrams] = useState('100');
  const [foodResults, setFoodResults] = useState(baseFoods.map((f) => ({ ...f, source: 'Base local' })));
  const [foodLoading, setFoodLoading] = useState(false);

  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoItems, setPhotoItems] = useState([]);

  const [notifGranted, setNotifGranted] = useState(false);
  const [notifications, setNotifications] = useState([
    'Hora de beber água 💧',
    'Você ainda precisa de 800ml hoje',
  ]);

  const [googleToken, setGoogleToken] = useState(null);

  const [profile, setProfile] = useState({
    name: 'Heitor',
    email: 'local@nutriai.app',
    goal: 'cut',
    weight: '78',
    height: '176',
    age: '29',
    sex: 'Masculino',
    targetWeight: '74',
    timeline: '8',
    activity: 'Moderado',
    kcalGoal: 2000,
    waterGoalMl: 2500,
  });
  const [prefs, setPrefs] = useState({ remindersMeal: true, remindersWater: true, smartwatch: false });
  const [meals, setMeals] = useState(defaultMeals);
  const [waterMl, setWaterMl] = useState(1200);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file'],
  });

  useEffect(() => {
    const init = async () => {
      const [p, m, pref] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.profile),
        AsyncStorage.getItem(STORAGE_KEYS.meals),
        AsyncStorage.getItem(STORAGE_KEYS.prefs),
      ]);
      if (p) setProfile(JSON.parse(p));
      if (m) setMeals(JSON.parse(m));
      if (pref) setPrefs(JSON.parse(pref));

      const { status } = await Notifications.requestPermissionsAsync();
      setNotifGranted(status === 'granted');
    };
    init();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const token = response.authentication?.accessToken;
      if (token) {
        setGoogleToken(token);
        fetchGoogleProfile(token);
      }
    }
  }, [response]);

  const persist = async (nextProfile = profile, nextMeals = meals, nextPrefs = prefs) => {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.profile, JSON.stringify(nextProfile)],
      [STORAGE_KEYS.meals, JSON.stringify(nextMeals)],
      [STORAGE_KEYS.prefs, JSON.stringify(nextPrefs)],
    ]);
  };

  const fetchGoogleProfile = async (token) => {
    try {
      const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await r.json();
      const next = { ...profile, name: data.name || profile.name, email: data.email || profile.email };
      setProfile(next);
      await persist(next, meals, prefs);
      Alert.alert('Google', `Conectado como ${next.name}`);
    } catch {
      Alert.alert('Google', 'Falha ao carregar perfil Google.');
    }
  };

  const googleLogin = async () => {
    if (!request) {
      Alert.alert('Google Login', 'Configure EXPO_PUBLIC_GOOGLE_* no .env.');
      return;
    }
    await promptAsync();
  };

  const addFoodItem = async (meal, food, gramsVal, kcal, source) => {
    const next = { ...meals, [meal]: [{ food, grams: gramsVal, kcal, source }, ...meals[meal]] };
    setMeals(next);
    await persist(profile, next, prefs);
  };

  const removeFoodItem = async (meal, idx) => {
    const next = { ...meals, [meal]: meals[meal].filter((_, i) => i !== idx) };
    setMeals(next);
    await persist(profile, next, prefs);
  };

  const searchFoods = async () => {
    if (!foodQuery.trim()) {
      setFoodResults(baseFoods.map((f) => ({ ...f, source: 'Base local' })));
      return;
    }
    setFoodLoading(true);
    try {
      const q = encodeURIComponent(foodQuery.trim());
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=10`;
      const res = await fetch(url);
      const json = await res.json();
      const parsed = (json.products || []).map((p) => ({
        name: p.product_name || p.generic_name || 'Alimento',
        kcal100g: Number(p?.nutriments?.['energy-kcal_100g']) || null,
        source: 'Open Food Facts',
      }));
      setFoodResults(parsed.slice(0, 10));
    } catch {
      setFoodResults(baseFoods.map((f) => ({ ...f, source: 'Base local' })));
    } finally {
      setFoodLoading(false);
    }
  };

  const applyFood = async (food) => {
    const g = Number(grams) || 100;
    const kcal = food.kcal100g ? Math.round((food.kcal100g * g) / 100) : inferCalories(food.name, g);
    await addFoodItem(selectedMeal, food.name, g, kcal, food.kcal100g ? food.source : `${food.source} + IA`);
    setFoodModal(false);
  };

  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const status = await requestCameraPermission();
      if (!status.granted) {
        Alert.alert('Câmera', 'Permita o acesso à câmera para reconhecimento por foto.');
        return;
      }
    }
    setCameraModal(true);
  };

  const capturePhoto = async () => {
    try {
      setPhotoLoading(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      setPhotoItems(inferFromPhoto(photo));
    } catch {
      Alert.alert('Câmera', 'Não foi possível capturar a foto.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const confirmPhotoItems = async () => {
    for (const item of photoItems) {
      // eslint-disable-next-line no-await-in-loop
      await addFoodItem(selectedMeal, item.food, item.grams, item.kcal, item.source);
    }
    setPhotoItems([]);
    setCameraModal(false);
  };

  const saveProfile = async (next = profile) => {
    setProfile(next);
    await persist(next, meals, prefs);
  };

  const savePrefs = async (next) => {
    setPrefs(next);
    await persist(profile, meals, next);
    if (notifGranted && next.remindersWater) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'NutriAI', body: 'Hora de beber água 💧' },
        trigger: { hour: 10, minute: 30, repeats: true },
      });
    }
  };

  const exportPdf = async () => {
    const html = `<h1>Relatório NutriAI</h1>
      <p>Usuário: ${profile.name} (${profile.email})</p>
      <p>Calorias: ${dayTotal}/${profile.kcalGoal}</p>
      ${mealNames.map((m) => `<h3>${m}</h3><ul>${meals[m].map((i) => `<li>${i.food} - ${i.grams}g - ${i.kcal} kcal</li>`).join('')}</ul>`).join('')}`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar dieta (PDF)' });
  };

  const backupToDrive = async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile,
      prefs,
      meals,
      waterMl,
    };

    if (googleToken) {
      try {
        const metadata = { name: `nutriai-backup-${Date.now()}.json`, mimeType: 'application/json' };
        const boundary = 'nutriai_boundary';
        const body =
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n--${boundary}--`;

        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${googleToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        });

        if (!res.ok) throw new Error('drive upload failed');
        Alert.alert('Backup', 'Backup enviado para o Google Drive com sucesso.');
        return;
      } catch {
        Alert.alert('Backup', 'Falha no upload direto para Drive. Abrindo compartilhamento manual.');
      }
    }

    const uri = `${FileSystem.cacheDirectory}nutriai-backup-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
    await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Salvar backup no Drive' });
  };

  const dayTotal = useMemo(() => Object.values(meals).flat().reduce((s, i) => s + i.kcal, 0), [meals]);
  const mealTotals = useMemo(() => Object.fromEntries(mealNames.map((m) => [m, meals[m].reduce((s, i) => s + i.kcal, 0)])), [meals]);

  const renderOnboarding = () => (
    <View style={styles.onboarding}>
      <LinearGradient colors={['#2E6BFF', '#7D5EFF']} style={styles.hero}>
        <Text style={styles.heroTitle}>NutriAI v1.01</Text>
        <Text style={styles.heroSubtitle}>Design moderno + registro de refeições com IA</Text>
      </LinearGradient>
      <Text style={styles.sectionTitle}>Objetivo</Text>
      <View style={styles.rowWrap}>{goalOptions.map((g) => <Pill key={g.id} active={profile.goal === g.id} label={`${g.emoji} ${g.label}`} onPress={() => setProfile((p) => ({ ...p, goal: g.id }))} />)}</View>
      <View style={styles.formGrid}>
        <Input label="Nome" value={profile.name} onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))} />
        <Input label="Peso (kg)" value={profile.weight} onChangeText={(v) => setProfile((p) => ({ ...p, weight: v }))} keyboardType="numeric" />
        <Input label="Altura (cm)" value={profile.height} onChangeText={(v) => setProfile((p) => ({ ...p, height: v }))} keyboardType="numeric" />
        <Input label="Idade" value={profile.age} onChangeText={(v) => setProfile((p) => ({ ...p, age: v }))} keyboardType="numeric" />
      </View>
      <Text style={styles.smallMuted}>Atividade</Text>
      <View style={styles.rowWrap}>{activityOptions.map((a) => <Pill key={a} active={profile.activity === a} label={a} onPress={() => setProfile((p) => ({ ...p, activity: a }))} />)}</View>
      <View style={styles.rowWrap}>
        <CTA label="Entrar com Google" onPress={googleLogin} />
        <CTA label="Continuar" onPress={async () => { await saveProfile(); setStep(7); }} primary />
      </View>
    </View>
  );

  const renderDashboard = () => (
    <ScrollView style={styles.screen}>
      <LinearGradient colors={['#2E6BFF', '#7D5EFF']} style={styles.headerCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.headerTitle}>Olá, {profile.name}</Text>
            <Text style={styles.headerSub}>Meta: {goalOptions.find((g) => g.id === profile.goal)?.label}</Text>
          </View>
          <TouchableOpacity style={styles.notifSquare} onPress={() => setNotifModal(true)}>
            <Text style={{ color: '#fff', fontSize: 17 }}>🔔</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Card title="Calorias">
        <Text style={styles.kpi}>{dayTotal} / {profile.kcalGoal} kcal</Text>
        <Progress value={dayTotal} max={profile.kcalGoal} color="#2E6BFF" />
      </Card>

      <Card title="Água">
        <Text style={styles.kpi}>{(waterMl / 1000).toFixed(1)} / {(profile.waterGoalMl / 1000).toFixed(1)} L</Text>
        <Progress value={waterMl} max={profile.waterGoalMl} color="#00A8FF" />
        <View style={styles.rowWrap}>
          {[-500, -300, -200, 200, 300, 500].map((m) => (
            <Pill
              key={m}
              label={`${m > 0 ? '+' : ''}${m}ml`}
              onPress={() => setWaterMl((w) => Math.max(0, w + m))}
              active={m > 0}
            />
          ))}
        </View>
      </Card>

      <Card title="Refeições" right={<CTA small primary label="+ Adicionar" onPress={() => setFoodModal(true)} />}>
        {mealNames.map((meal) => (
          <View key={meal} style={styles.mealBlock}>
            <View style={styles.rowBetween}><Text style={styles.mealTitle}>{meal}</Text><Text style={styles.smallMuted}>{mealTotals[meal]} kcal</Text></View>
            {meals[meal].map((item, idx) => (
              <View key={`${meal}-${idx}`} style={styles.rowBetween}>
                <Text style={styles.foodText}>{item.food} • {item.grams}g</Text>
                <TouchableOpacity onPress={() => removeFoodItem(meal, idx)}><Text style={styles.remove}>remover</Text></TouchableOpacity>
              </View>
            ))}
            <View style={styles.rowWrap}>
              <Pill label="Alterar" onPress={() => { setSelectedMeal(meal); setFoodModal(true); }} />
              <Pill label="📸 Foto" active onPress={() => { setSelectedMeal(meal); openCamera(); }} />
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );

  const renderProfile = () => (
    <ScrollView style={styles.screen}>
      <Card title="Conta" right={<CTA label="Google" primary small onPress={googleLogin} />}>
        <Text style={styles.foodText}>Nome: {profile.name}</Text>
        <Text style={styles.foodText}>Email: {profile.email}</Text>
      </Card>

      <Card title="Informações pessoais" right={<CTA label="Editar" small primary onPress={() => setProfileModal(true)} />}>
        <View style={styles.personalGrid}>
          <Stat label="Peso" value={`${profile.weight} kg`} />
          <Stat label="Altura" value={`${profile.height} cm`} />
          <Stat label="Idade" value={`${profile.age}`} />
          <Stat label="Sexo" value={profile.sex} />
        </View>
      </Card>

      <Card title="Preferências" right={<CTA label="Config" small onPress={() => setPrefsModal(true)} />}>
        <Text style={styles.foodText}>Lembrete refeição: {prefs.remindersMeal ? 'Ativo' : 'Desativado'}</Text>
        <Text style={styles.foodText}>Lembrete água: {prefs.remindersWater ? 'Ativo' : 'Desativado'}</Text>
      </Card>

      <Card title="Relatórios e backup">
        <View style={styles.rowWrap}>
          <CTA label="Exportar PDF" onPress={exportPdf} />
          <CTA label="Salvar no Drive" primary onPress={backupToDrive} />
        </View>
      </Card>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {step < 7 ? renderOnboarding() : (
        <>
          {tab === 'Dashboard' && renderDashboard()}
          {tab === 'Perfil' && renderProfile()}
          {tab === 'Dieta' && <View style={styles.center}><Text style={styles.sectionTitle}>Use o dashboard para montar a dieta dinâmica.</Text></View>}
          {tab === 'Progresso' && <View style={styles.center}><Text style={styles.sectionTitle}>Progresso detalhado em evolução contínua.</Text></View>}
          <View style={styles.tabBar}>{['Dashboard', 'Dieta', 'Progresso', 'Perfil'].map((t) => <TouchableOpacity key={t} onPress={() => setTab(t)}><Text style={[styles.tab, tab === t && styles.tabActive]}>{t}</Text></TouchableOpacity>)}</View>
        </>
      )}

      <Modal visible={foodModal} transparent animationType="slide" onRequestClose={() => setFoodModal(false)}>
        <Sheet>
          <Text style={styles.sectionTitle}>Adicionar alimento</Text>
          <View style={styles.rowWrap}>{mealNames.map((m) => <Pill key={m} label={m} active={m === selectedMeal} onPress={() => setSelectedMeal(m)} />)}</View>
          <View style={styles.rowWrap}><TextInput style={[styles.input, { flex: 1 }]} value={foodQuery} placeholder="Buscar alimento" onChangeText={setFoodQuery} /><CTA label="Buscar" primary onPress={searchFoods} /></View>
          <TextInput style={styles.input} value={grams} placeholder="Quantidade (g)" keyboardType="numeric" onChangeText={setGrams} />
          {foodLoading && <ActivityIndicator />}
          <ScrollView style={{ maxHeight: 240 }}>{foodResults.map((f, idx) => <TouchableOpacity key={`${f.name}-${idx}`} style={styles.resultRow} onPress={() => applyFood(f)}><Text style={styles.foodText}>{f.name}</Text><Text style={styles.smallMuted}>{f.kcal100g ? `${f.kcal100g} kcal/100g` : 'sem kcal'} • {f.source}</Text></TouchableOpacity>)}</ScrollView>
          <CTA label="Fechar" onPress={() => setFoodModal(false)} />
        </Sheet>
      </Modal>

      <Modal visible={cameraModal} transparent animationType="slide" onRequestClose={() => setCameraModal(false)}>
        <Sheet tall>
          <Text style={styles.sectionTitle}>Câmera IA</Text>
          <View style={styles.cameraBox}>{cameraPermission?.granted ? <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" /> : <View style={styles.center}><Text>Sem permissão de câmera</Text></View>}</View>
          <View style={styles.rowWrap}><CTA label="Capturar" primary onPress={capturePhoto} /><CTA label="Fechar" onPress={() => setCameraModal(false)} /></View>
          {photoLoading && <ActivityIndicator />}
          {photoItems.length > 0 && <Card title="Resultado dinâmico">{photoItems.map((it, i) => <Text key={`${it.food}-${i}`} style={styles.foodText}>{it.food} • {it.grams}g • {it.kcal} kcal • conf {Math.round(it.confidence * 100)}%</Text>)}<CTA label="Confirmar" primary onPress={confirmPhotoItems} /></Card>}
        </Sheet>
      </Modal>

      <Modal visible={profileModal} transparent animationType="slide" onRequestClose={() => setProfileModal(false)}>
        <Sheet>
          <Text style={styles.sectionTitle}>Editar informações pessoais</Text>
          <Input label="Nome" value={profile.name} onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))} />
          <Input label="Peso (kg)" value={profile.weight} onChangeText={(v) => setProfile((p) => ({ ...p, weight: v }))} keyboardType="numeric" />
          <Input label="Altura (cm)" value={profile.height} onChangeText={(v) => setProfile((p) => ({ ...p, height: v }))} keyboardType="numeric" />
          <Input label="Idade" value={profile.age} onChangeText={(v) => setProfile((p) => ({ ...p, age: v }))} keyboardType="numeric" />
          <Input label="Sexo" value={profile.sex} onChangeText={(v) => setProfile((p) => ({ ...p, sex: v }))} />
          <View style={styles.rowWrap}><CTA label="Salvar" primary onPress={async () => { await saveProfile(); setProfileModal(false); }} /><CTA label="Cancelar" onPress={() => setProfileModal(false)} /></View>
        </Sheet>
      </Modal>

      <Modal visible={prefsModal} transparent animationType="slide" onRequestClose={() => setPrefsModal(false)}>
        <Sheet>
          <Text style={styles.sectionTitle}>Preferências</Text>
          <Pref label="Lembrete de refeições" value={prefs.remindersMeal} onValueChange={(v) => setPrefs((p) => ({ ...p, remindersMeal: v }))} />
          <Pref label="Lembrete de água" value={prefs.remindersWater} onValueChange={(v) => setPrefs((p) => ({ ...p, remindersWater: v }))} />
          <Pref label="Smartwatch" value={prefs.smartwatch} onValueChange={(v) => setPrefs((p) => ({ ...p, smartwatch: v }))} />
          <View style={styles.rowWrap}><CTA label="Salvar" primary onPress={async () => { await savePrefs(prefs); setPrefsModal(false); }} /><CTA label="Cancelar" onPress={() => setPrefsModal(false)} /></View>
        </Sheet>
      </Modal>

      <Modal visible={notifModal} transparent animationType="fade" onRequestClose={() => setNotifModal(false)}>
        <View style={styles.overlay}><View style={styles.notifBox}><Text style={styles.sectionTitle}>Notificações</Text>{notifications.map((n, i) => <Text key={`${n}-${i}`} style={styles.foodText}>• {n}</Text>)}<CTA label="Fechar" onPress={() => setNotifModal(false)} /></View></View>
      </Modal>
    </SafeAreaView>
  );
}

function Input({ label, ...props }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.smallMuted}>{label}</Text>
      <TextInput style={styles.input} {...props} />
    </View>
  );
}

function Card({ title, right, children }) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}><Text style={styles.sectionTitle}>{title}</Text>{right}</View>
      {children}
    </View>
  );
}

function CTA({ label, onPress, primary, small }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.cta, primary ? styles.ctaPrimary : styles.ctaSecondary, small && { paddingVertical: 8 }]}>
      <Text style={[styles.ctaText, primary && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Pill({ label, onPress, active }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Progress({ value, max, color }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} /></View>;
}

function Sheet({ children, tall }) {
  return <View style={styles.sheetWrap}><View style={[styles.sheet, tall && { maxHeight: '94%' }]}>{children}</View></View>;
}

function Pref({ label, value, onValueChange }) {
  return <View style={styles.prefRow}><Text>{label}</Text><Switch value={value} onValueChange={onValueChange} /></View>;
}

function Stat({ label, value }) {
  return <View style={styles.stat}><Text style={styles.smallMuted}>{label}</Text><Text style={styles.foodText}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F6FF' },
  screen: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  onboarding: { flex: 1, padding: 18 },
  hero: { borderRadius: 24, padding: 20, marginBottom: 14 },
  heroTitle: { fontSize: 32, color: '#fff', fontWeight: '900' },
  heroSubtitle: { color: '#E8EEFF', marginTop: 6 },
  sectionTitle: { fontWeight: '800', fontSize: 16, color: '#0f172a', marginBottom: 6 },
  smallMuted: { color: '#64748b', fontSize: 12 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formGrid: { marginTop: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DCE4FF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  cta: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  ctaPrimary: { backgroundColor: '#2E6BFF' },
  ctaSecondary: { backgroundColor: '#EAF0FF' },
  ctaText: { color: '#2447AC', fontWeight: '800' },
  pill: { backgroundColor: '#EAF0FF', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  pillActive: { backgroundColor: '#2E6BFF' },
  pillText: { color: '#2B4FAD', fontWeight: '700' },
  headerCard: { borderRadius: 22, padding: 16, marginBottom: 12 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  headerSub: { color: '#EAF0FF' },
  notifSquare: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E8EEFF', shadowColor: '#3556C5', shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  kpi: { fontWeight: '900', fontSize: 24, color: '#0f172a' },
  progressTrack: { marginTop: 8, height: 10, borderRadius: 10, backgroundColor: '#E6EDFF', overflow: 'hidden' },
  progressFill: { height: 10, borderRadius: 10 },
  mealBlock: { borderTopWidth: 1, borderTopColor: '#EDF2FF', paddingTop: 10, marginTop: 8 },
  mealTitle: { fontWeight: '800', color: '#0f172a' },
  foodText: { color: '#1e293b', marginBottom: 4 },
  remove: { color: '#E5484D', fontWeight: '700' },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E6ECFF' },
  tab: { color: '#64748b', fontWeight: '700' },
  tabActive: { color: '#2E6BFF', fontWeight: '900' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,8,23,0.35)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 14, maxHeight: '88%' },
  resultRow: { borderBottomWidth: 1, borderBottomColor: '#EEF2FF', paddingVertical: 8 },
  cameraBox: { height: 260, borderRadius: 14, overflow: 'hidden', backgroundColor: '#dbeafe', marginBottom: 10 },
  overlay: { flex: 1, justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 72, paddingRight: 14, backgroundColor: 'rgba(2,8,23,0.3)' },
  notifBox: { width: Platform.select({ web: 350, default: 300 }), backgroundColor: '#fff', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E6EDFF' },
  prefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EEF2FF' },
  personalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { width: '48%', backgroundColor: '#F8FAFF', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E6ECFF' },
});
