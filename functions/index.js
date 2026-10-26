
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const {
  getFirestore,
  FieldValue,
  Timestamp
} = require("firebase-admin/firestore");
const crypto = require("crypto");

initializeApp();

const db = getFirestore();
const ADMIN_EMAIL = "rochakauan047@gmail.com";

function gerarHash(valor) {
  return crypto.createHash("sha256").update(valor).digest("hex");
}

function exigirAdministrador(request) {
  const email = String(request.auth?.token?.email || "").toLowerCase();
  const verificado = request.auth?.token?.email_verified === true;

  if (!request.auth || email !== ADMIN_EMAIL || !verificado) {
    throw new HttpsError(
      "permission-denied",
      "Apenas o administrador autorizado pode realizar esta ação."
    );
  }
}

// Gera um código de seis caracteres, válido por 24 horas.
exports.generateAccessCode = onCall(async (request) => {
  exigirAdministrador(request);

  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  for (let tentativa = 0; tentativa < 10; tentativa++) {
    let codigo = "";

    for (let i = 0; i < 6; i++) {
      codigo += caracteres[crypto.randomInt(caracteres.length)];
    }

    const hash = gerarHash(codigo);
    const referencia = db.collection("access_codes").doc(hash);
    const agora = Date.now();

    try {
      await referencia.create({
        active: true,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: ADMIN_EMAIL,
        expiresAt: Timestamp.fromMillis(
          agora + 24 * 60 * 60 * 1000
        )
      });

      return {
        code: codigo,
        expiresAt: new Date(
          agora + 24 * 60 * 60 * 1000
        ).toISOString()
      };
    } catch (erro) {
      if (erro.code !== 6 && erro.code !== "already-exists") {
        console.error("Erro ao salvar código:", erro);
        throw new HttpsError(
          "internal",
          "Não foi possível gerar o código."
        );
      }
    }
  }

  throw new HttpsError(
    "internal",
    "Não foi possível gerar um código exclusivo."
  );
});

// Valida o código e autentica o funcionário.
exports.validateAccessCode = onCall(async (request) => {
  const nome = String(request.data?.name || "").trim();
  const codigo = String(request.data?.code || "").trim().toUpperCase();

  if (!nome || nome.length > 80 ||
      !/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(codigo)) {
    throw new HttpsError(
      "invalid-argument",
      "Informe seu nome e um código válido de seis caracteres."
    );
  }

  // Limita tentativas por endereço IP em janelas de 15 minutos.
  const ip = request.rawRequest?.ip || "unknown";
  const ipHash = gerarHash(ip);
  const limiteRef = db.collection("loginRateLimits").doc(ipHash);
  const agora = Date.now();
  const janela = 15 * 60 * 1000;

  const permitido = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(limiteRef);
    const dados = snapshot.exists ? snapshot.data() : null;
    const inicio = dados?.windowStart?.toMillis?.() || 0;
    const tentativas = dados?.count || 0;

    if (!snapshot.exists || agora - inicio >= janela) {
      tx.set(limiteRef, {
        windowStart: Timestamp.fromMillis(agora),
        count: 1
      });
      return true;
    }

    if (tentativas >= 8) return false;

    tx.update(limiteRef, {
      count: tentativas + 1
    });

    return true;
  });

  if (!permitido) {
    throw new HttpsError(
      "resource-exhausted",
      "Muitas tentativas. Aguarde 15 minutos."
    );
  }

  const hash = gerarHash(codigo);
  const referencia = db.collection("access_codes").doc(hash);
  const snapshot = await referencia.get();

  if (!snapshot.exists) {
    throw new HttpsError(
      "permission-denied",
      "Código inválido ou expirado."
    );
  }

  const dados = snapshot.data();

  if (
    dados.active !== true ||
    !dados.expiresAt ||
    dados.expiresAt.toMillis() <= Date.now()
  ) {
    throw new HttpsError(
      "permission-denied",
      "Código inválido ou expirado."
    );
  }

  // Cada nome recebe uma identidade autenticada pelo Firebase.
  const uid = "staff_" + gerarHash(
    nome.toLowerCase() + ":" + hash
  ).slice(0, 40);

  const token = await getAuth().createCustomToken(uid, {
    staff: true,
    staffName: nome
  });

  return {
    customToken: token,
    staffName: nome
  };
});
