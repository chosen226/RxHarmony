import streamlit as st
import requests

# Load RxHarmony Logo (Ensure it's inside the "assets" folder)
st.image("assets/rxharmony_logo.png", width=150)

# App Title
st.title("RxHarmony - Your Personal Medication Assistant")

# Session State Initialization
if "logged_in" not in st.session_state:
    st.session_state["logged_in"] = False
if "username" not in st.session_state:
    st.session_state["username"] = ""

# Login/Register Section
st.subheader("Login to Your Account")
username = st.text_input("Username")
password = st.text_input("Password", type="password")
login_button = st.button("Login")

if login_button:
    response = requests.post("http://127.0.0.1:8000/login/", json={"username": username, "password": password})
    if response.status_code == 200:
        st.session_state["logged_in"] = True
        st.session_state["username"] = username
        st.success("Login Successful!")
    else:
        st.error("Invalid username or password")

# Show Main App Only After Login
if st.session_state["logged_in"]:
    # Sidebar Navigation
    st.sidebar.title("Navigation")
    menu_option = st.sidebar.radio("Go to", ["Profile", "Medications", "Drug Interactions", "Symptom Checker"])

    # **1. Profile Page (Users enter medical details)**
    if menu_option == "Profile":
        st.subheader("Your Patient Profile")
        st.write("Enter your medical details below:")

        name = st.text_input("Full Name")
        dob = st.date_input("Date of Birth")
        allergies = st.text_area("Allergies (Separate with commas)")
        medications = st.text_area("Medications (Prescriptions, OTC, Supplements - Separate with commas)")
        conditions = st.text_area("Medical Conditions (Separate with commas)")
        save_button = st.button("Save Profile")

        if save_button:
            profile_data = {
                "username": st.session_state["username"],
                "name": name,
                "dob": str(dob),
                "allergies": allergies.split(","),
                "medications": medications.split(","),
                "conditions": conditions.split(","),
            }
            profile_response = requests.post("http://127.0.0.1:8000/save-profile/", json=profile_data)
            if profile_response.status_code == 200:
                st.success("Profile saved successfully!")
            else:
                st.error("Error saving profile. Try again.")

    # **2. Medications Page**
    elif menu_option == "Medications":
        st.subheader("Your Medications")
        st.write("Feature to track your medications will be added soon!")

    # **3. Drug Interactions Checker**
    elif menu_option == "Drug Interactions":
        st.subheader("Check Drug Interactions")
        st.write("Feature to check for interactions will be added soon!")

    # **4. Symptom Checker**
    elif menu_option == "Symptom Checker":
        st.subheader("Symptom Checker")
        st.write("Enter symptoms to receive OTC recommendations (Coming Soon!)")

    # Logout Button
    if st.sidebar.button("Logout"):
        st.session_state["logged_in"] = False
        st.session_state["username"] = ""
        st.experimental_rerun()
