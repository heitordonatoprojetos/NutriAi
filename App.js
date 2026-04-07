import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';

const goals = [
  { id: 'cut', emoji: '🔥', label: 'Emagrecer' },
  { id: 'maintain', emoji: '⚖️', label: 'Manter peso' },
  { id: 'bulk', emoji: '💪', label: 'Ganhar massa' },
];

const activityLevels = ['Sedentário', 'Leve', 'Moderado', 'Intenso'];

const tabs = ['Dashboard', 'Dieta', 'Progresso', 'Notificações', 'Perfil'];

function Card({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function App() {
  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [water, setWater] = useState(1200);
  const [mealKcal, setMealKcal] = useState({
    'Café da manhã': 320,
    Almoço: 520,
    Jantar: 410,
    Lanches: 0,
  });
  const [data, setData] = useState({
    name: 'Heitor',
    objective: 'cut',
    weight: '78',
    height: '176',
    age: '29',
    sex: 'Masculino',
    targetWeight: '74',
    timeline: 8,
    activity: 'Moderado',
  });

  const calorieGoal = 2000;
  const totalKcal = Object.values(mealKcal).reduce((acc, v) => acc + v, 0);

  const plan = useMemo(() => {
    const protein = 150;
    const carbs = 210;
    const fat = 60;
    return {
      calories: calorieGoal,
      waterLiters: 2.5,
      macros: { protein, carbs, fat },
    };
  }, []);

  const objectiveLabel = goals.find((g) => g.id === data.objective)?.label;

  const renderOnboarding = () => {
    if (step === 1) {
      return (
        <View style={styles.screen}>
          <Text style={styles.logo}>🥗 NutriAI</Text>
          <Text style={styles.subtitle}>Controle sua alimentação com IA em segundos</Text>
          <TouchableOpacity style={styles.button} onPress={() => setStep(2)}>
            <Text style={styles.buttonText}>Começar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn}>
            <Text style={styles.ghostText}>Já tenho conta</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 2) {
      return (
        <View style={styles.screen}>
          <Text style={styles.title}>Qual seu objetivo?</Text>
          {goals.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={[styles.optionCard, data.objective === goal.id && styles.optionCardActive]}
              onPress={() => setData({ ...data, objective: goal.id })}
            >
              <Text style={styles.optionText}>{goal.emoji} {goal.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.button} onPress={() => setStep(3)}>
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 3) {
      return (
        <View style={styles.screen}>
          <Text style={styles.title}>Dados físicos</Text>
          {[
            ['weight', 'Peso atual (kg)'],
            ['height', 'Altura (cm)'],
            ['age', 'Idade'],
            ['sex', 'Sexo'],
          ].map(([key, placeholder]) => (
            <TextInput
              key={key}
              style={styles.input}
              value={data[key]}
              placeholder={placeholder}
              onChangeText={(v) => setData({ ...data, [key]: v })}
            />
          ))}
          <TouchableOpacity style={styles.button} onPress={() => setStep(4)}>
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 4) {
      return (
        <View style={styles.screen}>
          <Text style={styles.title}>Meta</Text>
          <TextInput
            style={styles.input}
            value={data.targetWeight}
            placeholder="Peso desejado"
            onChangeText={(v) => setData({ ...data, targetWeight: v })}
          />
          <TextInput
            style={styles.input}
            value={String(data.timeline)}
            placeholder="Tempo (semanas)"
            onChangeText={(v) => setData({ ...data, timeline: Number(v) || 0 })}
            keyboardType="numeric"
          />
          <Text style={styles.preview}>Meta: perder {Math.max(Number(data.weight) - Number(data.targetWeight), 0)}kg em {data.timeline} semanas</Text>
          <TouchableOpacity style={styles.button} onPress={() => setStep(5)}>
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 5) {
      return (
        <View style={styles.screen}>
          <Text style={styles.title}>Atividade física</Text>
          {activityLevels.map((level) => (
            <TouchableOpacity
              key={level}
              style={[styles.optionCard, data.activity === level && styles.optionCardActive]}
              onPress={() => setData({ ...data, activity: level })}
            >
              <Text style={styles.optionText}>{level}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.button} onPress={() => setStep(6)}>
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Resultado automático</Text>
        <Card title="🔥 Calorias/dia">
          <Text>{plan.calories} kcal</Text>
        </Card>
        <Card title="💧 Água recomendada">
          <Text>{plan.waterLiters} L / dia</Text>
        </Card>
        <Card title="🍗 Distribuição de macros">
          <Text>Proteína {plan.macros.protein}g | Carbo {plan.macros.carbs}g | Gordura {plan.macros.fat}g</Text>
        </Card>
        <TouchableOpacity style={styles.button} onPress={() => setStep(7)}>
          <Text style={styles.buttonText}>Ir para o app</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderDashboard = () => (
    <ScrollView style={styles.screen}>
      <Text style={styles.greeting}>Bom dia, {data.name}</Text>
      <Text style={styles.date}>terça-feira</Text>

      <Card title="🔥 Calorias">
        <Text style={styles.bigText}>{totalKcal} / {calorieGoal} kcal</Text>
        <Text>Proteína ▮▮▮▮▯ 75%</Text>
        <Text>Carbo ▮▮▮▯▯ 60%</Text>
        <Text>Gordura ▮▮▯▯▯ 40%</Text>
      </Card>

      <Card title="💧 Água">
        <Text style={styles.bigText}>{(water / 1000).toFixed(1)}L / 2.5L</Text>
        <View style={styles.row}>
          {[200, 300, 500].map((ml) => (
            <TouchableOpacity key={ml} style={styles.smallButton} onPress={() => setWater(water + ml)}>
              <Text style={styles.smallButtonText}>+{ml}ml</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card title="🍽️ Refeições do dia">
        {Object.entries(mealKcal).map(([meal, kcal]) => (
          <View key={meal} style={styles.mealRow}>
            <Text>{meal}</Text>
            <View style={styles.row}>
              <Text>{kcal} kcal</Text>
              <TouchableOpacity
                onPress={() => setMealKcal({ ...mealKcal, [meal]: kcal + 120 })}
                style={styles.addBtn}
              >
                <Text style={styles.addBtnText}>+ adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </Card>

      <TouchableOpacity style={styles.floating} onPress={() => setActiveTab('Foto')}>
        <Text style={styles.floatingText}>📸 Tirar foto</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPhotoFlow = () => (
    <View style={styles.screen}>
      <Text style={styles.title}>Fluxo de Foto (IA)</Text>
      <Card title="1) Câmera">
        <Text>Câmera aberta direto + botão capturar.</Text>
      </Card>
      <Card title="2) Processando">
        <Text>Analisando seu prato…</Text>
      </Card>
      <Card title="3) Resultado">
        <Text>Arroz (120g), Feijão (90g), Frango (150g)</Text>
        <Text>Total: 640 kcal</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.smallButton}><Text style={styles.smallButtonText}>Confirmar</Text></TouchableOpacity>
          <TouchableOpacity style={styles.smallButton}><Text style={styles.smallButtonText}>Editar</Text></TouchableOpacity>
        </View>
      </Card>
    </View>
  );

  const renderDiet = () => (
    <ScrollView style={styles.screen}>
      <Text style={styles.title}>🥗 Dieta do Dia</Text>
      <Text style={styles.subtitle}>Total: {calorieGoal} kcal</Text>
      {[
        ['🍳 Café da manhã', 'Omelete + pão integral + fruta'],
        ['🍛 Almoço', 'Arroz, feijão, frango e salada'],
        ['🌙 Jantar', 'Sopa proteica + legumes'],
        ['🍌 Lanches', 'Iogurte natural + castanhas'],
      ].map(([meal, suggestion]) => (
        <Card title={meal} key={meal}>
          <Text>{suggestion}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.smallButton}><Text style={styles.smallButtonText}>🔁 Trocar</Text></TouchableOpacity>
            <TouchableOpacity style={styles.smallButton}><Text style={styles.smallButtonText}>➕ Adicionar</Text></TouchableOpacity>
          </View>
        </Card>
      ))}
    </ScrollView>
  );

  const renderProgress = () => (
    <View style={styles.screen}>
      <Text style={styles.title}>📈 Evolução</Text>
      <Card title="📊 Gráfico de peso">
        <Text>78 → 77.2 → 76.8 → 76.3 kg</Text>
      </Card>
      <Card title="🎯 Meta">
        <Text>Atual: {data.weight}kg | Meta: {data.targetWeight}kg</Text>
      </Card>
      <Card title="🔮 Previsão">
        <Text>Você atingirá sua meta em ~{data.timeline * 7} dias.</Text>
      </Card>
      <Card title="💧 Água (semanal)">
        <Text>Média diária: 2.1L | Dias na meta: 5/7</Text>
      </Card>
    </View>
  );

  const renderNotifications = () => (
    <View style={styles.screen}>
      <Text style={styles.title}>🔔 Notificações</Text>
      <Card title="Lembretes ativos">
        <Text>• Hora de beber água 💧</Text>
        <Text>• Você ainda precisa de 800ml hoje</Text>
        <Text>• Hora da próxima refeição 🍽️</Text>
      </Card>
    </View>
  );

  const renderProfile = () => (
    <View style={styles.screen}>
      <Text style={styles.title}>⚙️ Perfil</Text>
      <Card title="Resumo">
        <Text>Objetivo: {objectiveLabel}</Text>
        <Text>Altura: {data.height}cm | Idade: {data.age}</Text>
        <Text>Atividade: {data.activity}</Text>
      </Card>
      <Card title="Configurações">
        <Text>• Editar dados físicos</Text>
        <Text>• Alterar meta</Text>
        <Text>• Preferências alimentares</Text>
        <Text>• Exportar dieta (PDF)</Text>
        <Text>• Integrações (smartwatch)</Text>
      </Card>
    </View>
  );

  if (step < 7) {
    return <SafeAreaView style={styles.container}>{renderOnboarding()}</SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      {activeTab === 'Dashboard' && renderDashboard()}
      {activeTab === 'Foto' && renderPhotoFlow()}
      {activeTab === 'Dieta' && renderDiet()}
      {activeTab === 'Progresso' && renderProgress()}
      {activeTab === 'Notificações' && renderNotifications()}
      {activeTab === 'Perfil' && renderProfile()}

      <View style={styles.tabBar}>
        {[...tabs, 'Foto'].map((tab) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tab, activeTab === tab && styles.tabActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fc' },
  screen: { flex: 1, padding: 18 },
  logo: { fontSize: 32, fontWeight: '800', marginTop: 40 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#596074', marginBottom: 18 },
  greeting: { fontSize: 26, fontWeight: '700' },
  date: { color: '#707991', marginBottom: 14 },
  bigText: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  button: {
    backgroundColor: '#2b62ff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: 'white', fontWeight: '700' },
  ghostBtn: { alignItems: 'center', marginTop: 12 },
  ghostText: { color: '#2b62ff', fontWeight: '700' },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e3e7f5',
  },
  optionCardActive: { borderColor: '#2b62ff', backgroundColor: '#eef3ff' },
  optionText: { fontSize: 16, fontWeight: '600' },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d9deec',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  preview: { marginBottom: 12, color: '#364059' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
  smallButton: {
    backgroundColor: '#eaf0ff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallButtonText: { color: '#1c49c2', fontWeight: '700' },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addBtn: { marginLeft: 8, backgroundColor: '#f0f4ff', borderRadius: 8, padding: 6 },
  addBtnText: { color: '#2b62ff', fontWeight: '700' },
  floating: {
    backgroundColor: '#2b62ff',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginVertical: 24,
  },
  floatingText: { color: 'white', fontWeight: '800' },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e3e8f7',
    backgroundColor: 'white',
  },
  tab: { color: '#7a839a', fontWeight: '600' },
  tabActive: { color: '#2b62ff', fontWeight: '800' },
});
