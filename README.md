# 🎯 MenuChatCRM Frontend

Frontend moderno per **MenuChatCRM** - Sistema completo di gestione contatti con ownership e proprietà dinamiche.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Components-000000?style=for-the-badge)

## 🚀 Caratteristiche Principali

- ✅ **Autenticazione JWT** con context provider
- ✅ **Gestione contatti** con tabella interattiva
- ✅ **Filtri avanzati** (ricerca, lista, owner)
- ✅ **Colonne personalizzabili** con dropdown
- ✅ **Design responsive** e moderno
- ✅ **Tooltips informativi** per UX migliorata
- ✅ **Integrazione API** completa con backend
- ✅ **Credenziali test** pre-configurate

## 🛠️ Tech Stack

### Core
- **[Next.js 15](https://nextjs.org/)** - React framework con App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS

### UI Components
- **[shadcn/ui](https://ui.shadcn.com/)** - Component library
- **[Lucide React](https://lucide.dev/)** - Icon library
- **[Framer Motion](https://www.framer.com/motion/)** - Animations

### State Management
- **React Context** - Authentication state
- **Custom hooks** - API integration

## 🏗️ Architettura

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Layout principale con AuthProvider
│   ├── page.tsx           # Homepage con routing condizionale
│   └── globals.css        # Stili globali
├── components/ui/          # shadcn/ui components
│   ├── contacts-table.tsx # Tabella gestione contatti
│   ├── login-form.tsx     # Form di login
│   └── ...               # Altri componenti UI
├── context/
│   └── AuthContext.tsx    # Context per autenticazione
├── lib/
│   ├── api.ts            # API client per backend
│   └── utils.ts          # Utility functions
└── types/
    └── contact.ts         # TypeScript types
```

## 🚀 Quick Start

### 1. Installazione

```bash
# Clona il repository
git clone https://github.com/Mbenve9198/crm-frontend.git
cd crm-frontend

# Installa le dipendenze
npm install
```

### 2. Configurazione Environment

Crea il file `.env.local`:

```bash
# URL del backend MenuChatCRM
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Environment
NODE_ENV=development
```

### 3. Avvio

```bash
# Sviluppo
npm run dev

# Build di produzione
npm run build
npm start
```

Il frontend sarà disponibile su: **http://localhost:3001**

## 🔐 Credenziali di Test

Il sistema include credenziali preconfigurate per il testing:

### 👨‍💼 Admin
- **Email**: `marco@menuchat.com`
- **Password**: `Itpennywise9194!`
- **Permessi**: Accesso completo al sistema

### 👨‍💻 Manager
- **Email**: `federico@menuchat.com`
- **Password**: `Itpennywise9194!`
- **Permessi**: Gestione utenti e contatti

> 💡 **Tip**: Il form di login include pulsanti per auto-compilare le credenziali!

## 📊 Funzionalità UI

### 🔍 Tabella Contatti Avanzata

- **Filtri multipli**: ricerca, lista, owner
- **Colonne personalizzabili** con selezione dinamica
- **Tooltips informativi** per avatar e dettagli
- **Actions menu** per ogni contatto (visualizza, modifica, elimina)
- **Design responsive** con overflow gestito

### 🎨 Componenti Moderni

- **Login form** con show/hide password
- **Loading states** con spinner
- **Error handling** con alert colorati
- **User profile** nell'header con badge ruolo
- **Logout** sicuro con cleanup stato

### 📱 Mobile Ready

Completamente responsive con:
- Layout adattivo per smartphone
- Tabella con scroll orizzontale
- Touch-friendly controls
- Ottimizzazione per dispositivi mobili

## 🔌 Integrazione Backend

### API Client

Il sistema include un client API completo (`src/lib/api.ts`) per:

- ✅ **Autenticazione** (login, logout, profilo)
- ✅ **Gestione contatti** (CRUD completo)
- ✅ **Gestione utenti** (listing, assignment)
- ✅ **Import CSV** (analyze & execute)
- ✅ **Statistiche** (contatti e utenti)

### Error Handling

- **Retry automatico** per errori temporanei
- **Token refresh** automatico
- **Redirect sicuro** su logout/token expired
- **Messaggi user-friendly** per tutti gli errori

## 🎯 Backend Compatibility

Progettato per integrarsi perfettamente con il backend MenuChatCRM:

- **Node.js + Express + MongoDB**
- **JWT Authentication**
- **Role-based permissions**
- **Contact ownership**
- **CSV import con mappatura dinamica**

> 📋 **Backend repository**: Richiedi l'accesso al repository backend per l'integrazione completa

## 🔧 Scripts Disponibili

```bash
# Sviluppo con hot reload
npm run dev

# Build per produzione
npm run build

# Avvio produzione
npm start

# Linting
npm run lint

# Type checking
npm run type-check
```

## 📦 Dipendenze Principali

```json
{
  "next": "^15.0.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.4.0",
  "lucide-react": "^0.400.0",
  "framer-motion": "^11.0.0"
}
```

## 🤝 Contributing

1. **Fork** il repository
2. **Crea** un branch per la feature (`git checkout -b feature/amazing-feature`)
3. **Commit** le modifiche (`git commit -m 'Add amazing feature'`)
4. **Push** al branch (`git push origin feature/amazing-feature`)
5. **Apri** una Pull Request

## 📝 ToDo / Roadmap

- [ ] **Dashboard analytics** con grafici
- [ ] **Modal** per creazione/modifica contatti
- [ ] **Drag & drop** per CSV import
- [ ] **Notifiche real-time** con WebSocket
- [ ] **Dark mode** toggle
- [ ] **Multi-language** support
- [ ] **Export** contatti in vari formati
- [ ] **Advanced filtering** con date picker

## 🐛 Issues & Support

Per bug reports e feature requests, apri un [issue](https://github.com/Mbenve9198/crm-frontend/issues) su GitHub.

## 📄 License

Questo progetto è rilasciato sotto licenza **MIT**.

---

**MenuChatCRM Frontend** - Interfaccia moderna per la gestione contatti professionale 🎯

Made with ❤️ using Next.js, TypeScript e shadcn/ui
