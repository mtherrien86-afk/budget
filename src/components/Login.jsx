import { useState } from "react";

export default function Login({ auth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await auth.login(email, password);
      else await auth.signup(email, password);
    } catch (err) {
      setError(traduireErreur(err.code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <h1 className="serif">Le grand livre</h1>
        <p className="login-sub">
          {mode === "login" ? "Connexion à ton budget." : "Créer un compte."}
        </p>

        <div className="field">
          <label>Courriel</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Mot de passe</label>
          <input
            type="password" required minLength={6}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="login-error">{error}</p>}

        <button className="btn" type="submit" disabled={busy}>
          {mode === "login" ? "Se connecter" : "Créer le compte"}
        </button>
        <button
          type="button" className="btn secondary small login-switch"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Pas de compte? En créer un" : "Déjà un compte? Se connecter"}
        </button>
      </form>
    </div>
  );
}

function traduireErreur(code) {
  const map = {
    "auth/invalid-email": "Courriel invalide.",
    "auth/user-not-found": "Aucun compte avec ce courriel.",
    "auth/wrong-password": "Mot de passe incorrect.",
    "auth/email-already-in-use": "Ce courriel a déjà un compte.",
    "auth/weak-password": "Mot de passe trop court (6 caractères min).",
    "auth/invalid-credential": "Courriel ou mot de passe incorrect.",
  };
  return map[code] || "Une erreur est survenue.";
}
