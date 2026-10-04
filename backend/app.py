from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import Groq
from typing import List, Optional
import os
import time
import requests
import base64
import re

load_dotenv()

groq_key = os.getenv("GROQ_API_KEY")
cf_account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
cf_api_token = os.getenv("CLOUDFLARE_API_TOKEN")
client = Groq(api_key=groq_key)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HistoryItem(BaseModel):
    message: str
    sender: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[HistoryItem]] = []


class ImageRequest(BaseModel):
    prompt: str


SYSTEM_PROMPT = """You are a helpful AI assistant, similar to ChatGPT.

CRITICAL RULES:
1. Conversation Continuity: The user often types SHORT follow-up messages (like "Sindh", "Punjab", "another one", "aur batao", "more", "next"). Understand these in CONTEXT of the previous conversation.
2. NEVER ask "What do you mean?" if the context is clear.
3. Always reply in the SAME language as the user (Urdu, English, Hindi, Roman Urdu).

FORMATTING RULES (VERY IMPORTANT):
- Reply in PLAIN TEXT format, like ChatGPT does.
- DO NOT use markdown tables (no | pipes | in your response).
- DO NOT use heavy headers (###, ##, #).
- DO NOT use horizontal lines (---).
- Use simple bullet points with dashes (-) or numbers (1. 2. 3.) when listing items.
- Use bold text (**text**) ONLY for important labels — sparingly.
- Write in natural paragraphs for explanations.
- Keep the response clean, readable, and conversational.
- If the user asks for a profile, biography, or details, write it as flowing text with simple bullet points — NOT as a table.

Example of GOOD response format:
Dr. Shehryar Nizazi is a physician specializing in Internal Medicine and Public Health.

His qualifications include:
- MBBS from King Edward Medical University (2006)
- MD in Internal Medicine from Aga Khan University (2012)
- MPH from London School of Hygiene & Tropical Medicine (2015)

He currently serves as a Senior Consultant at Aga Khan University Hospital.

Example of BAD response format (DO NOT DO THIS):
| Category | Details |
|----------|---------|
| Full Name | Dr. Shehryar |
| Specialty | ... |

NEVER use tables in your responses. Always use plain text with simple formatting."""


MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "qwen/qwen3-32b",
    "moonshotai/kimi-k2-instruct-0905",
    "openai/gpt-oss-120b",
]


def call_groq_with_retry(messages, max_attempts_per_model=2):
    last_error = None
    for model_name in MODELS:
        for attempt in range(max_attempts_per_model):
            try:
                print(f"🔄 Trying {model_name} (attempt {attempt+1}/{max_attempts_per_model})")
                response = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1024,
                )
                print(f"✅ Success with {model_name}")
                return response
            except Exception as err:
                last_error = err
                err_str = str(err)
                if ("404" in err_str or "NOT_FOUND" in err_str 
                    or "model_not_found" in err_str.lower() 
                    or "decommissioned" in err_str.lower()):
                    print(f"⚠️ {model_name} not available, skipping...")
                    break
                if "429" in err_str or "rate_limit" in err_str.lower():
                    print(f"⚠️ {model_name} rate limited, skipping...")
                    break
                if "503" in err_str or "overloaded" in err_str.lower():
                    wait = 2 * (attempt + 1)
                    print(f"⏳ {model_name} busy. Waiting {wait}s...")
                    time.sleep(wait)
                else:
                    print(f"⚠️ {model_name} error: {err_str[:100]}")
                    break
    raise last_error


def clean_markdown_tables(text):
    """Convert any markdown tables in the response to plain text."""
    if not text:
        return text
    
    lines = text.split("\n")
    output = []
    in_table = False
    table_headers = []
    
    for line in lines:
        stripped = line.strip()
        
        # Detect table separator line (like |---|---|)
        if re.match(r"^\|[\s\-:|]+\|$", stripped):
            in_table = True
            continue
        
        # Detect table row
        if stripped.startswith("|") and stripped.endswith("|"):
            # Extract cells
            cells = [c.strip() for c in stripped.strip("|").split("|")]
            
            # Check if this is the first row (header) of a new table
            if not table_headers:
                table_headers = cells
                in_table = True
                continue
            
            # Format as bullet points with header labels
            row_text = " • ".join(
                f"{h}: {c}" for h, c in zip(table_headers, cells) if c
            )
            output.append(row_text)
            continue
        
        # Reset table tracking when non-table line appears
        if in_table and not stripped.startswith("|"):
            in_table = False
            table_headers = []
        
        output.append(line)
    
    return "\n".join(output)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
def chat(request: ChatRequest):
    try:
        messages = []
        messages.append({"role": "system", "content": SYSTEM_PROMPT})

        if request.history:
            for item in request.history[-15:]:
                if not item.message or not item.message.strip():
                    continue
                msg_text = item.message.replace("🎨 ", "").strip()
                if not msg_text:
                    continue
                role = "user" if item.sender == "user" else "assistant"
                messages.append({"role": role, "content": msg_text})

        messages.append({"role": "user", "content": request.message})

        print(f"=== Chat: {request.message[:50]} ===")

        response = call_groq_with_retry(messages)
        reply = response.choices[0].message.content

        # Post-process: tables ko plain text mein convert karein
        reply = clean_markdown_tables(reply)

        return {"reply": reply}

    except Exception as e:
        import traceback
        traceback.print_exc()
        err_str = str(e)
        print(f"❌ ERROR: {err_str[:200]}")
        if "429" in err_str or "rate_limit" in err_str.lower():
            return {"reply": "⚠️ Bohat requests ho gayi. 30 second baad try karein."}
        if "503" in err_str or "overloaded" in err_str.lower():
            return {"reply": "⏳ Server busy hai. 30 second baad try karein."}
        return {"reply": f"Backend error: {err_str[:200]}"}


@app.post("/refine-image-prompt")
def refine_image_prompt(request: ChatRequest):
    try:
        messages = []
        messages.append({
            "role": "system",
            "content": """You are an image prompt generator. Output ONLY one single detailed English image prompt. No explanations, no quotes, no markdown.

Rules:
- If user follows up ("another one", "make it blue"), modify the previous prompt.
- If user types a single word like "dog" after "cat", they want a "dog" image.
- Include: subject, style, lighting, mood, setting, quality.
- Maximum 50 words. English only."""
        })

        if request.history:
            for item in request.history[-10:]:
                if not item.message or not item.message.strip():
                    continue
                msg_text = item.message.replace("🎨 ", "").strip()
                if not msg_text:
                    continue
                role = "user" if item.sender == "user" else "assistant"
                messages.append({"role": role, "content": msg_text})

        messages.append({"role": "user", "content": f"Generate image prompt for: {request.message}"})

        response = call_groq_with_retry(messages)
        refined = response.choices[0].message.content.strip().strip('"').strip("'").strip()
        if refined.startswith("Prompt:"):
            refined = refined.replace("Prompt:", "").strip()
        if not refined:
            refined = request.message
        print(f"✅ Refined: {refined}")
        return {"prompt": refined}

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ Refine error: {str(e)[:200]}")
        return {"prompt": request.message}


# ===== IMAGE GENERATION (Cloudflare + Pollinations fallback) =====

SAFE_WORD_MAP = {
    "girl": "woman",
    "girls": "women",
    "boy": "man",
    "boys": "men",
    "child": "person",
    "children": "people",
    "kid": "person",
    "kids": "people",
    "baby": "infant",
}


def sanitize_prompt(text):
    """Clean prompt and replace risky words."""
    clean = " ".join(text.split())
    clean = "".join(c for c in clean if c.isprintable())
    clean = clean.replace('"', "").replace("'", "").replace("\\", "")

    for word, safe in SAFE_WORD_MAP.items():
        clean = re.sub(rf"\b{word}\b", safe, clean, flags=re.IGNORECASE)

    if len(clean) > 1000:
        clean = clean[:1000]

    if not clean:
        clean = "sunset over mountains"

    return clean


def generate_with_pollinations(prompt):
    """Fallback: Pollinations with retries."""
    for attempt in range(3):
        try:
            encoded = requests.utils.quote(prompt)
            seed = int(time.time() * 1000) % 1000000
            url = f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&nologo=true&seed={seed}"

            print(f"🌐 Pollinations attempt {attempt+1}: {url[:130]}")

            res = requests.get(url, timeout=120, allow_redirects=True)

            print(f"   Status: {res.status_code}, Size: {len(res.content)} bytes")

            if res.status_code == 200 and len(res.content) > 1000:
                b64 = base64.b64encode(res.content).decode("utf-8")
                print(f"✅ Pollinations success ({len(b64)} bytes)")
                return f"data:image/png;base64,{b64}"
            else:
                print(f"   ⚠️ Bad response")
                time.sleep(2)
        except Exception as e:
            print(f"❌ Pollinations attempt {attempt+1} error: {str(e)[:150]}")
            time.sleep(2)

    return None


@app.post("/generate-image")
def generate_image(request: ImageRequest):
    try:
        clean = sanitize_prompt(request.prompt or "")
        print(f"🎨 Clean prompt: {clean}")

        cf_error = None

        if cf_account_id and cf_api_token:
            try:
                url = f"https://api.cloudflare.com/client/v4/accounts/{cf_account_id}/ai/run/@cf/black-forest-labs/flux-1-schnell"

                body = {
                    "prompt": clean + ", digital art",
                    "steps": 4,
                }

                response = requests.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {cf_api_token}",
                        "Content-Type": "application/json",
                    },
                    json=body,
                    timeout=60,
                )

                print(f"☁️ Cloudflare status: {response.status_code}")

                if response.status_code == 200:
                    ct = response.headers.get("content-type", "")

                    if "image" in ct:
                        b64 = base64.b64encode(response.content).decode("utf-8")
                        print(f"✅ Cloudflare success ({len(b64)} bytes)")
                        return {"image": f"data:image/png;base64,{b64}"}

                    try:
                        data = response.json()
                        if data.get("success") and isinstance(data.get("result"), dict) and "image" in data["result"]:
                            print(f"✅ Cloudflare JSON success")
                            return {"image": f"data:image/png;base64,{data['result']['image']}"}
                    except Exception:
                        pass

                    b64 = base64.b64encode(response.content).decode("utf-8")
                    return {"image": f"data:image/png;base64,{b64}"}
                else:
                    cf_error = response.text[:200]
                    print(f"⚠️ Cloudflare failed: {cf_error}")
            except Exception as e:
                cf_error = str(e)[:200]
                print(f"⚠️ Cloudflare exception: {cf_error}")

        # Pollinations Fallback
        print("🔄 Switching to Pollinations fallback...")
        poll_result = generate_with_pollinations(clean)

        if poll_result:
            return {"image": poll_result}

        return {"error": f"Dono services fail. Cloudflare: {cf_error or 'skipped'}"}

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ Image gen error: {str(e)[:200]}")
        return {"error": str(e)[:200]}


# ===== SERVE FRONTEND AT ROOT =====
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)
FRONTEND_DIR = os.path.join(PARENT_DIR, "frontend")

print(f"🔍 Looking for frontend at: {FRONTEND_DIR}")
print(f"🔍 Exists: {os.path.isdir(FRONTEND_DIR)}")

if os.path.isdir(FRONTEND_DIR):
    @app.get("/")
    def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")
    print(f"✅ Frontend mounted at /")
else:
    @app.get("/")
    def no_frontend():
        return {"error": "Frontend folder not found", "expected_path": FRONTEND_DIR}