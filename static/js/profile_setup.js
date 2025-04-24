// ===== GLOBAL VARIABLES =====
let globalConditions = [];

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
});

/**
 * Initialize the application, set up all event listeners
 */
function initializeApp() {
  // DOM Elements
  const profileForm = document.getElementById("profileForm");
  const conditionsList = document.getElementById("conditionsList");
  const newConditionInput = document.getElementById("newCondition");
  const addConditionBtn = document.getElementById("addCondition");
  const logoutBtn = document.getElementById("logoutBtn");
  const medicationList = document.getElementById("medicationList");
  const medicationTableBody = document.getElementById("medicationTableBody");
  const addMedicationBtn = document.getElementById("addMedicationBtn");
  const emptyMedicationState = document.getElementById("emptyMedicationState");
  const medicationModal = document.getElementById("medicationModal");
  const modalClose = document.querySelector(".close");
  const cancelMedicationBtn = document.getElementById("cancelMedication");
  const medicationForm = document.getElementById("medicationForm");
  const modalTitle = document.getElementById("modalTitle");
  const allergiesTextarea = document.getElementById("allergies");
  const saveAllergiesBtn = document.getElementById("saveAllergies");

  // Load initial data
  loadConditions();
  loadMedications();
  loadProfileData();
  setupMedicationHandlers();

  // Document-level click handler for condition deletion
  setupConditionDeleteHandler();

  // Add new condition button
  if (addConditionBtn) {
    addConditionBtn.addEventListener("click", function () {
      const conditionName = newConditionInput.value.trim();

      if (!conditionName) {
        showMessage("Please enter a condition name", "error");
        return;
      }

      // Check if condition already exists
      if (globalConditions.includes(conditionName)) {
        showMessage("This condition already exists", "error");
        return;
      }

      // Add to the UI and tracking array
      addConditionToList(conditionName);
      globalConditions.push(conditionName);

      // Clear input
      newConditionInput.value = "";

      // Save the updated profile with the new condition
      saveProfileData();
    });
  }

  // Also add condition when pressing Enter in input
  if (newConditionInput) {
    newConditionInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addConditionBtn.click();
      }
    });
  }

  // Handle profile form submission
  if (profileForm) {
    profileForm.addEventListener("submit", function (e) {
      e.preventDefault();
      saveProfileData();
    });
  }

  // Add new medication button click
  if (addMedicationBtn) {
    addMedicationBtn.addEventListener("click", function () {
      // Create a new row for adding medication
      const newRow = createNewMedicationRow();
      medicationTableBody.appendChild(newRow);

      // Hide empty state if visible
      emptyMedicationState.style.display = "none";

      // Focus on the name field
      newRow.querySelector('input[name="name"]').focus();
    });
  }

  // Show save button when allergies are edited
  if (allergiesTextarea && saveAllergiesBtn) {
    allergiesTextarea.addEventListener("input", function () {
      saveAllergiesBtn.style.display = "block";
    });

    // Save allergies when save button is clicked
    saveAllergiesBtn.addEventListener("click", function () {
      saveProfileData();
      saveAllergiesBtn.style.display = "none";
    });
  }

  // Medication Modal functionality
  if (modalClose) {
    modalClose.addEventListener("click", function () {
      closeMedicationModal();
    });
  }

  if (cancelMedicationBtn) {
    cancelMedicationBtn.addEventListener("click", function () {
      closeMedicationModal();
    });
  }

  // Close modal when clicking outside
  window.addEventListener("click", function (event) {
    if (event.target === medicationModal) {
      closeMedicationModal();
    }
  });

  // Handle medication form submission
  if (medicationForm) {
    medicationForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const medicationId = document.getElementById("medicationId").value;
      const formData = new FormData(medicationForm);

      const medicationData = {
        name: formData.get("name"),
        description: formData.get("description"),
        frequency_per_day: parseInt(formData.get("frequency_per_day")),
        tablets_per_dose: parseFloat(formData.get("tablets_per_dose")),
        remaining_tablets: parseFloat(formData.get("remaining_tablets")),
        refill_date: formData.get("refill_date") || null,
      };

      // Determine if it's an update or new medication
      const url = medicationId
        ? `/medication/api/medications/${medicationId}/`
        : "/medication/api/medications/";

      const method = medicationId ? "PUT" : "POST";

      // Save the medication
      fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify(medicationData),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          closeMedicationModal();
          showMessage(
            `Medication ${medicationId ? "updated" : "added"} successfully`,
            "success"
          );

          // Reload medication list
          loadMedications();
        })
        .catch((error) => {
          console.error("Error:", error);
          showMessage(
            `Error ${medicationId ? "updating" : "adding"} medication: ` +
              error.message,
            "error"
          );
        });
    });
  }

  // Logout functionality
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      fetch("/logout/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
          "X-Requested-With": "XMLHttpRequest",
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            window.location.href = data.redirect_url;
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          showMessage("Error logging out", "error");
        });
    });
  }
}

/**
 * Set up event handler for condition deletion
 */
function setupConditionDeleteHandler() {
  document.addEventListener("click", function (event) {
    if (event.target.classList.contains("delete-condition")) {
      event.preventDefault();
      event.stopPropagation();

      console.log("Delete condition button clicked");

      const deleteBtn = event.target;
      const li = deleteBtn.closest("li");
      const conditionName = li.textContent.replace("Remove", "").trim();
      const conditionsList = document.getElementById("conditionsList");

      console.log("Removing condition:", conditionName);
      console.log("Current conditions:", globalConditions);

      // Remove this condition from the UI
      li.remove();

      // Remove from global tracking array
      const index = globalConditions.indexOf(conditionName);
      if (index > -1) {
        globalConditions.splice(index, 1);
        console.log(
          "Condition removed from array, new conditions:",
          globalConditions
        );
      }

      // Save the profile with the updated conditions
      saveProfileData();

      // Show empty state if no conditions left
      if (conditionsList.children.length === 0) {
        const emptyLi = document.createElement("li");
        emptyLi.classList.add("empty-state");
        emptyLi.textContent = "No medical conditions added.";
        conditionsList.appendChild(emptyLi);
      }
    }
  });
}

// ===== UTILITY FUNCTIONS =====
/**
 * Get cookie value by name
 * @param {string} name - Name of the cookie to retrieve
 * @return {string} Cookie value or null if not found
 */
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

/**
 * Display temporary message to the user
 * @param {string} message - Message text to display
 * @param {string} type - Message type (info, success, error)
 */
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

// ===== PROFILE MANAGEMENT FUNCTIONS =====
/**
 * Save profile data to the server
 */
function saveProfileData() {
  console.log("Saving profile data");

  // Get current form data
  const profileForm = document.getElementById("profileForm");
  const formData = new FormData(profileForm);
  const profileData = {
    date_of_birth: formData.get("date_of_birth"),
    gender: formData.get("gender"),
    blood_type: formData.get("blood_type"),
    allergies: formData.get("allergies"),
    emergency_contact: formData.get("emergency_contact"),
    emergency_contact_phone: formData.get("emergency_contact_phone"),
    conditions: globalConditions,
  };

  console.log("Saving profile data:", profileData);

  // Use the profile update endpoint
  fetch("/api/profile/update/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: JSON.stringify(profileData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok: " + response.status);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        showMessage("Profile updated successfully", "success");
      } else {
        showMessage(
          "Error: " + (data.message || data.error || "Unknown error"),
          "error"
        );
      }
    })
    .catch((error) => {
      console.error("Error updating profile:", error);
      showMessage("Error updating profile: " + error.message, "error");

      // If there's a 404 error, fall back to the old endpoint
      if (error.message.includes("404")) {
        console.log("Falling back to legacy profile update endpoint");
        // Try the old endpoint as fallback
        fetch("/profile/setup/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
          },
          body: JSON.stringify(profileData),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Legacy endpoint failed: " + response.status);
            }
            return response.json();
          })
          .then((data) => {
            showMessage(
              "Profile updated successfully (legacy method)",
              "success"
            );
            // Reload medications since we used the legacy endpoint which might affect them
            setTimeout(() => {
              loadMedications();
            }, 500);
          })
          .catch((fallbackError) => {
            console.error("Error with legacy profile update:", fallbackError);
            showMessage("Could not update profile with either method", "error");
          });
      }
    });
}

/**
 * Load profile data from the server
 */
function loadProfileData() {
  // Try to fetch profile data from API
  fetch("/api/profile/")
    .then((response) => {
      if (!response.ok) {
        if (response.status === 404) {
          console.log("Profile API endpoint not found. Using DOM values.");
          return Promise.reject("API endpoint not found");
        }
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      // If API successful, update form with API data
      populateProfileForm(data);

      // If conditions are included in the API response, update them
      if (data.conditions && Array.isArray(data.conditions)) {
        updateConditionsList(data.conditions);
      }
    })
    .catch((error) => {
      // If API failed, ensure DOM values are properly loaded
      if (error === "API endpoint not found") {
        // Just ensure the form is properly initialized with existing DOM values
        checkFormInitialization();
      } else {
        console.error("Error loading profile:", error);
      }
    });
}

/**
 * Populate the profile form with data
 * @param {Object} data - Profile data to populate form with
 */
function populateProfileForm(data) {
  // Set each form field value from data if available
  if (data.date_of_birth) {
    document.getElementById("date_of_birth").value =
      data.date_of_birth.split("T")[0];
  }
  if (data.gender) {
    document.getElementById("gender").value = data.gender;
  }
  if (data.blood_type) {
    document.getElementById("blood_type").value = data.blood_type;
  }
  if (data.allergies) {
    document.getElementById("allergies").value = data.allergies;
  }
  if (data.emergency_contact) {
    document.getElementById("emergency_contact").value = data.emergency_contact;
  }
  if (data.emergency_contact_phone) {
    document.getElementById("emergency_contact_phone").value =
      data.emergency_contact_phone;
  }
}

/**
 * Check and fix form initialization issues, particularly with dates and select fields
 */
function checkFormInitialization() {
  // For date inputs that may have format issues from Django template
  const dobInput = document.getElementById("date_of_birth");
  if (dobInput.value && dobInput.value.includes("/")) {
    // Convert potential MM/DD/YYYY format to YYYY-MM-DD for HTML5 date input
    const parts = dobInput.value.split("/");
    if (parts.length === 3) {
      const newDate = `${parts[2]}-${parts[0].padStart(
        2,
        "0"
      )}-${parts[1].padStart(2, "0")}`;
      dobInput.value = newDate;
    }
  }

  // For select elements, ensure they have proper values selected
  const genderSelect = document.getElementById("gender");
  const bloodTypeSelect = document.getElementById("blood_type");

  // If these have values but no option is selected, try to select the option
  if (genderSelect.value && !genderSelect.selectedOptions[0]) {
    const genderOption = genderSelect.querySelector(
      `option[value="${genderSelect.value}"]`
    );
    if (genderOption) genderOption.selected = true;
  }

  if (bloodTypeSelect.value && !bloodTypeSelect.selectedOptions[0]) {
    const bloodOption = bloodTypeSelect.querySelector(
      `option[value="${bloodTypeSelect.value}"]`
    );
    if (bloodOption) bloodOption.selected = true;
  }
}

// ===== CONDITION MANAGEMENT FUNCTIONS =====
/**
 * Load medical conditions from the DOM
 */
function loadConditions() {
  globalConditions = [];

  const conditionsList = document.getElementById("conditionsList");

  // Get conditions from the rendered list items
  const liElements = conditionsList.querySelectorAll("li:not(.empty-state)");
  liElements.forEach((li) => {
    // Only get the text content, not including the button text
    const buttonText = li.querySelector("button")
      ? li.querySelector("button").textContent
      : "";
    const conditionText = li.textContent.replace(buttonText, "").trim();

    if (conditionText) {
      globalConditions.push(conditionText);
    }
  });

  console.log("Loaded conditions:", globalConditions);
}

/**
 * Add a new condition to the list
 * @param {string} conditionName - Name of the condition to add
 */
function addConditionToList(conditionName) {
  if (!conditionName) return;

  const conditionsList = document.getElementById("conditionsList");

  // Remove empty state if present
  const emptyState = conditionsList.querySelector(".empty-state");
  if (emptyState) {
    emptyState.remove();
  }

  // Add to the UI
  const li = document.createElement("li");
  li.textContent = conditionName;

  // Add delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.classList.add("btn-sm", "btn-danger", "delete-condition");
  deleteBtn.textContent = "Remove";

  li.appendChild(deleteBtn);
  conditionsList.appendChild(li);
}

/**
 * Update the conditions list from API data
 * @param {Array} conditions - List of conditions from API
 */
function updateConditionsList(conditions) {
  const conditionsList = document.getElementById("conditionsList");

  // Clear existing conditions
  conditionsList.innerHTML = "";
  globalConditions = [];

  if (conditions.length > 0) {
    conditions.forEach((condition) => {
      // Extract the condition name whether it's an object or string
      const conditionName =
        typeof condition === "object" ? condition.name : condition;
      addConditionToList(conditionName);
      globalConditions.push(conditionName);
    });
  } else {
    // Show empty state if no conditions
    const emptyLi = document.createElement("li");
    emptyLi.classList.add("empty-state");
    emptyLi.textContent = "No medical conditions added.";
    conditionsList.appendChild(emptyLi);
  }
}

// ===== MEDICATION MANAGEMENT FUNCTIONS =====
/**
 * Load medications from the server
 */
function loadMedications() {
  const medicationTableBody = document.getElementById("medicationTableBody");
  const emptyMedicationState = document.getElementById("emptyMedicationState");

  fetch("/medication/api/medications/")
    .then((response) => {
      if (!response.ok) {
        if (response.status === 404) {
          console.log(
            "Medications API endpoint not found. Using DOM data instead."
          );
          return Promise.reject("API endpoint not found");
        }
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      // Clear current table
      medicationTableBody.innerHTML = "";

      if (data.medications && data.medications.length > 0) {
        // Render each medication
        data.medications.forEach((med) => {
          const row = createMedicationRow(med);
          medicationTableBody.appendChild(row);
        });

        // Hide empty state
        emptyMedicationState.style.display = "none";
      } else {
        // Show empty state
        emptyMedicationState.style.display = "block";
      }
    })
    .catch((error) => {
      // Only show this message if it's not our known "API endpoint not found" error
      if (error !== "API endpoint not found") {
        console.error("Error loading medications:", error);
        emptyMedicationState.textContent =
          "Error loading medications. Please try again.";
        emptyMedicationState.style.display = "block";
      }
    });
}

/**
 * Create a medication row for the table
 * @param {Object} medication - Medication data
 * @return {HTMLElement} The created table row
 */
function createMedicationRow(medication) {
  console.log("Creating row for medication:", medication);

  try {
    // Create the row element
    const row = document.createElement("tr");
    row.classList.add("medication-row");

    // Safely set dataset ID
    if (medication.id) {
      row.dataset.id = medication.id;
    } else {
      console.warn("Medication is missing ID");
    }

    // Safely format directions
    let directions = "";
    try {
      directions = `${medication.frequency_per_day}x daily`;
    } catch (e) {
      console.error("Error formatting directions:", e);
      directions = "Unknown";
    }

    // Calculate refill due date based on usage
    let calculatedRefillDate = null;
    try {
      if (
        medication.remaining_tablets &&
        medication.frequency_per_day &&
        medication.tablets_per_dose
      ) {
        const dailyUsage =
          medication.frequency_per_day * medication.tablets_per_dose;
        const daysRemaining = Math.floor(
          medication.remaining_tablets / dailyUsage
        );

        calculatedRefillDate = new Date();
        calculatedRefillDate.setDate(
          calculatedRefillDate.getDate() + daysRemaining
        );
      }
    } catch (e) {
      console.error("Error calculating refill date:", e);
    }

    // Use calculated date if available, otherwise use stored refill date
    let refillDateDisplay = "None";
    try {
      if (calculatedRefillDate) {
        refillDateDisplay = calculatedRefillDate.toLocaleDateString();
      } else if (medication.refill_date) {
        const refillDate = new Date(medication.refill_date);
        refillDateDisplay = refillDate.toLocaleDateString();
      }
    } catch (e) {
      console.error("Error formatting refill date:", e);
      refillDateDisplay = String(medication.refill_date || "None");
    }

    // Build row HTML
    try {
      row.innerHTML = `
                <td>
                    <div class="medication-view-mode">${
                      medication.name || "Unknown"
                    }</div>
                    <div class="medication-edit-mode">
                        <input type="text" name="name" value="${
                          medication.name || ""
                        }" required>
                    </div>
                </td>
                <td>
                    <div class="medication-view-mode">${directions}</div>
                    <div class="medication-edit-mode">
                        <textarea name="description">${
                          medication.description || ""
                        }</textarea>
                        <input type="number" name="frequency_per_day" min="1" value="${
                          medication.frequency_per_day || 1
                        }" required>
                    </div>
                </td>
                <td>
                    <div class="medication-view-mode">${
                      medication.tablets_per_dose || 1
                    }</div>
                    <div class="medication-edit-mode">
                        <input type="number" name="tablets_per_dose" min="0.5" step="0.5" value="${
                          medication.tablets_per_dose || 1
                        }" required>
                    </div>
                </td>
                <td>
                    <div class="medication-view-mode">${
                      medication.remaining_tablets || 0
                    }</div>
                    <div class="medication-edit-mode">
                        <input type="number" name="remaining_tablets" min="0" step="0.5" value="${
                          medication.remaining_tablets || 0
                        }" required>
                    </div>
                </td>
                <td>
                    <div class="medication-view-mode">${refillDateDisplay}</div>
                    <div class="medication-edit-mode">
                        <input type="date" name="refill_date" value="${
                          medication.refill_date
                            ? medication.refill_date.split("T")[0]
                            : ""
                        }">
                    </div>
                </td>
                <td>
                    <div class="medication-view-mode action-icons">
                        <button class="action-icon refill-medication">🔄</button>
                        <button class="action-icon edit-medication">✏️</button>
                        <button class="action-icon delete-medication">🗑️</button>
                    </div>
                    <div class="medication-edit-mode action-icons">
                        <button class="btn btn-sm btn-primary save-medication">Save</button>
                        <button class="btn btn-sm cancel-edit">Cancel</button>
                    </div>
                </td>
            `;
    } catch (e) {
      console.error("Error setting innerHTML:", e);
      row.textContent = "Error creating medication row";
      return row;
    }

    // Try to add event listeners
    try {
      setupRowEventListeners(row);
    } catch (e) {
      console.error("Error setting up event listeners:", e);
    }

    return row;
  } catch (outerError) {
    console.error("Unexpected error in createMedicationRow:", outerError);
    const errorRow = document.createElement("tr");
    errorRow.innerHTML = '<td colspan="6">Error creating medication row</td>';
    return errorRow;
  }
}

/**
 * Create a new empty medication row
 * @return {HTMLElement} The created table row
 */
function createNewMedicationRow() {
  const row = document.createElement("tr");
  row.classList.add("medication-row", "medication-row-new");

  row.innerHTML = `
        <td>
            <div class="medication-view-mode"></div>
            <div class="medication-edit-mode">
                <input type="text" name="name" placeholder="Medication name" required>
            </div>
        </td>
        <td>
            <div class="medication-view-mode"></div>
            <div class="medication-edit-mode">
                <textarea name="description" placeholder="Description"></textarea>
            </div>
        </td>
        <td>
            <div class="medication-view-mode"></div>
            <div class="medication-edit-mode">
                <p>Doses per day</p>
                <input type="number" name="frequency_per_day" min="1" value="1" required>
            </div>
        </td>
        <td>
            <div class="medication-view-mode"></div>
            <div class="medication-edit-mode">
                <p>Tablets per dose </p>
                <input type="number" name="tablets_per_dose" min="0.5" step="0.5" value="1" required>
            </div>
        </td>
        <td>
            <div class="medication-view-mode"></div>
            <div class="medication-edit-mode">
                <p>Remaining tablets</p>
                <input type="number" name="remaining_tablets" min="0" step="0.5" value="30" required>
            </div>
        </td>
        <td>
            <div class="medication-view-mode"></div>
            <div class="medication-edit-mode">
                <input type="hidden" name="refill_date" value="">
            </div>
        </td>
        <td>
            <div class="medication-view-mode medication-actions"></div>
            <div class="medication-edit-mode medication-actions">
                <button class="btn btn-sm btn-primary save-medication">Save</button>
                <button class="btn btn-sm cancel-edit">Cancel</button>
            </div>
        </td>
    `;

  // Setup listeners for save and cancel buttons
  const saveBtn = row.querySelector(".save-medication");
  const cancelBtn = row.querySelector(".cancel-edit");
  const medicationTableBody = document.getElementById("medicationTableBody");
  const emptyMedicationState = document.getElementById("emptyMedicationState");

  saveBtn.addEventListener("click", function () {
    saveMedication(row);
  });

  cancelBtn.addEventListener("click", function () {
    if (confirm("Discard this new medication?")) {
      row.remove();

      // Show empty state if no medications left
      if (medicationTableBody.children.length === 0) {
        emptyMedicationState.style.display = "block";
      }
    }
  });

  return row;
}

/**
 * Set up event listeners for a medication table row
 * @param {HTMLElement} row - The medication row to set up
 */
function setupRowEventListeners(row) {
  const editBtn = row.querySelector(".edit-medication");
  const deleteBtn = row.querySelector(".delete-medication");
  const refillBtn = row.querySelector(".refill-medication");
  const saveBtn = row.querySelector(".save-medication");
  const cancelBtn = row.querySelector(".cancel-edit");

  // Store original values for cancel
  let originalValues = {};

  if (editBtn) {
    editBtn.addEventListener("click", function () {
      // Save original values before editing
      originalValues = {
        name: row.querySelector('input[name="name"]').value,
        description: row.querySelector('textarea[name="description"]').value,
        frequency_per_day: row.querySelector('input[name="frequency_per_day"]')
          .value,
        tablets_per_dose: row.querySelector('input[name="tablets_per_dose"]')
          .value,
        remaining_tablets: row.querySelector('input[name="remaining_tablets"]')
          .value,
        refill_date: row.querySelector('input[name="refill_date"]').value,
      };

      // Enable editing
      row.classList.add("medication-row-editing");
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      // Restore original values
      if (Object.keys(originalValues).length > 0) {
        row.querySelector('input[name="name"]').value = originalValues.name;
        row.querySelector('textarea[name="description"]').value =
          originalValues.description;
        row.querySelector('input[name="frequency_per_day"]').value =
          originalValues.frequency_per_day;
        row.querySelector('input[name="tablets_per_dose"]').value =
          originalValues.tablets_per_dose;
        row.querySelector('input[name="remaining_tablets"]').value =
          originalValues.remaining_tablets;
        row.querySelector('input[name="refill_date"]').value =
          originalValues.refill_date;
      }

      // Disable editing
      row.classList.remove("medication-row-editing");
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", function () {
      const medicationId = row.dataset.id;
      const medicationName = row
        .querySelector(".medication-view-mode")
        .textContent.trim();
      const medicationTableBody = document.getElementById(
        "medicationTableBody"
      );
      const emptyMedicationState = document.getElementById(
        "emptyMedicationState"
      );

      if (confirm(`Are you sure you want to delete ${medicationName}?`)) {
        fetch(`/medication/api/medications/${medicationId}/`, {
          method: "DELETE",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Network response was not ok");
            }
            return response.json();
          })
          .then((data) => {
            row.remove();
            showMessage("Medication deleted successfully", "success");

            // Show empty state if no medications left
            if (medicationTableBody.children.length === 0) {
              emptyMedicationState.style.display = "block";
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            showMessage("Error deleting medication: " + error.message, "error");
          });
      }
    });
  }

  if (refillBtn) {
    refillBtn.addEventListener("click", function () {
      const medicationId = row.dataset.id;

      fetch(`/medication/api/medications/${medicationId}/refill/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          showMessage("Medication refilled successfully", "success");
          // Reload medications to show updated counts and dates
          loadMedications();
        })
        .catch((error) => {
          console.error("Error:", error);
          showMessage("Error refilling medication: " + error.message, "error");
        });
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      saveMedication(row);
    });
  }
}

/**
 * Save medication data from a row
 * @param {HTMLElement} row - The medication row to save
 */
function saveMedication(row) {
  const isNewMedication = row.classList.contains("medication-row-new");
  const medicationId = isNewMedication ? null : row.dataset.id;

  // Collect data from form fields
  const medicationData = {
    name: row.querySelector('input[name="name"]').value,
    description: row.querySelector('textarea[name="description"]').value,
    frequency_per_day: parseInt(
      row.querySelector('input[name="frequency_per_day"]').value
    ),
    tablets_per_dose: parseFloat(
      row.querySelector('input[name="tablets_per_dose"]').value
    ),
    remaining_tablets: parseFloat(
      row.querySelector('input[name="remaining_tablets"]').value
    ),
    refill_date: row.querySelector('input[name="refill_date"]').value || null,
  };

  // Calculate refill date if not specified
  if (!medicationData.refill_date) {
    // Calculate days remaining based on usage
    const dailyUsage =
      medicationData.frequency_per_day * medicationData.tablets_per_dose;
    const daysRemaining = Math.floor(
      medicationData.remaining_tablets / dailyUsage
    );

    // Set refill date to calculated date
    const calculatedRefillDate = new Date();
    calculatedRefillDate.setDate(
      calculatedRefillDate.getDate() + daysRemaining
    );

    // Format date as YYYY-MM-DD for the input
    const year = calculatedRefillDate.getFullYear();
    const month = String(calculatedRefillDate.getMonth() + 1).padStart(2, "0");
    const day = String(calculatedRefillDate.getDate()).padStart(2, "0");
    medicationData.refill_date = `${year}-${month}-${day}`;
  }

  // Validate required fields
  if (!medicationData.name) {
    showMessage("Medication name is required", "error");
    return;
  }

  // Check for invalid values
  if (
    isNaN(medicationData.frequency_per_day) ||
    medicationData.frequency_per_day < 1
  ) {
    showMessage("Frequency must be at least 1", "error");
    return;
  }

  if (
    isNaN(medicationData.tablets_per_dose) ||
    medicationData.tablets_per_dose < 0.5
  ) {
    showMessage("Tablets per dose must be at least 0.5", "error");
    return;
  }

  if (
    isNaN(medicationData.remaining_tablets) ||
    medicationData.remaining_tablets < 0
  ) {
    showMessage("Remaining tablets cannot be negative", "error");
    return;
  }

  // Log the data being sent (for debugging)
  console.log("Sending medication data:", medicationData);

  // Determine if it's an update or new medication
  const url = medicationId
    ? `/medication/api/medications/${medicationId}/`
    : "/medication/api/medications/";

  const method = medicationId ? "PUT" : "POST";

  // Save the medication
  fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: JSON.stringify(medicationData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errData) => {
          // If the server returns error details, throw them
          throw new Error(errData.error || "Network response was not ok");
        });
      }
      return response.json();
    })
    .then((data) => {
      showMessage(
        `Medication ${medicationId ? "updated" : "added"} successfully`,
        "success"
      );

      // Reload medications to show updated data
      loadMedications();
    })
    .catch((error) => {
      console.error("Error:", error);
      showMessage(
        `Error ${medicationId ? "updating" : "adding"} medication: ` +
          error.message,
        "error"
      );
    });
}

/**
 * Get formatted directions text for medication
 * @param {Object} medication - Medication data
 * @return {string} Formatted directions text
 */
function getDirectionsText(medication) {
  let frequency = "";
  switch (medication.frequency_per_day) {
    case 1:
      frequency = "once daily";
      break;
    case 2:
      frequency = "twice daily";
      break;
    case 3:
      frequency = "three times daily";
      break;
    case 4:
      frequency = "four times daily";
      break;
    default:
      frequency = `${medication.frequency_per_day}x daily`;
  }

  let tablets = "";
  if (medication.tablets_per_dose === 1) {
    tablets = "Take one tablet";
  } else {
    tablets = `Take ${medication.tablets_per_dose} tablets`;
  }

  // Use description if available, otherwise construct generic directions
  if (medication.description && medication.description.trim() !== "") {
    return medication.description;
  } else {
    return `${tablets} by mouth ${frequency}`;
  }
}

// ===== MEDICATION MODAL FUNCTIONS =====
/**
 * Open the medication modal for editing or adding
 * @param {string|null} medicationId - ID of medication to edit, or null for new
 */
function openMedicationModal(medicationId = null) {
  const modalTitle = document.getElementById("modalTitle");
  const medicationForm = document.getElementById("medicationForm");
  const medicationModal = document.getElementById("medicationModal");

  modalTitle.textContent = medicationId ? "Edit Medication" : "Add Medication";
  medicationForm.reset();
  document.getElementById("medicationId").value = medicationId || "";

  if (medicationId) {
    // Fetch medication details and populate form
    fetch(`/medication/api/medications/${medicationId}/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((med) => {
        document.getElementById("medName").value = med.name;
        document.getElementById("medDescription").value = med.description || "";
        document.getElementById("medFrequency").value = med.frequency_per_day;
        document.getElementById("medDosage").value = med.tablets_per_dose;
        document.getElementById("medRemaining").value = med.remaining_tablets;
        if (med.refill_date) {
          document.getElementById("medRefillDate").value =
            med.refill_date.split("T")[0];
        }
      })
      .catch((error) => {
        console.error("Error fetching medication:", error);
        showMessage("Error loading medication details", "error");
      });
  }

  medicationModal.style.display = "block";
}

/**
 * Close the medication modal
 */
function closeMedicationModal() {
  const medicationModal = document.getElementById("medicationModal");
  const medicationForm = document.getElementById("medicationForm");

  medicationModal.style.display = "none";
  medicationForm.reset();
}

/**
 * Setup handlers for medication cards
 */
function setupMedicationHandlers() {
  // Edit medication buttons
  document.querySelectorAll(".edit-medication").forEach((button) => {
    button.addEventListener("click", function () {
      const medicationId = this.closest(".medication-card").dataset.id;
      openMedicationModal(medicationId);
    });
  });

  // Delete medication buttons
  document.querySelectorAll(".delete-medication").forEach((button) => {
    button.addEventListener("click", function () {
      const medicationCard = this.closest(".medication-card");
      const medicationId = medicationCard.dataset.id;
      const medicationName =
        medicationCard.querySelector(".medication-name").textContent;
      const medicationList = document.getElementById("medicationList");

      if (confirm(`Are you sure you want to delete ${medicationName}?`)) {
        fetch(`/medication/api/medications/${medicationId}/`, {
          method: "DELETE",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Network response was not ok");
            }
            return response.json();
          })
          .then((data) => {
            medicationCard.remove();
            showMessage("Medication deleted successfully", "success");

            // Show empty state if no medications left
            if (medicationList.children.length === 0) {
              medicationList.innerHTML =
                '<div class="empty-state">You don\'t have any medications added yet.</div>';
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            showMessage("Error deleting medication: " + error.message, "error");
          });
      }
    });
  });

  // Refill medication buttons
  document.querySelectorAll(".refill-medication").forEach((button) => {
    button.addEventListener("click", function () {
      const medicationCard = this.closest(".medication-card");
      const medicationId = medicationCard.dataset.id;

      fetch(`/medication/api/medications/${medicationId}/refill/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          showMessage("Medication refilled successfully", "success");
          // Reload medications to show updated counts and dates
          loadMedications();
        })
        .catch((error) => {
          console.error("Error:", error);
          showMessage("Error refilling medication: " + error.message, "error");
        });
    });
  });
}
