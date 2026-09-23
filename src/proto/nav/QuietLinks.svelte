<script lang="ts">
  import { socialNavItems } from "../../lib/navLinks";

  let { className = "" }: { className?: string } = $props();
</script>

<nav class="quiet-nav {className}" aria-label="Pages">
  <a class="skip" href="#proto-content">Skip to content</a>
  {#each socialNavItems as item (item.href)}
    <a
      class="quiet-link"
      href={item.href}
      target="_blank"
      rel="noopener noreferrer">{item.label}</a
    >
  {/each}
</nav>

<style>
  .quiet-nav {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 0 0.75rem;
  }

  .quiet-link {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: var(--color-text-primary);
    font-size: 0.875rem;
    text-decoration: none;
  }

  .quiet-link:active {
    opacity: 0.7;
  }

  @media (hover: hover) and (pointer: fine) {
    .quiet-link:hover {
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }
  }

  .skip {
    position: absolute;
    left: 0.5rem;
    top: 0.5rem;
    z-index: 30;
    transform: translateY(-150%);
    background: var(--color-bg-primary);
    color: var(--color-text-primary);
    padding: 0.5rem 0.75rem;
  }

  .skip:focus {
    transform: none;
  }
</style>
