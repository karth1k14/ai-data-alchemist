from fastapi import FastAPI, Request, Body, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from typing import List, Dict
import pandas as pd
import openai
import os

app = FastAPI()

# Basic Auth (Username: admin, Password: password123)
security = HTTPBasic()
def verify_user(credentials: HTTPBasicCredentials = Depends(security)):
    if credentials.username != "admin" or credentials.password != "password123":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

# CORS (Allow frontend requests)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment (Make sure this is set: OPENAI_API_KEY)
openai.api_key = os.getenv("OPENAI_API_KEY")

class UploadData(BaseModel):
    data: List[Dict]

class RuleInput(BaseModel):
    rules: List[Dict]

@app.post("/api/upload")
async def upload(data: UploadData, credentials: HTTPBasicCredentials = Depends(verify_user)):
    df = pd.DataFrame(data.data)
    df.columns = map_headers_ai(df.columns)
    errors = validate_data(df)
    return {"status": "ok", "errors": errors}

@app.post("/api/update")
async def update(row: Dict, credentials: HTTPBasicCredentials = Depends(verify_user)):
    # Optional: Revalidate updated row
    return {"status": "row updated"}

@app.post("/api/rules")
async def save_rules(rule_input: RuleInput, credentials: HTTPBasicCredentials = Depends(verify_user)):
    with open("rules.json", "w") as f:
        f.write(str(rule_input.rules))
    return {"status": "rules saved"}

@app.post("/api/query")
async def query(query: str = Body(...), data: List[Dict] = Body(...), credentials: HTTPBasicCredentials = Depends(verify_user)):
    prompt = f"""
You are a data filter generator. Given this data schema:
- Tasks with fields TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases, MaxConcurrent

And this user query: "{query}"
Generate a Python boolean expression string usable in pandas DataFrame.query() to filter the tasks.
Only return the expression itself without any explanations.
    """
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    filter_expr = response.choices[0].message["content"].strip()
    try:
        df = pd.DataFrame(data)
        filtered_df = df.query(filter_expr)
        return {"filtered_data": filtered_df.to_dict(orient="records")}
    except Exception as e:
        return {"error": f"Could not apply filter: {e}"}

# Helpers

def map_headers_ai(headers):
    mapping = {
        "Client Id": "ClientID",
        "client_name": "ClientName",
        "Task id": "TaskID",
    }
    return [mapping.get(h.strip(), h.strip()) for h in headers]

def validate_data(df):
    errors = []
    if "ClientID" in df.columns and df.duplicated(subset=["ClientID"]).any():
        errors.append("Duplicate ClientIDs found")
    if "PriorityLevel" in df.columns and (df["PriorityLevel"].astype(int) < 1).any():
        errors.append("PriorityLevel should be >= 1")
    # Add more checks from your milestone list
    return errors
