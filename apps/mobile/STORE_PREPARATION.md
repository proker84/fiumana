# Guida alla Pubblicazione sugli Store

## Requisiti Icone App

### File da creare in `assets/icons/`:

1. **app_icon.png** (1024x1024 px)
   - Icona principale dell'app
   - Senza trasparenza per iOS
   - Sfondo: #1a1a2e (blu scuro)
   - Logo Fiumana Immobiliare al centro

2. **app_icon_foreground.png** (1024x1024 px)
   - Solo per Android adaptive icon
   - Sfondo trasparente
   - Logo centrato con margine del 20%

3. **splash_icon.png** (512x512 px)
   - Icona per splash screen nativo
   - Sfondo trasparente
   - Logo semplificato

4. **branding.png** (200x50 px)
   - Testo "Fiumana Immobiliare" per splash screen
   - Sfondo trasparente
   - Colore testo: #4ef1ff (cyan)

## Comandi per Generare Icone

```bash
cd apps/mobile

# Genera icone launcher
flutter pub get
dart run flutter_launcher_icons

# Genera splash screen nativo
dart run flutter_native_splash:create
```

## Screenshot per gli Store

### Dimensioni richieste:

#### iOS (iPhone)
- 6.7" Display: 1290 x 2796 px (iPhone 14 Pro Max)
- 6.5" Display: 1284 x 2778 px (iPhone 14 Plus)
- 5.5" Display: 1242 x 2208 px (iPhone 8 Plus)

#### iOS (iPad)
- 12.9" Display: 2048 x 2732 px (iPad Pro)

#### Android
- Smartphone: 1080 x 1920 px (minimo)
- Tablet 7": 1080 x 1920 px
- Tablet 10": 1920 x 1200 px

### Screenshot da preparare (5-8 per piattaforma):

1. **Login Screen** - Schermata di accesso
2. **Admin Dashboard** - Dashboard principale admin
3. **Calendario Pulizie** - Vista calendario cleaner
4. **Dettaglio Pulizia** - Con foto prima/dopo
5. **Gestione Stock** - Lista articoli con alert
6. **Check-in Ospite** - Flusso check-in
7. **FAQ Multimediali** - Lista FAQ con video
8. **Pagamenti** - Riepilogo pagamenti

## Testi per gli Store

### Titolo App
`Fiumana Immobiliare`

### Sottotitolo (max 30 caratteri)
`Gestione Immobili Smart`

### Descrizione Breve (max 80 caratteri)
`Gestisci proprietà, pulizie, ospiti e inventario in un'unica app.`

### Descrizione Completa

```
Fiumana Immobiliare è la soluzione completa per la gestione di proprietà in affitto breve.

FUNZIONALITÀ PRINCIPALI:

🏠 GESTIONE PROPRIETÀ
• Dashboard completa con statistiche in tempo reale
• Visualizzazione prenotazioni sincronizzate da Airbnb
• Gestione inventario e scorte per ogni proprietà

🧹 MODULO PULIZIE
• Calendario assegnazioni con notifiche push
• Documentazione fotografica prima/dopo
• Checklist interattive per ogni proprietà
• Tracciamento pagamenti al personale

📋 CHECK-IN AUTONOMO
• Procedura guidata per gli ospiti
• Integrazione automatica con Portale Alloggiati
• Conforme GDPR con crittografia dati

❓ FAQ MULTIMEDIALI
• Guide video e audio per ogni proprietà
• Istruzioni su elettrodomestici, WiFi, etc.
• Supporto multilingua

RUOLI UTENTE:
• Amministratore: controllo completo
• Personale Pulizie: gestione lavori assegnati
• Ospite: check-in e informazioni soggiorno

SICUREZZA:
• Autenticazione sicura
• Dati sensibili criptati AES-256
• Conforme normativa GDPR

Scarica ora e semplifica la gestione dei tuoi immobili!
```

### Parole Chiave (Keywords)

`gestione immobili, affitto breve, pulizie, check-in, airbnb, booking, property management, cleaning, vacation rental, casa vacanze`

### Categoria
- iOS: `Business` o `Productivity`
- Android: `Business`

## Configurazione iOS

### Info.plist - Permessi richiesti

Le seguenti chiavi sono già configurate:
- `NSCameraUsageDescription`: Per foto pulizie
- `NSPhotoLibraryUsageDescription`: Per selezione foto
- `NSLocationWhenInUseUsageDescription`: Per verifica posizione (opzionale)

### App Store Connect

1. Creare App ID in Apple Developer
2. Creare Profilo Provisioning per Distribution
3. Configurare App Store Connect:
   - Informazioni app
   - Prezzi (Gratis)
   - Privacy Policy URL
   - Screenshot e video preview

### Build Release iOS

```bash
cd apps/mobile

# Pulisci e ricostruisci
flutter clean
flutter pub get

# Build release
flutter build ipa --release

# Output: build/ios/ipa/fiumana_mobile.ipa
```

## Configurazione Android

### Keystore

Creare keystore per la firma:

```bash
keytool -genkey -v -keystore fiumana-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias fiumana
```

### key.properties

Creare file `android/key.properties`:

```properties
storePassword=<password>
keyPassword=<password>
keyAlias=fiumana
storeFile=../fiumana-release-key.jks
```

### build.gradle

Il file `android/app/build.gradle` è già configurato per leggere key.properties.

### Build Release Android

```bash
cd apps/mobile

# Pulisci e ricostruisci
flutter clean
flutter pub get

# Build APK release
flutter build apk --release

# Build App Bundle (consigliato per Play Store)
flutter build appbundle --release

# Output:
# - build/app/outputs/flutter-apk/app-release.apk
# - build/app/outputs/bundle/release/app-release.aab
```

### Google Play Console

1. Creare app in Google Play Console
2. Configurare:
   - Informazioni app
   - Classificazione contenuti (IARC)
   - Target audience
   - Privacy Policy URL
   - Data Safety form

## Checklist Pre-Pubblicazione

### Generale
- [ ] Privacy Policy URL online e accessibile
- [ ] Terms of Service URL online e accessibile
- [ ] Icone app generate (tutte le dimensioni)
- [ ] Splash screen configurato
- [ ] Screenshot preparati
- [ ] Testi store tradotti (IT + EN)

### iOS
- [ ] Apple Developer Account attivo
- [ ] App ID configurato
- [ ] Provisioning Profile creato
- [ ] Build IPA testato su TestFlight
- [ ] App Store Connect configurato

### Android
- [ ] Google Play Developer Account attivo
- [ ] Keystore creato e backup sicuro
- [ ] key.properties configurato
- [ ] App Bundle firmato e testato
- [ ] Data Safety form completato

## URL da Preparare

Prima della pubblicazione, hostare online:

1. **Privacy Policy**: `https://fiumanaimmobiliare.it/privacy`
2. **Terms of Service**: `https://fiumanaimmobiliare.it/terms`
3. **Support Email**: `support@fiumanaimmobiliare.it`
4. **Website**: `https://fiumanaimmobiliare.it`

## Note Finali

- TestFlight: testare con almeno 5-10 utenti beta prima della pubblicazione
- Play Store: utilizzare Internal Testing prima di Production
- Rispondere tempestivamente a eventuali richieste di revisione
- Monitorare crash reports dopo il lancio
