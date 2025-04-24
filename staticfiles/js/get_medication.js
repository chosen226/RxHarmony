// Global variables
let userProfile = {};
let userMedications = [];
let userConditions = [];

// Utility functions
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function showMessage(message, type = "info") {
  const messageContainer = document.getElementById("messageContainer");
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");
  messageElement.classList.add(type);
  messageElement.textContent = message;

  messageContainer.appendChild(messageElement);

  // Remove message after 4 seconds
  setTimeout(() => {
    messageElement.remove();
  }, 4000);
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return "Unknown";

  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }

  return age;
}

function formatGender(genderCode) {
  if (!genderCode) return "Not specified";

  switch (genderCode) {
    case "M":
      return "Male";
    case "F":
      return "Female";
    case "O":
      return "Other";
    case "N":
      return "Prefer not to say";
    default:
      return genderCode;
  }
}

// Main document ready handler
document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const medicationsList = document.getElementById("medicationsList");
  const allergiesContainer = document.getElementById("allergiesContainer");
  const conditionsList = document.getElementById("conditionsList");
  const ageDisplay = document.getElementById("ageDisplay");
  const genderDisplay = document.getElementById("genderDisplay");
  const bloodTypeDisplay = document.getElementById("bloodTypeDisplay");
  const currentAilment = document.getElementById("currentAilment");
  const getDiagnosisBtn = document.getElementById("getDiagnosisBtn");
  const diagnosisResultCard = document.getElementById("diagnosisResultCard");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const diagnosisContent = document.getElementById("diagnosisContent");

  // Load user health information
  loadUserProfile();
  loadMedications();

  // Get diagnosis button click handler
  getDiagnosisBtn.addEventListener("click", function () {
    const ailmentText = currentAilment.value.trim();

    if (!ailmentText) {
      showMessage("Please describe your ailment", "error");
      return;
    }

    // Show the diagnosis card and loading indicator
    diagnosisResultCard.style.display = "block";
    loadingIndicator.style.display = "flex";
    diagnosisContent.style.display = "none";
    diagnosisContent.innerHTML = "";

    // Scroll to the diagnosis card
    diagnosisResultCard.scrollIntoView({ behavior: "smooth" });

    // Get AI diagnosis
    getAIDiagnosis(ailmentText);
  });

  // Function to load user profile
  function loadUserProfile() {
    fetch("/api/profile/")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        userProfile = data;

        // Update personal details
        ageDisplay.textContent = calculateAge(data.date_of_birth);
        genderDisplay.textContent = formatGender(data.gender);
        bloodTypeDisplay.textContent = data.blood_type || "Not specified";

        // Update allergies
        if (data.allergies && data.allergies.trim()) {
          allergiesContainer.innerHTML = `<p>${data.allergies}</p>`;
        } else {
          allergiesContainer.innerHTML = `<p class="empty-state">No allergies recorded</p>`;
        }

        // Update conditions if included in the API response
        if (data.conditions && Array.isArray(data.conditions)) {
          updateConditionsList(data.conditions);
        } else {
          // Otherwise fetch conditions separately
          loadConditions();
        }
      })
      .catch((error) => {
        console.error("Error loading profile:", error);
        ageDisplay.textContent = "Unknown";
        genderDisplay.textContent = "Unknown";
        bloodTypeDisplay.textContent = "Unknown";
        allergiesContainer.innerHTML = `<p class="empty-state">Unable to load allergies</p>`;

        // Try to load conditions separately anyway
        loadConditions();
      });
  }

  // Function to load conditions separately if needed
  function loadConditions() {
    // Check if we need to make a separate API call for conditions
    // or if your API structure has them elsewhere

    // For now, let's assume we need to handle empty conditions
    conditionsList.innerHTML =
      '<li class="empty-state">No medical conditions recorded</li>';

    // You would add actual fetch code here if needed for your API structure
  }

  // Function to update conditions list
  function updateConditionsList(conditions) {
    conditionsList.innerHTML = "";
    userConditions = [];

    if (conditions.length > 0) {
      conditions.forEach((condition) => {
        // Extract the condition name whether it's an object or string
        const conditionName =
          typeof condition === "object" ? condition.name : condition;

        const li = document.createElement("li");
        li.textContent = conditionName;
        conditionsList.appendChild(li);

        userConditions.push(conditionName);
      });
    } else {
      conditionsList.innerHTML =
        '<li class="empty-state">No medical conditions recorded</li>';
    }
  }

  // Function to load medications
  function loadMedications() {
    fetch("/medication/api/medications/")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        medicationsList.innerHTML = "";
        userMedications = [];

        if (data.medications && data.medications.length > 0) {
          data.medications.forEach((med) => {
            const li = document.createElement("li");
            li.textContent = med.name;
            medicationsList.appendChild(li);

            userMedications.push(med.name);
          });
        } else {
          medicationsList.innerHTML =
            '<li class="empty-state">No medications recorded</li>';
        }
      })
      .catch((error) => {
        console.error("Error loading medications:", error);
        medicationsList.innerHTML =
          '<li class="empty-state">Unable to load medications</li>';
      });
  }

  // Function to get AI diagnosis
  function getAIDiagnosis(ailmentText) {
    // Prepare data for OpenAI API
    const promptData = {
      ailment: ailmentText,
      age: calculateAge(userProfile.date_of_birth),
      gender: formatGender(userProfile.gender),
      allergies: userProfile.allergies || "None",
      medications:
        userMedications.length > 0 ? userMedications.join(", ") : "None",
      conditions:
        userConditions.length > 0 ? userConditions.join(", ") : "None",
      blood_type: userProfile.blood_type || "Unknown",
    };

    // Make request to your Django backend, which will forward to OpenAI
    fetch("/medication/api/get-otc-recommendation/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify(promptData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        // Hide loading indicator
        loadingIndicator.style.display = "none";
        diagnosisContent.style.display = "block";

        // Display the AI recommendation
        if (data.recommendation) {
          diagnosisContent.innerHTML = data.recommendation.replace(
            /\n/g,
            "<br>"
          );
        } else {
          diagnosisContent.innerHTML =
            '<p class="error">Unable to generate a recommendation. Please consult with a healthcare professional.</p>';
        }

        // Add disclaimer
        const disclaimer = document.createElement("div");
        disclaimer.classList.add("disclaimer");
        disclaimer.innerHTML = `
                        <hr>
                        <p><strong>Disclaimer:</strong> This is an AI-generated suggestion and should not replace professional medical advice. 
                        If your symptoms are severe or persistent, please consult with a healthcare provider.</p>
                    `;
        diagnosisContent.appendChild(disclaimer);
      })
      .catch((error) => {
        console.error("Error getting AI diagnosis:", error);

        // Hide loading indicator
        loadingIndicator.style.display = "none";
        diagnosisContent.style.display = "block";

        // Show error message
        diagnosisContent.innerHTML = `
                        <p class="error">Sorry, we encountered an error while generating your recommendation. 
                        Please try again later or consult with a healthcare professional.</p>
                        <p class="error-details">Error: ${error.message}</p>
                    `;
      });
  }
});
