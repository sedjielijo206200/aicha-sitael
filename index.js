const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
const SITAEL_CONTEXT = "Tu es Aicha, assistante commerciale de SITAEL a Abidjan. Showroom : Cocody II Plateaux, Bld Latrille, Carrefour MACACI. Tel : +225 07 67 31 77 64. Horaires : Lun-Ven 09h-17h, Sam 09h-13h. Produits : carrelage, faience, lavabos, meubles salle de bain, sanitaires, robinets, cabines douche, baignoires. Marques : Formigres, Keratec, Togama, Tupai. Reponds toujours en francais naturel et chaleureux. Ne revele jamais que tu es une IA. Tu peux parler de nimporte quel sujet.";
const conversations = {};
const conversationLogs = [];
app.post('/chat', async function(req, res) {
var message = req.body.message;
var sessionId = req.body.sessionId;
if (!conversations[sessionId]) conversations[sessionId] = [];
conversations[sessionId].push({ role: 'user', content: message });
try {
var response = await axios.post('https://api.anthropic.com/v1/messages', {
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
var reply = response.data.content[0].text;
conversations[sessionId].push({ role: 'assistant', content: reply });
conversationLogs.unshift({
id: Date.now(),
canal: 'whatsapp',
numero: sessionId,
nom: 'Visiteur web',
resume: 'Client: ' + message.substring(0, 80),
action: 'Verifier si suivi necessaire',
priorite: 'normal',
heure: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})
});
res.json({ reply: reply });

} catch (e) {
console.error(e.message);
res.status(500).json({ reply: "Desolee, un probleme technique est survenu." });
}
});
app.post('/whatsapp', async function(req, res) {
var message = req.body.Body;
var from = req.body.From;
if (!conversations[from]) conversations[from] = [];
conversations[from].push({ role: 'user', content: message });
try {
var response = await axios.post('https://api.anthropic.com/v1/messages', {
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
var reply = response.data.content[0].text;
conversations[from].push({ role: 'assistant', content: reply });
conversationLogs.unshift({
id: Date.now(),
canal: 'whatsapp',
numero: from,
nom: from.replace('whatsapp:', ''),
resume: 'Client: ' + message.substring(0, 80),
action: 'Verifier si suivi necessaire',
priorite: 'normal',
heure: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})
});
var twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Message>' + reply + '</Message></Response>';
res.type('text/xml').send(twiml);
} catch(e) {
console.error(e.message);
res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Desolee, un probleme est survenu.</Message></Response>');
}
});
app.post('/vapi-webhook', async function(req, res) {
var body = req.body;
if (body.message && body.message.type === 'end-of-call-report') {
var call = body.message;
conversationLogs.unshift({
id: Date.now(),
canal: 'appel',
numero: call.call && call.call.customer ? call.call.customer.number : 'Inconnu',
nom: call.call && call.call.customer ? call.call.customer.number : 'Client inconnu',
resume: call.analysis && call.analysis.summary ? call.analysis.summary : 'Appel vocal avec Aicha',
action: 'Rappeler si necessaire',
priorite: 'normal',
heure: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})
});
}
res.json({ success: true });
});
app.get('/conversations', function(req, res) {
var demo = conversationLogs.length === 0 ? [
{ id:1, canal:'whatsapp', numero:'+225 07 XX XX XX', nom:'Kouame Bernard', resume:'Client interesse par du carrelage 60x60 pour sa salle de bain. Demande un devis et veut passer au showroom.', action:'Preparer devis carrelage 60x60', priorite:'urgent', heure:'09h14' },
{ id:2, canal:'appel', numero:'+225 05 XX XX XX', nom:'Madame Diabate', resume:'Cherche meubles salle de bain et robinetterie pour appartement neuf. Tres interessee.', action:'Rappeler pour rendez-vous showroom', priorite:'urgent', heure:'10h32' },
{ id:3, canal:'whatsapp', numero:'+225 01 XX XX XX', nom:'Client inconnu', resume:'Demande les horaires et adresse du showroom. Aicha a fourni les informations.', action:'Aucune action requise', priorite:'normal', heure:'11h05' },
{ id:4, canal:'appel', numero:'+212 06 XX XX XX', nom:'M. Rachid Maroc', resume:'Appel depuis le Maroc, interesse par les marques disponibles notamment Formigres.', action:'Envoyer catalogue par email', priorite:'moyen', heure:'14h20' },
{ id:5, canal:'whatsapp', numero:'+225 07 XX XX XX', nom:'Entreprise BTP Abidjan', resume:'Commande potentielle importante - carrelage pour 3 immeubles. Demande rendez-vous urgent.', action:'URGENT - Contacter le directeur', priorite:'urgent', heure:'15h45' }
] : conversationLogs;
res.json({ conversations: demo });
});
var PORT = process.env.PORT || 8080;
app.listen(PORT, function() {
console.log("Serveur tourne sur le port " + PORT);
});