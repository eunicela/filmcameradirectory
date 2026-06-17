const cameras = [
  {
    id: "canon-ae-1",
    maker: "Canon",
    model: "AE-1 Program",
    format: "35mm",
    mount: "FD",
    tags: ["35mm", "beginner", "metered"],
    meter: "Shutter priority and program auto",
    stock: "Kodak Gold 200",
    summary:
      "Accessible controls, plentiful lenses, and reliable auto exposure for everyday rolls.",
  },
  {
    id: "nikon-f3",
    maker: "Nikon",
    model: "F3",
    format: "35mm",
    mount: "F",
    tags: ["35mm", "mechanical", "pro body"],
    meter: "Aperture priority with manual backup",
    stock: "Ilford HP5 Plus",
    summary:
      "A durable SLR with a bright finder, excellent lens support, and a reassuring mechanical feel.",
  },
  {
    id: "olympus-xa",
    maker: "Olympus",
    model: "XA",
    format: "35mm",
    mount: "Fixed 35mm f/2.8",
    tags: ["35mm", "compact", "rangefinder"],
    meter: "Aperture priority",
    stock: "Cinestill 800T",
    summary:
      "Pocketable rangefinder for quick street work, available light, and low-friction carry.",
  },
  {
    id: "mamiya-645",
    maker: "Mamiya",
    model: "645 1000S",
    format: "medium format",
    mount: "M645",
    tags: ["medium format", "mechanical", "portrait"],
    meter: "Prism dependent",
    stock: "Kodak Portra 400",
    summary:
      "Medium format negatives with an SLR workflow, great for portraits and controlled sessions.",
  },
  {
    id: "pentax-k1000",
    maker: "Pentax",
    model: "K1000",
    format: "35mm",
    mount: "K",
    tags: ["35mm", "beginner", "mechanical"],
    meter: "Needle match manual meter",
    stock: "Ilford FP4 Plus",
    summary:
      "Simple, sturdy, and easy to teach. A classic manual camera for learning exposure by feel.",
  },
  {
    id: "yashica-mat-124g",
    maker: "Yashica",
    model: "Mat-124G",
    format: "medium format",
    mount: "Fixed 80mm f/3.5",
    tags: ["medium format", "tlr", "mechanical"],
    meter: "Coupled CdS meter",
    stock: "Fomapan 100",
    summary:
      "A waist-level twin lens reflex that slows down composition and makes square frames shine.",
  },
];

const recipes = [
  {
    film: "Ilford HP5 Plus",
    developer: "Kodak D-76 1+1",
    iso: "400",
    temperature: "20 C",
    developmentSeconds: 660,
    agitation: "First 30 seconds, then 10 seconds each minute.",
    notes: "Great all-purpose contrast with forgiving highlight handling.",
    process: [
      ["Pre-soak", 60],
      ["Developer", 660],
      ["Stop bath", 45],
      ["Fixer", 300],
      ["Wash", 600],
      ["Photo-Flo", 60],
    ],
  },
  {
    film: "Ilford HP5 Plus",
    developer: "Ilford Ilfotec DD-X 1+4",
    iso: "800",
    temperature: "20 C",
    developmentSeconds: 780,
    agitation: "First 30 seconds, then 10 seconds each minute.",
    notes: "Useful push recipe for dim interiors while keeping shadow detail.",
    process: [
      ["Pre-soak", 60],
      ["Developer", 780],
      ["Stop bath", 45],
      ["Fixer", 300],
      ["Wash", 600],
      ["Photo-Flo", 60],
    ],
  },
  {
    film: "Kodak Tri-X 400",
    developer: "Kodak D-76 Stock",
    iso: "400",
    temperature: "20 C",
    developmentSeconds: 405,
    agitation: "First 30 seconds, then 5 seconds every 30 seconds.",
    notes: "Classic documentary look with crisp midtone separation.",
    process: [
      ["Pre-soak", 60],
      ["Developer", 405],
      ["Stop bath", 45],
      ["Fixer", 300],
      ["Wash", 600],
      ["Photo-Flo", 60],
    ],
  },
  {
    film: "Kodak Portra 400",
    developer: "C-41 Kit",
    iso: "400",
    temperature: "38 C",
    developmentSeconds: 210,
    agitation: "Continuous first 10 seconds, then 4 inversions each 30 seconds.",
    notes: "Color negative baseline for portraits and mixed daylight.",
    process: [
      ["Developer", 210],
      ["Blix", 390],
      ["Wash", 180],
      ["Stabilizer", 60],
    ],
  },
  {
    film: "Fomapan 100",
    developer: "Rodinal 1+50",
    iso: "100",
    temperature: "20 C",
    developmentSeconds: 540,
    agitation: "First 30 seconds, then one gentle inversion each minute.",
    notes: "Sharp, economical recipe for slow walks and tripod work.",
    process: [
      ["Pre-soak", 60],
      ["Developer", 540],
      ["Stop bath", 45],
      ["Fixer", 300],
      ["Wash", 600],
      ["Photo-Flo", 60],
    ],
  },
];

const state = {
  filter: "all",
  search: "",
  recipe: recipes[0],
  timer: {
    intervalId: null,
    remainingSeconds: 0,
    totalSeconds: 0,
    running: false,
  },
};

const elements = {
  cameraGrid: document.querySelector("#camera-grid"),
  cameraSearch: document.querySelector("#camera-search"),
  filterButtons: document.querySelectorAll("[data-filter]"),
  filmStock: document.querySelector("#film-stock"),
  developer: document.querySelector("#developer"),
  recipeCard: document.querySelector("#recipe-card"),
  timerDisplay: document.querySelector("#timer-display"),
  timerLabel: document.querySelector("#timer-label"),
  startTimer: document.querySelector("#start-timer"),
  pauseTimer: document.querySelector("#pause-timer"),
  resetTimer: document.querySelector("#reset-timer"),
  processList: document.querySelector("#process-list"),
  loadedFilm: document.querySelector("#loaded-film"),
  frameCount: document.querySelector("#frame-count"),
  devTime: document.querySelector("#dev-time"),
  rollForm: document.querySelector("#roll-form"),
  rollCamera: document.querySelector("#roll-camera"),
  rollTitle: document.querySelector("#roll-title"),
  rollNotes: document.querySelector("#roll-notes"),
  previewTitle: document.querySelector("#preview-title"),
  previewCamera: document.querySelector("#preview-camera"),
  previewStock: document.querySelector("#preview-stock"),
  previewNotes: document.querySelector("#preview-notes"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function recipeTotalSeconds(recipe) {
  return recipe.process.reduce((total, step) => total + step[1], 0);
}

function renderCameras() {
  const query = state.search.trim().toLowerCase();
  const filtered = cameras.filter((camera) => {
    const searchable = [
      camera.maker,
      camera.model,
      camera.format,
      camera.mount,
      camera.meter,
      camera.stock,
      ...camera.tags,
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !query || searchable.includes(query);
    const matchesFilter =
      state.filter === "all" ||
      camera.format === state.filter ||
      camera.tags.includes(state.filter);

    return matchesSearch && matchesFilter;
  });

  if (filtered.length === 0) {
    elements.cameraGrid.innerHTML =
      '<p class="muted">No cameras match those filters yet.</p>';
    return;
  }

  elements.cameraGrid.innerHTML = filtered
    .map(
      (camera) => `
        <article class="camera-card">
          <header>
            <div>
              <p class="eyebrow">${escapeHtml(camera.format)}</p>
              <h3>${escapeHtml(camera.maker)} ${escapeHtml(camera.model)}</h3>
            </div>
            <button class="chip" type="button" data-load-camera="${escapeHtml(camera.id)}">
              Load
            </button>
          </header>
          <p>${escapeHtml(camera.summary)}</p>
          <dl>
            <div>
              <dt>Mount</dt>
              <dd>${escapeHtml(camera.mount)}</dd>
            </div>
            <div>
              <dt>Meter</dt>
              <dd>${escapeHtml(camera.meter)}</dd>
            </div>
          </dl>
          <ul class="tag-list">
            ${camera.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}
          </ul>
        </article>
      `,
    )
    .join("");
}

function populateRecipes() {
  const filmStocks = [...new Set(recipes.map((recipe) => recipe.film))];
  elements.filmStock.innerHTML = filmStocks
    .map((film) => `<option value="${escapeHtml(film)}">${escapeHtml(film)}</option>`)
    .join("");
  populateDevelopers();
}

function populateDevelopers() {
  const selectedFilm = elements.filmStock.value || recipes[0].film;
  const developers = recipes
    .filter((recipe) => recipe.film === selectedFilm)
    .map((recipe) => recipe.developer);

  elements.developer.innerHTML = developers
    .map((developer) => `<option value="${escapeHtml(developer)}">${escapeHtml(developer)}</option>`)
    .join("");
}

function updateRecipe() {
  const nextRecipe =
    recipes.find(
      (recipe) =>
        recipe.film === elements.filmStock.value &&
        recipe.developer === elements.developer.value,
    ) || recipes[0];

  state.recipe = nextRecipe;
  elements.loadedFilm.textContent = nextRecipe.film;
  elements.devTime.textContent = formatTime(nextRecipe.developmentSeconds);
  elements.recipeCard.innerHTML = `
    <dl>
      <div>
        <dt>Rating</dt>
        <dd>ISO ${escapeHtml(nextRecipe.iso)}</dd>
      </div>
      <div>
        <dt>Temperature</dt>
        <dd>${escapeHtml(nextRecipe.temperature)}</dd>
      </div>
      <div>
        <dt>Development</dt>
        <dd>${formatTime(nextRecipe.developmentSeconds)} in ${escapeHtml(nextRecipe.developer)}</dd>
      </div>
      <div>
        <dt>Agitation</dt>
        <dd>${escapeHtml(nextRecipe.agitation)}</dd>
      </div>
      <div>
        <dt>Notes</dt>
        <dd>${escapeHtml(nextRecipe.notes)}</dd>
      </div>
    </dl>
  `;

  resetTimer();
}

function renderProcessList() {
  let elapsedAtStepStart = 0;
  const elapsed = state.timer.totalSeconds - state.timer.remainingSeconds;

  elements.processList.innerHTML = state.recipe.process
    .map(([label, seconds]) => {
      const isCurrent = elapsed >= elapsedAtStepStart && elapsed < elapsedAtStepStart + seconds;
      elapsedAtStepStart += seconds;
      return `<li class="${isCurrent ? "current" : ""}">${escapeHtml(label)} - ${formatTime(seconds)}</li>`;
    })
    .join("");
}

function setTimerLabel() {
  if (state.timer.remainingSeconds === 0) {
    elements.timerLabel.textContent = "Session complete. Hang the negatives to dry.";
    return;
  }

  const elapsed = state.timer.totalSeconds - state.timer.remainingSeconds;
  let cursor = 0;
  const currentStep = state.recipe.process.find(([, seconds]) => {
    const withinStep = elapsed >= cursor && elapsed < cursor + seconds;
    cursor += seconds;
    return withinStep;
  });

  elements.timerLabel.textContent = currentStep
    ? `Now: ${currentStep[0]}`
    : "Ready for development";
}

function updateTimerDisplay() {
  elements.timerDisplay.textContent = formatTime(state.timer.remainingSeconds);
  setTimerLabel();
  renderProcessList();
}

function resetTimer() {
  window.clearInterval(state.timer.intervalId);
  state.timer.intervalId = null;
  state.timer.running = false;
  state.timer.totalSeconds = recipeTotalSeconds(state.recipe);
  state.timer.remainingSeconds = state.timer.totalSeconds;
  updateTimerDisplay();
}

function startTimer() {
  if (state.timer.running || state.timer.remainingSeconds === 0) {
    return;
  }

  state.timer.running = true;
  state.timer.intervalId = window.setInterval(() => {
    state.timer.remainingSeconds = Math.max(0, state.timer.remainingSeconds - 1);
    updateTimerDisplay();

    if (state.timer.remainingSeconds === 0) {
      window.clearInterval(state.timer.intervalId);
      state.timer.intervalId = null;
      state.timer.running = false;
    }
  }, 1000);
}

function pauseTimer() {
  window.clearInterval(state.timer.intervalId);
  state.timer.intervalId = null;
  state.timer.running = false;
}

function populateRollCameras() {
  elements.rollCamera.innerHTML = cameras
    .map(
      (camera) =>
        `<option value="${escapeHtml(camera.id)}">${escapeHtml(camera.maker)} ${escapeHtml(camera.model)}</option>`,
    )
    .join("");
}

function selectedRollCamera() {
  return cameras.find((camera) => camera.id === elements.rollCamera.value) || cameras[0];
}

function updateRollPreview() {
  const camera = selectedRollCamera();
  elements.previewTitle.textContent = elements.rollTitle.value.trim() || "Untitled roll";
  elements.previewCamera.textContent = `${camera.maker} ${camera.model}`;
  elements.previewStock.textContent = camera.stock;
  elements.previewNotes.textContent = elements.rollNotes.value.trim() || "No notes yet.";
  elements.frameCount.textContent = camera.format === "medium format" ? "4 / 12" : "12 / 36";
}

function loadCamera(cameraId) {
  const option = [...elements.rollCamera.options].find((item) => item.value === cameraId);
  if (!option) {
    return;
  }

  elements.rollCamera.value = cameraId;
  updateRollPreview();
  document.querySelector("#roll-desk").scrollIntoView({ behavior: "smooth" });
}

elements.cameraSearch.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderCameras();
});

elements.filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    elements.filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderCameras();
  });
});

elements.cameraGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-load-camera]");
  if (button) {
    loadCamera(button.dataset.loadCamera);
  }
});

elements.filmStock.addEventListener("change", () => {
  populateDevelopers();
  updateRecipe();
});

elements.developer.addEventListener("change", updateRecipe);
elements.startTimer.addEventListener("click", startTimer);
elements.pauseTimer.addEventListener("click", pauseTimer);
elements.resetTimer.addEventListener("click", resetTimer);
elements.rollForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateRollPreview();
});

elements.rollForm.addEventListener("input", updateRollPreview);

renderCameras();
populateRecipes();
populateRollCameras();
updateRecipe();
updateRollPreview();
