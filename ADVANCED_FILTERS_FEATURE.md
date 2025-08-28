# Filtri Avanzati: "Non è" e "Non contiene"

## Panoramica

Il sistema di filtri per i contatti è stato esteso con due nuovi operatori:
- **"Non è uguale a"** (`not_equals`) - Esclude contatti con un valore specifico
- **"Non contiene"** (`not_contains`) - Esclude contatti che contengono una stringa specifica

Questi nuovi filtri permettono ricerche più sofisticate e consentono di escludere facilmente gruppi di contatti indesiderati.

## Operatori di Filtro Disponibili

### 1. Operatori di Confronto
| Operatore | Label | Descrizione | Esempio |
|-----------|-------|-------------|---------|
| `equals` | È uguale a | Trova contatti con valore esatto | Nome = "Mario Rossi" |
| `not_equals` | **Non è uguale a** | Esclude contatti con valore specifico | Status ≠ "da contattare" |

### 2. Operatori di Testo
| Operatore | Label | Descrizione | Esempio |
|-----------|-------|-------------|---------|
| `contains` | Contiene | Trova contatti che contengono la stringa | Email contiene "@gmail" |
| `not_contains` | **Non contiene** | Esclude contatti che contengono la stringa | Email non contiene "test" |
| `starts_with` | Inizia con | Trova contatti che iniziano con la stringa | Nome inizia con "Mar" |

### 3. Operatori di Esistenza
| Operatore | Label | Descrizione | Esempio |
|-----------|-------|-------------|---------|
| `is_empty` | È vuoto | Trova contatti con campo vuoto/null | Telefono è vuoto |
| `is_not_empty` | Non è vuoto | Trova contatti con campo popolato | Email non è vuoto |

## Casi d'Uso dei Nuovi Filtri

### "Non è uguale a" (`not_equals`)

#### Esempio 1: Escludere contatti con status specifico
```
Campo: Status
Condizione: Non è uguale a
Valore: "won"
Risultato: Mostra tutti i contatti tranne quelli già convertiti
```

#### Esempio 2: Escludere un proprietario specifico
```
Campo: Owner
Condizione: Non è uguale a
Valore: "Mario Rossi"
Risultato: Mostra contatti di tutti gli altri proprietari
```

#### Esempio 3: Escludere aziende specifiche
```
Campo: Company (proprietà dinamica)
Condizione: Non è uguale a
Valore: "Competitor Corp"
Risultato: Esclude contatti della società concorrente
```

### "Non contiene" (`not_contains`)

#### Esempio 1: Escludere email di test
```
Campo: Email
Condizione: Non contiene
Valore: "test"
Risultato: Esclude tutte le email contenenti "test" (test@, testing@, etc.)
```

#### Esempio 2: Escludere domini specifici
```
Campo: Email
Condizione: Non contiene
Valore: "@competitor.com"
Risultato: Esclude email del dominio concorrente
```

#### Esempio 3: Escludere note con parole chiave
```
Campo: Notes (proprietà dinamica)
Condizione: Non contiene
Valore: "spam"
Risultato: Esclude contatti con note contenenti "spam"
```

## Implementazione Tecnica

### Frontend (TypeScript)

#### Tipi di Filtro
```typescript
export type FilterCondition = 
  | 'equals'
  | 'not_equals'        // ← NUOVO
  | 'contains'
  | 'not_contains'      // ← NUOVO
  | 'starts_with'
  | 'is_empty'
  | 'is_not_empty';
```

#### Configurazione UI
```typescript
const filterConditions = [
  { value: 'equals', label: 'È uguale a', type: 'text' },
  { value: 'not_equals', label: 'Non è uguale a', type: 'text' },     // ← NUOVO
  { value: 'contains', label: 'Contiene', type: 'text' },
  { value: 'not_contains', label: 'Non contiene', type: 'text' },     // ← NUOVO
  { value: 'starts_with', label: 'Inizia con', type: 'text' },
  { value: 'is_empty', label: 'È vuoto', type: 'text' },
  { value: 'is_not_empty', label: 'Non è vuoto', type: 'text' },
];
```

#### Logica di Applicazione (useTableFilters.ts)
```typescript
switch (type) {
  case 'equals':
    return value === filterValue;
  case 'not_equals':                                               // ← NUOVO
    return value !== filterValue;
  case 'contains':
    return value.toLowerCase().includes(String(filterValue).toLowerCase());
  case 'not_contains':                                             // ← NUOVO
    return !value.toLowerCase().includes(String(filterValue).toLowerCase());
  // ... altri casi
}
```

### Backend (MongoDB)

#### Mappatura Filtri
```javascript
const buildMongoFilter = (column, columnFilter) => {
  const { type, value } = columnFilter.condition;
  
  switch (type) {
    case 'equals':
      return { [field]: value };
    
    case 'not_equals':                                             // ← NUOVO
      return { [field]: { $ne: value } };
    
    case 'contains':
      return { [field]: { $regex: value, $options: 'i' } };
    
    case 'not_contains':                                           // ← NUOVO
      return { [field]: { $not: { $regex: value, $options: 'i' } } };
    
    // ... altri casi
  }
};
```

#### Query MongoDB Generate

**not_equals:**
```javascript
// Input: Status non è uguale a "da contattare"
{ status: { $ne: "da contattare" } }

// Input: properties.company non è uguale a "Acme Corp"
{ "properties.company": { $ne: "Acme Corp" } }
```

**not_contains:**
```javascript
// Input: Email non contiene "test"
{ email: { $not: { $regex: "test", $options: "i" } } }

// Input: properties.notes non contiene "spam"
{ "properties.notes": { $not: { $regex: "spam", $options: "i" } } }
```

## Esempi di Utilizzo

### Scenario 1: Campagna di Follow-up
**Obiettivo:** Contattare tutti i prospect tranne quelli già convertiti

```
Filtri:
1. Status → Non è uguale a → "won"
2. Status → Non è uguale a → "lost"
3. Email → Non è vuoto

Risultato: Tutti i contatti attivi con email
```

### Scenario 2: Pulizia Database
**Obiettivo:** Trovare contatti reali escludendo quelli di test

```
Filtri:
1. Email → Non contiene → "test"
2. Email → Non contiene → "demo"
3. Email → Non contiene → "example"
4. Nome → Non contiene → "Test"

Risultato: Solo contatti reali nel database
```

### Scenario 3: Analisi Competitiva
**Obiettivo:** Analizzare prospect escludendo competitor

```
Filtri:
1. Company → Non è uguale a → "Competitor A"
2. Company → Non è uguale a → "Competitor B"
3. Email → Non contiene → "@competitor.com"
4. Status → È uguale a → "interessato"

Risultato: Prospect qualificati escludendo competitor
```

### Scenario 4: Segmentazione Avanzata
**Obiettivo:** Target specifico per campagna premium

```
Filtri:
1. Budget → Non è vuoto
2. Budget → Non è uguale a → "0"
3. Industry → Non è uguale a → "Non-profit"
4. Notes → Non contiene → "budget limitato"

Risultato: Contatti con capacità di spesa effettiva
```

## Combinazione di Filtri

I nuovi operatori si integrano perfettamente con quelli esistenti:

### Filtri AND (tutti devono essere veri)
```
- Status NON è "lost"
- Email NON contiene "test"  
- Budget NON è vuoto
= Contatti attivi reali con budget
```

### Filtri OR (tramite valori multipli)
```
- Status: Seleziona ["da contattare", "contattato", "interessato"]
- Email NON contiene "test"
= Contatti in pipeline escludendo test
```

## Performance e Ottimizzazione

### Indici MongoDB Consigliati
```javascript
// Per campi filtrati frequentemente
db.contacts.createIndex({ "status": 1 });
db.contacts.createIndex({ "email": 1 });
db.contacts.createIndex({ "properties.company": 1 });
db.contacts.createIndex({ "properties.industry": 1 });

// Indice composto per query complesse
db.contacts.createIndex({ 
  "status": 1, 
  "properties.budget": 1, 
  "email": 1 
});
```

### Note di Performance
- **Filtri di negazione:** Query `$ne` e `$not` sono meno efficienti dei filtri positivi
- **Uso di indici:** I filtri `not_contains` non possono usare indici di testo
- **Combinazioni:** Preferire filtri positivi quando possibile per migliori performance

## Test e Validazione

### Script di Test
```bash
npm run test-advanced-filters
```

### Test Cases Inclusi
1. **Funzioni di mappatura:** Verifica conversione colonne → campi MongoDB
2. **Generazione filtri:** Test costruzione query MongoDB
3. **Query reali:** Test su database con dati di esempio
4. **Edge cases:** Valori null, stringhe vuote, proprietà inesistenti

### Esempi di Test
```javascript
// Test not_equals
buildMongoFilter('Status', { 
  type: 'condition', 
  condition: { type: 'not_equals', value: 'da contattare' } 
});
// Risultato: { status: { $ne: 'da contattare' } }

// Test not_contains
buildMongoFilter('Email', { 
  type: 'condition', 
  condition: { type: 'not_contains', value: 'test' } 
});
// Risultato: { email: { $not: { $regex: 'test', $options: 'i' } } }
```

## Compatibilità

- ✅ **Retrocompatibile:** I filtri esistenti continuano a funzionare
- ✅ **Frontend/Backend:** Sincronizzazione completa tra client e server
- ✅ **Proprietà dinamiche:** Supporto completo per campi personalizzati
- ✅ **Esportazione:** I filtri sono inclusi nelle esportazioni CSV

## Risoluzione Problemi

### Problema: Filtro non funziona
**Soluzione:** Verificare che il campo esista nel database
```bash
# Verifica struttura contatti
db.contacts.findOne({}, { name: 1, email: 1, properties: 1 });
```

### Problema: Performance lenta
**Soluzione:** Aggiungere indici appropriati
```bash
# Verifica query plan
db.contacts.find({ status: { $ne: "won" } }).explain("executionStats");
```

### Problema: Risultati inattesi
**Soluzione:** Controllare i log del backend
```bash
# I filtri applicati vengono loggati
tail -f logs/backend.log | grep "Debug query contatti"
```

## Roadmap Future

### Possibili Estensioni
1. **Filtri numerici:** "maggiore di", "minore di", "tra"
2. **Filtri data:** "prima di", "dopo", "negli ultimi X giorni"
3. **Filtri array:** "contiene almeno uno", "non contiene nessuno"
4. **Filtri regex:** Supporto per espressioni regolari personalizzate

### Ottimizzazioni Pianificate
1. **Cache query:** Cache delle query più frequenti
2. **Indici dinamici:** Creazione automatica di indici basata sull'uso
3. **Suggerimenti filtri:** AI-powered filter suggestions
4. **Filtri salvati:** Possibilità di salvare combinazioni di filtri complesse 