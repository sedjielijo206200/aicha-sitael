require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Aïcha tourne sur le port ${PORT}`));