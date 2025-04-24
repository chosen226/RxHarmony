let map;
let service;
let geocoder;
let autocomplete;
let allPharmacies = [];
let searchResultsCount = 0;
let searchCompleted = 0;

function initMap() {
  geocoder = new google.maps.Geocoder();
  const mapElement = document.getElementById("map");
  const addressInput = document.getElementById("address-input");
  autocomplete = new google.maps.places.Autocomplete(addressInput, {
    types: ["geocode", "establishment"],
    fields: ["formatted_address", "geometry", "name"],
  });

  autocomplete.addListener("place_changed", function () {
    const place = autocomplete.getPlace();
    if (!place.geometry) {
      searchByAddress();
    } else {
      const location = place.geometry.location;
      resetMapAndTable();
      initializeMapWithLocation(location);
    }
  });

  useCurrentLocation();
  document
    .getElementById("search-button")
    .addEventListener("click", searchByAddress);
  document
    .getElementById("address-input")
    .addEventListener("keypress", function (e) {
      if (
        e.key === "Enter" &&
        !e.target.getAttribute("data-selected-from-dropdown")
      ) {
        searchByAddress();
      }
    });
  document
    .getElementById("current-location-button")
    .addEventListener("click", useCurrentLocation);
}

function searchByAddress() {
  const address = document.getElementById("address-input").value.trim();

  if (!address) {
    alert("Please enter an address to search");
    return;
  }

  resetMapAndTable();

  geocoder.geocode({ address: address }, function (results, status) {
    if (status === google.maps.GeocoderStatus.OK) {
      const location = results[0].geometry.location;
      initializeMapWithLocation(location);
    } else {
      alert("Geocode was not successful for the following reason: " + status);

      document.getElementById("map").innerHTML =
        '<div style="padding: 20px; color: #d32f2f;">Could not find that address. Please try a different search term.</div>';
      document.getElementById("pharmacy-list").innerHTML =
        '<tr><td colspan="3" style="color: #d32f2f;">Could not find that address. Please check your spelling and try again.</td></tr>';
    }
  });
}

function useCurrentLocation() {
  resetMapAndTable();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        initializeMapWithLocation(userLocation);
      },
      (error) => {
        console.error("Geolocation error: ", error);
        alert(
          "Geolocation permission denied. Please enable location services or use the address search option."
        );

        document.getElementById("map").innerHTML =
          '<div style="padding: 20px; color: #d32f2f;">Location access denied. Please enable location services or use the address search.</div>';
        document.getElementById("pharmacy-list").innerHTML =
          '<tr><td colspan="3" style="color: #d32f2f;">Location access denied. Please enable location services or use the address search.</td></tr>';
      }
    );
  } else {
    alert(
      "Geolocation is not supported by this browser. Please use the address search option."
    );

    document.getElementById("map").innerHTML =
      '<div style="padding: 20px; color: #d32f2f;">Geolocation is not supported by this browser. Please use the address search.</div>';
    document.getElementById("pharmacy-list").innerHTML =
      '<tr><td colspan="3" style="color: #d32f2f;">Geolocation is not supported by this browser. Please use the address search.</td></tr>';
  }
}

function resetMapAndTable() {
  document.getElementById("map").innerHTML = `
          <div class="loader-container">
            <div class="loader"></div>
          </div>
        `;
  document.getElementById("pharmacy-list").innerHTML = `
          <tr>
            <td colspan="3" class="table-loader">
              <div class="loader-container">
                <div class="loader"></div>
              </div>
              <p>Finding nearby healthcare locations...</p>
            </td>
          </tr>
        `;

  allPharmacies = [];
  searchResultsCount = 0;
  searchCompleted = 0;
}

function initializeMapWithLocation(location) {
  const mapElement = document.getElementById("map");
  mapElement.innerHTML = "";

  map = new google.maps.Map(mapElement, {
    center: location,
    zoom: 13,
    styles: [
      {
        featureType: "poi.business",
        stylers: [{ visibility: "simplified" }],
      },
    ],
  });

  const marker = new google.maps.Marker({
    position: location,
    map: map,
    title: "Selected Location",
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: "#3b7ede",
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: "#FFFFFF",
    },
  });

  service = new google.maps.places.PlacesService(map);

  runMultipleSearches(location);
}

function runMultipleSearches(location) {
  const pharmacyTypeRequest = {
    location: location,
    radius: 10000,
    type: "pharmacy",
  };

  const pharmacyKeywordRequest = {
    location: location,
    radius: 10000,
    keyword: "pharmacy",
  };

  const drugstoreRequest = {
    location: location,
    radius: 10000,
    keyword: "drugstore",
  };

  const walmartPharmacyRequest = {
    location: location,
    radius: 10000,
    keyword: "walmart pharmacy",
  };

  const storesWithPharmaciesRequest = {
    location: location,
    radius: 10000,
    keyword: "store pharmacy",
  };

  searchResultsCount = 5;

  service.nearbySearch(pharmacyTypeRequest, (results, status) => {
    processSearchResults(results, status, "type:pharmacy");
  });

  service.nearbySearch(pharmacyKeywordRequest, (results, status) => {
    processSearchResults(results, status, "keyword:pharmacy");
  });

  service.nearbySearch(drugstoreRequest, (results, status) => {
    processSearchResults(results, status, "keyword:drugstore");
  });

  service.nearbySearch(walmartPharmacyRequest, (results, status) => {
    processSearchResults(results, status, "keyword:walmart pharmacy");
  });

  service.nearbySearch(storesWithPharmaciesRequest, (results, status) => {
    processSearchResults(results, status, "keyword:store pharmacy");
  });
}

function processSearchResults(results, status, searchType) {
  console.log(`${searchType} search response status:`, status);
  searchCompleted++;

  if (
    status === google.maps.places.PlacesServiceStatus.OK &&
    results.length > 0
  ) {
    console.log(`${searchType} found ${results.length} results`);

    results.forEach((place) => {
      const existing = allPharmacies.find((p) => p.place_id === place.place_id);
      if (!existing) {
        allPharmacies.push(place);
      }
    });
  } else {
    console.log(
      `${searchType} found no results or had an error. Status: ${status}`
    );
  }

  if (searchCompleted === searchResultsCount) {
    displayPharmacyResults();
  }
}

function displayPharmacyResults() {
  const list = document.getElementById("pharmacy-list");
  list.innerHTML = "";

  console.log(`Total unique pharmacies found: ${allPharmacies.length}`);

  if (allPharmacies.length === 0) {
    list.innerHTML =
      '<tr><td colspan="3">No pharmacies found in this area. Try increasing the search radius or using a different location.</td></tr>';
    return;
  }

  allPharmacies = allPharmacies.filter((place) => {
    if (
      place.name.toLowerCase().includes("pharmacy") ||
      place.name.toLowerCase().includes("rx") ||
      place.name.toLowerCase().includes("drug") ||
      place.name.toLowerCase().includes("chemist")
    ) {
      return true;
    }

    const knownPharmacyChains = [
      "walmart",
      "walgreens",
      "cvs",
      "rite aid",
      "kroger",
      "publix",
      "costco",
      "sam's club",
      "target",
      "meijer",
      "safeway",
      "albertsons",
      "heb",
      "wegmans",
      "giant",
      "shoprite",
      "fred meyer",
      "harris teeter",
      "hy-vee",
    ];

    return knownPharmacyChains.some((chain) =>
      place.name.toLowerCase().includes(chain)
    );
  });

  allPharmacies.forEach((place) => {
    const placeLatLng = new google.maps.LatLng(
      place.geometry.location.lat(),
      place.geometry.location.lng()
    );
    const referenceLatLng = new google.maps.LatLng(
      map.getCenter().lat(),
      map.getCenter().lng()
    );
    place.distance =
      google.maps.geometry.spherical.computeDistanceBetween(
        referenceLatLng,
        placeLatLng
      ) / 1000;
  });

  allPharmacies.sort((a, b) => a.distance - b.distance);

  allPharmacies.forEach((place) => {
    const marker = new google.maps.Marker({
      position: place.geometry.location,
      map: map,
      title: place.name,
    });

    marker.addListener("click", () => {
      service.getDetails(
        { placeId: place.place_id },
        (placeDetail, detailStatus) => {
          if (detailStatus === google.maps.places.PlacesServiceStatus.OK) {
            const infoContent = `
                    <div style="max-width: 300px;">
                      <h3 style="margin-top: 0;">${place.name}</h3>
                      ${
                        placeDetail.formatted_address
                          ? `<p><strong>Address:</strong> ${placeDetail.formatted_address}</p>`
                          : ""
                      }
                      ${
                        placeDetail.formatted_phone_number
                          ? `<p><strong>Phone:</strong> ${placeDetail.formatted_phone_number}</p>`
                          : ""
                      }
                      ${
                        placeDetail.website
                          ? `<p><a href="${placeDetail.website}" target="_blank">Visit Website</a></p>`
                          : ""
                      }
                      ${
                        placeDetail.opening_hours
                          ? `<p><strong>Open now:</strong> ${
                              placeDetail.opening_hours.open_now ? "Yes" : "No"
                            }</p>`
                          : ""
                      }
                    </div>
                  `;

            const infoWindow = new google.maps.InfoWindow({
              content: infoContent,
            });

            infoWindow.open(map, marker);
          }
        }
      );
    });

    const tr = document.createElement("tr");

    const nameCell = document.createElement("td");
    const nameSpan = document.createElement("div");
    nameSpan.className = "place-name";
    nameSpan.textContent = place.name;

    const distanceSpan = document.createElement("div");
    distanceSpan.className = "place-distance";
    const distanceMiles = place.distance * 0.621371;
    distanceSpan.textContent = `${distanceMiles.toFixed(2)} miles away`;

    nameCell.appendChild(nameSpan);
    nameCell.appendChild(distanceSpan);
    tr.appendChild(nameCell);

    const addressCell = document.createElement("td");
    if (place.vicinity) {
      const addressInfo = document.createElement("div");
      addressInfo.className = "place-address";
      addressInfo.textContent = place.vicinity;
      addressCell.appendChild(addressInfo);
    }
    tr.appendChild(addressCell);

    const actionsCell = document.createElement("td");

    const detailsButton = document.createElement("button");
    detailsButton.textContent = "Show Details";
    detailsButton.className = "details-button";
    actionsCell.appendChild(detailsButton);

    tr.appendChild(actionsCell);

    const detailsRow = document.createElement("tr");
    detailsRow.style.display = "none";

    const detailsCell = document.createElement("td");
    detailsCell.colSpan = 3;

    const detailsDiv = document.createElement("div");
    detailsDiv.className = "place-details";
    detailsDiv.innerHTML = "<p>Loading details...</p>";

    detailsCell.appendChild(detailsDiv);
    detailsRow.appendChild(detailsCell);

    list.appendChild(tr);
    list.appendChild(detailsRow);

    detailsButton.addEventListener("click", function () {
      if (detailsRow.style.display === "none") {
        detailsRow.style.display = "table-row";
        detailsButton.textContent = "Hide Details";

        if (detailsDiv.innerHTML === "<p>Loading details...</p>") {
          service.getDetails(
            { placeId: place.place_id },
            (placeDetail, detailStatus) => {
              if (detailStatus === google.maps.places.PlacesServiceStatus.OK) {
                let detailsHtml = "";

                if (placeDetail.opening_hours) {
                  if (placeDetail.opening_hours.open_now) {
                    detailsDiv.classList.add("open");
                  } else {
                    detailsDiv.classList.add("closed");
                  }
                }

                if (placeDetail.formatted_address) {
                  detailsHtml += `<p><strong>Full Address:</strong> ${placeDetail.formatted_address}</p>`;
                }

                if (placeDetail.formatted_phone_number) {
                  detailsHtml += `<p><strong>Phone:</strong> ${placeDetail.formatted_phone_number}</p>`;
                }

                if (placeDetail.website) {
                  detailsHtml += `<p><strong>Website:</strong> <a href="${placeDetail.website}" target="_blank">${placeDetail.website}</a></p>`;
                }

                if (placeDetail.opening_hours) {
                  detailsHtml += `<p><strong>Open now:</strong> ${
                    placeDetail.opening_hours.open_now ? "Yes" : "No"
                  }</p>`;

                  if (placeDetail.opening_hours.weekday_text) {
                    detailsHtml += `<p><strong>Hours:</strong></p><ul class="hours-list">`;
                    placeDetail.opening_hours.weekday_text.forEach((day) => {
                      detailsHtml += `<li>${day}</li>`;
                    });
                    detailsHtml += `</ul>`;
                  }
                }

                if (placeDetail.rating) {
                  detailsHtml += `<p><strong>Rating:</strong> ${placeDetail.rating}/5 (${placeDetail.user_ratings_total} reviews)</p>`;
                }

                if (place.types && place.types.length > 0) {
                  const typesText = place.types.join(", ");

                  let styledTypesText = typesText;
                  [
                    "health",
                    "hospital",
                    "clinic",
                    "pharmacy",
                    "drug",
                    "medicine",
                  ].forEach((keyword) => {
                    const regex = new RegExp(keyword, "gi");
                    styledTypesText = styledTypesText.replace(
                      regex,
                      (match) => `<span class="highlight">${match}</span>`
                    );
                  });

                  detailsHtml += `<p><strong>Types:</strong> ${styledTypesText}</p>`;
                }

                detailsDiv.innerHTML =
                  detailsHtml || "<p>No additional details available</p>";
              } else {
                detailsDiv.innerHTML = "<p>Unable to load details</p>";
              }
            }
          );
        }
      } else {
        detailsRow.style.display = "none";
        detailsButton.textContent = "Show Details";
      }
    });
  });
}

function loadGoogleMapsAPI() {
  const script = document.createElement("script");
  script.src =
    "https://maps.googleapis.com/maps/api/js?key=AIzaSyA9PZUpLrcoEADDIaqdRfJ7FguAUUcBswU&libraries=places,geometry&callback=initMap";
  script.async = true;
  script.defer = true;

  script.onerror = function () {
    document.getElementById("map").innerHTML =
      '<div style="padding: 20px; color: #d32f2f;">Failed to load Google Maps API. The API key may be invalid or have domain restrictions.</div>';
    document.getElementById("pharmacy-list").innerHTML =
      '<tr><td colspan="4" style="color: #d32f2f;">Google Maps failed to load. Please check the console for more details.</td></tr>';
    console.error("Google Maps API failed to load");
  };

  document.head.appendChild(script);
}

window.onload = function () {
  setTimeout(function () {
    const searchInput = document.getElementById("address-input");
    if (searchInput) {
      searchInput.placeholder = "Enter address or use current location";
    }
  }, 500);

  loadGoogleMapsAPI();
};
