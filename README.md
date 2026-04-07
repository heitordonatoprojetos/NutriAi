# NutriAI (v1.01)

Aplicativo Expo/React Native com:
- onboarding completo,
- dashboard interativa com barras de progresso,
- câmera real + inferência dinâmica por IA para alimentos,
- edição de refeições com Open Food Facts + fallback IA,
- login Google para dados individuais,
- persistência local com SQLite,
- exportação de relatório PDF,
- backup compartilhável para Google Drive,
- notificações de água/refeições,
- build de APK no GitHub Actions.

## Rodar

```bash
npm install
npm start
```

## Web / Android / iOS

```bash
npm run web
npm run android
npm run ios
```

## Variáveis para Google Login

Crie `.env` (ou configure no ambiente Expo):

```bash
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

## Backup no Drive

No Perfil > Relatórios e backup > **Backup p/ Drive**.
O app gera JSON e abre o compartilhamento nativo para salvar no Google Drive.

## APK a cada atualização

Workflow: `.github/workflows/android-apk.yml`

- `npm ci`
- `expo prebuild --platform android`
- `./gradlew assembleDebug`
- upload artifact `nutriai-v1.01-apk`
