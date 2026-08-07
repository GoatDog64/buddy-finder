const searchForm = document.getElementById("searchForm");
const locationInput = document.getElementById("location");
const distanceSelect = document.getElementById("distance");
const geoButton = document.getElementById("geoButton");
const otherTypeWrap = document.getElementById("otherTypeWrap");
const otherTypeSelect = document.getElementById("otherType");
const formMessage = document.getElementById("formMessage");
const resultsSection = document.getElementById("resultsSection");
const resultsTitle = document.getElementById("resultsTitle");
const resultsCount = document.getElementById("resultsCount");
const petGrid = document.getElementById("petGrid");
const loading = document.getElementById("loading");
const emptyState = document.getElementById("emptyState");
const errorState = document.getElementById("errorState");
const loadMoreButton = document.getElementById("loadMore");
const template = document.getElementById("petCardTemplate");

let currentPage = 1;

document.querySelectorAll('input[name="petType"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    otherTypeWrap.classList.toggle("hidden", getSelectedPetType() !== "Other");
  });
});

geoButton.addEventListener("click", () => {
  formMessage.textContent = "";
  if (!navigator.geolocation) {
    formMessage.textContent = "Your browser doesn't support location access.";
    return;
  }
  geoButton.disabled = true;
  geoButton.textContent = "…";
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      locationInput.value = `${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`;
      locationInput.dataset.displayLocation = "your current location";
      geoButton.disabled = false;
      geoButton.textContent = "◎";
      formMessage.textContent = "Current location added.";
    },
    (error) => {
      geoButton.disabled = false;
      geoButton.textContent = "◎";
      const messages = {1:"Location permission was denied. You can enter a city or ZIP instead.",2:"Your location couldn't be determined. Try entering a city or ZIP.",3:"Location request timed out. Try again or enter a city or ZIP."};
      formMessage.textContent = messages[error.code] || "Couldn't access your location.";
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
});

locationInput.addEventListener("input", () => delete locationInput.dataset.displayLocation);
searchForm.addEventListener("submit", async (event) => { event.preventDefault(); currentPage = 1; petGrid.innerHTML = ""; await runSearch(false); });
loadMoreButton.addEventListener("click", async () => { currentPage += 1; await runSearch(true); });

function getSelectedPetType() { return document.querySelector('input[name="petType"]:checked').value; }
function getApiType() { const selected = getSelectedPetType(); return selected === "Other" ? otherTypeSelect.value : selected; }
function readableType(type) { return ({Dog:"dogs",Cat:"cats",Rabbit:"rabbits","Small & Furry":"small animals",Bird:"birds",Horse:"horses","Scales, Fins & Other":"reptiles, fish & other pets",Barnyard:"barnyard animals"})[type] || "pets"; }

async function runSearch(append) {
  const location = locationInput.value.trim();
  if (!location) return;
  const type = getApiType();
  const distance = distanceSelect.value;
  formMessage.textContent = "";
  errorState.classList.add("hidden");
  emptyState.classList.add("hidden");
  loadMoreButton.classList.add("hidden");
  resultsSection.classList.remove("hidden");
  loading.classList.remove("hidden");
  const displayLocation = locationInput.dataset.displayLocation || location;
  resultsTitle.textContent = `${capitalize(readableType(type))} near ${displayLocation}`;
  if (!append) { resultsCount.textContent = ""; resultsSection.scrollIntoView({ behavior: "smooth", block: "start" }); }
  try {
    const params = new URLSearchParams({ location, type, distance, page: String(currentPage) });
    const response = await fetch(`/api/pets?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || "Could not load pet listings.");
    const animals = data.animals || [];
    if (!append && animals.length === 0) emptyState.classList.remove("hidden");
    animals.forEach(renderPet);
    const total = data.pagination?.total_count;
    const shown = petGrid.children.length;
    resultsCount.textContent = Number.isFinite(total) ? `${shown.toLocaleString()} of ${total.toLocaleString()} found` : `${shown.toLocaleString()} shown`;
    if (currentPage < (data.pagination?.total_pages || 1) && animals.length > 0) loadMoreButton.classList.remove("hidden");
  } catch (error) {
    if (!append) petGrid.innerHTML = "";
    errorState.innerHTML = `<strong>Buddy Finder couldn't load listings.</strong><br>${escapeHtml(error.message)}`;
    errorState.classList.remove("hidden");
  } finally { loading.classList.add("hidden"); }
}

function renderPet(pet) {
  const node = template.content.cloneNode(true);
  const card = node.querySelector(".pet-card");
  const photoLink = node.querySelector(".pet-photo-link");
  const image = node.querySelector(".pet-photo");
  const placeholder = node.querySelector(".photo-placeholder");
  const distance = node.querySelector(".pet-distance");
  const name = node.querySelector(".pet-name");
  const breed = node.querySelector(".pet-breed");
  const sex = node.querySelector(".pet-sex");
  const age = node.querySelector(".pet-age");
  const size = node.querySelector(".pet-size");
  const location = node.querySelector(".pet-location");
  const meet = node.querySelector(".meet-button");
  const petUrl = pet.url || "https://www.petfinder.com/";
  photoLink.href = petUrl; meet.href = petUrl;
  const photo = pet.primary_photo_cropped?.medium || pet.primary_photo_cropped?.small || pet.photos?.[0]?.medium || pet.photos?.[0]?.small;
  if (photo) {
    image.src = photo; image.alt = `${pet.name || "Adoptable pet"} available for adoption`;
    image.addEventListener("load", () => placeholder.classList.add("hidden"));
    image.addEventListener("error", () => { image.classList.add("hidden"); placeholder.classList.remove("hidden"); });
  } else image.classList.add("hidden");
  const miles = Number(pet.distance);
  if (Number.isFinite(miles)) distance.textContent = `${Math.round(miles)} mi away`; else distance.classList.add("hidden");
  name.textContent = pet.name || "New friend";
  breed.textContent = formatBreed(pet.breeds);
  sex.textContent = pet.gender || "Unknown";
  age.textContent = pet.age || "Age unknown";
  size.textContent = pet.size || "Size unknown";
  const address = pet.contact?.address || {};
  location.textContent = [address.city, address.state].filter(Boolean).join(", ") || "Ask the rescue for location";
  petGrid.appendChild(card);
}

function formatBreed(breeds = {}) { const parts = [breeds.primary, breeds.secondary].filter(Boolean); if (!parts.length) return "Breed not listed"; return `${parts.join(" / ")}${breeds.mixed ? " mix" : ""}`; }
function capitalize(value) { return value ? value[0].toUpperCase() + value.slice(1) : value; }
function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
