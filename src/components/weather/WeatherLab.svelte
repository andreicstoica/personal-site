<script lang="ts">
  import {
    COLOR_MODES,
    PLACE_LABEL,
    PLACES,
    TIMES,
    WEATHERS,
    type ColorMode,
    type Place,
    type TimeOfDay,
    type Weather,
  } from "../../lib/weather/scene";

  let {
    place,
    weather,
    time,
    colorMode,
    onPlace,
    onWeather,
    onTime,
    onColorMode,
    onLocalize,
  }: {
    place: Place;
    weather: Weather;
    time: TimeOfDay;
    colorMode: ColorMode | "system";
    onPlace: (place: Place) => void;
    onWeather: (weather: Weather) => void;
    onTime: (time: TimeOfDay) => void;
    onColorMode: (mode: ColorMode | "system") => void;
    onLocalize: () => void;
  } = $props();

  const colorChoices = ["system", ...COLOR_MODES] as const;

  function choose<T extends string>(
    event: Event,
    allowed: readonly T[],
    apply: (value: T) => void,
  ) {
    const target = event.currentTarget;
    if (!(target instanceof HTMLSelectElement)) return;
    const match = allowed.find((item) => item === target.value);
    if (match !== undefined) apply(match);
  }
</script>

<section id="weather-lab" aria-label="Weather banner lab">
  <p>lab</p>
  <label>
    place
    <select
      id="lab-place"
      value={place}
      onchange={(event) => choose(event, PLACES, onPlace)}
    >
      {#each PLACES as option}
        <option value={option}>{PLACE_LABEL[option]}</option>
      {/each}
    </select>
  </label>
  <label>
    weather
    <select
      id="lab-weather"
      value={weather}
      onchange={(event) => choose(event, WEATHERS, onWeather)}
    >
      {#each WEATHERS as option}
        <option value={option}>{option}</option>
      {/each}
    </select>
  </label>
  <label>
    time
    <select
      id="lab-time"
      value={time}
      onchange={(event) => choose(event, TIMES, onTime)}
    >
      {#each TIMES as option}
        <option value={option}>{option === "golden-hour" ? "golden hour" : option}</option>
      {/each}
    </select>
  </label>
  <label>
    color
    <select
      id="lab-color"
      value={colorMode}
      onchange={(event) => choose(event, colorChoices, onColorMode)}
    >
      {#each colorChoices as option}
        <option value={option}>{option}</option>
      {/each}
    </select>
  </label>
  <button type="button" onclick={onLocalize}>localize</button>
</section>

<style>
  #weather-lab {
    position: fixed;
    right: var(--guide-launch-inset);
    /* Stack above the chat launcher instead of on it. */
    bottom: calc(
      var(--guide-launch-inset) + var(--guide-launch-size) + var(--spacing-xs)
    );
    z-index: 40;
    display: grid;
    gap: 0.3rem;
    width: 11.5rem;
    padding: 0.45rem 0.5rem 0.55rem;
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.3;
  }

  #weather-lab p {
    margin: 0;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }

  label {
    display: grid;
    gap: 0.1rem;
  }

  select,
  button {
    width: 100%;
    font: inherit;
    color: inherit;
    background: transparent;
    border: 1px solid var(--color-text-muted);
    border-radius: 0;
    padding: 0.1rem 0.2rem;
  }

  button {
    cursor: pointer;
    text-align: left;
    letter-spacing: 0.04em;
  }

  button:hover {
    border-color: var(--color-text-secondary);
    color: var(--color-primary-text);
  }
</style>
