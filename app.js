(function () {
  "use strict";

  const DAY_MS = 24 * 60 * 60 * 1000;
  const storage = {
    get: function (key, fallback) {
      try {
        const saved = localStorage.getItem(key);
        return saved === null ? fallback : JSON.parse(saved);
      } catch (error) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        // The app remains usable for this visit if browser storage is unavailable.
      }
    }
  };

  const savedPlants = storage.get("sproutPlants", null);
  let plants = Array.isArray(savedPlants) ? savedPlants : SAMPLE_PLANTS.map(function (plant) {
    return {
      id: plant.id,
      name: plant.name,
      species: plant.species,
      location: plant.location,
      interval: plant.interval,
      lastWateredAt: Date.now() - plant.lastWatered * DAY_MS,
      icon: plant.icon
    };
  });

  const plantTotal = document.getElementById("plant-total");
  const dueTotal = document.getElementById("due-total");
  const dueCaption = document.getElementById("due-caption");
  const nextDue = document.getElementById("next-due");
  const nextCaption = document.getElementById("next-caption");
  const priorityList = document.getElementById("priority-list");
  const allPlants = document.getElementById("all-plants");
  const emptyState = document.getElementById("empty-state");
  const plantsEmpty = document.getElementById("plants-empty");
  const dialog = document.getElementById("plant-dialog");
  const form = document.getElementById("plant-form");

  document.title = STARTUP.name + " | Plant care, in rhythm";
  document.getElementById("tagline").textContent = STARTUP.tagline;
  document.getElementById("pitch").textContent = STARTUP.pitch;
  document.getElementById("today-label").textContent = new Intl.DateTimeFormat("en", {
    weekday: "long", month: "long", day: "numeric"
  }).format(new Date()).toUpperCase();

  function getDaysUntilDue(plant) {
    const daysSinceWatering = Math.floor((Date.now() - plant.lastWateredAt) / DAY_MS);
    return Number(plant.interval) - daysSinceWatering;
  }

  function getSortedPlants() {
    return plants.slice().sort(function (first, second) {
      return getDaysUntilDue(first) - getDaysUntilDue(second);
    });
  }

  function getStatus(daysUntilDue) {
    if (daysUntilDue < 0) {
      const daysLate = Math.abs(daysUntilDue);
      return { label: daysLate === 1 ? "1 day overdue" : daysLate + " days overdue", type: "overdue" };
    }
    if (daysUntilDue === 0) return { label: "Due today", type: "today" };
    if (daysUntilDue === 1) return { label: "Due tomorrow", type: "soon" };
    return { label: "In " + daysUntilDue + " days", type: "upcoming" };
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function makePlantRow(plant) {
    const daysUntilDue = getDaysUntilDue(plant);
    const status = getStatus(daysUntilDue);
    const row = makeElement("article", "plant-row");
    const avatar = makeElement("span", "plant-avatar avatar-" + (plant.icon || "leaf"), "✳");
    avatar.setAttribute("aria-hidden", "true");
    const details = makeElement("div", "plant-details");
    details.append(makeElement("h3", "", plant.name));
    details.append(makeElement("p", "plant-meta", [plant.species, plant.location].filter(Boolean).join(" · ") || "Your plant"));
    const schedule = makeElement("div", "plant-schedule");
    schedule.append(makeElement("span", "status status-" + status.type, status.label));
    schedule.append(makeElement("span", "schedule-detail", "Every " + plant.interval + " days"));
    const actions = makeElement("div", "plant-actions");
    const waterButton = makeElement("button", "button water-button", "Watered");
    waterButton.type = "button";
    waterButton.setAttribute("aria-label", "Mark " + plant.name + " as watered today");
    waterButton.addEventListener("click", function () { markWatered(plant.id); });
    const removeButton = makeElement("button", "remove-button", "Remove");
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", "Remove " + plant.name);
    removeButton.addEventListener("click", function () { removePlant(plant.id); });
    actions.append(waterButton, removeButton);
    row.append(avatar, details, schedule, actions);
    return row;
  }

  function makePlantCard(plant) {
    const daysUntilDue = getDaysUntilDue(plant);
    const status = getStatus(daysUntilDue);
    const card = makeElement("article", "plant-card");
    const top = makeElement("div", "plant-card-top");
    const avatar = makeElement("span", "plant-avatar avatar-" + (plant.icon || "leaf"), "✳");
    avatar.setAttribute("aria-hidden", "true");
    const badge = makeElement("span", "status status-" + status.type, status.label);
    top.append(avatar, badge);
    const title = makeElement("h2", "", plant.name);
    const species = makeElement("p", "plant-species", plant.species || "Plant pal");
    const location = makeElement("p", "plant-location", plant.location || "Location not set");
    const footer = makeElement("div", "plant-card-footer");
    const frequency = makeElement("span", "schedule-detail", "Every " + plant.interval + " days");
    const waterButton = makeElement("button", "button water-button", "Watered");
    waterButton.type = "button";
    waterButton.setAttribute("aria-label", "Mark " + plant.name + " as watered today");
    waterButton.addEventListener("click", function () { markWatered(plant.id); });
    const removeButton = makeElement("button", "remove-button", "Remove");
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", "Remove " + plant.name);
    removeButton.addEventListener("click", function () { removePlant(plant.id); });
    footer.append(frequency, waterButton);
    card.append(top, title, species, location, footer, removeButton);
    return card;
  }

  function render() {
    const sortedPlants = getSortedPlants();
    const urgentCount = sortedPlants.filter(function (plant) { return getDaysUntilDue(plant) <= 0; }).length;
    plantTotal.textContent = String(plants.length);
    dueTotal.textContent = String(urgentCount);
    dueCaption.textContent = urgentCount === 1 ? "plant ready for water" : "plants ready for water";

    if (sortedPlants.length === 0) {
      nextDue.textContent = "Add a plant";
      nextCaption.textContent = "Your care calendar starts here";
    } else {
      const next = getDaysUntilDue(sortedPlants[0]);
      nextDue.textContent = next < 0 ? Math.abs(next) + "d late" : next === 0 ? "Today" : next === 1 ? "Tomorrow" : "In " + next + " days";
      nextCaption.textContent = sortedPlants[0].name;
    }

    priorityList.replaceChildren.apply(priorityList, sortedPlants.map(makePlantRow));
    allPlants.replaceChildren.apply(allPlants, sortedPlants.map(makePlantCard));
    emptyState.hidden = plants.length !== 0;
    priorityList.hidden = plants.length === 0;
    plantsEmpty.hidden = plants.length !== 0;
  }

  function save() {
    storage.set("sproutPlants", plants);
    render();
  }

  function markWatered(id) {
    plants = plants.map(function (plant) {
      return plant.id === id ? Object.assign({}, plant, { lastWateredAt: Date.now() }) : plant;
    });
    save();
  }

  function removePlant(id) {
    plants = plants.filter(function (plant) { return plant.id !== id; });
    save();
  }

  function showView() {
    const requested = (window.location.hash || "#home").slice(1);
    const views = document.querySelectorAll("[data-view]");
    const exists = Array.prototype.some.call(views, function (view) { return view.id === requested; });
    const current = exists ? requested : "home";
    views.forEach(function (view) { view.hidden = view.id !== current; });
    document.querySelectorAll("nav a").forEach(function (link) {
      if (link.getAttribute("href") === "#" + current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
  }

  document.querySelectorAll("[data-open-dialog]").forEach(function (button) {
    button.addEventListener("click", function () { dialog.showModal(); });
  });
  document.querySelectorAll("[data-close-dialog]").forEach(function (button) {
    button.addEventListener("click", function () { dialog.close(); });
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const values = new FormData(form);
    plants.push({
      id: "plant-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
      name: values.get("name").trim(),
      species: values.get("species").trim(),
      location: values.get("location").trim(),
      interval: Number(values.get("interval")),
      lastWateredAt: Date.now(),
      icon: "leaf"
    });
    save();
    form.reset();
    dialog.close();
  });

  const sitters = [
    { name: "Maya", area: "Downtown", note: "Happy to check in on leafy roommates and follow your care notes.", initials: "M" },
    { name: "Jordan", area: "North End", note: "Weekend plant parent with a soft spot for ferns and monstera.", initials: "J" },
    { name: "Alex", area: "Harbourfront", note: "Can help with a quick watering visit while you're out of town.", initials: "A" }
  ];
  const sitterList = document.getElementById("sitter-list");
  sitters.forEach(function (sitter) {
    const card = makeElement("article", "sitter-card");
    const avatar = makeElement("span", "sitter-avatar", sitter.initials);
    const title = makeElement("h2", "", sitter.name);
    const area = makeElement("p", "sitter-area", sitter.area + " · sample profile");
    const note = makeElement("p", "sitter-note", sitter.note);
    const button = makeElement("button", "button sitter-button", "Request an introduction");
    button.type = "button";
    button.addEventListener("click", function () {
      button.textContent = "Interest noted for this demo";
      button.disabled = true;
    });
    card.append(avatar, title, area, note, button);
    sitterList.append(card);
  });

  window.addEventListener("hashchange", showView);
  render();
  showView();
})();