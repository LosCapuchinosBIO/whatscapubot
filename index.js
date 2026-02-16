const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// 1) Verificación del webhook (Meta hace un GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 2) Recepción de mensajes (Meta hace un POST)
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const message = value?.messages?.[0];
    const from = message?.from; // número del usuario
    const text = message?.text?.body;

    if (from && text) {
      console.log("Mensaje:", { from, text });

      const reply = buildReply(text);
      await sendTextMessage(from, reply);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error webhook:", err?.response?.data || err.message);
    res.sendStatus(200); // WhatsApp espera 200 para no reintentar infinito
  }
});

function buildReply(text) {
  const t = text.trim().toLowerCase();

  if (t === "hola" || t === "buenas") {
    return "¡Hola! 👋 Escribí:\n- MENU\n- AYUDA\n- INFO";
  }
  if (t === "menu") {
    return "📌 Menú:\n1) INFO\n2) AYUDA\n\nRespondé con la palabra.";
  }
  if (t === "info") {
    return "Soy un bot de WhatsApp (Cloud API) corriendo en Render 🤖";
  }
  if (t === "ayuda") {
    return "Decime qué necesitás y te guío. Ej: 'quiero integrar pagos' o 'quiero IA'.";
  }

  return `Recibí: "${text}". Probá MENU 🙂`;
}

async function sendTextMessage(to, body) {
  const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to,
      text: { body },
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
