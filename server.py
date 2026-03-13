from flask import Flask, request, jsonify, send_from_directory, session
import os
import requests as http_requests
from dotenv import load_dotenv

load_dotenv()

GROK_API_KEY = os.getenv("GROK_API_KEY", "")

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "future-you-secret-2035")


# ── Health Check (important for Render) ──────────────────
@app.route("/health")
def health():
    return {"status": "ok"}


# ── Call Grok API ────────────────────────────────────────
def call_grok(messages, system=None):
    url = "https://api.x.ai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {GROK_API_KEY}",
        "Content-Type": "application/json"
    }

    all_messages = []
    if system:
        all_messages.append({"role": "system", "content": system})

    all_messages.extend(messages)

    body = {
        "model": "grok-3-mini",
        "messages": all_messages,
        "max_tokens": 600
    }

    try:
        resp = http_requests.post(url, json=body, headers=headers, timeout=30)

        if resp.status_code != 200:
            print("Grok error:", resp.text)
            return "Something went wrong contacting the future timeline."

        return resp.json()["choices"][0]["message"]["content"]

    except Exception as e:
        print("Grok request failed:", e)
        return "The connection to 2035 is a little unstable right now."


# ── System prompt builder ────────────────────────────────
def build_system_prompt(goals=None):

    base = """You are the user's future self, speaking from the year 2035.
You have achieved meaningful success and found peace with who you are.
Speak with warmth, honesty, and grounded wisdom — like a trusted older version of yourself.
Reference specific feelings as if you remember them vividly from your own past.
Keep responses to 2–4 short paragraphs. Conversational, not lecture-like.
Never break character. Never say you are an AI."""

    if goals:
        name = goals.get("name", "")
        career = goals.get("career", "")
        fitness = goals.get("fitness", "")
        life = goals.get("life", "")

        if any([name, career, fitness, life]):
            base += "\n\nCONTEXT about your past self:"

            if name:
                base += f"\n- Name: {name}"

            if career:
                base += f"\n- Career dream: {career} (you achieved this)"

            if fitness:
                base += f"\n- Fitness goal: {fitness} (you reached this)"

            if life:
                base += f"\n- Life goal: {life} (this shaped who you became)"

    return base


# ── Serve frontend ───────────────────────────────────────
@app.route("/")
def home():
    return send_from_directory(".", "index.html")


@app.route("/script.js")
def script():
    return send_from_directory(".", "script.js")


@app.route("/style.css")
def styles():
    return send_from_directory(".", "style.css")


# ── Save goals ───────────────────────────────────────────
@app.route("/goals", methods=["POST"])
def save_goals():

    data = request.get_json()

    session["goals"] = {
        "name": data.get("name", ""),
        "career": data.get("career", ""),
        "fitness": data.get("fitness", ""),
        "life": data.get("life", "")
    }

    session["history"] = []

    return jsonify({"status": "ok"})


# ── Chat ─────────────────────────────────────────────────
@app.route("/chat", methods=["POST"])
def chat():

    data = request.get_json()
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"reply": "What's on your mind?"}), 400

    goals = session.get("goals", {})
    history = session.get("history", [])

    try:

        system = build_system_prompt(goals)

        history.append({"role": "user", "content": user_message})

        reply = call_grok(history[-20:], system=system)

        history.append({"role": "assistant", "content": reply})

        session["history"] = history

        return jsonify({"reply": reply})

    except Exception as e:
        print("CHAT ERROR:", e)
        return jsonify({"reply": "Something went wrong."}), 500


# ── Future Letter ────────────────────────────────────────
@app.route("/letter", methods=["POST"])
def generate_letter():

    goals = session.get("goals", {})
    name = goals.get("name", "friend")

    prompt = f"""Write a personal letter from someone's future self in 2035 to their present self.
To: {name}
Career: {goals.get("career", "meaningful work")}
Fitness: {goals.get("fitness", "feeling healthy")}
Life goal: {goals.get("life", "a fulfilling life")}
Open with "Dear {name},", write 4–5 emotional paragraphs, end with "With love, Future You (2035)"."""

    letter = call_grok([{"role": "user", "content": prompt}])

    return jsonify({"letter": letter})


# ── Day Simulation ───────────────────────────────────────
@app.route("/day", methods=["POST"])
def future_day():

    goals = session.get("goals", {})
    name = goals.get("name", "you")

    prompt = f"""Write a vivid "A Day in Your Life in 2035" for {name}.
Career: {goals.get("career", "meaningful work")}
Fitness: {goals.get("fitness", "feeling healthy")}
Life: {goals.get("life", "fulfilling life")}
Second-person narrative, 5–6 time-stamped moments, 5–7 paragraphs."""

    sim = call_grok([{"role": "user", "content": prompt}])

    return jsonify({"simulation": sim})


# ── Reset ────────────────────────────────────────────────
@app.route("/reset", methods=["POST"])
def reset():
    session.clear()
    return jsonify({"status": "ok"})


# ── Local run (Render will use Gunicorn instead) ─────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)