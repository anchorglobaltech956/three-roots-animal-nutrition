(() => {
  "use strict";

  const currentScript = document.currentScript;
  const DATA_URL = currentScript?.src
    ? new URL("dealers.json", currentScript.src).href
    : "/dealers/dealers.json";

  const state = {
    groups: new Map(),
    cities: [],
    selectedKey: "",
    panel: null,
    cityList: null
  };

  const text = {
    en: {
      citiesLabel: "Cities with Three Roots dealers",
      title: (city, state, count) => `Dealers in ${city}, ${state} (${count})`,
      intro: "Select a dealer below for the address, phone number, or directions.",
      call: "Call",
      noPhone: "Phone not listed",
      directions: "Directions",
      loadError: "Dealer information could not be loaded. Please try again."
    },
    es: {
      citiesLabel: "Ciudades con distribuidores de Three Roots",
      title: (city, state, count) => `Distribuidores en ${city}, ${state} (${count})`,
      intro: "Selecciona un distribuidor para ver la dirección, teléfono o cómo llegar.",
      call: "Llamar",
      noPhone: "Teléfono no disponible",
      directions: "Cómo llegar",
      loadError: "No se pudo cargar la información de distribuidores. Inténtalo de nuevo."
    }
  };

  const getLang = () =>
    (document.documentElement.lang || "en").toLowerCase().startsWith("es") ? "es" : "en";

  const normalize = value =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const keyFor = (city, state) => `${normalize(city)}|${normalize(state || "TX")}`;

  const dialHref = value => {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return "";
    return digits.length === 10 ? `+1${digits}` : `+${digits}`;
  };

  function ensurePanel() {
    let panel = document.getElementById("dealer-results");

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "dealer-results";
      state.cityList.insertAdjacentElement("afterend", panel);
    }

    panel.className = "dealer-results dynamic-dealer-results";
    panel.hidden = true;
    panel.setAttribute("aria-live", "polite");
    panel.innerHTML = `
      <h3 id="dealer-results-title"></h3>
      <p id="dealer-results-intro"></p>
      <div id="retailer-result-grid" class="retailer-result-grid"></div>
    `;

    state.panel = panel;
  }

  function makeDealerCard(dealer) {
    const lang = getLang();
    const t = text[lang];

    const article = document.createElement("article");
    article.className = "retailer-result dynamic-retailer-result";

    const name = document.createElement("strong");
    name.textContent = dealer.dealer_name || "";

    const address = document.createElement("address");
    address.textContent =
      dealer.full_address ||
      [dealer.street_address, dealer.city, dealer.state, dealer.zip]
        .filter(Boolean)
        .join(", ");

    const actions = document.createElement("div");
    actions.className = "dynamic-retailer-actions";

    if (dealer.telephone) {
      const phone = document.createElement("a");
      phone.href = `tel:${dialHref(dealer.telephone)}`;
      phone.className = "dynamic-retailer-phone";
      phone.textContent = `${t.call}: ${dealer.telephone}`;
      actions.appendChild(phone);
    } else {
      const phone = document.createElement("span");
      phone.className = "dynamic-retailer-phone-missing";
      phone.textContent = t.noPhone;
      actions.appendChild(phone);
    }

    const directions = document.createElement("a");
    directions.className = "retailer-map-link dynamic-retailer-map-link";
    directions.target = "_blank";
    directions.rel = "noopener noreferrer";
    directions.href =
      dealer.map_url ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.textContent)}`;
    directions.textContent = `${t.directions} ↗`;
    actions.appendChild(directions);

    article.append(name, address, actions);
    return article;
  }

  function setActiveButton(key) {
    state.cityList
      .querySelectorAll(".city-choice[data-dealer-city-key]")
      .forEach(button => {
        const active = button.dataset.dealerCityKey === key;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
  }

  function renderByKey(key, scroll = true) {
    const group = state.groups.get(key);
    if (!group) return false;

    state.selectedKey = key;
    setActiveButton(key);

    const lang = getLang();
    const t = text[lang];
    const dealers = [...group.dealers].sort((a, b) =>
      String(a.dealer_name || "").localeCompare(String(b.dealer_name || ""))
    );

    state.panel.querySelector("#dealer-results-title").textContent =
      t.title(group.city, group.state, dealers.length);

    state.panel.querySelector("#dealer-results-intro").textContent = t.intro;

    const grid = state.panel.querySelector("#retailer-result-grid");
    grid.replaceChildren(...dealers.map(makeDealerCard));
    state.panel.hidden = false;

    const cityInput = document.getElementById("dealer-city");
    const stateSelect = document.getElementById("dealer-state");

    if (cityInput) cityInput.value = group.city;
    if (stateSelect) stateSelect.value = group.state;

    if (scroll) {
      state.panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    return true;
  }

  function buildCityButtons() {
    state.cityList.replaceChildren();
    state.cityList.classList.add("dynamic-dealer-cities");
    state.cityList.setAttribute("aria-label", text[getLang()].citiesLabel);

    for (const group of state.cities) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "city-choice retailer-city dynamic-retailer-city";
      button.dataset.dealerCityKey = group.key;
      button.dataset.retailerCity = group.city;
      button.setAttribute("aria-pressed", "false");
      button.textContent = `${group.city}, ${group.state}${group.city === "Weslaco" ? " ★" : ""}`;
      state.cityList.appendChild(button);
    }
  }

  function parseCityLabel(value) {
    const cleaned = String(value || "").replace("★", "").trim();
    const match = cleaned.match(/^(.+?),\s*([A-Z]{2})\b/i);
    if (!match) return null;
    return { city: match[1].trim(), state: match[2].toUpperCase() };
  }

  function wireCityButtons() {
    state.cityList.addEventListener(
      "click",
      event => {
        const button = event.target.closest(".city-choice[data-dealer-city-key]");
        if (!button) return;
        event.stopImmediatePropagation();
        renderByKey(button.dataset.dealerCityKey);
      },
      true
    );
  }

  function wireMapPins() {
    document.querySelectorAll(".city-pin").forEach(pin => {
      const parsed = parseCityLabel(pin.getAttribute("aria-label") || pin.querySelector("title")?.textContent);
      if (!parsed) return;

      const key = keyFor(parsed.city, parsed.state);
      if (!state.groups.has(key)) {
        pin.classList.add("city-pin-no-dealer");
        pin.setAttribute("aria-disabled", "true");
        return;
      }

      pin.classList.add("city-pin-has-dealer");
      pin.dataset.dealerCityKey = key;

      pin.addEventListener(
        "click",
        event => {
          event.stopImmediatePropagation();
          renderByKey(key);
        },
        true
      );

      pin.addEventListener(
        "keydown",
        event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopImmediatePropagation();
          renderByKey(key);
        },
        true
      );
    });
  }

  function showLoadError() {
    if (!state.cityList) return;
    ensurePanel();
    state.panel.hidden = false;
    state.panel.querySelector("#dealer-results-title").textContent = "";
    state.panel.querySelector("#dealer-results-intro").textContent = text[getLang()].loadError;
    state.panel.querySelector("#retailer-result-grid").replaceChildren();
  }

  async function init() {
    state.cityList = document.querySelector(".dealer-cities");
    if (!state.cityList) return;

    try {
      const response = await fetch(DATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`Dealer data request failed: ${response.status}`);

      const data = await response.json();
      const active = Array.isArray(data)
        ? data.filter(item => item && item.active !== false && item.city && item.state)
        : [];

      for (const dealer of active) {
        const key = keyFor(dealer.city, dealer.state);
        if (!state.groups.has(key)) {
          state.groups.set(key, {
            key,
            city: dealer.city,
            state: dealer.state,
            dealers: []
          });
        }
        state.groups.get(key).dealers.push(dealer);
      }

      state.cities = [...state.groups.values()].sort((a, b) =>
        a.city.localeCompare(b.city) || a.state.localeCompare(b.state)
      );

      ensurePanel();
      buildCityButtons();
      wireCityButtons();
      wireMapPins();

      const cityInput = document.getElementById("dealer-city");
      const stateSelect = document.getElementById("dealer-state");
      if (cityInput) {
        cityInput.addEventListener("change", () => {
          const key = keyFor(cityInput.value, stateSelect?.value || "TX");
          if (state.groups.has(key)) renderByKey(key, false);
        });
      }

      const langObserver = new MutationObserver(() => {
        state.cityList.setAttribute("aria-label", text[getLang()].citiesLabel);
        if (state.selectedKey) renderByKey(state.selectedKey, false);
      });
      langObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["lang"]
      });

    } catch (error) {
      console.error("Three Roots dynamic dealer directory failed to load.", error);
      showLoadError();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
