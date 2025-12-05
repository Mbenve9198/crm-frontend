# 🤖 Guida Implementazione Frontend Autopilot

## Panoramica

Questa guida spiega come modificare il frontend per supportare le campagne WhatsApp in modalità **Autopilot**.

## Modifiche ai Tipi (✅ Completate)

I tipi TypeScript sono stati aggiornati in `src/types/whatsapp.ts`:
- `CampaignMode`: 'standard' | 'autopilot'
- `AutopilotConfig`: Configurazione autopilot
- `AutopilotMessageData`: Dati analisi competitor
- `WhatsappCampaign`: Aggiunto `mode` e `autopilotConfig`
- `CreateCampaignRequest`: Aggiunto `mode` e `autopilotConfig`

## Modific he al Form Creazione Campagna

### 1. Aggiungere Toggle Mode al Form

Nel file `src/app/whatsapp-campaigns/page.tsx`, nella sezione del form di creazione campagna, aggiungi un toggle per selezionare il mode:

```tsx
// Aggiungi questo stato all'inizio del componente CampaignsContent
const [campaignMode, setCampaignMode] = useState<CampaignMode>('standard');

// Nel form di creazione campagna, dopo il campo "Nome" aggiungi:
<div className="space-y-2">
  <label className="text-sm font-medium">Modalità Campagna</label>
  <Select
    value={campaignMode}
    onValueChange={(value) => setCampaignMode(value as CampaignMode)}
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="standard">
        📝 Standard - Template Manuale
      </SelectItem>
      <SelectItem value="autopilot">
        🤖 Autopilot - Generazione AI
      </SelectItem>
    </SelectContent>
  </Select>
  {campaignMode === 'autopilot' && (
    <p className="text-sm text-gray-500">
      I messaggi verranno generati automaticamente con AI basandosi sui competitor
    </p>
  )}
</div>
```

### 2. Form Configurazione Autopilot

Quando `campaignMode === 'autopilot'`, mostra questi campi invece del template messaggio:

```tsx
{campaignMode === 'autopilot' ? (
  // ========== CONFIGURAZIONE AUTOPILOT ==========
  <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
    <div className="flex items-center gap-2 mb-2">
      <Bot className="h-5 w-5 text-blue-600" />
      <h3 className="font-semibold text-blue-900">Configurazione Autopilot</h3>
    </div>

    {/* Keyword Ricerca */}
    <div className="space-y-2">
      <label className="text-sm font-medium">
        Keyword Ricerca Google Maps
      </label>
      <Input
        placeholder="es. ristorante italiano, pizzeria..."
        value={newCampaignData.autopilotConfig?.searchKeyword || ''}
        onChange={(e) => setNewCampaignData({
          ...newCampaignData,
          autopilotConfig: {
            ...newCampaignData.autopilotConfig,
            searchKeyword: e.target.value
          }
        })}
      />
      <p className="text-xs text-gray-500">
        Keyword generica per cercare competitor su Google Maps
      </p>
    </div>

    {/* Tono Messaggio */}
    <div className="space-y-2">
      <label className="text-sm font-medium">
        Tono del Messaggio
      </label>
      <Select
        value={newCampaignData.autopilotConfig?.claudeSettings?.tone || 'professionale e amichevole'}
        onValueChange={(value) => setNewCampaignData({
          ...newCampaignData,
          autopilotConfig: {
            ...newCampaignData.autopilotConfig,
            claudeSettings: {
              ...newCampaignData.autopilotConfig?.claudeSettings,
              tone: value
            }
          }
        })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="professionale e amichevole">
            Professionale e Amichevole
          </SelectItem>
          <SelectItem value="professionale e diretto">
            Professionale e Diretto
          </SelectItem>
          <SelectItem value="amichevole e colloquiale">
            Amichevole e Colloquiale
          </SelectItem>
          <SelectItem value="urgente ma rispettoso">
            Urgente ma Rispettoso
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Lunghezza Massima */}
    <div className="space-y-2">
      <label className="text-sm font-medium">
        Lunghezza Messaggio
      </label>
      <Input
        type="number"
        min="100"
        max="350"
        placeholder="280"
        value={newCampaignData.autopilotConfig?.claudeSettings?.maxLength || 280}
        onChange={(e) => setNewCampaignData({
          ...newCampaignData,
          autopilotConfig: {
            ...newCampaignData.autopilotConfig,
            claudeSettings: {
              ...newCampaignData.autopilotConfig?.claudeSettings,
              maxLength: parseInt(e.target.value)
            }
          }
        })}
      />
      <p className="text-xs text-gray-500">
        Numero massimo di caratteri (100-350)
      </p>
    </div>

    {/* Focus Principale */}
    <div className="space-y-2">
      <label className="text-sm font-medium">
        Focus Principale
      </label>
      <Select
        value={newCampaignData.autopilotConfig?.claudeSettings?.focusPoint || 'visibilità su Google'}
        onValueChange={(value) => setNewCampaignData({
          ...newCampaignData,
          autopilotConfig: {
            ...newCampaignData.autopilotConfig,
            claudeSettings: {
              ...newCampaignData.autopilotConfig?.claudeSettings,
              focusPoint: value
            }
          }
        })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="visibilità su Google">
            Visibilità su Google
          </SelectItem>
          <SelectItem value="numero di recensioni">
            Numero di Recensioni
          </SelectItem>
          <SelectItem value="competizione locale">
            Competizione Locale
          </SelectItem>
          <SelectItem value="rating e reputazione">
            Rating e Reputazione
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Salva Analisi */}
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        id="saveAnalysis"
        checked={newCampaignData.autopilotConfig?.saveAnalysisToContact !== false}
        onChange={(e) => setNewCampaignData({
          ...newCampaignData,
          autopilotConfig: {
            ...newCampaignData.autopilotConfig,
            saveAnalysisToContact: e.target.checked
          }
        })}
        className="rounded"
      />
      <label htmlFor="saveAnalysis" className="text-sm">
        Salva dati competitor nel contatto
      </label>
    </div>

    {/* Info Requisiti */}
    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
      <p className="text-sm text-yellow-800 font-medium mb-1">
        ⚠️ Requisiti Contatti
      </p>
      <p className="text-xs text-yellow-700">
        I contatti devono avere nelle properties:
        <br />• <code className="bg-yellow-100 px-1">restaurant_name</code>
        <br />• <code className="bg-yellow-100 px-1">latitude</code>
        <br />• <code className="bg-yellow-100 px-1">longitude</code>
        <br />• <code className="bg-yellow-100 px-1">keyword</code> (opzionale)
      </p>
    </div>
  </div>
) : (
  // ========== TEMPLATE STANDARD ==========
  <div className="space-y-2">
    <label className="text-sm font-medium">Template Messaggio</label>
    <Textarea
      placeholder="Ciao {nome}, sono {utente}..."
      value={newCampaignData.messageTemplate}
      onChange={(e) => setNewCampaignData({
        ...newCampaignData,
        messageTemplate: e.target.value
      })}
      rows={5}
    />
  </div>
)}
```

### 3. Aggiornare lo Stato Iniziale

Modifica lo stato iniziale di `newCampaignData`:

```tsx
const [newCampaignData, setNewCampaignData] = useState<CreateCampaignRequest>({
  name: '',
  description: '',
  whatsappSessionId: '',
  targetList: '',
  mode: 'standard', // 🤖 NUOVO
  autopilotConfig: {  // 🤖 NUOVO
    claudeSettings: {
      tone: 'professionale e amichevole',
      maxLength: 280,
      focusPoint: 'visibilità su Google',
      cta: 'chiedere se sono interessati a migliorare'
    },
    searchKeyword: 'ristorante',
    useContactKeyword: true,
    saveAnalysisToContact: true,
    requiredContactFields: {
      nameField: 'properties.restaurant_name',
      latField: 'properties.latitude',
      lngField: 'properties.longitude',
      keywordField: 'properties.keyword'
    }
  },
  messageTemplate: '',
  attachments: [],
  messageSequences: [],
  priority: 'media',
  contactFilters: {
    excludeContacts: [],
    excludeFromCampaigns: [],
    excludeContactedWithinDays: undefined
  },
  timing: {
    schedule: {
      startTime: '09:00',
      endTime: '18:00',
      timezone: 'Europe/Rome'
    }
  }
});
```

### 4. Modificare la Funzione di Creazione

Nella funzione `handleCreateCampaign`, assicurati di includere `mode` e `autopilotConfig`:

```tsx
const handleCreateCampaign = async () => {
  try {
    setIsLoading(true);

    // Validazione
    if (!newCampaignData.name || !newCampaignData.whatsappSessionId || !newCampaignData.targetList) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    // Validazione specifica per mode
    if (newCampaignData.mode === 'standard') {
      if (!newCampaignData.messageTemplate?.trim()) {
        toast.error('Il template messaggio è obbligatorio per campagne standard');
        return;
      }
    } else if (newCampaignData.mode === 'autopilot') {
      if (!newCampaignData.autopilotConfig?.searchKeyword) {
        toast.error('La keyword di ricerca è obbligatoria per campagne autopilot');
        return;
      }
    }

    // Prepara payload
    const payload = {
      ...newCampaignData,
      mode: newCampaignData.mode || 'standard',
      messageTemplate: newCampaignData.mode === 'autopilot' 
        ? '' 
        : newCampaignData.messageTemplate
    };

    const response = await apiClient.createWhatsappCampaign(payload);

    if (response.success) {
      toast.success(response.message || 'Campagna creata con successo');
      setShowNewCampaignDialog(false);
      fetchCampaigns();
      
      // Reset form
      setNewCampaignData({
        // ... stato iniziale
      });
      setCampaignMode('standard');
    }
  } catch (error) {
    console.error('Errore creazione campagna:', error);
    toast.error('Errore nella creazione della campagna');
  } finally {
    setIsLoading(false);
  }
};
```

## Visualizzazione Dati Autopilot

### Badge Campagna Autopilot

Nella tabella delle campagne, aggiungi un badge per identificare campagne autopilot:

```tsx
{campaign.mode === 'autopilot' && (
  <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
    <Bot className="h-3 w-3 mr-1" />
    Autopilot
  </Badge>
)}
```

### Dettagli Messaggio con Dati AI

Quando mostri i dettagli di un messaggio inviato in autopilot, mostra i dati dei competitor:

```tsx
{message.autopilotData && (
  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
    <div className="flex items-center gap-2 mb-2">
      <Bot className="h-4 w-4 text-blue-600" />
      <span className="text-sm font-medium text-blue-900">
        Generato con AI
      </span>
    </div>
    
    {/* Ranking */}
    <div className="text-sm space-y-1">
      <p className="text-gray-700">
        <strong>Ranking:</strong> #{message.autopilotData.userRank}
      </p>
      <p className="text-gray-700">
        <strong>Recensioni:</strong> {message.autopilotData.userReviews}
      </p>
    </div>

    {/* Competitor */}
    {message.autopilotData.competitors.length > 0 && (
      <div className="mt-2">
        <p className="text-xs font-medium text-gray-600 mb-1">Top Competitor:</p>
        {message.autopilotData.competitors.map((comp, idx) => (
          <div key={idx} className="text-xs text-gray-600">
            {idx + 1}. {comp.name} - {comp.reviews} recensioni ({comp.rating}⭐)
          </div>
        ))}
      </div>
    )}

    {/* Score AI */}
    <div className="mt-2 pt-2 border-t border-blue-200">
      <p className="text-xs text-gray-600">
        <strong>AI Model:</strong> {message.autopilotData.aiModel}
        <br />
        <strong>Score:</strong> {message.autopilotData.messageValidation.score}/100
      </p>
    </div>
  </div>
)}
```

## Import Necessari

Aggiungi questi import all'inizio del file:

```tsx
import { Bot, Sparkles } from 'lucide-react'; // Icone per autopilot
import type { CampaignMode, AutopilotConfig } from '@/types/whatsapp';
```

## Esempio Completo Componente Form

Per facilitare l'integrazione, ecco un componente standalone che puoi usare come riferimento:

```tsx
// components/ui/autopilot-config-form.tsx
import React from 'react';
import { Bot, Info } from 'lucide-react';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import type { AutopilotConfig } from '@/types/whatsapp';

interface AutopilotConfigFormProps {
  config: AutopilotConfig;
  onChange: (config: AutopilotConfig) => void;
}

export function AutopilotConfigForm({ config, onChange }: AutopilotConfigFormProps) {
  const updateConfig = (updates: Partial<AutopilotConfig>) => {
    onChange({ ...config, ...updates });
  };

  const updateClaudeSettings = (updates: Partial<AutopilotConfig['claudeSettings']>) => {
    onChange({
      ...config,
      claudeSettings: {
        ...config.claudeSettings,
        ...updates
      }
    });
  };

  return (
    <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
      <div className="flex items-center gap-2 mb-2">
        <Bot className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900">Configurazione Autopilot</h3>
      </div>

      {/* Keyword Ricerca */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Keyword Ricerca</label>
        <Input
          placeholder="es. ristorante italiano"
          value={config.searchKeyword || ''}
          onChange={(e) => updateConfig({ searchKeyword: e.target.value })}
        />
        <p className="text-xs text-gray-500">
          Keyword per cercare competitor su Google Maps
        </p>
      </div>

      {/* Tono */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Tono del Messaggio</label>
        <Select
          value={config.claudeSettings?.tone || 'professionale e amichevole'}
          onValueChange={(value) => updateClaudeSettings({ tone: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="professionale e amichevole">Professionale e Amichevole</SelectItem>
            <SelectItem value="professionale e diretto">Professionale e Diretto</SelectItem>
            <SelectItem value="amichevole e colloquiale">Amichevole e Colloquiale</SelectItem>
            <SelectItem value="urgente ma rispettoso">Urgente ma Rispettoso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lunghezza */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Lunghezza Massima</label>
        <Input
          type="number"
          min="100"
          max="350"
          value={config.claudeSettings?.maxLength || 280}
          onChange={(e) => updateClaudeSettings({ maxLength: parseInt(e.target.value) })}
        />
      </div>

      {/* Info */}
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
          <div className="text-xs text-yellow-800">
            <p className="font-medium mb-1">Requisiti Contatti:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><code>properties.restaurant_name</code></li>
              <li><code>properties.latitude</code></li>
              <li><code>properties.longitude</code></li>
              <li><code>properties.keyword</code> (opzionale)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Testing

### 1. Test Creazione Campagna

```bash
# Console Browser DevTools
// Verifica payload inviato
console.log('Creating autopilot campaign:', payload);

// Atteso:
{
  name: "Test Autopilot",
  mode: "autopilot",
  autopilotConfig: {
    searchKeyword: "ristorante italiano",
    claudeSettings: {
      tone: "professionale e amichevole",
      maxLength: 280,
      ...
    }
  },
  ...
}
```

### 2. Test Visualizzazione Dati

Dopo che una campagna autopilot è stata avviata e ha inviato messaggi, verifica che:
- Badge "Autopilot" appaia sulla campagna
- Dettagli messaggio mostrino competitor trovati
- Score AI sia visualizzato

## Troubleshooting

### Errore: "messageTemplate è obbligatorio"

**Causa**: Il backend valida sempre messageTemplate per mode='standard'

**Soluzione**: Assicurati di inviare una stringa vuota per autopilot:
```tsx
messageTemplate: mode === 'autopilot' ? '' : actualTemplate
```

### Form non si resetta dopo creazione

**Soluzione**: Aggiungi reset esplicito di `campaignMode`:
```tsx
setCampaignMode('standard');
setNewCampaignData({ /* initial state */ });
```

### Badge Autopilot non appare

**Causa**: Campo `mode` non presente nella campagna

**Soluzione**: Il backend setta `mode: 'standard'` per campagne create prima dell'update. Aggiorna manualmente o ricrea la campagna.

---

**Pronto per l'uso!** 🚀

Questa implementazione permette di:
- ✅ Creare campagne autopilot dal frontend
- ✅ Configurare AI e Serper tramite UI
- ✅ Visualizzare dati competitor nei dettagli messaggio
- ✅ Distinguere campagne standard da autopilot

Per domande o supporto, consulta `AUTOPILOT_FEATURE.md` nel backend.





