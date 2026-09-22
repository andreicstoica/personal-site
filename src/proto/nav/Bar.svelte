<script lang="ts">
  import Nav from "../../components/nav/Nav.svelte";
  import WeatherBanner from "../../components/weather/WeatherBanner.svelte";
  import { mainNavItems, socialNavItems } from "../../lib/navLinks";
  import PageCopy from "./PageCopy.svelte";
</script>

<div class="stage">
  <WeatherBanner showLab={false} />
  <Nav {mainNavItems} {socialNavItems} />
  <div class="scroll scrollbar-gutter-stable" data-page-scroll>
    <PageCopy />
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
</style>
