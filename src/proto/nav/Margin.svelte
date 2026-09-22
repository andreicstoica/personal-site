<script lang="ts">
  import WeatherBanner from "../../components/weather/WeatherBanner.svelte";
  import DocName from "./DocName.svelte";
  import PageCopy from "./PageCopy.svelte";
  import QuietLinks from "./QuietLinks.svelte";
</script>

<div class="stage">
  <QuietLinks className="margin-links" />
  <WeatherBanner showLab={false} />
  <div class="scroll scrollbar-gutter-stable" data-page-scroll>
    <DocName />
    <PageCopy />
  </div>
</div>

<style>
  .stage {
    position: relative;
    display: flex;
    height: 100%;
    min-height: 0;
    min-width: 0;
    flex-direction: column;
    overflow: hidden;
  }

  .stage :global(.margin-links) {
    position: absolute;
    z-index: 20;
    top: 0;
    right: 0;
    justify-content: flex-end;
    max-width: min(18rem, 42vw);
  }

  .scroll {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
  }

  @media (max-width: 720px) {
    .stage :global(.margin-links) {
      position: static;
      max-width: none;
      margin-bottom: 0.15rem;
    }
  }
</style>
