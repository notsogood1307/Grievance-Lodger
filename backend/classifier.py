import os
import json
import logging
from groq import Groq

# Mock Departments (Assuming some UUIDs exist, but we will return department names/tags for MVP)
DEPARTMENTS = [
    "Water & Sanitation",
    "Public Works & Roads",
    "Power & Electricity",
    "Public Health",
    "Law Enforcement",
    "General Administration"
]

client = None
try:
    groq_api_key = os.environ.get("GROQ_API_KEY")
    if groq_api_key:
        client = Groq(api_key=groq_api_key)
    else:
        logging.warning("GROQ_API_KEY not found in environment.")
except Exception as e:
    logging.warning(f"Failed to initialize Groq client: {e}")

def classify_grievance(text: str, image_url: str = None) -> dict:
    """
    Classifies the grievance text and determines urgency and departments using Groq LLM.
    Fallback to simple rules if Groq API key is missing or request fails.
    """
    if client:
        try:
            prompt = f"""
Analyze the following citizen grievance and classify it.
Allowed Departments: {', '.join(DEPARTMENTS)}

Grievance: "{text}"

Respond ONLY with a valid JSON object matching this schema:
{{
  "category": "String (Short summary category, e.g. 'Roads & Infrastructure')",
  "departments": ["String (Select 1 or 2 matching departments from the allowed list)"],
  "confidence": "Float (between 0.0 and 1.0)",
  "urgency_score": "Integer (1 to 10, where 10 is immediate emergency)"
}}
"""
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that routes citizen grievances to government departments. Always output ONLY valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                model="llama3-8b-8192",
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            
            result = json.loads(chat_completion.choices[0].message.content)
            return {
                "category": result.get("category", "General"),
                "departments": result.get("departments", ["General Administration"]),
                "confidence": float(result.get("confidence", 0.8)),
                "urgency_score": int(result.get("urgency_score", 1))
            }
        except Exception as e:
            logging.error(f"Groq API failed, falling back to rule-based: {e}")
            
    # Fallback Rule-Based (if Groq isn't configured or fails)
    text_lower = text.lower()
    category = "General"
    departments = []
    urgency_score = 1
    
    if any(word in text_lower for word in ["water", "leak", "pipe", "drain"]):
        category, deps = "Water Supply & Sanitation", ["Water & Sanitation"]
        departments.extend(deps)
    if any(word in text_lower for word in ["road", "pothole", "street"]):
        category, deps = "Roads & Infrastructure", ["Public Works & Roads"]
        departments.extend(deps)
    
    if not departments:
        departments.append("General Administration")
        
    if any(word in text_lower for word in ["emergency", "accident", "live wire", "gas leak"]):
        urgency_score = 9
    elif any(word in text_lower for word in ["broken", "block", "power cut"]):
        urgency_score = 5

    return {
        "category": category,
        "departments": list(set(departments)),
        "confidence": 0.5,
        "urgency_score": urgency_score
    }
