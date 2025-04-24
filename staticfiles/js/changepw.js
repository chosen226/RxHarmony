document.addEventListener("DOMContentLoaded", function () {
  const submitBtn = document.getElementById("submitPasswordBtn");
  submitBtn.addEventListener("click", submitPasswordChange);
});

function submitPasswordChange() {
  // Get form values
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // Reset error/success messages
  const errorElement = document.getElementById("passwordError");
  const successElement = document.getElementById("passwordSuccess");
  errorElement.style.display = "none";
  successElement.style.display = "none";

  // Basic validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    errorElement.textContent = "All fields are required.";
    errorElement.style.display = "block";
    return;
  }

  if (newPassword.length < 8) {
    errorElement.textContent =
      "New password must be at least 8 characters long.";
    errorElement.style.display = "block";
    return;
  }

  if (newPassword !== confirmPassword) {
    errorElement.textContent = "New passwords do not match.";
    errorElement.style.display = "block";
    return;
  }

  // Create request data
  const data = {
    current_password: currentPassword,
    new_password: newPassword,
  };

  // Send request to server
  fetch("/changepw/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrfToken(),
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Show success message
        alert("password change successully");
        successElement.textContent =
          "Password changed successfully! Redirecting to profile...";
        successElement.style.display = "block";

        // Clear form
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";

        // Redirect after 2 seconds
      } else {
        // Show error message
        errorElement.textContent =
          data.error || "An error occurred while changing the password.";
        errorElement.style.display = "block";
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      errorElement.textContent = "An error occurred. Please try again.";
      errorElement.style.display = "block";
    });
}

// Function to get CSRF token from cookies
function getCsrfToken() {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, "csrftoken".length + 1) === "csrftoken" + "=") {
        cookieValue = decodeURIComponent(
          cookie.substring("csrftoken".length + 1)
        );
        break;
      }
    }
  }
  return cookieValue;
}
