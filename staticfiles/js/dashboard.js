let trackingData = {};
let medications = []; // This will be populated via AJAX

// Set today's date as default
document.addEventListener("DOMContentLoaded", function () {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("trackingDate").value = today;

  // Fetch medications from the server
  fetchMedications();

  // Add event listeners
  document
    .getElementById("addMedicationForm")
    .addEventListener("submit", addMedication);
  document
    .getElementById("trackingDate")
    .addEventListener("change", loadDailyTracking);
  document
    .getElementById("saveTracking")
    .addEventListener("click", saveTracking);
});

// Fetch medications from the server
// Fetch medications from the server
function fetchMedications() {
  fetch("/medication/api/medications/")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      // Make sure we're using the medications array from the response
      medications = data.medications; // This is the key change

      // Debug output to console
      console.log("Received medications data:", medications);

      if (!Array.isArray(medications)) {
        console.error("medications is not an array:", medications);
        medications = []; // Fallback to empty array to prevent errors
      }

      loadMedications();
      loadDailyTracking();
    })
    .catch((error) => {
      console.error("Error fetching medications:", error);
      document.getElementById(
        "medicationsList"
      ).innerHTML = `<div class="alert alert-danger">Error loading medications: ${error.message}</div>`;
    });
}
// Load medications into the manage tab
function loadMedications() {
  const medicationsList = document.getElementById("medicationsList");
  medicationsList.innerHTML = "";

  if (medications.length === 0) {
    medicationsList.innerHTML = "<p>No medications added yet.</p>";
    return;
  }

  medications.forEach((med) => {
    const template = document.getElementById("medicationItemTemplate");
    const clone = template.content.cloneNode(true);

    clone.querySelector(".medication-name").textContent = med.name;
    clone.querySelector(".description").textContent =
      med.description || "No description";
    clone.querySelector(".refill-date").textContent =
      med.refill_date || "Not set";
    clone.querySelector(".frequency").textContent = med.frequency_per_day;
    clone.querySelector(".tablets").textContent = med.tablets_per_dose;

    // Set form fields for editing
    clone.querySelector(".edit-name").value = med.name;
    clone.querySelector(".edit-refill").value = med.refill_date || "";
    clone.querySelector(".edit-frequency").value = med.frequency_per_day;
    clone.querySelector(".edit-tablets").value = med.tablets_per_dose;
    clone.querySelector(".edit-description").value = med.description || "";

    // Set data attribute for medication ID
    const card = clone.querySelector(".medication-card");
    card.dataset.id = med.id;

    // Add event listeners for edit/delete
    card.querySelector(".edit-med").addEventListener("click", function () {
      toggleEditMode(card);
    });

    card.querySelector(".delete-med").addEventListener("click", function () {
      deleteMedication(med.id);
    });

    card.querySelector(".cancel-edit").addEventListener("click", function () {
      toggleEditMode(card);
    });

    card
      .querySelector(".edit-medication-form")
      .addEventListener("submit", function (e) {
        e.preventDefault();
        saveMedicationChanges(card);
      });

    medicationsList.appendChild(clone);
  });
}
function saveMedicationChanges(card) {
  const medId = parseInt(card.dataset.id);

  const updatedMed = {
    id: medId,
    name: card.querySelector(".edit-name").value,
    description: card.querySelector(".edit-description").value,
    refill_date: card.querySelector(".edit-refill").value,
    frequency_per_day: parseInt(card.querySelector(".edit-frequency").value),
    tablets_per_dose: parseFloat(card.querySelector(".edit-tablets").value),
    remaining_tablets: parseFloat(
      card.querySelector(".edit-remaining-tablets").value
    ),
  };

  // Send the updated medication to the server
  fetch(`/medication/api/medications/${medId}/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrfToken(),
    },
    body: JSON.stringify(updatedMed),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      // After successful update, refresh the medications
      fetchMedications();
      toggleEditMode(card);
    })
    .catch((error) => {
      console.error("Error updating medication:", error);
      alert(`Error updating medication: ${error.message}`);
    });
}

// Load daily tracking tab
// Load daily tracking tab
// Load daily tracking tab
function loadDailyTracking() {
  const dailyList = document.getElementById("dailyTrackingList");
  dailyList.innerHTML = "";

  if (medications.length === 0) {
    dailyList.innerHTML = "<p>No medications to track.</p>";
    return;
  }

  const selectedDate = document.getElementById("trackingDate").value;

  // Fetch tracking data for the selected date if available
  fetchTrackingData(selectedDate)
    .then(() => {
      // Initialize tracking data for this date if it doesn't exist
      if (!trackingData[selectedDate]) {
        trackingData[selectedDate] = {};
      }

      medications.forEach((med) => {
        // Initialize tracking data for this medication if it doesn't exist
        if (!trackingData[selectedDate][med.id]) {
          trackingData[selectedDate][med.id] = Array(
            med.frequency_per_day
          ).fill(false);
        }

        // Make sure the array has the correct length
        if (
          trackingData[selectedDate][med.id].length !== med.frequency_per_day
        ) {
          // If medication frequency has changed, resize the array
          const oldData = trackingData[selectedDate][med.id];
          trackingData[selectedDate][med.id] = Array(
            med.frequency_per_day
          ).fill(false);

          // Preserve existing data as much as possible
          for (
            let i = 0;
            i < Math.min(oldData.length, med.frequency_per_day);
            i++
          ) {
            trackingData[selectedDate][med.id][i] = oldData[i];
          }
        }

        const template = document.getElementById("dailyTrackingTemplate");
        const clone = template.content.cloneNode(true);

        clone.querySelector(".tracking-name").textContent = med.name;
        clone.querySelector(".tracking-tablets").textContent =
          med.tablets_per_dose;

        const card = clone.querySelector(".medication-card");
        card.dataset.id = med.id;

        const checkboxContainer = clone.querySelector(".checkbox-container");

        // Create checkboxes based on frequency
        for (let i = 0; i < med.frequency_per_day; i++) {
          const checkItem = document.createElement("div");
          checkItem.className = "check-item";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.id = `med-${med.id}-dose-${i}`;
          checkbox.checked = trackingData[selectedDate][med.id][i];
          checkbox.addEventListener("change", function () {
            trackingData[selectedDate][med.id][i] = this.checked;
          });

          const label = document.createElement("label");
          label.htmlFor = `med-${med.id}-dose-${i}`;
          label.textContent = getDoseLabel(i);

          checkItem.appendChild(checkbox);
          checkItem.appendChild(label);
          checkboxContainer.appendChild(checkItem);
        }

        dailyList.appendChild(clone);
      });
    })
    .catch((error) => {
      console.error("Error loading tracking data:", error);
      dailyList.innerHTML = `<div class="alert alert-danger">Error loading tracking data: ${error.message}</div>`;
    });
}

// Fetch tracking data for a specific date
function fetchTrackingData(date) {
  return fetch(`/medication/api/tracking/${date}/`)
    .then((response) => {
      if (!response.ok) {
        // If 404, it just means no data yet for this date, which is fine
        if (response.status === 404) {
          return { tracking: {} };
        }
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (data && data.tracking) {
        trackingData[date] = data.tracking;
      } else {
        // Initialize empty tracking data if none exists
        trackingData[date] = {};
      }
    })
    .catch((error) => {
      // Just log the error and continue with empty tracking data
      console.error("Error fetching tracking data:", error);
      trackingData[date] = {};
    });
} // Helper function to get dose label
function getDoseLabel(index) {
  const labels = ["Morning", "Noon", "Evening", "Night"];
  return index < labels.length ? labels[index] : `Dose ${index + 1}`;
}

// Add a new medication
function addMedication(e) {
  e.preventDefault();

  const newMed = {
    name: document.getElementById("medName").value,
    description: document.getElementById("description").value,
    refill_date: document.getElementById("refillDate").value,
    frequency_per_day: parseInt(document.getElementById("frequency").value),
    tablets_per_dose: parseFloat(document.getElementById("tablets").value),
    remaining_tablets: 30, // Always start with 30 tablets
  };

  // Send the new medication to the server
  fetch("/medication/api/medications/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrfToken(),
    },
    body: JSON.stringify(newMed),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      // Reset form
      document.getElementById("addMedicationForm").reset();

      // Refresh medications list
      fetchMedications();
    })
    .catch((error) => {
      console.error("Error adding medication:", error);
      alert(`Error adding medication: ${error.message}`);
    });
}
// Save changes to a medication
function loadMedications() {
  const medicationsList = document.getElementById("medicationsList");
  medicationsList.innerHTML = "";

  if (medications.length === 0) {
    medicationsList.innerHTML = "<p>No medications added yet.</p>";
    return;
  }

  medications.forEach((med) => {
    const template = document.getElementById("medicationItemTemplate");
    const clone = template.content.cloneNode(true);

    clone.querySelector(".medication-name").textContent = med.name;
    clone.querySelector(".description").textContent =
      med.description || "No description";
    clone.querySelector(".refill-date").textContent =
      med.refill_date || "Not set";
    clone.querySelector(".frequency").textContent = med.frequency_per_day;
    clone.querySelector(".tablets").textContent = med.tablets_per_dose;

    // Add remaining tablets display
    if (clone.querySelector(".remaining-count")) {
      clone.querySelector(
        ".remaining-count"
      ).textContent = `${med.remaining_tablets} of 30 tablets`;
    }

    // Update progress bar width based on remaining percentage
    if (clone.querySelector(".remaining-bar")) {
      const percentage = (med.remaining_tablets / 30) * 100;
      clone.querySelector(".remaining-bar").style.width = `${percentage}%`;

      // Change color based on percentage (red < 20%, yellow < 50%, blue otherwise)
      let barColor = "bg-primary"; // Default blue
      if (percentage < 20) {
        barColor = "bg-danger"; // Red for low
      } else if (percentage < 50) {
        barColor = "bg-warning"; // Yellow for medium
      }

      clone.querySelector(".remaining-bar").className = clone
        .querySelector(".remaining-bar")
        .className.replace(/bg-\w+/, barColor);
    }

    // Set form fields for editing
    clone.querySelector(".edit-name").value = med.name;
    clone.querySelector(".edit-refill").value = med.refill_date || "";
    clone.querySelector(".edit-frequency").value = med.frequency_per_day;
    clone.querySelector(".edit-tablets").value = med.tablets_per_dose;
    clone.querySelector(".edit-description").value = med.description || "";

    // Set remaining tablets field
    if (clone.querySelector(".edit-remaining-tablets")) {
      clone.querySelector(".edit-remaining-tablets").value =
        med.remaining_tablets;
    }

    // Set data attribute for medication ID
    const card = clone.querySelector(".medication-card");
    card.dataset.id = med.id;

    // Add event listeners for edit/delete
    card.querySelector(".edit-med").addEventListener("click", function () {
      toggleEditMode(card);
    });

    card.querySelector(".delete-med").addEventListener("click", function () {
      deleteMedication(med.id);
    });

    card.querySelector(".cancel-edit").addEventListener("click", function () {
      toggleEditMode(card);
    });

    card
      .querySelector(".edit-medication-form")
      .addEventListener("submit", function (e) {
        e.preventDefault();
        saveMedicationChanges(card);
      });

    medicationsList.appendChild(clone);
  });
}

// Delete a medication
function deleteMedication(medId) {
  if (confirm("Are you sure you want to delete this medication?")) {
    fetch(`/medication/api/medications/${medId}/`, {
      method: "DELETE",
      headers: {
        "X-CSRFToken": getCsrfToken(),
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        // After successful deletion, refresh the medications
        fetchMedications();
      })
      .catch((error) => {
        console.error("Error deleting medication:", error);
        alert(`Error deleting medication: ${error.message}`);
      });
  }
}

// Save tracking data
function saveTracking() {
  const selectedDate = document.getElementById("trackingDate").value;

  fetch(`/medication/api/tracking/${selectedDate}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrfToken(),
    },
    body: JSON.stringify({
      tracking: trackingData[selectedDate],
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      alert("Tracking data saved successfully!");
      // Refresh medications to update the tablet count display
      fetchMedications();
    })
    .catch((error) => {
      console.error("Error saving tracking data:", error);
      alert(`Error saving tracking data: ${error.message}`);
    });
}

// Helper function to get CSRF token from cookies
function getCsrfToken() {
  const cookieValue = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="));

  if (cookieValue) {
    return cookieValue.split("=")[1];
  }

  // If no CSRF token in cookies, look for it in a meta tag
  const csrfInput = document.querySelector('meta[name="csrf-token"]');
  if (csrfInput) {
    return csrfInput.getAttribute("content");
  }

  return "";
}
