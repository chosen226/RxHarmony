from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import sqlite3
import bcrypt

app = FastAPI()

# Connect to Database
conn = sqlite3.connect("rxharmony.db", check_same_thread=False)
cursor = conn.cursor()

# Create Users & Patients Tables (if they don't exist)
cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    name TEXT,
    dob TEXT,
    allergies TEXT,
    medications TEXT,
    conditions TEXT
)
""")
conn.commit()

# User Registration Model
class UserRegister(BaseModel):
    username: str
    password: str

# Patient Profile Model
class PatientProfile(BaseModel):
    username: str
    name: str
    dob: str
    allergies: List[str]
    medications: List[str]
    conditions: List[str]

# Register New User
@app.post("/register/")
def register_user(user: UserRegister):
    hashed_pw = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt()).decode()
    try:
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (user.username, hashed_pw))
        conn.commit()
        return {"message": "User registered successfully"}
    except:
        raise HTTPException(status_code=400, detail="Username already exists")

# User Login
@app.post("/login/")
def login_user(user: UserRegister):
    cursor.execute("SELECT password FROM users WHERE username = ?", (user.username,))
    result = cursor.fetchone()
    if result and bcrypt.checkpw(user.password.encode(), result[0].encode()):
        return {"message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid credentials")

# Save Patient Profile
@app.post("/save-profile/")
def save_profile(profile: PatientProfile):
    cursor.execute("INSERT OR REPLACE INTO patients (username, name, dob, allergies, medications, conditions) VALUES (?, ?, ?, ?, ?, ?)",
                   (profile.username, profile.name, profile.dob, ", ".join(profile.allergies),
                    ", ".join(profile.medications), ", ".join(profile.conditions)))
    conn.commit()
    return {"message": "Profile saved successfully!"}
