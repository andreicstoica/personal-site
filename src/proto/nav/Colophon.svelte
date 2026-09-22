<script lang="ts">
  import WeatherBanner from "../../components/weather/WeatherBanner.svelte";
  import DocName from "./DocName.svelte";
  import PageCopy from "./PageCopy.svelte";
  import QuietLinks from "./QuietLinks.svelte";
</script>

<div class="stage">
  <WeatherBanner showLab={false} />
  <div class="scroll scrollbar-gutter-stable" data-page-scroll>
    <DocName />
    <PageCopy />
    <QuietLinks className="colophon-links" />
  </div>
</div>

<style>
  .stage {
    display: flex;
    height: 100%;
    min-height: 0;
    min-width: 0;
    flex-direction: column;
    overflow: hidden;
  }

  .scroll {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
  }

  .stage :global(.colophon-links) {
    max-width: 42rem;
    margin-top: 2rem;
    margin-bottom: 4.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid
      color-mix(in srgb, var(--color-text-primary) 12%, transparent);
  }
</style>
