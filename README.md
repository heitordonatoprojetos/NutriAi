# NutriAI (v1.01)

Aplicativo Expo/React Native com foco em UX moderna:
- onboarding visual,
- dashboard com cards interativos e barras de progresso,
- captura por câmera com inferência dinâmica por IA,
- edição de refeições com Open Food Facts + fallback IA,
- login Google funcional,
- persistência local por usuário com AsyncStorage,
- exportação de PDF,
- backup para Google Drive (upload direto via API quando logado),
- build de APK no GitHub Actions.

## Rodar

```bash
npm install
npm start
```

## Plataformas

```bash
npm run web
npm run android
npm run ios
```

## Google Login + Drive

Crie `.env` com:

```bash
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

> O app solicita escopos `profile`, `email` e `drive.file`.

## Backup no Drive

No Perfil > **Salvar no Drive**:
- se estiver logado no Google, envia backup JSON direto para o Google Drive;
- se não estiver, abre fallback de compartilhamento manual.

## Erro `Failed to resolve plugin for module "expo-camera"`

No Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules, package-lock.json
npm install
npm start
```

## APK a cada atualização

Workflow: `.github/workflows/android-apk.yml`
