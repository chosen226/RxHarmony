document.addEventListener("DOMContentLoaded", function () {
  const profileButton = document.getElementById("profileButton");
  const profileDropdown = document.getElementById("profileDropdown");

  if (profileButton && profileDropdown) {
    profileButton.addEventListener("click", function (e) {
      e.stopPropagation();
      profileDropdown.classList.toggle("active");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
      if (
        !profileDropdown.contains(e.target) &&
        !profileButton.contains(e.target)
      ) {
        profileDropdown.classList.remove("active");
      }
    });
  }
});
