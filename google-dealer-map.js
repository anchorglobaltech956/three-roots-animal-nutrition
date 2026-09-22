(() => {
  "use strict";

  const mapElement = document.getElementById("dealer-google-map");
  const statusElement = document.getElementById("dealer-google-map-status");
  if (!mapElement || !statusElement) return;

  const settings = window.THREE_ROOTS_GOOGLE_MAPS || {};
  const apiKey = String(settings.apiKey || "").trim();
  const dealersDataUrl = settings.dealersDataUrl || "dealers/dealers.json";
  const CACHE_KEY = "threeRootsDealerGeocodesV2";
  const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 365;

  const copy = {
    en: {
      setup: 'Google Maps needs the site API key before the dealer pins can load. The city dealer list below still works. <a href="dealers/">View the complete dealer directory →</a>',
      loadingMap: "Loading Google dealer map…",
      loadingDealers: (done, total) => `Locating dealer pins… ${done} of ${total}`,
      ready: (count, total) => `${count} of ${total} dealer locations mapped. Select a pin for details.`,
      partial: (count, total) => `${count} of ${total} dealer locations mapped. Some addresses could not be located automatically.`,
      error: 'The Google dealer map could not load. Use the city list below or <a href="dealers/">open the complete dealer directory</a>.',
      call: "Call",
      directions: "Directions"
    },
    es: {
      setup: 'Google Maps necesita la clave API del sitio antes de cargar los marcadores. La lista de ciudades abajo sigue funcionando. <a href="dealers/">Ver el directorio completo →</a>',
      loadingMap: "Cargando el mapa de distribuidores…",
      loadingDealers: (done, total) => `Ubicando distribuidores… ${done} de ${total}`,
      ready: (count, total) => `${count} de ${total} distribuidores ubicados. Selecciona un marcador para ver los detalles.`,
      partial: (count, total) => `${count} de ${total} distribuidores ubicados. Algunas direcciones no pudieron localizarse automáticamente.`,
      error: 'No se pudo cargar el mapa de distribuidores. Usa la lista de ciudades abajo o <a href="dealers/">abre el directorio completo</a>.',
      call: "Llamar",
      directions: "Cómo llegar"
    }
  };

  const lang = () =>
    (document.documentElement.lang || "en").toLowerCase().startsWith("es") ? "es" : "en";

  function setStatus(html, className = "") {
    statusElement.innerHTML = html;
    statusElement.className = `dealer-google-map-status ${className}`.trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function phoneHref(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return "";
    return digits.length === 10 ? `+1${digits}` : `+${digits}`;
  }

  function directionsUrl(dealer) {
    const destination = dealer.full_address || dealer.map_query || [
      dealer.street_address, dealer.city, dealer.state, dealer.zip
    ].filter(Boolean).join(", ");
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  }

  function popupHtml(dealer) {
    const t = copy[lang()];
    const address = dealer.full_address || [
      dealer.street_address, dealer.city, dealer.state, dealer.zip
    ].filter(Boolean).join(", ");
    const dial = phoneHref(dealer.telephone);
    const call = dial && dealer.telephone
      ? `<a class="dealer-map-popup-call" href="tel:${escapeHtml(dial)}">${escapeHtml(t.call)}: ${escapeHtml(dealer.telephone)}</a>`
      : "";

    return `
      <div class="dealer-map-popup">
        <h3>${escapeHtml(dealer.dealer_name)}</h3>
        <address>${escapeHtml(address)}</address>
        <div class="dealer-map-popup-actions">
          ${call}
          <a class="dealer-map-popup-directions" href="${escapeHtml(directionsUrl(dealer))}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.directions)} ↗</a>
        </div>
      </div>`;
  }

  function loadGoogleMaps() {
    return new Promise((resolve, reject) => {
      if (window.google?.maps) return resolve(window.google.maps);

      const callbackName = `__threeRootsMapsReady_${Date.now()}`;
      const script = document.createElement("script");
      const params = new URLSearchParams({
        key: apiKey,
        callback: callbackName,
        v: "weekly",
        region: "US",
        language: lang() === "es" ? "es" : "en"
      });

      window[callbackName] = () => {
        try { delete window[callbackName]; } catch (_) {}
        resolve(window.google.maps);
      };

      script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        try { delete window[callbackName]; } catch (_) {}
        reject(new Error("Google Maps JavaScript API failed to load"));
      };
      document.head.appendChild(script);
    });
  }

  function readCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      if (!parsed || typeof parsed !== "object") return {};
      return parsed;
    } catch (_) {
      return {};
    }
  }

  function writeCache(cache) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (_) {}
  }

  function cacheKeyFor(dealer) {
    return String(dealer.full_address || dealer.map_query || "").trim().toLowerCase();
  }

  function getCachedPosition(cache, dealer) {
    const record = cache[cacheKeyFor(dealer)];
    if (!record || typeof record.lat !== "number" || typeof record.lng !== "number") return null;
    if (!record.savedAt || Date.now() - record.savedAt > CACHE_MAX_AGE) return null;
    return { lat: record.lat, lng: record.lng };
  }

  function rememberPosition(cache, dealer, position) {
    cache[cacheKeyFor(dealer)] = {
      lat: position.lat,
      lng: position.lng,
      savedAt: Date.now()
    };
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function geocodeDealer(geocoder, dealer, retries = 2) {
    const address = dealer.full_address || dealer.map_query || [
      dealer.street_address, dealer.city, dealer.state, dealer.zip
    ].filter(Boolean).join(", ");

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await geocoder.geocode({ address, region: "US" });
        const first = response?.results?.[0];
        if (!first) return null;
        const location = first.geometry.location;
        return { lat: location.lat(), lng: location.lng() };
      } catch (error) {
        const message = String(error?.message || error || "");
        const retryable = /OVER_QUERY_LIMIT|UNKNOWN_ERROR|RESOURCE_EXHAUSTED/i.test(message);
        if (!retryable || attempt === retries) return null;
        await wait(650 * (attempt + 1));
      }
    }
    return null;
  }

  function makeMarker(map, position, dealer, infoWindow) {
    const marker = new google.maps.Marker({
      map,
      position,
      title: dealer.dealer_name,
      animation: null
    });

    marker.addListener("click", () => {
      infoWindow.setContent(popupHtml(dealer));
      infoWindow.open({ map, anchor: marker, shouldFocus: false });
    });
    return marker;
  }

  async function initMap() {
    const t = copy[lang()];

    if (!apiKey || apiKey === "PASTE_GOOGLE_MAPS_API_KEY_HERE") {
      setStatus(t.setup, "is-setup");
      return;
    }

    setStatus(t.loadingMap);

    try {
      const [dealerResponse] = await Promise.all([
        fetch(dealersDataUrl, { cache: "no-store" }),
        loadGoogleMaps()
      ]);

      if (!dealerResponse.ok) throw new Error(`Dealer data request failed: ${dealerResponse.status}`);
      const allDealers = await dealerResponse.json();
      const dealers = Array.isArray(allDealers)
        ? allDealers.filter(d => d && d.active !== false && d.full_address && d.dealer_name)
        : [];

      const map = new google.maps.Map(mapElement, {
        center: { lat: 31.0, lng: -99.0 },
        zoom: 5,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: "cooperative",
        clickableIcons: true
      });

      const geocoder = new google.maps.Geocoder();
      const infoWindow = new google.maps.InfoWindow();
      const bounds = new google.maps.LatLngBounds();
      const cache = readCache();
      let mapped = 0;
      let processed = 0;

      // Render cached pins first so repeat visitors see the map immediately.
      const uncached = [];
      for (const dealer of dealers) {
        const cached = getCachedPosition(cache, dealer);
        if (cached) {
          makeMarker(map, cached, dealer, infoWindow);
          bounds.extend(cached);
          mapped += 1;
        } else {
          uncached.push(dealer);
        }
      }

      processed = mapped;
      if (mapped > 0) {
        map.fitBounds(bounds, 55);
        setStatus(t.loadingDealers(processed, dealers.length));
      }

      // Geocode known static dealer addresses at a conservative pace.
      for (const dealer of uncached) {
        const position = await geocodeDealer(geocoder, dealer);
        processed += 1;

        if (position) {
          makeMarker(map, position, dealer, infoWindow);
          bounds.extend(position);
          mapped += 1;
          rememberPosition(cache, dealer, position);
          if (mapped === 1 || mapped % 12 === 0) map.fitBounds(bounds, 55);
        }

        setStatus(t.loadingDealers(processed, dealers.length));
        if (processed % 8 === 0) writeCache(cache);
        await wait(120);
      }

      writeCache(cache);
      if (mapped > 0) map.fitBounds(bounds, 55);
      setStatus(
        mapped === dealers.length ? t.ready(mapped, dealers.length) : t.partial(mapped, dealers.length),
        "is-ready"
      );

      // Expose a small integration hook for city-list clicks.
      window.THREE_ROOTS_DEALER_MAP = {
        map,
        focusCity(city, state) {
          const matches = dealers.filter(d => d.city === city && d.state === state);
          const cityBounds = new google.maps.LatLngBounds();
          let found = 0;
          for (const dealer of matches) {
            const p = getCachedPosition(cache, dealer);
            if (p) { cityBounds.extend(p); found += 1; }
          }
          if (found) map.fitBounds(cityBounds, 70);
        }
      };

    } catch (error) {
      console.error("Three Roots Google dealer map failed:", error);
      setStatus(copy[lang()].error, "is-error");
    }
  }

  // Delay the Google API request until the map is close to the viewport.
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      initMap();
    }, { rootMargin: "500px 0px" });
    observer.observe(mapElement);
  } else {
    initMap();
  }
})();
