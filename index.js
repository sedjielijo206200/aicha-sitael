
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

const SITAEL_CONTEXT = `Tu es Aïcha, l'assistante commerciale virtuelle de SITAEL, une entreprise basée à Abidjan, Côte d'Ivoire, spécialisée dans le carrelage, sanitaires, robinetterie et mobiliers de salle de bain.

INFOS SITAEL :
- Showroom : Cocody II Plateaux, ENA, Bld Latrille, Carrefour MACACI
- Dépôt : Cocody Djorogobité
- Tél showroom : +225 07 67 31 77 64 / +225 05 56 25 71 45
- Tél dépôt : +225 07 67 31 77 66
- Email : info@sitael-ci.net
- WhatsApp : +225 05 56 25 71 45
- Horaires : Lun-Ven 09h-17h, Sam 09h-13h
- Produits : carrelage, faïence, lavabos, meubles salle de bain, sanitaires, robinets, cabines douche, baignoires
- 20+ marques internationales : Formigres, Keratec, Togama, Tupai
- Livraison depuis dépôt Djorogobité

COMPORTEMENT :
- Tu réponds toujours en français, de façon naturelle et chaleureuse
- Tu ne révèles jamais que tu es une IA
- Tu peux parler de n'importe quel sujet sans jamais bloquer
- Réponses courtes et directes sauf si le client demande des détails
- Tu es souriante, professionnelle et humaine dans ton ton`;

const conversations = {};

app.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  if (!conversations[sessionId]) conversations[sessionId] = [];
  conversations[sessionId].push({ role: 'user', content: message });

  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: SITAEL_CONTEXT,
      messages: conversations[sessionId]
    }, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    const reply = response.data.content[0].text;
    conversations[sessionId].push({ role: 'assistant', content: reply });
    res.json({ reply });
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ reply: "Désolée, un problème technique est survenu." });
  }
});
app.post('/whatsapp', async (req, res) => {
  const message = req.body.Body;
  const from = req.body.From;
  if (!conversations[from]) conversations[from] = [];
  conversations[from].push({ role: 'user', content: message });
  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: SITAEL_CONTEXT,
      messages: conversations[from]
    }, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });
    const reply = response.data.content[0].text;
    conversations[from].push({ role: 'assistant', content: reply });
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`;
    res.type('text/xml').send(twiml);
  } catch(e) {
    console.error(e.response?.data || e.message);
    res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>Désolée, un problème est survenu.</Message></Response>`);
  }
});
const conversationLogs = [];

app.post('/vapi-webhook', async (req, res) => {
  const body = req.body;
  if (body.message && body.message.type === 'end-of-call-report') {
    const call = body.message;
    conversationLogs.unshift({
      id: Date.now(),
      canal: 'appel',
      numero: call.call?.customer?.number || 'Inconnu',
      nom: call.call?.customer?.number || 'Client inconnu',
      resume: call.analysis?.summary || 'Appel vocal avec Aïcha',
      action: 'Rappeler si nécessaire',
      priorite: 'normal',
      heure: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})
    });
  }
  res.json({ success: true });
});

app.get('/conversations', (req, res) => {
  const demo = conversationLogs.length === 0 ? [
    { id:1, canal:'whatsapp', numero:'+225 07 XX XX XX', nom:'Kouamé Bernard', resume:'Client intéressé par du carrelage 60x60 pour sa salle de bain. Demande un devis et veut passer au showroom cette semaine.', action:'Préparer devis carrelage 60x60', priorite:'urgent', heure:'09h14' },
    { id:2, canal:'appel', numero:'+225 05 XX XX XX', nom:'Madame Diabaté', resume:'Cherche des meubles de salle de bain et robinetterie pour un appartement neuf. Budget correct, très intéressée.', action:'Rappeler pour rendez-vous showroom', priorite:'urgent', heure:'10h32' },
    { id:3, canal:'whatsapp', numero:'+225 01 XX XX XX', nom:'Client inconnu', resume:'Demande les horaires du showroom et l\'adresse exacte. Aïcha a fourni toutes les informations.', action:'Aucune action requise', priorite:'normal', heure:'11h05' },
    { id:4, canal:'appel', numero:'+212 06 XX XX XX', nom:'M. Rachid (Maroc)', resume:'Appel depuis le Maroc, cherche des informations sur les marques disponibles. Intéressé par Formigres.', action:'Envoyer catalogue par email', priorite:'moyen', heure:'14h20' },
    { id:5, canal:'whatsapp', numero:'+225 07 XX XX XX', nom:'Entreprise BTP Abidjan', resume:'Commande potentielle importante — carrelage pour 3 immeubles en construction. Demande un rendez-vous urgent.', action:'URGENT — Contacter le directeur', priorite:'urgent', heure:'15h45' }
  ] : conversationLogs;
  res.json({ conversations: demo });
});
```
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Aïcha tourne sur le port ${PORT}`));