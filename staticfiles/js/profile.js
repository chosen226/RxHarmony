// Global Variables
let trackingData = {};
let medications = [];
let currentRefillIndex = 0;

// ===== INITIALIZATION FUNCTIONS =====
document.addEventListener("DOMContentLoaded", function () {
  // Initialize navigation buttons
  document.getElementById("prevRefill").addEventListener("click", function () {
    navigateRefills(-1);
  });

  document.getElementById("nextRefill").addEventListener("click", function () {
    navigateRefills(1);
  });

  document.getElementById("prevMonth").addEventListener("click", function () {
    navigateMonth(-1);
  });

  document.getElementById("nextMonth").addEventListener("click", function () {
    navigateMonth(1);
  });

  // Initialize toggles for allergies and conditions
  const allergiesToggle = document.getElementById("allergiesToggle");
  const allergiesMenu = document.getElementById("allergiesMenu");
  const conditionsToggle = document.getElementById("conditionsToggle");
  const conditionsMenu = document.getElementById("conditionsMenu");

  allergiesToggle.addEventListener("click", function () {
    allergiesMenu.classList.toggle("show");
    allergiesToggle.classList.toggle("active");
  });

  conditionsToggle.addEventListener("click", function () {
    conditionsMenu.classList.toggle("show");
    conditionsToggle.classList.toggle("active");
  });

  // Initialize add medication form toggle
  const addMedicationBtn = document.getElementById("addMedicationBtn");
  const addMedicationForm = document.getElementById("addMedicationForm");
  const cancelAddMed = document.getElementById("cancelAddMed");

  addMedicationBtn.addEventListener("click", function () {
    addMedicationForm.classList.add("show");
  });

  cancelAddMed.addEventListener("click", function () {
    addMedicationForm.classList.remove("show");
    document.getElementById("newMedicationForm").reset();
  });

  // Set default date to today
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("trackingDate").value = today;

  // Initialize all components
  initCalendar();
  fetchMedications();

  // Add event listeners for forms
  document
    .getElementById("newMedicationForm")
    .addEventListener("submit", addMedication);
  document
    .getElementById("trackingDate")
    .addEventListener("change", loadDailyTracking);
  document
    .getElementById("saveTracking")
    .addEventListener("click", saveTracking);
});

// ===== CALENDAR FUNCTIONS =====
function initCalendar() {
  const currentDate = new Date();
  renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
}

function renderCalendar(year, month) {
  const currentMonthText = document.getElementById("currentMonth");
  const calendarBody = document.getElementById("calendarBody");

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  currentMonthText.textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  calendarBody.innerHTML = "";

  let date = 1;
  for (let i = 0; i < 6; i++) {
    const row = document.createElement("tr");

    for (let j = 0; j < 7; j++) {
      const cell = document.createElement("td");

      if (i === 0 && j < firstDay) {
        cell.textContent = "";
      } else if (date > daysInMonth) {
        break;
      } else {
        cell.textContent = date;

        if (
          date === currentDay &&
          month === currentMonth &&
          year === currentYear
        ) {
          cell.classList.add("today");
        }

        const currentDate = new Date(year, month, date);
        const isRefillDate = medications.some((med) => {
          if (med.refill_date) {
            const refillDate = new Date(med.refill_date);
            return (
              refillDate.getFullYear() === year &&
              refillDate.getMonth() === month &&
              refillDate.getDate() === date
            );
          }
          return false;
        });

        if (isRefillDate) {
          cell.classList.add("has-med");
        }

        date++;
      }

      row.appendChild(cell);
    }

    calendarBody.appendChild(row);

    if (date > daysInMonth) {
      break;
    }
  }

  updateUpcomingRefills(year, month);
}

function navigateMonth(direction) {
  const currentMonthText = document.getElementById("currentMonth").textContent;
  const [monthName, year] = currentMonthText.split(" ");

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  let monthIndex = monthNames.indexOf(monthName);
  let newYear = parseInt(year);

  monthIndex += direction;

  if (monthIndex < 0) {
    monthIndex = 11;
    newYear--;
  } else if (monthIndex > 11) {
    monthIndex = 0;
    newYear++;
  }

  renderCalendar(newYear, monthIndex);
}

// ===== REFILL FUNCTIONS =====
function updateUpcomingRefills(year, month) {
  const refillsList = document.getElementById("upcomingRefills");
  refillsList.innerHTML = "";

  // Calculate refill dates based on usage rate
  const upcomingRefills = [];
  const today = new Date();
  const tenDaysLater = new Date(today);
  tenDaysLater.setDate(today.getDate() + 15);

  if (medications.length > 0) {
    medications.forEach((med) => {
      // Calculate days until medication runs out
      const dailyUsage = med.frequency_per_day * med.tablets_per_dose;
      const daysRemaining = Math.floor(med.remaining_tablets / dailyUsage);

      // Calculate the date when medication will run out
      const runOutDate = new Date(today);
      runOutDate.setDate(today.getDate() + daysRemaining);

      // If it will run out in the next 10 days, add to upcoming refills
      if (runOutDate <= tenDaysLater) {
        upcomingRefills.push({
          date: runOutDate,
          name: med.name,
          daysLeft: daysRemaining,
        });
      }

      // Also add medications with explicitly set refill dates in the next 10 days
      if (med.refill_date) {
        const refillDate = new Date(med.refill_date);
        if (
          refillDate >= today &&
          refillDate <= tenDaysLater &&
          !upcomingRefills.some((refill) => refill.name === med.name)
        ) {
          upcomingRefills.push({
            date: refillDate,
            name: med.name,
            daysLeft: daysRemaining,
            isScheduled: true,
          });
        }
      }
    });
  }

  // Sort refills by date (earliest first)
  upcomingRefills.sort((a, b) => a.date - b.date);

  // Reset current index if it's out of bounds
  if (currentRefillIndex >= upcomingRefills.length) {
    currentRefillIndex = 0;
  }

  if (upcomingRefills.length === 0) {
    const emptyItem = document.createElement("div");
    emptyItem.className = "no-refills";
    emptyItem.textContent = "No upcoming refills needed";
    refillsList.appendChild(emptyItem);

    // Disable navigation buttons
    document.getElementById("prevRefill").disabled = true;
    document.getElementById("nextRefill").disabled = true;
  } else {
    // Create all refill items
    upcomingRefills.forEach((refill) => {
      const item = document.createElement("div");
      item.className = "refill-item";

      const dateSpan = document.createElement("div");
      dateSpan.className = "refill-date";

      if (refill.isScheduled) {
        dateSpan.textContent = `Scheduled: ${refill.date.toLocaleDateString()}`;
      } else {
        dateSpan.textContent = `Runs out: ${refill.date.toLocaleDateString()}`;
      }

      const medSpan = document.createElement("div");
      medSpan.className = "refill-med";
      medSpan.textContent = refill.name;

      const daysLeftSpan = document.createElement("div");
      daysLeftSpan.className = "refill-days-left";

      if (refill.daysLeft <= 0) {
        daysLeftSpan.textContent = "Refill now!";
        daysLeftSpan.style.color = "#ff3b30"; // Red for urgent
      } else if (refill.daysLeft === 1) {
        daysLeftSpan.textContent = "1 day left";
        daysLeftSpan.style.color = "#ff9500"; // Orange for warning
      } else {
        daysLeftSpan.textContent = `${refill.daysLeft} days left`;
      }

      item.appendChild(dateSpan);
      item.appendChild(medSpan);
      item.appendChild(daysLeftSpan);
      refillsList.appendChild(item);
    });

    // Enable/disable buttons based on content
    document.getElementById("prevRefill").disabled =
      upcomingRefills.length <= 1;
    document.getElementById("nextRefill").disabled =
      upcomingRefills.length <= 1;

    // Set initial position
    updateRefillsPosition();
  }
}

function updateRefillsPosition() {
  const slider = document.getElementById("upcomingRefills");
  const items = slider.getElementsByClassName("refill-item");

  if (items.length > 0) {
    const translateValue = -currentRefillIndex * 100;
    slider.style.transform = `translateX(${translateValue}%)`;
  }
}

function navigateRefills(direction) {
  const slider = document.getElementById("upcomingRefills");
  const itemCount = slider.getElementsByClassName("refill-item").length;

  if (itemCount <= 1) return;

  currentRefillIndex += direction;

  // Ensure we stay within bounds
  if (currentRefillIndex < 0) {
    currentRefillIndex = itemCount - 1;
  } else if (currentRefillIndex >= itemCount) {
    currentRefillIndex = 0;
  }

  updateRefillsPosition();
}

// ===== MEDICATION FUNCTIONS =====
function toggleEditMode(card) {
  const detailsDiv = card.querySelector(".medication-details");
  const formDiv = card.querySelector(".medication-form");

  if (detailsDiv.style.display === "none") {
    detailsDiv.style.display = "block";
    formDiv.style.display = "none";
  } else {
    detailsDiv.style.display = "none";
    formDiv.style.display = "block";
  }
}

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
      medications = data.medications;

      // Debug output to console
      console.log("Received medications data:", medications);

      if (!Array.isArray(medications)) {
        console.error("medications is not an array:", medications);
        medications = []; // Fallback to empty array to prevent errors
      }

      loadMedications();
      loadDailyTracking();

      // Refresh the calendar with medication dates
      const currentMonthText =
        document.getElementById("currentMonth").textContent;
      const [monthName, year] = currentMonthText.split(" ");

      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      renderCalendar(parseInt(year), monthNames.indexOf(monthName));
    })
    .catch((error) => {
      console.error("Error fetching medications:", error);
      document.getElementById(
        "medicationsList"
      ).innerHTML = `<div class="alert alert-danger">Error loading medications: ${error.message}</div>`;
    });
}

function loadMedications() {
  const medicationsList = document.getElementById("medicationsList");
  medicationsList.innerHTML = "";

  if (medications.length === 0) {
    medicationsList.innerHTML =
      "<p class='empty-state'>No medications added yet.</p>";
    return;
  }

  medications.forEach((med) => {
    const template = document.getElementById("medicationItemTemplate");
    const clone = template.content.cloneNode(true);

    // Add snap scrolling for one-card-at-a-time view
    const card = clone.querySelector(".medication-card");
    card.style.scrollSnapAlign = "start";
    card.style.minHeight = "230px";
    card.style.marginBottom = "20px";

    clone.querySelector(".medication-name").textContent = med.name;

    // Format description
    if (med.description) {
      clone.querySelector(".description").textContent = med.description;
    } else {
      clone.querySelector(".description").textContent = "No description";
    }

    // Format refill date
    const refillElement = clone.querySelector(".refill-date");
    if (med.refill_date) {
      refillElement.textContent = med.refill_date;
    } else {
      refillElement.textContent = "Not set";
    }

    // Set frequency and tablets
    clone.querySelector(".frequency").textContent = med.frequency_per_day;
    clone.querySelector(".tablets").textContent = med.tablets_per_dose;

    // Add remaining tablets display
    // Calculate the total capacity (nearest multiple of 30 that's >= remaining)
    const totalCapacity = Math.ceil(med.remaining_tablets / 30) * 30;

    // Add remaining tablets display
    if (clone.querySelector(".remaining-count")) {
      clone.querySelector(
        ".remaining-count"
      ).textContent = `${med.remaining_tablets} of ${totalCapacity} tablets`;
    }

    // Update progress bar width based on remaining percentage
    if (clone.querySelector(".remaining-bar")) {
      const percentage = (med.remaining_tablets / totalCapacity) * 100;
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
    card.dataset.id = med.id;

    // Add event listeners for edit/delete
    card.querySelector(".refill-med").addEventListener("click", function () {
      refillMedication(med.id);
    });

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

function refillMedication(medId) {
  if (
    confirm(
      "Refill this medication? This will set the remaining tablets to 30 and update the refill date."
    )
  ) {
    fetch(`/medication/api/medications/${medId}/refill/`, {
      method: "POST",
      headers: {
        "X-CSRFToken": getCsrfToken(),
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        // After successful refill, refresh the medications
        fetchMedications();
        alert("Medication refilled successfully!");
      })
      .catch((error) => {
        console.error("Error refilling medication:", error);
        alert(`Error refilling medication: ${error.message}`);
      });
  }
}

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
      document.getElementById("newMedicationForm").reset();
      document.getElementById("addMedicationForm").classList.remove("show");

      // Refresh medications list
      fetchMedications();
    })
    .catch((error) => {
      console.error("Error adding medication:", error);
      alert(`Error adding medication: ${error.message}`);
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

// ===== TRACKING FUNCTIONS =====
function loadDailyTracking() {
  const dailyList = document.getElementById("dailyTrackingList");
  dailyList.innerHTML = "";

  if (medications.length === 0) {
    dailyList.innerHTML = "<p class='empty-state'>No medications to track.</p>";
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
}

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

// ===== UTILITY FUNCTIONS =====
function getDoseLabel(index) {
  const labels = ["Morning", "Noon", "Evening", "Night"];
  return index < labels.length ? labels[index] : `Dose ${index + 1}`;
}

function getCsrfToken() {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, "csrftoken".length + 1) === "csrftoken=") {
        cookieValue = decodeURIComponent(
          cookie.substring("csrftoken".length + 1)
        );
        break;
      }
    }
  }
  return cookieValue;
}
