document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const insuranceTypeSelect = document.getElementById("insuranceType");
  const drugNameInput = document.getElementById("drugName");
  const findDiscountsBtn = document.getElementById("findDiscountsBtn");
  const discountResultsCard = document.getElementById("discountResultsCard");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const discountContent = document.getElementById("discountContent");
  const messageContainer = document.getElementById("messageContainer");

  // Get CSRF token function
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

  // Show message function
  function showMessage(message, type = "info") {
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

  // Find discounts button click handler
  findDiscountsBtn.addEventListener("click", function () {
    const insuranceType = insuranceTypeSelect.value;
    const drugName = drugNameInput.value.trim();

    // Validate inputs
    if (!insuranceType) {
      showMessage("Please select your insurance type", "error");
      return;
    }

    if (!drugName) {
      showMessage("Please enter a medication name", "error");
      return;
    }

    // Show the results card and loading indicator
    discountResultsCard.style.display = "block";
    loadingIndicator.style.display = "flex";
    discountContent.style.display = "none";
    discountContent.innerHTML = "";

    // Scroll to the results card
    discountResultsCard.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    // Get discount information
    getDiscounts(insuranceType, drugName);
  });

  // Function to process discount content and prevent nesting issues
  function processDiscountContent(content) {
    // Convert line breaks to <br> tags
    content = content.replace(/\n/g, "<br>");

    // If we detect nested discount-option divs, fix them
    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;

    // Find all discount-option elements
    const discountOptions = tempDiv.querySelectorAll(".discount-option");

    // Check for nested discount options and fix them
    discountOptions.forEach((option) => {
      const nestedOptions = option.querySelectorAll(".discount-option");

      // If there are nested options, move them out
      nestedOptions.forEach((nestedOption) => {
        // Replace the nested option with a properly formatted section
        const title = document.createElement("h4");
        title.textContent =
          nestedOption.querySelector("h4")?.textContent ||
          "Additional Discount";

        const content = document.createElement("div");
        content.innerHTML = nestedOption.innerHTML;
        content.classList.add("additional-discount");

        // Replace the nested option with our new elements
        const parent = nestedOption.parentNode;
        parent.insertBefore(title, nestedOption);
        parent.insertBefore(content, nestedOption);
        nestedOption.remove();
      });
    });

    return tempDiv.innerHTML;
  }

  // Function to get discount information
  function getDiscounts(insuranceType, drugName) {
    // Prepare data for API
    const requestData = {
      insurance_type: insuranceType,
      drug_name: drugName,
    };

    // Send request to the API
    fetch("/medication/api/get-drug-discounts/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify(requestData),
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
        discountContent.style.display = "block";

        // Display the discount options
        if (data.success && data.discounts) {
          // Remove asterisks (**) from the content before displaying
          let cleanedContent = data.discounts.replace(/\*\*/g, "");

          // Process HTML to fix nested discount options
          cleanedContent = processDiscountContent(cleanedContent);

          discountContent.innerHTML = cleanedContent;
        } else {
          discountContent.innerHTML =
            '<p class="error">Unable to find discount information. Please try again later.</p>';
        }

        // Add disclaimer
        const disclaimer = document.createElement("div");
        disclaimer.classList.add("disclaimer");
        disclaimer.innerHTML = `
            <hr>
            <p><strong>Disclaimer:</strong> This information is provided for reference only and may not reflect current pricing or availability. 
            Prices and discounts are subject to change. Please verify all information with the pharmacy or manufacturer before making decisions.</p>
          `;
        discountContent.appendChild(disclaimer);
      })
      .catch((error) => {
        console.error("Error getting discounts:", error);

        // Hide loading indicator
        loadingIndicator.style.display = "none";
        discountContent.style.display = "block";

        // Show error message
        discountContent.innerHTML = `
            <p class="error">We're sorry, but there was an error finding discount information for ${drugName}.</p>
            <p>Please try again later or contact customer support if the problem persists.</p>
          `.replace(/\*\*/g, "");

        // Add disclaimer
        const disclaimer = document.createElement("div");
        disclaimer.classList.add("disclaimer");
        disclaimer.innerHTML = `
            <hr>
            <p><strong>Note:</strong> The service is currently experiencing difficulties. Please try again later.</p>
          `;
        discountContent.appendChild(disclaimer);
      });
  }
});
